// Service/process integration only. Run via the Node bundle command recorded in output.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { availableParallelism, cpus, getPriority, platform, release, totalmem, tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Deferred, Effect, Ref } from 'effect';
import { prepareAst, type ClangNode } from '../src/analysis';
import { loadPreparedAst, makeAstCache, type AstExtractionResult } from '../src/ast-cache';
import { fingerprintFile, validateDependencies, verifyDependencies } from '../src/dependencies';
import { clearDiskCache, diskCacheStats, makeDiskCache, readDiskAst, writeDiskAst } from '../src/disk-cache';
import { disposePrewarm, makePrewarmScheduler, requestForeground, schedulePrewarm, trackNativeProcess, withSchedulerMaintenance } from '../src/prewarm';
import { runClangAst } from '../src/services';

type Event = Readonly<Record<string, unknown>>;
const ast = { kind: 'TranslationUnitDecl', inner: [] } satisfies ClangNode;
const astText = JSON.stringify(ast);
const ready: AstExtractionResult = { _tag: 'ExtractionReady', prepared: prepareAst(ast), hit: 'load' };
const execute = promisify(execFile);
const state = <A>(reference: Ref.Ref<A>) => Effect.runSync(Ref.get(reference));
const succeed = <A>(deferred: Deferred.Deferred<A>, value: A) => Effect.runSync(Deferred.succeed(deferred, value));
const awaiting = <A>(deferred: Deferred.Deferred<A>) => Effect.runPromise(Deferred.await(deferred));
const noNative = Effect.fail(new Error('Unexpected native extraction'));
const alive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; }
  catch { return false; }
};
const timed = async <A>(action: () => Promise<A>) => {
  const start = performance.now();
  const cpu = process.cpuUsage();
  const result = await action();
  return { result, ms: performance.now() - start, cpuMicros: process.cpuUsage(cpu) };
};
const fixture = async <A>(action: (directory: string) => Promise<A>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-cache-v2-lifecycle-'));
  try { return await action(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
};
const extracted = async (source: string) => ({
  astText, astBytes: Buffer.byteLength(astText), prepared: prepareAst(ast), cacheable: true,
  dependencies: (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [],
    paths: [{ path: source, ...await fingerprintFile(source) }] })))!
});
const native = (directory: string, signal: AbortSignal, report: (event: Event) => void, delayMs = 10000) =>
  runClangAst({ compiler: '/usr/bin/python3', cwd: directory,
    args: ['-c', 'import sys,time; time.sleep(' + delayMs / 1000 + '); sys.stdout.write(' + JSON.stringify(astText) + ')'] }, 1024 * 1024, signal, report)
    .pipe(Effect.map((astText) => ({ astText, astBytes: Buffer.byteLength(astText), prepared: prepareAst(ast), cacheable: false })),
      Effect.mapError((error) => new Error(error.message)));

const diskBypass = () => fixture(async (directory) => {
  const source = path.join(directory, 'b.cpp');
  await writeFile(source, 'int b() {}');
  const disk = makeDiskCache(path.join(directory, 'ast'));
  assert.equal(await Effect.runPromise(writeDiskAst(disk, 'b', await extracted(source), new AbortController().signal)), true);
  const cache = makeAstCache();
  const pid = Deferred.makeUnsafe<number>();
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const controller = new AbortController();
  const a = Effect.runPromise(loadPreparedAst(cache, { source: path.join(directory, 'a.cpp'), documentVersion: 1 },
    native(directory, controller.signal, (event) => {
      Effect.runSync(Ref.update(events, (events) => [...events, event]));
      if (event.event === 'native-start') succeed(pid, Number(event.pid));
    })), { signal: controller.signal });
  void a.catch(() => undefined);
  const nativePid = await awaiting(pid);
  try {
    const restored = await timed(() => Effect.runPromise(loadPreparedAst(cache,
      { source, documentVersion: 1, buildIdentity: 'b' }, noNative, validateDependencies, readDiskAst(disk, 'b'))));
    assert.equal(restored.result._tag, 'ExtractionReady');
    assert.equal(alive(nativePid), true);
    assert.equal(state(events).some((event) => event.event === 'native-exit'), false);
    controller.abort();
    const cancelled = await timed(() => assert.rejects(a));
    assert.equal(alive(nativePid), false);
    return { restoreMs: restored.ms, restoreCpuMicros: restored.cpuMicros, cancellationReapMs: cancelled.ms,
      bCompletedWhileAAlive: true, nativePid, events: state(events) };
  } finally { controller.abort(); await a.catch(() => undefined); }
});

