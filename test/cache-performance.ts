// Opt-in service benchmark. No VS Code UI is simulated by these timings.
import assert from 'node:assert/strict';
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
const samples = await Array.from({ length: repetitions }).reduce<Promise<number[]>>(async (samples) => {
  const previous = await samples;
  const start = performance.now();
  const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
  const identity = await buildIdentity(source, command, executable, {});
  const result = await Effect.runPromise(loadPreparedAst(cache, { ...request, buildIdentity: identity }, Effect.fail(new Error('Unexpected extraction')), validateDependencies));
  assert.equal(result._tag, 'ExtractionReady');
  return [...previous, performance.now() - start];
}, Promise.resolve([]));
await Effect.runPromise(invalidateAstCache(cache, '/unrelated.cpp'));
assert.equal((await Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('unrelated edit')), validateDependencies)))._tag, 'ExtractionReady');
const sorted = samples.reduce<number[]>((sorted, value) => { sorted.push(value); return sorted.sort((a, b) => a - b); }, []);
console.log(JSON.stringify({ source, repetitions, coldMs, dependencies: extracted.dependencies.paths.length,
  manifestBytes: Buffer.byteLength(JSON.stringify(extracted.dependencies)), memoryMs: samples,
  p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1],
  host: process.memoryUsage() }, null, 2));
