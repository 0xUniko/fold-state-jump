import { Ref, Effect, Semaphore } from 'effect';
import type { AstExtractionResult } from './ast-cache';
import { availableParallelism, freemem, loadavg, setPriority } from 'node:os';

type TaskInput = { readonly key: string; readonly source: string; readonly reason: string };
type TaskBase = TaskInput & {
  readonly id: number;
  readonly controller: AbortController;
  readonly promise: Promise<AstExtractionResult>;
  readonly nativePid?: number;
};
type BackgroundTask = TaskBase & { readonly _tag: 'Background'; readonly deadline: ReturnType<typeof setTimeout> };
type ForegroundTask = TaskBase & { readonly _tag: 'Foreground'; readonly waiters: number };
type RunningTask = BackgroundTask | ForegroundTask;
type ScheduledTask = TaskInput & { readonly timer: ReturnType<typeof setTimeout> };
type SchedulerState = {
  readonly closed: boolean;
  readonly maintenance: number;
  readonly nextId: number;
  readonly scheduled?: ScheduledTask;
  readonly tasks: readonly RunningTask[];
  readonly cancellations: number;
};
export type PrewarmScheduler = {
  readonly state: Ref.Ref<SchedulerState>;
  readonly report: (event: Readonly<Record<string, unknown>>) => void;
  readonly maintenance: Semaphore.Semaphore;
};
type Work = (signal: AbortSignal) => Promise<AstExtractionResult>;
export const makePrewarmScheduler = (report: PrewarmScheduler['report']): PrewarmScheduler => ({
  state: Ref.makeUnsafe<SchedulerState>({ closed: false, maintenance: 0, nextId: 1, tasks: [], cancellations: 0 }),
  report, maintenance: Semaphore.makeUnsafe(1)
});
const stateOf = (scheduler: PrewarmScheduler) => Effect.runSync(Ref.get(scheduler.state));
const change = (scheduler: PrewarmScheduler, step: (state: SchedulerState) => SchedulerState) =>
  Effect.runSync(Ref.update(scheduler.state, step));

export const backgroundAdmission = (freeBytes = freemem(), load = loadavg()[0], cpus = availableParallelism()):
  'ready' | 'memory-pressure' | 'cpu-pressure' =>
  freeBytes < 2 * 1024 ** 3 ? 'memory-pressure' : load > cpus * 0.8 ? 'cpu-pressure' : 'ready';

const applyNativePriority = (scheduler: PrewarmScheduler, task: RunningTask): void => {
  if (task.nativePid === undefined) return;
  const priority = task._tag === 'Background' ? 10 : 0;
  try {
    setPriority(task.nativePid, priority);
    scheduler.report({ event: 'native-priority', id: task.id, pid: task.nativePid, priority });
  } catch (error) {
    // Raising a previously niced child usually needs CAP_SYS_NICE. Preserve
    // ongoing parsing on promotion and expose the failed adjustment explicitly.
    scheduler.report({ event: 'native-priority-unavailable', id: task.id, pid: task.nativePid, priority, error: String(error) });
  }
};

export const trackNativeProcess = (scheduler: PrewarmScheduler, signal: AbortSignal, pid: number | undefined): void => {
  change(scheduler, (state) => ({ ...state, tasks: state.tasks.map((task) =>
    task.controller.signal === signal ? { ...task, nativePid: pid } : task) }));
  const task = stateOf(scheduler).tasks.find((task) => task.controller.signal === signal);
  if (task && pid !== undefined) applyNativePriority(scheduler, task);
};

const cancelTask = (scheduler: PrewarmScheduler, task: RunningTask, reason: string): void => {
  if (task.controller.signal.aborted) return;
  scheduler.report({ event: 'cancel', id: task.id, source: task.source, reason });
  change(scheduler, (state) => ({ ...state, cancellations: state.cancellations + 1 }));
  task.controller.abort();
};

export const cancelPrewarm = (scheduler: PrewarmScheduler, reason: string): void => {
  const state = stateOf(scheduler);
  if (state.scheduled) clearTimeout(state.scheduled.timer);
  change(scheduler, (state) => ({ ...state, scheduled: undefined }));
  state.tasks.filter((task): task is BackgroundTask => task._tag === 'Background')
    .map((task) => cancelTask(scheduler, task, reason));
};

export const cancelSourceTasks = (scheduler: PrewarmScheduler, sources: readonly string[]): void => {
  const state = stateOf(scheduler);
  if (state.scheduled && sources.includes(state.scheduled.source)) {
    clearTimeout(state.scheduled.timer);
    change(scheduler, (state) => ({ ...state, scheduled: undefined }));
  }
  state.tasks.filter((task) => sources.includes(task.source)).map((task) => cancelTask(scheduler, task, 'dependency-changed'));
};

const finishTask = (scheduler: PrewarmScheduler, id: number): void => {
  const task = stateOf(scheduler).tasks.find((task) => task.id === id);
  if (task?._tag === 'Background') clearTimeout(task.deadline);
  change(scheduler, (state) => ({ ...state, tasks: state.tasks.filter((task) => task.id !== id) }));
};

