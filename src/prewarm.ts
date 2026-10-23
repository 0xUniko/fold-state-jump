import { Ref, Effect } from 'effect';
import type { AstExtractionResult } from './ast-cache';

type TaskInput = { readonly key: string; readonly source: string; readonly reason: string };
type TaskBase = TaskInput & {
  readonly id: number;
  readonly controller: AbortController;
  readonly promise: Promise<AstExtractionResult>;
};
type BackgroundTask = TaskBase & { readonly _tag: 'Background'; readonly deadline: ReturnType<typeof setTimeout> };
type ForegroundTask = TaskBase & { readonly _tag: 'Foreground'; readonly waiters: number };
type RunningTask = BackgroundTask | ForegroundTask;
type ScheduledTask = TaskInput & { readonly timer: ReturnType<typeof setTimeout> };
type SchedulerState = {
  readonly closed: boolean;
  readonly nextId: number;
  readonly scheduled?: ScheduledTask;
  readonly tasks: readonly RunningTask[];
  readonly cancellations: number;
};
export type PrewarmScheduler = {
  readonly state: Ref.Ref<SchedulerState>;
  readonly report: (event: Readonly<Record<string, unknown>>) => void;
};
type Work = (signal: AbortSignal) => Promise<AstExtractionResult>;
export const makePrewarmScheduler = (report: PrewarmScheduler['report']): PrewarmScheduler => ({
  state: Ref.makeUnsafe<SchedulerState>({ closed: false, nextId: 1, tasks: [], cancellations: 0 }), report
});
const stateOf = (scheduler: PrewarmScheduler) => Effect.runSync(Ref.get(scheduler.state));
const change = (scheduler: PrewarmScheduler, step: (state: SchedulerState) => SchedulerState) =>
  Effect.runSync(Ref.update(scheduler.state, step));

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
  if (stateOf(scheduler).closed) return;
  const same = stateOf(scheduler).tasks.find((task) => task.key === input.key && !task.controller.signal.aborted);
  if (same) return;
  cancelPrewarm(scheduler, 'active-input-changed');
  const timer = setTimeout(() => {
    change(scheduler, (state) => ({ ...state, scheduled: undefined }));
    const state = stateOf(scheduler);
    if (state.closed || state.tasks.some((task) => task._tag === 'Foreground')) return;
    startTask(scheduler, input, work, 'background');
  }, Math.max(0, delayMs));
  change(scheduler, (state) => ({ ...state, scheduled: { ...input, timer } }));
  scheduler.report({ event: 'scheduled', ...input, delayMs });
};

export const requestForeground = async (
  scheduler: PrewarmScheduler, input: TaskInput, signal: AbortSignal, work: Work
): Promise<AstExtractionResult> => {
  if (stateOf(scheduler).closed || signal.aborted) throw new Error('Analysis cancelled');
  const same = stateOf(scheduler).tasks.find((task) => task.key === input.key && !task.controller.signal.aborted);
  // Promote before cancelling other background work, so the shared native
  // process survives an editor switch and keeps independent foreground waiters.
  if (same?._tag === 'Background') {
    clearTimeout(same.deadline);
    const { deadline: _deadline, ...base } = same;
    change(scheduler, (state) => ({ ...state, tasks: state.tasks.map((task) => task.id === same.id
      ? { ...base, _tag: 'Foreground', waiters: 0 } : task) }));
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

export const disposePrewarm = (scheduler: PrewarmScheduler): Promise<void> => {
  change(scheduler, (state) => ({ ...state, closed: true }));
  return cancelAllTasks(scheduler);
};
