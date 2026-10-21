// Manual end-to-end benchmark. Run after `bun run build:native`:
// bun run bench /path/to/source.cpp "state.member" 10
// Measures one cold extraction and both cold-index and warm-index cursor queries.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeAst, byteOffsetFromUtf16, prepareAst, type AnalysisResult, type ClangNode } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const source = path.resolve(process.argv[2] ?? 'test/fixtures/native-paths.cpp');
const needle = process.argv[3] ?? 'bank_state.bank.records';
const repetitions = Number(process.argv[4] ?? 10);
const caseName = process.argv[5] ??
  (path.basename(source) === 'native-paths.cpp' ? 'helper-records' : undefined);
if (!Number.isSafeInteger(repetitions) || repetitions < 1) throw new Error('Repetitions must be a positive integer.');

const sourceText = await readFile(source, 'utf8');
const marker = caseName ? '// @case ' + caseName : '';
const markerOffset = marker ? sourceText.indexOf(marker) : -1;
if (marker && markerOffset < 0) throw new Error('Missing benchmark case: ' + marker);
const lineStart = marker ? sourceText.lastIndexOf('\n', markerOffset) + 1 : 0;
const cursor = sourceText.indexOf(needle, lineStart);
if (cursor < 0 || (marker && cursor >= markerOffset)) {
  throw new Error('No occurrence of ' + JSON.stringify(needle) + ' in selected case of ' + source);
}
const options = {
  file: source,
  sourceText,
  cursorByteOffset: byteOffsetFromUtf16(sourceText, cursor + needle.length - 1)
};

const measure = <T>(action: () => T): { readonly value: T; readonly ms: number } => {
  const start = performance.now();
  const value = action();
  return { value, ms: performance.now() - start };
};
const print = (name: string, ms: number): void =>
  console.log(name.padEnd(26) + ms.toFixed(2).padStart(12) + ' ms');

// Compare actual targets and call paths, rather than just result tags. Avoid
// retaining previous query results and their complete indexes during cold runs.
const signature = (result: AnalysisResult): unknown => {
  switch (result._tag) {
    case 'AnalysisFailure': return result;
    case 'MutationFound': return [result._tag, result.mutation.node, result.via, result.wrapped];
    case 'OriginFound': return [result._tag, result.origin.node, result.kind];
    case 'CandidatesFound': return [result._tag, result.candidates.map((candidate) => [
      candidate.mutation.node, candidate.orderOffset,
      candidate.frames.map((frame) => [frame.callsite.node, frame.caller.id])
    ])];
  }
};

const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
const executable = path.resolve('native/build/fold-state-jump-ast');
const extractionStart = performance.now();
const astText = await Effect.runPromise(runClangAst(
  makeExtractionCommand(command, executable),
  64 * 1024 * 1024,
  AbortSignal.timeout(120_000)
));
const nativeMs = performance.now() - extractionStart;
const parsed = measure(() => JSON.parse(astText) as ClangNode);
const prepared = measure(() => prepareAst(parsed.value));
const expected = signature(analyzeAst(parsed.value, options, prepared.value));
Array.from({ length: 10 }).map(() => analyzeAst(parsed.value, options, prepared.value));
const queries = Array.from({ length: repetitions });
const warm = queries.reduce<number>((ms) => {
  const query = measure(() => analyzeAst(parsed.value, options, prepared.value));
  assert.deepEqual(signature(query.value), expected, 'Prepared query changed its target');
  return ms + query.ms;
}, 0);
const cold = queries.reduce<number>((ms) => {
  const query = measure(() => analyzeAst(parsed.value, options));
  assert.deepEqual(signature(query.value), expected, 'Prepared and cold analysis disagree');
  return ms + query.ms;
}, 0);
console.log('File: ' + source);
console.log('Extracted JSON: ' + (Buffer.byteLength(astText) / 1048576).toFixed(2) + ' MiB');
print('Native compile + extract', nativeMs);
print('JSON.parse', parsed.ms);
print('Prepare indexes', prepared.ms);
print('Cold queries (avg)', cold / repetitions);
print('Warm queries (avg)', warm / repetitions);
console.log('Result: ' + analyzeAst(parsed.value, options, prepared.value)._tag);
console.log('RSS: ' + (process.memoryUsage().rss / 1048576).toFixed(1) + ' MiB');