const startTask = (scheduler: PrewarmScheduler, input: TaskInput, work: Work, priority: 'background' | 'foreground'): RunningTask => {
  const id = stateOf(scheduler).nextId;
  const controller = new AbortController();
  const startedAt = performance.now();
  const promise = Promise.resolve().then(() => work(controller.signal)).then((result) => {
    scheduler.report({ event: 'complete', id, source: input.source, ms: performance.now() - startedAt, result: result._tag });
    return result;
  }, (error) => {
    scheduler.report({ event: controller.signal.aborted ? 'cancelled' : 'failed', id, source: input.source, error: String(error) });
    throw error;
  }).finally(() => finishTask(scheduler, id));
  const base = { ...input, id, controller, promise };
  const task: RunningTask = priority === 'background'
    ? { ...base, _tag: 'Background', deadline: setTimeout(() => {
        const task = stateOf(scheduler).tasks.find((task) => task.id === id);
        if (task) cancelTask(scheduler, task, 'deadline');
      }, 120000) }
    : { ...base, _tag: 'Foreground', waiters: 0 };
  change(scheduler, (state) => ({ ...state, nextId: id + 1, tasks: [...state.tasks, task] }));
  scheduler.report({ event: 'start', id, priority, ...input });
  // A background task has no caller awaiting it until a foreground joins.
  // Observe failures here as well as in requestForeground's per-caller promise.
  void promise.catch(() => undefined);
  return task;
};
const baseTask = (scheduler: PrewarmScheduler, id: number): RunningTask => {
  const task = stateOf(scheduler).tasks.find((task) => task.id === id);
  if (!task) throw new Error('Expired task deadline');
  return task;
};

export const schedulePrewarm = (scheduler: PrewarmScheduler, input: TaskInput, delayMs: number, work: Work): void => {
  if (stateOf(scheduler).closed || stateOf(scheduler).maintenance > 0) return;
  const same = stateOf(scheduler).tasks.find((task) => task.key === input.key && !task.controller.signal.aborted);
  if (same) {
    const scheduled = stateOf(scheduler).scheduled;
    if (scheduled) clearTimeout(scheduled.timer);
    change(scheduler, (state) => ({ ...state, scheduled: undefined }));
    return;
  }
  cancelPrewarm(scheduler, 'active-input-changed');
  const timer = setTimeout(() => {
    if (stateOf(scheduler).scheduled?.timer !== timer) return;
    change(scheduler, (state) => ({ ...state, scheduled: undefined }));
    const state = stateOf(scheduler);
    if (state.closed || state.maintenance > 0 || state.tasks.some((task) => task._tag === 'Foreground')) return;
    startTask(scheduler, input, work, 'background');
  }, Math.max(0, delayMs));
  change(scheduler, (state) => ({ ...state, scheduled: { ...input, timer } }));
  scheduler.report({ event: 'scheduled', ...input, delayMs });
};

export const requestForeground = async (
  scheduler: PrewarmScheduler, input: TaskInput, signal: AbortSignal, work: Work
): Promise<AstExtractionResult> => {
  if (stateOf(scheduler).closed || signal.aborted) throw new Error('Analysis cancelled');
  if (stateOf(scheduler).maintenance > 0) throw new Error('Cache clearing is in progress. Run the command again when it completes.');
  const same = stateOf(scheduler).tasks.find((task) => task.key === input.key && !task.controller.signal.aborted);
  // Promote before cancelling other background work, so the shared native
  // process survives an editor switch and keeps independent foreground waiters.
  if (same?._tag === 'Background') {
    clearTimeout(same.deadline);
    const { deadline: _deadline, ...base } = same;
    change(scheduler, (state) => ({ ...state, tasks: state.tasks.map((task) => task.id === same.id
      ? { ...base, _tag: 'Foreground', waiters: 0 } : task) }));
    applyNativePriority(scheduler, baseTask(scheduler, same.id));
  }
  cancelPrewarm(scheduler, 'foreground-priority');
  const task = same ? baseTask(scheduler, same.id) : startTask(scheduler, input, work, 'foreground');
  change(scheduler, (state) => ({ ...state, tasks: state.tasks.map((current) => current.id === task.id && current._tag === 'Foreground'
    ? { ...current, waiters: current.waiters + 1 } : current) }));
  scheduler.report({ event: same ? 'join' : 'foreground', id: task.id, source: input.source });
  try {
    return await Effect.runPromise(Effect.tryPromise({
      try: () => task.promise,
      catch: (error) => new Error(String(error))
    }), { signal });
  } finally {
    change(scheduler, (state) => ({ ...state, tasks: state.tasks.map((current) => current.id === task.id && current._tag === 'Foreground'
      ? { ...current, waiters: current.waiters - 1 } : current) }));
    const current = stateOf(scheduler).tasks.find((current) => current.id === task.id);
    if (current?._tag === 'Foreground' && current.waiters === 0) cancelTask(scheduler, current, 'no-waiters');
  }
};

export const cancelAllTasks = (scheduler: PrewarmScheduler): Promise<void> => {
  cancelPrewarm(scheduler, 'dispose');
  const tasks = stateOf(scheduler).tasks;
  tasks.map((task) => cancelTask(scheduler, task, 'dispose'));
  return Promise.allSettled(tasks.map((task) => task.promise)).then(() => undefined);
};

// Admission closes synchronously, before any await. Concurrent clears queue
// behind one permit and keep admission closed until the last clear finishes.
export const withSchedulerMaintenance = <A>(scheduler: PrewarmScheduler, action: () => Promise<A>): Promise<A> => {
  change(scheduler, (state) => ({ ...state, maintenance: state.maintenance + 1 }));
  cancelPrewarm(scheduler, 'cache-clear');
  return Effect.runPromise(scheduler.maintenance.withPermit(Effect.tryPromise({
    try: async () => {
      await cancelAllTasks(scheduler);
      return await action();
    }, catch: (error) => new Error(String(error))
  }))).finally(() => change(scheduler, (state) => ({ ...state, maintenance: state.maintenance - 1 })));
};

export const disposePrewarm = (scheduler: PrewarmScheduler): Promise<void> => {
  change(scheduler, (state) => ({ ...state, closed: true }));
  return cancelAllTasks(scheduler);
};
