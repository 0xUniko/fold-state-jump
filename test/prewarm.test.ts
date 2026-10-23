import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { Deferred, Effect, Ref } from 'effect';
import { makePrewarmScheduler, schedulePrewarm, requestForeground, disposePrewarm, cancelPrewarm, cancelAllTasks, withSchedulerMaintenance, cancelSourceTasks, backgroundAdmission, trackNativeProcess } from '../src/prewarm';
import { prepareAst } from '../src/analysis';
import type { AstExtractionResult } from '../src/ast-cache';

const ready: AstExtractionResult = { _tag: 'ExtractionReady', prepared: prepareAst({ kind: 'TranslationUnitDecl' }), hit: 'load' };
const input = (source = '/one.cpp', version = 1) => ({ source, key: JSON.stringify([source, version]), reason: 'test' });
const controller = () => new AbortController();
const pending = () => {
  const started = Deferred.makeUnsafe<void>();
  const released = Deferred.makeUnsafe<void>();
  const work = (signal: AbortSignal) => Effect.runPromise(Effect.gen(function* () {
    yield* Deferred.succeed(started, undefined);
    yield* Deferred.await(released);
    return ready;
  }), { signal });
  return { work, started: () => Effect.runPromise(Deferred.await(started)), release: () => Effect.runPromise(Deferred.succeed(released, undefined)) };
};
const fixture = () => {
  const events = Ref.makeUnsafe<readonly Readonly<Record<string, unknown>>[]>([]);
  const scheduler = makePrewarmScheduler((event) => Effect.runSync(Ref.update(events, (events) => [...events, event])));
  return { scheduler, events: () => Effect.runSync(Ref.get(events)), state: () => Effect.runSync(Ref.get(scheduler.state)) };
};

