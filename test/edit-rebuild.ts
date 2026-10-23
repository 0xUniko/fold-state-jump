// Opt-in real-TU edit/age scenario on an isolated source copy. No project edits.
// bun test/edit-rebuild.ts /path/to/pipeline.h [N=3] [--wait]
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { resolveCompileCommand } from '../src/services';
import { buildIdentity, validateDependencies } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { makeAstCache, loadPreparedAst, invalidateAstCache } from '../src/ast-cache';
import { analyzeAst } from '../src/analysis';

const original = path.resolve(process.argv[2]);
const repetitions = Number(process.argv[3] ?? 3);
const directory = await mkdtemp(path.join(tmpdir(), 'fsj-edited-tu-'));
const source = path.join(directory, path.basename(original));
const sourceText = await readFile(original, 'utf8');
const executable = path.resolve('native/build/fold-state-jump-ast');
const originalCommand = await Effect.runPromise(resolveCompileCommand(original, [path.dirname(original)], 'clang++'));
const command = { ...originalCommand, args: [...originalCommand.args.slice(0, -1), source] };
const nativeStarts = Ref.makeUnsafe(0);
const cache = makeAstCache();
const load = async (version: number) => {
  const start = performance.now();
  const identity = await buildIdentity(source, command, executable, {});
  const result = await Effect.runPromise(loadPreparedAst(cache, { source, documentVersion: version, buildIdentity: identity },
    extractVerifiedAst(source, command, executable, 67108864, AbortSignal.timeout(180000), (event) => {
      if (event.event === 'native-start') Effect.runSync(Ref.update(nativeStarts, (count) => count + 1));
    }), validateDependencies));
  const ms = performance.now() - start;
  assert.equal(result._tag, 'ExtractionReady');
  assert.equal(await buildIdentity(source, command, executable, {}), identity);
  return { result, ms };
};
try {
  await writeFile(source, sourceText);
  const first = await load(1);
  const needle = 'return {std::move(session_state), std::move(logits)};';
  const offset = sourceText.indexOf(needle);
  assert.ok(offset >= 0, 'This benchmark targets the real pipeline fixture');
  const cursorByteOffset = Buffer.byteLength(sourceText.slice(0, offset + needle.indexOf('session_state')));
  const target = (result: typeof first.result) => {
    assert.equal(result._tag, 'ExtractionReady');
    if (result._tag !== 'ExtractionReady') throw new Error('Missing prepared result');
    const analysis = analyzeAst(result.prepared.ast, { file: source, sourceText, cursorByteOffset }, result.prepared);
    assert.equal(analysis._tag, 'MutationFound');
    if (analysis._tag !== 'MutationFound') throw new Error('Missing mutation');
    return { file: analysis.mutation.file, range: analysis.mutation.node.range, via: analysis.via, wrapped: analysis.wrapped };
  };
  const expected = target(first.result);
  const unrelated = path.join(directory, 'unrelated.cpp');
  await writeFile(unrelated, 'int unrelated = 1;');
  await Effect.runPromise(invalidateAstCache(cache, unrelated));
  const unrelatedHit = await load(1);
  assert.equal(Effect.runSync(Ref.get(nativeStarts)), 1);
  assert.deepEqual(target(unrelatedHit.result), expected);
  const ageStart = performance.now();
  if (process.argv.includes('--wait')) await new Promise((resolve) => setTimeout(resolve, 61000));
  const actualWaitMs = performance.now() - ageStart;
  const aged = await load(1);
  assert.equal(Effect.runSync(Ref.get(nativeStarts)), 1);
  assert.deepEqual(target(aged.result), expected);
  const rebuildMs = await Array.from({ length: repetitions }).reduce<Promise<number[]>>(async (samples, _, index) => {
    const previous = await samples;
    await writeFile(source, sourceText + '\n// isolated saved edit ' + index + '\n');
    await Effect.runPromise(invalidateAstCache(cache, source));
    const rebuilt = await load(index + 2);
    assert.deepEqual(target(rebuilt.result), expected);
    return [...previous, rebuilt.ms];
  }, Promise.resolve([]));
  console.log(JSON.stringify({ original, isolatedCopy: source, repetitions, initialColdMs: first.ms,
    unrelatedHitMs: unrelatedHit.ms, actualWaitMs,
    waited61Seconds: process.argv.includes('--wait'), agedHitMs: aged.ms, rebuildMs,
    nativeStarts: Effect.runSync(Ref.get(nativeStarts)), allTargetsEqual: true, host: process.memoryUsage() }, null, 2));
} finally { await rm(directory, { recursive: true, force: true }); }
