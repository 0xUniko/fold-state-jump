// Manual differential check against a saved analyzer:
// bun test/compare-analysis.ts /path/to/ast.json /path/to/source.cpp /path/to/baseline-analysis.ts [warm-rounds=5]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import * as current from '../src/analysis';
import type { AnalysisResult, ClangNode, PreparedAst, WrappedNode } from '../src/analysis';

const [astPath, sourcePath, baselinePath] = process.argv.slice(2, 5);
if (!astPath || !sourcePath || !baselinePath) {
  throw new Error('Usage: bun test/compare-analysis.ts <ast.json> <source> <baseline-analysis.ts> [warm-rounds=5]');
}
const warmRounds = Number(process.argv[5] ?? 5);
if (!Number.isSafeInteger(warmRounds) || warmRounds < 0) throw new Error('Warm rounds must be a nonnegative integer.');

const file = path.resolve(sourcePath);
const [astText, sourceText, baseline]: readonly [string, string, typeof current] = await Promise.all([
  readFile(astPath, 'utf8'),
  readFile(file, 'utf8'),
  import(pathToFileURL(path.resolve(baselinePath)).href)
]);
const ast = JSON.parse(astText) as ClangNode;

const measure = <A>(action: () => A): { readonly value: A; readonly ms: number } => {
  const start = performance.now();
  const value = action();
  return { value, ms: performance.now() - start };
};

const baselinePrepared = measure(() => baseline.prepareAst(ast));
const currentPrepared = measure(() => current.prepareAst(ast));
const expressions = currentPrepared.value.index.all.filter((wrapped) =>
  path.resolve(wrapped.file) === file &&
  ['DeclRefExpr', 'MemberExpr', 'CXXDependentScopeMemberExpr'].includes(wrapped.node.kind));
// Template instantiations and nested member paths can share a source position.
// One query per position covers the same cursor-selection behavior completely.
const cursorByteOffsets = [...new Set(expressions.flatMap((wrapped) => {
  const offset = wrapped.node.range?.end?.offset;
  return offset === undefined ? [] : [offset];
}))];
assert.ok(cursorByteOffsets.length > 0, 'No supported expression offsets found in ' + file);

const targetSignature = (wrapped: WrappedNode): unknown => ({
  file: wrapped.file,
  id: wrapped.node.id,
  kind: wrapped.node.kind,
  name: wrapped.node.name,
  range: wrapped.node.range,
  loc: wrapped.node.loc
});

const signature = (result: AnalysisResult): unknown => {
  switch (result._tag) {
    case 'AnalysisFailure': return result;
    case 'MutationFound': return {
      _tag: result._tag, mutation: targetSignature(result.mutation), via: result.via, wrapped: result.wrapped
    };
    case 'OriginFound': return { _tag: result._tag, origin: targetSignature(result.origin), kind: result.kind };
    case 'CandidatesFound': return {
      _tag: result._tag,
      candidates: result.candidates.map((candidate) => ({
        mutation: targetSignature(candidate.mutation),
        orderOffset: candidate.orderOffset,
        frames: candidate.frames.map((frame) => ({
          callsite: targetSignature(frame.callsite),
          caller: {
            id: frame.caller.id, name: frame.caller.name, type: frame.caller.type,
            wrapped: targetSignature(frame.caller.wrapped)
          }
        }))
      }))
    };
  }
};

const queryAll = (analysis: typeof current, prepared: PreparedAst) =>
  cursorByteOffsets.map((cursorByteOffset) => {
    const options = { file, sourceText, cursorByteOffset };
    return {
      mutation: analysis.analyzeAst(ast, options, prepared),
      origin: analysis.analyzeOriginAst(ast, options, prepared)
    };
  });

// Keep signature construction and deep equality outside the measured queries.
const baselineQueries = measure(() => queryAll(baseline, baselinePrepared.value));
const currentQueries = measure(() => queryAll(current, currentPrepared.value));
cursorByteOffsets.map((cursorByteOffset, index) => {
  assert.deepEqual(signature(currentQueries.value[index].mutation), signature(baselineQueries.value[index].mutation),
    'Mutation differs at ' + file + ':' + cursorByteOffset);
  assert.deepEqual(signature(currentQueries.value[index].origin), signature(baselineQueries.value[index].origin),
    'Origin differs at ' + file + ':' + cursorByteOffset);
});

const rounded = (ms: number): number => Number(ms.toFixed(3));
console.log(JSON.stringify({
  file,
  expressions: expressions.length,
  uniqueCursors: cursorByteOffsets.length,
  queries: cursorByteOffsets.length * 2,
  prepareMs: { baseline: rounded(baselinePrepared.ms), current: rounded(currentPrepared.ms) },
  queryMs: { baseline: rounded(baselineQueries.ms), current: rounded(currentQueries.ms) },
  signatures: 'equal'
}));

Array.from({ length: warmRounds }, (_, round) => {
  const baselineMs = measure(() => queryAll(baseline, baselinePrepared.value)).ms;
  const currentMs = measure(() => queryAll(current, currentPrepared.value)).ms;
  console.log(JSON.stringify({
    warmRound: round + 1,
    queries: cursorByteOffsets.length * 2,
    queryMs: { baseline: rounded(baselineMs), current: rounded(currentMs) }
  }));
});
