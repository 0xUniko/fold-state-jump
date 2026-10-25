import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuery, callerLinksAt, prepareAst, type ClangNode, type CallerLink } from '../src/analysis';

const range = (start: number, end = start) => ({ begin: { offset: start }, end: { offset: end, tokLen: 1 } });
const reference = (id: string, offset: number): ClangNode => ({ kind: 'DeclRefExpr', referencedDecl: { id, name: id }, range: range(offset, offset + id.length - 1) });
const member = (base: ClangNode, name: string, offset: number): ClangNode => ({ kind: 'MemberExpr', name, inner: [base], range: range(base.range?.begin?.offset ?? offset, offset) });
const fn = (id: string, file: string, symbol: string, statements: readonly ClangNode[], parameter = true): ClangNode => ({
  kind: 'FunctionDecl', id, name: id, symbol, loc: { file, offset: 5 },
  inner: [...(parameter ? [{ kind: 'ParmVarDecl', id: 'state', name: 'state', type: { qualType: 'State &' } }] : []), { kind: 'CompoundStmt', inner: statements }]
});
const call = (symbol: string, argument: ClangNode, start = 50): ClangNode => ({
  kind: 'CallExpr', callee: { id: 'same-process-id', name: 'same-name', symbol },
  inner: [reference('callee', start), argument], range: range(start, start + 30)
});
const ast = (...functions: readonly ClangNode[]) => prepareAst({ kind: 'TranslationUnitDecl', inner: functions });
const options = { file: '/leaf.cpp', sourceText: '', cursorByteOffset: 101 };
const leaf = ast(fn('leaf', '/leaf.cpp', 'leaf-symbol', [member(reference('state', 90), 'records', 101)]));

describe('cross-AST continuation', () => {
  test('retains each AST parameter identity and every mapped member across rounds', () => {
    const middleCall = call('leaf-symbol', member(reference('state', 60), 'bank', 70));
    const middle = ast(fn('middle', '/middle.cpp', 'middle-symbol', [middleCall]));
    const topCall = call('middle-symbol', reference('local', 60));
    const write: ClangNode = { kind: 'BinaryOperator', opcode: '=', inner: [member(member(reference('local', 20), 'bank', 27), 'records', 35), { kind: 'IntegerLiteral' }], range: range(20, 40) };
    const declaration: ClangNode = { kind: 'VarDecl', id: 'local', name: 'local', inner: [{ kind: 'InitListExpr' }], range: range(10, 15) };
    const top = ast(fn('top', '/top.cpp', 'top-symbol', [declaration, write, topCall], false));
    const first = analyzeQuery('origin', leaf.ast, options, leaf);
    assert.equal(first.boundaries.length, 1);
    const leafFunction = first.boundaries[0];
    const middleLinks = callerLinksAt(middle, '/middle.cpp', 50, 56, leafFunction);
    assert.equal(middleLinks.length, 1);
    const externalCallers = new Map<ClangNode, readonly CallerLink[]>([[leafFunction.wrapped.node, [...middleLinks, ...middleLinks]]]);
    const second = analyzeQuery('origin', leaf.ast, { ...options, externalCallers }, leaf);
    assert.equal(second.boundaries.length, 1);
    const middleFunction = second.boundaries[0];
    const topLinks = callerLinksAt(top, '/top.cpp', 50, 56, middleFunction);
    const finalOptions = { ...options, externalCallers: new Map([...externalCallers, [middleFunction.wrapped.node, topLinks]]) };
    const result = analyzeQuery('origin', leaf.ast, finalOptions, leaf);
    assert.equal(result.boundaries.length, 0);
    assert.equal(result.result._tag, 'OriginFound');
    if (result.result._tag === 'OriginFound') {
      assert.equal(result.result.origin.node, declaration);
      assert.deepEqual(result.result.frames?.map((frame) => [frame.caller.file, frame.parameterIndex, frame.argument?.members]),
        [['/middle.cpp', 0, ['bank', 'records']], ['/top.cpp', 0, ['bank', 'records']]]);
    }
    const mutation = analyzeQuery('mutation', leaf.ast, finalOptions, leaf);
    assert.equal(mutation.result._tag, 'MutationFound');
    if (mutation.result._tag === 'MutationFound') assert.equal(mutation.result.mutation.node, write);
  });
  test('validates stable symbols instead of IDs or function names', () => {
    const target = analyzeQuery('origin', leaf.ast, options, leaf).boundaries[0];
    const wrong = ast(fn('middle', '/middle.cpp', 'middle-symbol', [call('overload-symbol', reference('state', 60))]));
    assert.deepEqual(callerLinksAt(wrong, '/middle.cpp', 50, 56, target), []);
    assert.deepEqual(callerLinksAt(wrong, '/other.cpp', 50, 56, target), []);
    const legacyTarget = { ...target, wrapped: { ...target.wrapped, node: { ...target.wrapped.node, symbol: undefined } } };
    assert.deepEqual(callerLinksAt(wrong, '/middle.cpp', 50, 56, legacyTarget), []);
  });
  test('returns every verified caller specialization at a shared source range', () => {
    const target = analyzeQuery('origin', leaf.ast, options, leaf).boundaries[0];
    const prepared = ast(
      fn('specialization-a', '/middle.cpp', 'specialization-a-symbol', [call('leaf-symbol', reference('state', 60))]),
      fn('specialization-b', '/middle.cpp', 'specialization-b-symbol', [call('leaf-symbol', reference('state', 60))])
    );
    const links = callerLinksAt(prepared, '/middle.cpp', 50, 56, target);
    assert.equal(links.length, 2);
    assert.notEqual(links[0].caller.wrapped.node.symbol, links[1].caller.wrapped.node.symbol);
  });
  test('rejects non-call references, argument references and indirect calls', () => {
    const target = analyzeQuery('origin', leaf.ast, options, leaf).boundaries[0];
    const prepared = ast(fn('middle', '/middle.cpp', 'middle-symbol', [
      reference('leaf', 30), call('leaf-symbol', reference('state', 60)), { ...call('leaf-symbol', reference('state', 100), 90), callee: undefined }
    ]));
    assert.deepEqual(callerLinksAt(prepared, '/middle.cpp', 30, 34, target), []);
    assert.deepEqual(callerLinksAt(prepared, '/middle.cpp', 60, 65, target), []);
    assert.deepEqual(callerLinksAt(prepared, '/middle.cpp', 90, 96, target), []);
  });
  test('keeps unsupported arguments as explicit parameter boundaries', () => {
    const target = analyzeQuery('origin', leaf.ast, options, leaf).boundaries[0];
    const prepared = ast(fn('middle', '/middle.cpp', 'middle-symbol', [call('leaf-symbol', { kind: 'ConditionalOperator', range: range(60, 70) })]));
    const externalCallers = new Map([[target.wrapped.node, callerLinksAt(prepared, '/middle.cpp', 50, 56, target)]]);
    const query = analyzeQuery('origin', leaf.ast, { ...options, externalCallers }, leaf);
    assert.equal(query.result._tag, 'OriginFound');
    if (query.result._tag === 'OriginFound') assert.match(query.result.boundary ?? '', /Unsupported argument/);
  });
});