describe('event-driven prewarm scheduler', () => {
  test('resource admission distinguishes CPU and memory pressure', () => {
    assert.equal(backgroundAdmission(1024 ** 3, 0, 8), 'memory-pressure');
    assert.equal(backgroundAdmission(8 * 1024 ** 3, 7, 8), 'cpu-pressure');
    assert.equal(backgroundAdmission(8 * 1024 ** 3, 2, 8), 'ready');
  });

  test('clear closes admission through cancellation and asynchronous deletion, then reopens on failure', async () => {
    const { scheduler, state } = fixture();
    const task = pending();
    schedulePrewarm(scheduler, input(), 0, task.work);
    await task.started();
    const deleting = Deferred.makeUnsafe<void>();
    const release = Deferred.makeUnsafe<void>();
    const clear = withSchedulerMaintenance(scheduler, async () => {
      assert.equal(state().tasks.length, 0);
      await Effect.runPromise(Deferred.succeed(deleting, undefined));
      await Effect.runPromise(Deferred.await(release));
      throw new Error('delete failed');
    });
    schedulePrewarm(scheduler, input('/unexpected.cpp'), 0, async () => { throw new Error('unexpected'); });
    await Effect.runPromise(Deferred.await(deleting));
    await assert.rejects(requestForeground(scheduler, input(), controller().signal, async () => ready), /clearing/);
    assert.equal(state().scheduled, undefined);
    await Effect.runPromise(Deferred.succeed(release, undefined));
    await assert.rejects(clear, /delete failed/);
    assert.equal(state().maintenance, 0);
    assert.equal(await requestForeground(scheduler, input(), controller().signal, async () => ready), ready);
    await disposePrewarm(scheduler);
  });

  test('overlapping clears serialize and keep admission closed until both complete', async () => {
    const { scheduler, state } = fixture();
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const order = Ref.makeUnsafe<readonly number[]>([]);
    const first = withSchedulerMaintenance(scheduler, async () => {
      await Effect.runPromise(Deferred.succeed(started, undefined));
      await Effect.runPromise(Deferred.await(released));
      Effect.runSync(Ref.update(order, (order) => [...order, 1]));
    });
    await Effect.runPromise(Deferred.await(started));
    const second = withSchedulerMaintenance(scheduler, async () => {
      assert.equal(state().maintenance > 0, true);
      Effect.runSync(Ref.update(order, (order) => [...order, 2]));
    });
    assert.equal(state().maintenance, 2);
    await Effect.runPromise(Deferred.succeed(released, undefined));
    await Promise.all([first, second]);
    assert.deepEqual(Effect.runSync(Ref.get(order)), [1, 2]);
    assert.equal(state().maintenance, 0);
    await disposePrewarm(scheduler);
  });

  test('dependency cancellation targets affected TUs and exited PID ownership ends before promotion', async () => {
    const { scheduler, state, events } = fixture();
    const task = pending();
    schedulePrewarm(scheduler, input('/affected.cpp'), 0, task.work);
    await task.started();
    const signal = state().tasks[0].controller.signal;
    trackNativeProcess(scheduler, signal, undefined);
    const foreground = requestForeground(scheduler, input('/affected.cpp'), controller().signal, task.work);
    assert.equal(events().some((event) => event.event === 'native-priority'), false);
    cancelSourceTasks(scheduler, ['/unrelated.cpp']);
    assert.equal(signal.aborted, false);
    cancelSourceTasks(scheduler, ['/affected.cpp']);
    await assert.rejects(foreground);
    await disposePrewarm(scheduler);
  });
  test('debounces rapid events into one tracked task', async () => {
    const { scheduler, events, state } = fixture();
    const task = pending();
    Array.from({ length: 20 }).map(() => schedulePrewarm(scheduler, input(), 1, task.work));
    await task.started();
    assert.equal(events().filter((event) => event.event === 'start').length, 1);
    assert.equal(state().tasks.length, 1);
    await task.release();
    await disposePrewarm(scheduler);
    assert.equal(state().tasks.length, 0);
  });

  test('returning to an existing foreground task removes another editor debounce', async () => {
    const { scheduler, state } = fixture();
    const task = pending();
    const foreground = requestForeground(scheduler, input('/a.cpp'), controller().signal, task.work);
    await task.started();
    schedulePrewarm(scheduler, input('/b.cpp'), 60000, async () => { throw new Error('stale editor task'); });
    assert.equal(state().scheduled?.source, '/b.cpp');
    schedulePrewarm(scheduler, input('/a.cpp'), 60000, task.work);
    assert.equal(state().scheduled, undefined);
    await task.release();
    await foreground;
    await disposePrewarm(scheduler);
  });

  test('foreground joins a running prewarm once and preserves its result', async () => {
    const { scheduler, events } = fixture();
    const task = pending();
    schedulePrewarm(scheduler, input(), 0, task.work);
    await task.started();
    const first = requestForeground(scheduler, input(), controller().signal, () => Promise.reject(new Error('duplicate')));
    const second = requestForeground(scheduler, input(), controller().signal, () => Promise.reject(new Error('duplicate')));
    // Switching editors must not cancel a promoted foreground job.
    cancelPrewarm(scheduler, 'editor-switch');
    await task.release();
    assert.equal(await first, ready);
    assert.equal(await second, ready);
    assert.equal(events().filter((event) => event.event === 'start').length, 1);
    await disposePrewarm(scheduler);
  });

  test('cancelling one foreground waiter leaves another waiter running', async () => {
    const { scheduler } = fixture();
    const task = pending();
    const firstController = controller();
    const first = requestForeground(scheduler, input(), firstController.signal, task.work);
    await task.started();
    const second = requestForeground(scheduler, input(), controller().signal, task.work);
    firstController.abort();
    await assert.rejects(first);
    await task.release();
    assert.equal(await second, ready);
    await disposePrewarm(scheduler);
  });

  test('foreground cancels another background TU and cancels pending debounce', async () => {
    const { scheduler, state } = fixture();
    const task = pending();
    schedulePrewarm(scheduler, input('/background.cpp'), 0, task.work);
    await task.started();
    assert.equal(await requestForeground(scheduler, input('/foreground.cpp'), controller().signal, async () => ready), ready);
    assert.equal(state().cancellations, 1);
    schedulePrewarm(scheduler, input('/pending.cpp'), 60000, task.work);
    assert.equal(await requestForeground(scheduler, input('/foreground.cpp'), controller().signal, async () => ready), ready);
    assert.equal(state().scheduled, undefined);
    await disposePrewarm(scheduler);
  });

  test('new document versions do not join stale work', async () => {
    const { scheduler, events } = fixture();
    const task = pending();
    const first = requestForeground(scheduler, input('/one.cpp', 1), controller().signal, task.work);
    await task.started();
    const second = requestForeground(scheduler, input('/one.cpp', 2), controller().signal, async () => ready);
    assert.equal(await second, ready);
    await task.release();
    await first;
    assert.equal(events().filter((event) => event.event === 'start').length, 2);
    await disposePrewarm(scheduler);
  });

  test('failure and cancellation release tracked work; clear leaves scheduler usable', async () => {
    const { scheduler, state } = fixture();
    await assert.rejects(requestForeground(scheduler, input(), controller().signal, async () => { throw new Error('failed'); }), /failed/);
    const task = pending();
    const cancel = controller();
    const foreground = requestForeground(scheduler, input(), cancel.signal, task.work);
    await task.started();
    cancel.abort();
    await assert.rejects(foreground);
    await cancelAllTasks(scheduler);
    assert.equal(state().tasks.length, 0);
    assert.equal(await requestForeground(scheduler, input(), controller().signal, async () => ready), ready);
    await disposePrewarm(scheduler);
  });

  test('disposal drains active children and refuses future work', async () => {
    const { scheduler, state } = fixture();
    const task = pending();
    schedulePrewarm(scheduler, input(), 0, task.work);
    await task.started();
    await disposePrewarm(scheduler);
    assert.equal(state().tasks.length, 0);
    assert.equal(state().closed, true);
    await assert.rejects(requestForeground(scheduler, input(), controller().signal, task.work), /cancelled/);
    schedulePrewarm(scheduler, input(), 0, task.work);
    assert.equal(state().scheduled, undefined);
  });
});
