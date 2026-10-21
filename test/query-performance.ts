// Synthetic scaling benchmark: bun run bench:queries [repetitions]
// Each function has one write and one read, isolating cursor lookup from the
// intrinsic cost of tracing a function with many writes or call paths.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';

const repetitions = Number(process.argv[2] ?? 1000);
if (!Number.isSafeInteger(repetitions) || repetitions < 1) throw new Error('Repetitions must be a positive integer.');
const file = '/synthetic.cpp';
const rangeAt = (offset: number) => ({ begin: { offset, tokLen: 1 }, end: { offset, tokLen: 1 } });
const functionAt = (index: number): ClangNode => {
  const base = index * 32;
  const id = 'state-' + index;
  const referenceAt = (offset: number): ClangNode => ({
    kind: 'DeclRefExpr', referencedDecl: { id, name: 's' }, range: rangeAt(offset)
  });
  return {
    kind: 'FunctionDecl', id: 'function-' + index, name: 'function-' + index, loc: { file },
    inner: [
      { kind: 'ParmVarDecl', id, name: 's', type: { qualType: 'int &' }, loc: { file, offset: base, tokLen: 1 }, range: rangeAt(base) },
      { kind: 'CompoundStmt', inner: [
        { kind: 'UnaryOperator', opcode: '++', range: rangeAt(base + 8), inner: [referenceAt(base + 8)] },
        referenceAt(base + 24)
      ] }
    ]
  };
};

[100, 1000, 10000].map((functionCount) => {
  const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: Array.from({ length: functionCount }, (_, index) => functionAt(index)) };
  const prepareStart = performance.now();
  const prepared = prepareAst(ast);
  const prepareMs = performance.now() - prepareStart;
  const optionsAt = (index: number) => ({ file, sourceText: '', cursorByteOffset: index * 32 + 24 });
  Array.from({ length: 100 }).map((_, index) => {
    const options = optionsAt(index % functionCount);
    analyzeAst(ast, options, prepared);
    analyzeOriginAst(ast, options, prepared);
  });
  const timing = Array.from({ length: repetitions }).reduce<{ readonly mutationMs: number; readonly originMs: number }>((timing, _, index) => {
    const functionIndex = (index * 9973) % functionCount;
    const options = optionsAt(functionIndex);
    const mutationStart = performance.now();
    const mutation = analyzeAst(ast, options, prepared);
    const mutationMs = performance.now() - mutationStart;
    const originStart = performance.now();
    const origin = analyzeOriginAst(ast, options, prepared);
    const originMs = performance.now() - originStart;
    assert.equal(mutation._tag, 'MutationFound');
    if (mutation._tag === 'MutationFound') assert.equal(mutation.mutation.node.range?.begin?.offset, functionIndex * 32 + 8);
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') assert.equal(origin.origin.node.id, 'state-' + functionIndex);
    return { mutationMs: timing.mutationMs + mutationMs, originMs: timing.originMs + originMs };
  }, { mutationMs: 0, originMs: 0 });
  console.log(JSON.stringify({
    functions: functionCount, nodes: 1 + functionCount * 6, prepareMs: Number(prepareMs.toFixed(2)),
    mutationUs: Number((timing.mutationMs * 1000 / repetitions).toFixed(2)),
    originUs: Number((timing.originMs * 1000 / repetitions).toFixed(2))
  }));
});