const singleFlight = () => fixture(async (directory) => {
  const source = path.join(directory, 'main.cpp');
  await writeFile(source, 'int main() {}');
  const disk = makeDiskCache(path.join(directory, 'ast'));
  assert.equal(await Effect.runPromise(writeDiskAst(disk, 'single', await extracted(source), new AbortController().signal)), true);
  const cache = makeAstCache();
  const restores = Ref.makeUnsafe(0);
  const restore = Effect.gen(function* () {
    yield* Ref.update(restores, (restores) => restores + 1);
    yield* Effect.sleep(20);
    return yield* readDiskAst(disk, 'single');
  });
  const measured = await timed(() => Promise.all(Array.from({ length: 12 }, () => Effect.runPromise(loadPreparedAst(cache,
    { source, documentVersion: 1, buildIdentity: 'single' }, noNative, validateDependencies, restore)))));
  assert.ok(measured.result.every((result) => result._tag === 'ExtractionReady'));
  assert.equal(state(restores), 1);
  assert.equal(state(cache.loads).size, 0);
  return { callers: 12, restores: state(restores), ms: measured.ms, cpuMicros: measured.cpuMicros };
});

const promotion = () => fixture(async (directory) => {
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const scheduler = makePrewarmScheduler((event) => Effect.runSync(Ref.update(events, (events) => [...events, event])));
  const pid = Deferred.makeUnsafe<number>();
  const input = { source: path.join(directory, 'main.cpp'), key: 'same-version', reason: 'integration' };
  const work = (signal: AbortSignal) => Effect.runPromise(native(directory, signal, (event) => {
    Effect.runSync(Ref.update(events, (events) => [...events, event]));
    if (event.event === 'native-start') {
      trackNativeProcess(scheduler, signal, Number(event.pid));
      succeed(pid, Number(event.pid));
    }
  }, 300).pipe(Effect.map(() => ready)), { signal });
  try {
    schedulePrewarm(scheduler, input, 0, work);
    const nativePid = await awaiting(pid);
    const backgroundNice = getPriority(nativePid);
    assert.equal(backgroundNice, 10);
    const firstController = new AbortController();
    const first = requestForeground(scheduler, input, firstController.signal, () => Promise.reject(new Error('duplicate')));
    void first.catch(() => undefined);
    const second = requestForeground(scheduler, input, new AbortController().signal, () => Promise.reject(new Error('duplicate')));
    const promotedNice = getPriority(nativePid);
    firstController.abort();
    await assert.rejects(first);
    assert.equal(alive(nativePid), true);
    assert.equal(await second, ready);
    assert.equal(alive(nativePid), false);
    assert.equal(state(events).filter((event) => event.event === 'native-start').length, 1);
    assert.equal(state(scheduler.state).tasks.length, 0);
    return { backgroundNice, promotedNice, oneWaiterCancelledProcessSurvived: true, nativePid, events: state(events) };
  } finally { await disposePrewarm(scheduler); }
});

const maintenance = () => fixture(async (directory) => {
  const source = path.join(directory, 'main.cpp');
  await writeFile(source, 'int main() {}');
  const disk = makeDiskCache(path.join(directory, 'ast'));
  const extraction = await extracted(source);
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const scheduler = makePrewarmScheduler((event) => Effect.runSync(Ref.update(events, (events) => [...events, event])));
  const nativePid = Deferred.makeUnsafe<number>();
  const work = (signal: AbortSignal) => Effect.runPromise(native(directory, signal, (event) => {
    Effect.runSync(Ref.update(events, (events) => [...events, event]));
    if (event.event === 'native-start') { trackNativeProcess(scheduler, signal, Number(event.pid)); succeed(nativePid, Number(event.pid)); }
  }).pipe(Effect.map(() => ready)), { signal });
  const acquiredWrite = Deferred.makeUnsafe<void>();
  const releaseWrite = Deferred.makeUnsafe<void>();
  const inClear = Deferred.makeUnsafe<void>();
  const clearFinished = Ref.makeUnsafe(false);
  const unexpected = Ref.makeUnsafe(0);
  const input = { source, key: 'maintenance-child', reason: 'integration' };
  const hold = Effect.runPromise(disk.writes.withPermit(Effect.gen(function* () {
    yield* Deferred.succeed(acquiredWrite, undefined);
    yield* Deferred.await(releaseWrite);
  })));
  try {
    await awaiting(acquiredWrite);
    schedulePrewarm(scheduler, input, 0, work);
    const pid = await awaiting(nativePid);
    const writing = Effect.runPromise(writeDiskAst(disk, 'queued-write', extraction, new AbortController().signal));
    const start = performance.now();
    const clearing = withSchedulerMaintenance(scheduler, async () => {
      assert.equal(alive(pid), false);
      succeed(inClear, undefined);
      await Effect.runPromise(clearDiskCache(disk));
      Effect.runSync(Ref.set(clearFinished, true));
    });
    const unexpectedWork = async () => { Effect.runSync(Ref.update(unexpected, (unexpected) => unexpected + 1)); return ready; };
    schedulePrewarm(scheduler, { ...input, key: 'refused-background' }, 0, unexpectedWork);
    await assert.rejects(requestForeground(scheduler, { ...input, key: 'refused-foreground' }, new AbortController().signal, unexpectedWork), /clearing/);
    await awaiting(inClear);
    assert.equal(state(clearFinished), false);
    assert.equal(state(scheduler.state).scheduled, undefined);
    assert.equal(state(unexpected), 0);
    succeed(releaseWrite, undefined);
    assert.equal(await writing, true);
    await clearing;
    assert.deepEqual(await Effect.runPromise(diskCacheStats(disk)), { entries: 0, bytes: 0 });
    assert.equal(state(scheduler.state).maintenance, 0);
    assert.equal(await requestForeground(scheduler, { ...input, key: 'after-clear' }, new AbortController().signal, async () => ready), ready);
    assert.equal(await Effect.runPromise(writeDiskAst(disk, 'after-clear', extraction, new AbortController().signal)), true);
    assert.ok(await Effect.runPromise(readDiskAst(disk, 'after-clear')));
    return { clearMs: performance.now() - start, admissionRejected: true, writeDrainedBeforeClear: true,
      childReapedBeforeClear: true, usableAfterClear: true, events: state(events) };
  } finally { succeed(releaseWrite, undefined); await hold; await disposePrewarm(scheduler); }
});

