// Standalone Node service benchmark; consumes a real saved native AST/proof.
// Bundle with Bun, then run bench or read in separate top-level Node processes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { prepareAst, type ClangNode } from '../src/analysis';
import { makeAstCache, loadPreparedAst, invalidateAstCache } from '../src/ast-cache';
import { makeDiskCache, readDiskAst, writeDiskAst, diskCacheStats } from '../src/disk-cache';
import { prepareCacheLocation } from '../src/cache-location';
import { buildIdentity, decodeNativeDependencies, verifyDependencies, validateDependencies, sha256 } from '../src/dependencies';
import { emptyCompileDatabaseCache, resolveCompileCommandCached } from '../src/services';
import { makePrewarmScheduler, requestForeground, disposePrewarm } from '../src/prewarm';

const [mode, sourceArgument, manifestPath, astPath, workspaceArgument, repetitionsArgument = '51'] = process.argv.slice(2);
assert.ok(mode === 'bench' || mode === 'read');
const source = path.resolve(sourceArgument);
const roots = [path.resolve(workspaceArgument)];
const executable = path.resolve('native/build/fold-state-jump-ast');
const maxAstBytes = 67108864;
const configuration = { roots, config: '', maxAstBytes };
const repetitions = Number(repetitionsArgument);
const compileCache = Ref.makeUnsafe(emptyCompileDatabaseCache);
const resolveInput = Effect.gen(function* () {
  const resolved = yield* resolveCompileCommandCached(source, roots, 'clang++', yield* Ref.get(compileCache));
  yield* Ref.set(compileCache, resolved.cache);
  return resolved.command;
});
const identify = async () => buildIdentity(source, await Effect.runPromise(resolveInput), executable, configuration);
const locationInput = { source, workspaceRoots: roots, globalStorage: '/tmp/fsj-v2-benchmark-fallback' };
const requestStartedAt = performance.now();
const requestCpu = process.cpuUsage();
const location = await prepareCacheLocation(locationInput);
assert.notEqual(location._tag, 'UnavailableCache');
if (location._tag === 'UnavailableCache') throw new Error(location.reason);
const disk = makeDiskCache(location.astDirectory);
const identity = await identify();
const environment = { date: new Date().toISOString(), node: process.version, bunBundle: 'bun build --target=node --format=esm',
  platform: process.platform, kernel: os.release(), cpu: os.cpus()[0].model, logicalCpus: os.cpus().length,
  totalMemory: os.totalmem(), argv: process.argv,
  limitations: 'Warm OS page cache; uncontrolled frequency, thermals, GC and external applications. Service code without VS Code host. RSS is a snapshot, not peak. read excludes Node startup/imports. Native AST/proof generated separately; no Clang is launched by this script.' };

if (mode === 'read') {
  const loaded = await Effect.runPromise(readDiskAst(disk, identity));
  assert.ok(loaded);
  assert.equal(await identify(), identity);
  console.log(JSON.stringify({ environment, mode, location, nativeStarts: 0, ms: performance.now() - requestStartedAt,
    cpuMicros: process.cpuUsage(requestCpu), checksum: sha256(loaded.astText), host: process.memoryUsage() }));
} else {
  assert.ok(Number.isSafeInteger(repetitions) && repetitions >= 20);
  const astText = await readFile(astPath, 'utf8');
  const native = decodeNativeDependencies(JSON.parse(await readFile(manifestPath, 'utf8')));
  const dependencies = await Effect.runPromise(verifyDependencies(native));
  assert.ok(dependencies?.reusable);
  const extracted = { prepared: prepareAst(JSON.parse(astText) as ClangNode), astText,
    astBytes: Buffer.byteLength(astText), dependencies, cacheable: true };
  const writeStart = performance.now();
  assert.equal(await Effect.runPromise(writeDiskAst(disk, identity, extracted, new AbortController().signal)), true);
  const writeMs = performance.now() - writeStart;
  const memory = makeAstCache();
  const scheduler = makePrewarmScheduler(() => {});
  const load = async (cache = memory) => requestForeground(scheduler,
    { source, key: identity, reason: 'benchmark' }, new AbortController().signal,
    (signal) => Effect.runPromise(Effect.gen(function* () {
      const beforeIdentity = yield* Effect.promise(identify);
      const result = yield* loadPreparedAst(cache, { source, documentVersion: 1, buildIdentity: beforeIdentity },
        Effect.fail(new Error('Unexpected native extraction')), validateDependencies,
        Effect.gen(function* () {
          const currentLocation = yield* Effect.promise(() => prepareCacheLocation(locationInput));
          assert.notEqual(currentLocation._tag, 'UnavailableCache');
          if (currentLocation._tag === 'UnavailableCache') throw new Error(currentLocation.reason);
          assert.equal(currentLocation.astDirectory, disk.directory);
          return yield* readDiskAst(disk, beforeIdentity);
        }));
      assert.equal(yield* Effect.promise(identify), beforeIdentity);
      assert.equal(result._tag, 'ExtractionReady');
      return result;
    }), { signal }));
  const samples = async (action: () => Promise<unknown>, n: number) => Array.from({ length: n })
    .reduce<Promise<readonly { ms: number; cpuMicros: NodeJS.CpuUsage }[]>>(async (pending) => {
      const previous = await pending;
      const cpu = process.cpuUsage();
      const start = performance.now();
      await action();
      return [...previous, { ms: performance.now() - start, cpuMicros: process.cpuUsage(cpu) }];
    }, Promise.resolve([]));
  await load(); // Explicit unrecorded disk warmup; subsequent memory must hit RAM.
  const memorySamples = await samples(async () => {
    const loaded = await load();
    assert.equal(loaded._tag === 'ExtractionReady' && loaded.hit, 'memory');
  }, repetitions);
  await Effect.runPromise(invalidateAstCache(memory, path.join(roots[0], 'unrelated.cpp')));
  const unrelated = await load();
  assert.equal(unrelated._tag === 'ExtractionReady' && unrelated.hit, 'memory');
  const diskSamples = await samples(() => load(makeAstCache()), 15);
  const restored = await Effect.runPromise(readDiskAst(disk, identity));
  assert.equal(restored?.astText, astText);
  const percentile = (values: readonly number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
  const summarize = (samples: readonly { ms: number }[]) => ({ n: samples.length,
    p50Ms: percentile(samples.map((sample) => sample.ms), .5), p95Ms: percentile(samples.map((sample) => sample.ms), .95) });
  await disposePrewarm(scheduler);
  console.log(JSON.stringify({ environment, mode, source, location, nativeStarts: 0, identity, checksum: sha256(astText),
    astBytes: extracted.astBytes, proofBytes: Buffer.byteLength(JSON.stringify(dependencies)), guards: dependencies.guards.length,
    memory: { ...summarize(memorySamples), samples: memorySamples }, disk: { ...summarize(diskSamples), samples: diskSamples },
    writeMs, storage: await Effect.runPromise(diskCacheStats(disk)), unrelatedPreservesMemory: true, host: process.memoryUsage() }, null, 2));
}
