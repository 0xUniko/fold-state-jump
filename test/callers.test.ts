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

describe('local and external caller merging', () => {
  const reference = (id: string, offset: number): ClangNode => ({ kind: 'DeclRefExpr', referencedDecl: { id, name: id }, range: range(offset, offset + id.length - 1) });
  const increment = (id: string, name: string, offset: number): ClangNode => ({
    kind: 'UnaryOperator', opcode: '++', inner: [member(reference(id, offset), 'records', offset)],
    range: range(offset, offset + name.length + 2)
  });
  const call = (id: string, symbol: string, argument: ClangNode, start = 50): ClangNode => ({
    kind: 'CallExpr', callee: { id, name: id, symbol },
    inner: [reference(id, start), argument], range: range(start, start + 30)
  });
  const leafFn = (statements: readonly ClangNode[]): ClangNode => ({
    kind: 'FunctionDecl', id: 'leaf', name: 'leaf', symbol: 'leaf-symbol', loc: { file: '/leaf.cpp', offset: 5 },
    inner: [{ kind: 'ParmVarDecl', id: 'state', name: 'state', type: { qualType: 'State &' } },
      { kind: 'CompoundStmt', inner: statements }]
  });
  const callerFn = (id: string, file: string, symbol: string, statements: readonly ClangNode[]): ClangNode => ({
    kind: 'FunctionDecl', id, name: id, symbol, loc: { file, offset: 5 },
    inner: [{ kind: 'CompoundStmt', inner: statements }]
  });
  const declaration = (id: string, offset: number): ClangNode => ({
    kind: 'VarDecl', id, name: id, inner: [{ kind: 'InitListExpr' }], range: range(offset, offset + 1)
  });
  const preparedAst = (...functions: readonly ClangNode[]) => prepareAst({ kind: 'TranslationUnitDecl', inner: functions });
  const options = { file: '/leaf.cpp', sourceText: '', cursorByteOffset: 101 };

  test('keeps local candidate paths while still reporting the function for external discovery', () => {
    // Regression: a verified local caller used to suppress the boundary, so
    // callers in other translation units were never discovered.
    const localWrite = increment('local', 'local', 30);
    const local = preparedAst(
      leafFn([member(reference('state', 90), 'records', 101)]),
      callerFn('local_run', '/leaf.cpp', 'local-symbol', [declaration('local', 10), localWrite, call('leaf', 'leaf-symbol', reference('local', 60))]));
    const first = analyzeQuery('mutation', local.ast, options, local);
    assert.equal(first.result._tag, 'MutationFound');
    if (first.result._tag === 'MutationFound') assert.equal(first.result.mutation.node, localWrite);
    assert.equal(first.boundaries.length, 1, 'local callers must not suppress external discovery');
    // Once the language service has been queried, the boundary resolves away.
    const settled = analyzeQuery('mutation', local.ast, { ...options, externalCallers: new Map([[first.boundaries[0].wrapped.node, []]]) }, local);
    assert.equal(settled.boundaries.length, 0);
    assert.equal(settled.result._tag, 'MutationFound');
  });

  test('unions local and external mutation paths instead of choosing one', () => {
    const localWrite = increment('local', 'local', 30);
    const local = preparedAst(
      leafFn([member(reference('state', 90), 'records', 101)]),
      callerFn('local_run', '/leaf.cpp', 'local-symbol', [declaration('local', 10), localWrite, call('leaf', 'leaf-symbol', reference('local', 60))]));
    const externalWrite = increment('external', 'external', 30);
    const external = preparedAst(callerFn('external_run', '/external.cpp', 'external-symbol',
      [declaration('external', 10), externalWrite, call('leaf', 'leaf-symbol', reference('external', 60))]));
    const first = analyzeQuery('mutation', local.ast, options, local);
    const externalLinks = callerLinksAt(external, '/external.cpp', 50, 56, first.boundaries[0]);
    assert.equal(externalLinks.length, 1);
    const merged = analyzeQuery('mutation', local.ast, {
      ...options, externalCallers: new Map([[first.boundaries[0].wrapped.node, externalLinks]])
    }, local);
    assert.equal(merged.result._tag, 'CandidatesFound');
    if (merged.result._tag === 'CandidatesFound') {
      assert.equal(merged.result.candidates.length, 2);
      const mutations = merged.result.candidates.map((candidate) => candidate.mutation.node);
      assert.ok(mutations.includes(localWrite) && mutations.includes(externalWrite));
      assert.ok(merged.result.candidates.some((candidate) => candidate.frames[0].caller.file === '/external.cpp'));
      assert.ok(merged.result.candidates.some((candidate) => candidate.frames[0].caller.file === '/leaf.cpp'));
    }
    assert.equal(merged.boundaries.length, 0);
  });

  test('unions local and external origin paths to distinct initializations', () => {
    const localDeclaration = declaration('local', 10);
    const local = preparedAst(
      leafFn([member(reference('state', 90), 'records', 101)]),
      callerFn('local_run', '/leaf.cpp', 'local-symbol', [localDeclaration, call('leaf', 'leaf-symbol', reference('local', 60))]));
    const externalDeclaration = declaration('external', 10);
    const external = preparedAst(callerFn('external_run', '/external.cpp', 'external-symbol',
      [externalDeclaration, call('leaf', 'leaf-symbol', reference('external', 60))]));
    const first = analyzeQuery('origin', local.ast, options, local);
    assert.equal(first.boundaries.length, 1);
    const externalLinks = callerLinksAt(external, '/external.cpp', 50, 56, first.boundaries[0]);
    const merged = analyzeQuery('origin', local.ast, {
      ...options, externalCallers: new Map([[first.boundaries[0].wrapped.node, externalLinks]])
    }, local);
    assert.equal(merged.result._tag, 'OriginCandidatesFound');
    if (merged.result._tag === 'OriginCandidatesFound') {
      assert.equal(merged.result.candidates.length, 2);
      assert.deepEqual(merged.result.candidates.map((candidate) => candidate.origin.node).sort((a, b) =>
        (a.id ?? '').localeCompare(b.id ?? '')), [externalDeclaration, localDeclaration].sort((a, b) =>
        (a.id ?? '').localeCompare(b.id ?? '')));
    }
    assert.equal(merged.boundaries.length, 0);
  });

  test('traces a middle helper with a local caller out to an external outer caller', () => {
    const middle: ClangNode = {
      kind: 'FunctionDecl', id: 'middle', name: 'middle', symbol: 'middle-symbol', loc: { file: '/leaf.cpp', offset: 5 },
      inner: [
        { kind: 'ParmVarDecl', id: 'middle-state', name: 'state', type: { qualType: 'State &' } },
        { kind: 'CompoundStmt', inner: [call('leaf', 'leaf-symbol', reference('middle-state', 60))] }
      ]
    };
    const local = preparedAst(
      leafFn([member(reference('state', 90), 'records', 101)]),
      middle,
      callerFn('local_run', '/leaf.cpp', 'local-symbol', [declaration('local', 10), call('middle', 'middle-symbol', reference('local', 60))]));
    const externalWrite = increment('outer', 'outer', 30);
    const external = preparedAst(callerFn('outer_run', '/outer.cpp', 'outer-symbol',
      [declaration('outer', 10), externalWrite, call('middle', 'middle-symbol', reference('outer', 60))]));
    const leaf = analyzeQuery('mutation', local.ast, options, local);
    const leafFunction = leaf.boundaries.find((boundary) => boundary.name === 'leaf')!;
    assert.ok(leafFunction);
    assert.ok(leaf.boundaries.some((boundary) => boundary.name === 'middle'));
    const leafLinks = callerLinksAt(external, '/outer.cpp', 50, 56, leafFunction);
    const second = analyzeQuery('mutation', local.ast, {
      ...options, externalCallers: new Map([[leafFunction.wrapped.node, leafLinks]])
    }, local);
    const middleFunction = second.boundaries.find((boundary) => boundary.name === 'middle')!;
    assert.ok(middleFunction);
    const merged = analyzeQuery('mutation', local.ast, {
      ...options,
      externalCallers: new Map([
        [leafFunction.wrapped.node, leafLinks],
        [middleFunction.wrapped.node, callerLinksAt(external, '/outer.cpp', 50, 56, middleFunction)]
      ])
    }, local);
    assert.equal(merged.boundaries.length, 0);
    assert.equal(merged.result._tag, 'MutationFound');
    if (merged.result._tag === 'MutationFound') {
      assert.equal(merged.result.mutation.node, externalWrite);
      assert.deepEqual(merged.result.frames?.map((frame) => frame.caller.name), ['middle', 'outer_run']);
    }
  });
});