const percentiles = (samples: readonly number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  return { p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
};

if (process.argv[2] === '--restore-child') {
  const restored = await Effect.runPromise(readDiskAst(makeDiskCache(process.argv[3]!), process.argv[4]!));
  assert.ok(restored);
  console.log(JSON.stringify({ pid: process.pid, astText: restored.astText }));
} else if (process.argv[2] === '--seed-cross') {
  const directory = path.resolve(process.argv[3]!);
  await mkdir(directory, { recursive: true });
  const source = path.join(directory, 'main.cpp');
  await writeFile(source, 'int main() {}');
  assert.equal(await Effect.runPromise(writeDiskAst(makeDiskCache(path.join(directory, 'ast')), 'cross-process',
    await extracted(source), new AbortController().signal)), true);
  console.log(JSON.stringify({ pid: process.pid, directory, identity: 'cross-process', astText }));
} else {
  const repetitions = Number(process.argv[2] ?? 5);
  assert.ok(Number.isSafeInteger(repetitions) && repetitions > 0 && repetitions <= 50);
  const nodeSpawnProbe = await execute(process.execPath, ['-e', 'process.stdout.write("node-child-probe")'], { encoding: 'utf8' });
  const samples = await Array.from({ length: repetitions }).reduce<Promise<{
    readonly diskBypass: Awaited<ReturnType<typeof diskBypass>>;
    readonly singleFlight: Awaited<ReturnType<typeof singleFlight>>;
    readonly promotion: Awaited<ReturnType<typeof promotion>>;
    readonly maintenance: Awaited<ReturnType<typeof maintenance>>;
  }[]>>(async (samples) => [...await samples, { diskBypass: await diskBypass(), singleFlight: await singleFlight(),
    promotion: await promotion(), maintenance: await maintenance() }], Promise.resolve([]));
  const report = {
    recordedAt: new Date().toISOString(), repetitions,
    commands: ['bun build test/cache-v2-integration.ts --target=node --format=esm --outfile=/tmp/fsj-cache-v2-integration.mjs',
      process.execPath + ' /tmp/fsj-cache-v2-integration.mjs ' + repetitions + ' docs/measurements/cache-v2-lifecycle.json'],
    environment: { node: process.version, execPath: process.execPath, platform: platform(), kernel: release(), arch: process.arch,
      cpus: availableParallelism(), cpuModel: cpus()[0]?.model, totalMemoryBytes: totalmem(), processMemory: process.memoryUsage(),
      processResourceUsage: process.resourceUsage() },
    fixture: { astBytes: Buffer.byteLength(astText), nativeProcess: 'Python child producing valid compact AST; 10s timeout or 300ms completion',
      disk: 'real gzip snapshots with verified source dependency; 12 simultaneous same-version callers' },
    limitations: ['Small fixtures exercise service ordering, I/O and real process lifecycle, not Clang parsing cost.',
      'CPU and RSS belong to the parent Node process unless identified otherwise; fake children do not represent Clang memory.',
      'N=5 P95 is the maximum observed sample and is descriptive, not a tail-latency estimate.',
      'Node-spawned Node returned exit 0 with empty output on this host; the probe records this. Cross-process Node restore uses separate shell invocations outside this script.',
      'No VS Code Extension Host/UI tests. Priority promotion may be denied without CAP_SYS_NICE and is recorded.'],
    nodeSpawnProbe: { ...nodeSpawnProbe, expectedStdout: 'node-child-probe', usable: nodeSpawnProbe.stdout === 'node-child-probe' },
    summary: { diskRestoreWhileNativeAliveMs: percentiles(samples.map((sample) => sample.diskBypass.restoreMs)),
      cancellationReapMs: percentiles(samples.map((sample) => sample.diskBypass.cancellationReapMs)),
      sameVersionSingleFlightMs: percentiles(samples.map((sample) => sample.singleFlight.ms)),
      maintenanceMs: percentiles(samples.map((sample) => sample.maintenance.clearMs)) }, samples
  };
  const output = process.argv[3];
  if (output) { await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); }
  console.log(JSON.stringify(report.summary, null, 2));
}
