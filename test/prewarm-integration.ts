// Opt-in lifecycle checks with real native children, without a VS Code host.
import assert from 'node:assert/strict';
import path from 'node:path';
import { Deferred, Effect, Ref } from 'effect';
import { makePrewarmScheduler, schedulePrewarm, requestForeground, disposePrewarm, cancelAllTasks } from '../src/prewarm';
import { makeAstCache, loadPreparedAst } from '../src/ast-cache';
import { buildIdentity, validateDependencies } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { resolveCompileCommand } from '../src/services';

const source = path.resolve(process.argv[2] ?? 'test/fixtures/native-paths.cpp');
const repetitions = Number(process.argv[3] ?? 3);
const executable = path.resolve('native/build/fold-state-jump-ast');
const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
const identity = await buildIdentity(source, command, executable, {});
const events = Ref.makeUnsafe<readonly Readonly<Record<string, unknown>>[]>([]);
const report = (event: Readonly<Record<string, unknown>>) => Effect.runSync(Ref.update(events, (events) => [...events, event]));
const scheduler = makePrewarmScheduler(report);
const cache = makeAstCache();
const task = (version: number) => {
  const started = Deferred.makeUnsafe<void>();
  const input = { source, key: JSON.stringify([source, version, identity]), reason: 'integration' };
  const work = (signal: AbortSignal) => Effect.runPromise(Effect.gen(function* () {
    const beforeCommand = yield* resolveCompileCommand(source, [path.dirname(source)], 'clang++');
    assert.equal(yield* Effect.promise(() => buildIdentity(source, beforeCommand, executable, {})), identity);
    const result = yield* loadPreparedAst(cache, { source, documentVersion: version, buildIdentity: identity },
      extractVerifiedAst(source, command, executable, 67108864, signal, (event) => {
        report(event);
        if (event.event === 'native-start') Effect.runSync(Deferred.succeed(started, undefined));
      }), validateDependencies);
    const afterCommand = yield* resolveCompileCommand(source, [path.dirname(source)], 'clang++');
    assert.equal(yield* Effect.promise(() => buildIdentity(source, afterCommand, executable, {})), identity);
    return result;
  }), { signal });
  return { input, work, started: () => Effect.runPromise(Deferred.await(started)) };
};
try {
  const first = task(1);
  const start = performance.now();
  schedulePrewarm(scheduler, first.input, 0, first.work);
  await first.started();
  await Effect.runSync(Ref.get(scheduler.state)).tasks[0].promise;
  const prewarmMs = performance.now() - start;
  const warmMs = await Array.from({ length: 15 }).reduce<Promise<number[]>>(async (samples) => {
    const previous = await samples;
    const start = performance.now();
    assert.equal((await requestForeground(scheduler, first.input, new AbortController().signal, first.work))._tag, 'ExtractionReady');
    return [...previous, performance.now() - start];
  }, Promise.resolve([]));
  const cancelled = task(2);
  schedulePrewarm(scheduler, cancelled.input, 0, cancelled.work);
  await cancelled.started();
  const priorityStart = performance.now();
  await requestForeground(scheduler, first.input, new AbortController().signal, first.work);
  const priorityMs = performance.now() - priorityStart;
  await cancelAllTasks(scheduler);
  const inFlightMs = await Array.from({ length: repetitions }).reduce<Promise<number[]>>(async (samples, _, index) => {
    const previous = await samples;
    const next = task(10 + index);
    const count = Effect.runSync(Ref.get(events)).filter((event) => event.event === 'native-start').length;
    schedulePrewarm(scheduler, next.input, 0, next.work);
    await next.started();
    const start = performance.now();
    await requestForeground(scheduler, next.input, new AbortController().signal, next.work);
    assert.equal(Effect.runSync(Ref.get(events)).filter((event) => event.event === 'native-start').length - count, 1);
    return [...previous, performance.now() - start];
  }, Promise.resolve([]));
  await disposePrewarm(scheduler);
  const nativePids = Effect.runSync(Ref.get(events)).filter((event) => event.event === 'native-start').map((event) => event.pid as number);
  nativePids.map((pid) => assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }));
  console.log(JSON.stringify({ source, repetitions, prewarmMs, warmMs, priorityMs, inFlightMs,
    nativeStarts: nativePids.length, cancellations: Effect.runSync(Ref.get(scheduler.state)).cancellations,
    remainingTasks: Effect.runSync(Ref.get(scheduler.state)).tasks.length, host: process.memoryUsage(), events: Effect.runSync(Ref.get(events)) }, null, 2));
} finally { await disposePrewarm(scheduler); }
