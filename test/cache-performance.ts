// Opt-in service benchmark. No VS Code UI is simulated by these timings.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readDiskAst, writeDiskAst, makeDiskCache, diskCacheStats } from '../src/disk-cache';
import { Effect } from 'effect';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { buildIdentity, validateDependencies } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { loadPreparedAst, makeAstCache, invalidateAstCache } from '../src/ast-cache';
import { resolveCompileCommand } from '../src/services';

const source = path.resolve(process.argv[2] ?? 'test/fixtures/native-paths.cpp');
const repetitions = Number(process.argv[3] ?? 15);
const executable = path.resolve('native/build/fold-state-jump-ast');
const cache = makeAstCache();
const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
const request = { source, documentVersion: 1, buildIdentity: await buildIdentity(source, command, executable, {}) };
const start = performance.now();
const extracted = await Effect.runPromise(extractVerifiedAst(source, command, executable, 67108864, AbortSignal.timeout(180000)));
const coldMs = performance.now() - start;
assert.equal(extracted.cacheable, true);
await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed(extracted), validateDependencies));
const samples = await Array.from({ length: repetitions }).reduce<Promise<{ readonly ms: number; readonly cpuMicros: NodeJS.CpuUsage }[]>>(async (samples) => {
  const previous = await samples;
  const start = performance.now();
  const cpuStart = process.cpuUsage();
  const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
  const identity = await buildIdentity(source, command, executable, {});
  const result = await Effect.runPromise(loadPreparedAst(cache, { ...request, buildIdentity: identity }, Effect.fail(new Error('Unexpected extraction')), validateDependencies));
  assert.equal(result._tag, 'ExtractionReady');
  assert.equal(await buildIdentity(source, command, executable, {}), identity);
  return [...previous, { ms: performance.now() - start, cpuMicros: process.cpuUsage(cpuStart) }];
}, Promise.resolve([]));
await Effect.runPromise(invalidateAstCache(cache, '/unrelated.cpp'));
assert.equal((await Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('unrelated edit')), validateDependencies)))._tag, 'ExtractionReady');
const directory = await mkdtemp(path.join(tmpdir(), 'fsj-cache-bench-'));
const disk = makeDiskCache(directory);
const diskStart = performance.now();
assert.equal(await Effect.runPromise(writeDiskAst(disk, request.buildIdentity, extracted, new AbortController().signal)), true);
const writeMs = performance.now() - diskStart;
const diskSamples = await Array.from({ length: repetitions }).reduce<Promise<{ readonly ms: number; readonly cpuMicros: NodeJS.CpuUsage }[]>>(async (samples) => {
  const previous = await samples;
  const start = performance.now();
  const cpuStart = process.cpuUsage();
  const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
  const identity = await buildIdentity(source, command, executable, {});
  const diskLoaded = await Effect.runPromise(loadPreparedAst(makeAstCache(), { ...request, buildIdentity: identity },
    Effect.gen(function* () {
      const loaded = yield* readDiskAst(makeDiskCache(directory), identity);
      if (!loaded) return yield* Effect.fail(new Error('Disk cache miss'));
      return loaded;
    }), validateDependencies));
  assert.equal(diskLoaded._tag, 'ExtractionReady');
  assert.equal(await buildIdentity(source, command, executable, {}), identity);
  const ms = performance.now() - start;
  const cpuMicros = process.cpuUsage(cpuStart);
  if (diskLoaded._tag === 'ExtractionReady') assert.deepEqual(diskLoaded.prepared.ast, extracted.prepared.ast);
  return [...previous, { ms, cpuMicros }];
}, Promise.resolve([]));
const stats = await Effect.runPromise(diskCacheStats(disk));
await rm(directory, { recursive: true, force: true });
const gzipStart = performance.now();
const gzip = gzipSync(extracted.astText);
const gzipMs = performance.now() - gzipStart;
const gunzipStart = performance.now();
assert.equal(gunzipSync(gzip).toString('utf8'), extracted.astText);
const gunzipMs = performance.now() - gunzipStart;
const percentile = (samples: readonly number[], fraction: number) => {
  const sorted = samples.reduce<number[]>((sorted, value) => { sorted.push(value); return sorted.sort((a, b) => a - b); }, []);
  return sorted[Math.ceil(sorted.length * fraction) - 1];
};
console.log(JSON.stringify({ source, repetitions, coldMs, dependencies: extracted.dependencies.paths.length,
  manifestBytes: Buffer.byteLength(JSON.stringify(extracted.dependencies)), memoryMs: samples.map((sample) => sample.ms), memoryCpuMicros: samples.map((sample) => sample.cpuMicros),
  memoryP50: percentile(samples.map((sample) => sample.ms), .5), memoryP95: percentile(samples.map((sample) => sample.ms), .95), diskMs: diskSamples.map((sample) => sample.ms), diskCpuMicros: diskSamples.map((sample) => sample.cpuMicros),
  diskP50: percentile(diskSamples.map((sample) => sample.ms), .5), diskP95: percentile(diskSamples.map((sample) => sample.ms), .95), writeMs, disk: stats,
  gzip: { bytes: gzip.length, compressMs: gzipMs, decompressMs: gunzipMs }, host: process.memoryUsage() }, null, 2));
