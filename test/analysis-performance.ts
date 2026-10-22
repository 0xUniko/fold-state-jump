// bun test/analysis-performance.ts [analysis-module-path] [repetitions]
// The optional module path permits identical inputs against a saved baseline.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import type { ClangNode } from '../src/analysis';

const { prepareAst, analyzeAst, analyzeOriginAst } = await import(process.argv[2] ?? '../src/analysis');
const repetitions = Number(process.argv[3] ?? 1000);
if (!Number.isSafeInteger(repetitions) || repetitions < 1) throw new Error('Repetitions must be a positive integer.');
const file = '/synthetic.cpp';
const rangeAt = (offset: number) => ({ begin: { offset, tokLen: 1 }, end: { offset, tokLen: 1 } });
const reference = (id: string, offset: number): ClangNode => ({
  kind: 'DeclRefExpr', referencedDecl: { id, name: 's' }, range: rangeAt(offset)
});
const increment = (id: string, offset: number): ClangNode => ({
  kind: 'UnaryOperator', opcode: '++', range: rangeAt(offset), inner: [reference(id, offset)]
});
const functionWith = (inner: readonly ClangNode[]): ClangNode => ({
  kind: 'FunctionDecl', id: 'main', name: 'main', loc: { file },
  inner: [{ kind: 'ParmVarDecl', id: 'state', name: 's', type: { qualType: 'int &' } }, { kind: 'CompoundStmt', inner }]
});
const functionAst = (inner: readonly ClangNode[]): ClangNode => ({ kind: 'TranslationUnitDecl', inner: [functionWith(inner)] });
const count = 20_000;
const helper: ClangNode = {
  kind: 'FunctionDecl', id: 'helper', name: 'helper', loc: { file },
  inner: [{ kind: 'ParmVarDecl', id: 'value', name: 's', type: { qualType: 'int &' } }, {
    kind: 'CompoundStmt', inner: [increment('value', 0)]
  }]
};
const aliases = Array.from({ length: 2000 }, (_, index): ClangNode => ({
  kind: 'VarDecl', id: 'alias-' + index, name: 's', type: { qualType: 'int &' },
  inner: [reference(index === 0 ? 'state' : 'alias-' + (index - 1), 1)]
}));
const cases = [
  {
    name: 'unrelated writes', cursorByteOffset: count * 8 + 10, origin: false,
    ast: functionAst([increment('state', 1), ...Array.from({ length: count }, (_, index) => increment('other-' + index, index * 8 + 8)), reference('state', count * 8 + 10)])
  },
  {
    name: 'historical write', cursorByteOffset: 4, origin: false,
    ast: functionAst([increment('state', 1), reference('state', 4), ...Array.from({ length: count }, (_, index) => increment('state', index * 8 + 8))])
  },
  {
    name: 'latest helper call', cursorByteOffset: count * 8 + 10, origin: false,
    ast: { kind: 'TranslationUnitDecl', inner: [helper, functionWith([
      ...Array.from({ length: count }, (_, index): ClangNode => ({
        kind: 'CallExpr', callee: { id: 'helper', name: 'helper' }, range: rangeAt(index * 8 + 8),
        inner: [reference('helper', index * 8 + 8), reference('state', index * 8 + 10)]
      })), reference('state', count * 8 + 10)
    ])] } as ClangNode
  },
  { name: 'reference aliases', cursorByteOffset: 10, origin: true, ast: functionAst([...aliases, reference('alias-1999', 10)]) }
];

cases.map(({ name, ast, cursorByteOffset, origin }) => {
  const prepareStart = performance.now();
  const prepared = prepareAst(ast);
  const prepareMs = performance.now() - prepareStart;
  const options = { file, sourceText: '', cursorByteOffset };
  const query = () => origin ? analyzeOriginAst(ast, options, prepared) : analyzeAst(ast, options, prepared);
  Array.from({ length: 100 }).map(query);
  const start = performance.now();
  Array.from({ length: repetitions }).reduce((_, iteration) => {
    const result = query();
    assert.equal(result._tag, origin ? 'OriginFound' : 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node.range?.begin?.offset, name === 'latest helper call' ? 0 : 1);
    return iteration;
  }, 0);
  console.log(JSON.stringify({ name, operations: name === 'reference aliases' ? 2000 : count, prepareMs: Number(prepareMs.toFixed(2)), queryUs: Number(((performance.now() - start) * 1000 / repetitions).toFixed(2)) }));
});
