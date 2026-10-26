import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAst, analyzeOriginAst, analyzeQuery, buildTree, byteOffsetFromUtf16, utf16OffsetFromByte, expressionPath, prepareAst, type ClangNode, type WrappedNode } from '../src/analysis';

const wrapped = (node: WrappedNode['node'], children: readonly WrappedNode[] = []): WrappedNode => ({
  node,
  children,
  ancestors: [],
  file: '/fixture.cpp'
});

describe('source offsets', () => {
  test('converts UTF-16 editor offsets to UTF-8 byte offsets', () => {
    const source = 'a😀b';
    assert.equal(byteOffsetFromUtf16(source, 3), 5);
    assert.equal(utf16OffsetFromByte(source, 5), 3);
  });
});

describe('expression paths', () => {
  test('resolves nested member paths from the declaration identity', () => {
    const state = wrapped({ kind: 'DeclRefExpr', referencedDecl: { id: 'state-id', name: 'state' } });
    const a = wrapped({ kind: 'MemberExpr', name: 'a' }, [state]);
    const b = wrapped({ kind: 'MemberExpr', name: 'b' }, [a]);
    assert.deepEqual(expressionPath(b), {
      rootId: 'state-id',
      rootName: 'state',
      members: ['a', 'b']
    });
  });

  test('returns no path for an unsupported expression', () => {
    assert.equal(expressionPath(wrapped({ kind: 'IntegerLiteral' })), null);
  });
});

const reference = (id: string, name: string, offset: number): ClangNode => ({
  kind: 'DeclRefExpr',
  referencedDecl: { id, name },
  range: { begin: { offset }, end: { offset, tokLen: name.length } }
});

const member = (id: string, name: string, offset: number): ClangNode => ({
  kind: 'MemberExpr', name: 'b', inner: [reference(id, name, offset)],
  range: { begin: { offset }, end: { offset: offset + name.length + 1, tokLen: 1 } }
});

const increment = (id: string, name: string, offset: number): ClangNode => ({
  kind: 'UnaryOperator', opcode: '++', inner: [member(id, name, offset)],
  range: { begin: { offset }, end: { offset: offset + name.length + 2, tokLen: 2 } }
});

const foldAst = (statements: readonly ClangNode[], helpers: readonly ClangNode[] = []): ClangNode => ({
  kind: 'TranslationUnitDecl',
  inner: [
    ...helpers,
    {
      kind: 'FunctionDecl', id: 'example', name: 'example', loc: { file: '/fixture.cpp' },
      inner: [{ kind: 'CompoundStmt', inner: [{
        kind: 'CallExpr',
        inner: [reference('fold', 'fold_left', 0), {
          kind: 'CXXConstructExpr', range: { begin: { offset: 1 }, end: { offset: 1, tokLen: 1 } }
        }, {
          kind: 'LambdaExpr', inner: [{
            kind: 'CXXRecordDecl', inner: [{
              kind: 'CXXMethodDecl', id: 'lambda', name: 'operator()',
              inner: [
                { kind: 'ParmVarDecl', id: 'state', name: 'state', type: { qualType: 'State' } },
                { kind: 'CompoundStmt', inner: [...statements, { kind: 'ReturnStmt', range: { begin: { offset: 190 }, end: { offset: 199 } }, inner: [reference('state', 'state', 197)] }] }
              ]
            }]
          }]
        }]
      }] }]
    }
  ]
});

const analyze = (ast: ClangNode, cursorByteOffset = 106) => analyzeAst(ast, {
  file: '/fixture.cpp', sourceText: ' '.repeat(200), cursorByteOffset
});
const origin = (ast: ClangNode, cursorByteOffset = 106) => analyzeOriginAst(ast, {
  file: '/fixture.cpp', sourceText: ' '.repeat(200), cursorByteOffset
});

describe('AST source files', () => {
  test('inherits omitted file locations across descendants and siblings', () => {
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      { kind: 'FunctionDecl', loc: { file: '/header.hpp' }, inner: [{ kind: 'CompoundStmt' }] },
      { kind: 'FunctionDecl' },
      { kind: 'FunctionDecl', loc: { file: '/fixture.cpp' }, inner: [{ kind: 'CompoundStmt' }] }
    ] };
    assert.deepEqual(buildTree(ast).all.slice(1).map((wrapped) => wrapped.file), [
      '/header.hpp', '/header.hpp', '/header.hpp', '/fixture.cpp', '/fixture.cpp'
    ]);
  });
});

describe('fold mutation analysis', () => {
  test('finds the latest mutation inside a fold lambda', () => {
    const mutation = increment('state', 'state', 30);
    const result = analyze(foldAst([increment('state', 'state', 10), mutation, member('state', 'state', 100)]));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, mutation);
      assert.equal(result.via, 'direct');
    }
  });

  test('does not select the expression currently being mutated', () => {
    const mutation = increment('state', 'state', 10);
    const result = analyze(foldAst([mutation, increment('state', 'state', 100)]));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, mutation);
  });

  test('does not count mutations inside an uncalled nested lambda', () => {
    const result = analyze(foldAst([{
      kind: 'LambdaExpr', inner: [{
        kind: 'CXXMethodDecl', id: 'nested', name: 'operator()',
        inner: [{ kind: 'CompoundStmt', inner: [increment('state', 'state', 30)] }]
      }]
    }, member('state', 'state', 100)]));
    assert.equal(result._tag, 'AnalysisFailure');
  });

  test('wraps from the beginning of a fold to its last relevant mutation', () => {
    const last = increment('state', 'state', 70);
    const result = analyze(foldAst([
      member('state', 'state', 10),
      increment('state', 'state', 30),
      last
    ]), 16);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, last);
      assert.equal(result.wrapped, true);
    }
  });

  test('reports no mutation instead of navigating to an origin', () => {
    const result = analyze(foldAst([member('state', 'state', 100)]));
    assert.equal(result._tag, 'AnalysisFailure');
  });

  test('goes directly to the fold seed even when there is an earlier mutation', () => {
    const ast = foldAst([increment('state', 'state', 30), member('state', 'state', 100)]);
    const result = origin(ast);
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') {
      assert.equal(result.kind, 'initialization');
      assert.equal(result.origin.node.kind, 'CXXConstructExpr');
    }
  });

  test('does not wrap a fresh local object across fold iterations', () => {
    const mutation = increment('local-state', 'local', 70);
    const ast = foldAst([
      { kind: 'VarDecl', id: 'local-state', name: 'local', inner: [{ kind: 'InitListExpr' }] },
      member('local-state', 'local', 10), mutation
    ]);
    const result = analyze(ast, 16);
    assert.equal(result._tag, 'AnalysisFailure');
  });

  test('wraps to an invoked reference helper mutation inside the fold', () => {
    const mutation = increment('parameter', 'value', 10);
    const helper: ClangNode = {
      kind: 'FunctionDecl', id: 'mutate', name: 'mutate', loc: { file: '/fixture.cpp' },
      inner: [
        { kind: 'ParmVarDecl', id: 'parameter', name: 'value', type: { qualType: 'State &' } },
        { kind: 'CompoundStmt', inner: [mutation] }
      ]
    };
    const call: ClangNode = {
      kind: 'CallExpr', range: { begin: { offset: 50 }, end: { offset: 65, tokLen: 1 } },
      inner: [reference('mutate', 'mutate', 50), reference('state', 'state', 57)]
    };
    const result = analyze(foldAst([member('state', 'state', 10), call], [helper]), 16);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, mutation);
      assert.equal(result.via, 'call');
      assert.equal(result.wrapped, true);
    }
  });

  ['State &', 'State'].map((qualType) => test('handles helper parameter ' + qualType, () => {
    const mutation = increment('parameter', 'value', 10);
    const helper: ClangNode = {
      kind: 'FunctionDecl', id: 'mutate', name: 'mutate', loc: { file: '/fixture.cpp' },
      inner: [
        { kind: 'ParmVarDecl', id: 'parameter', name: 'value', type: { qualType } },
        { kind: 'CompoundStmt', inner: [mutation] }
      ]
    };
    const call: ClangNode = {
      kind: 'CallExpr', range: { begin: { offset: 50 }, end: { offset: 65, tokLen: 1 } },
      inner: [reference('mutate', 'mutate', 50), reference('state', 'state', 57)]
    };
    const result = analyze(foldAst([call, member('state', 'state', 100)], [helper]));
    assert.equal(result._tag, qualType === 'State &' ? 'MutationFound' : 'AnalysisFailure');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, mutation);
      assert.equal(result.via, 'call');
    }
  }));
});

describe('prepared AST reuse', () => {
  test('preserves mutation and origin results across repeated cursor queries', () => {
    const ast = foldAst([
      member('state', 'state', 10),
      increment('state', 'state', 30),
      increment('state', 'state', 70),
      member('state', 'state', 100)
    ]);
    const prepared = prepareAst(ast);
    const optionsAt = (cursorByteOffset: number) => ({
      file: '/fixture.cpp',
      sourceText: ' '.repeat(200),
      cursorByteOffset
    });

    [16, 36, 75, 106].map((offset) => {
      const fresh = analyzeAst(ast, optionsAt(offset));
      const reused = analyzeAst(ast, optionsAt(offset), prepared);
      assert.equal(reused._tag, fresh._tag);
      if (fresh._tag === 'MutationFound' && reused._tag === 'MutationFound') {
        assert.equal(reused.mutation.node, fresh.mutation.node);
        assert.equal(reused.wrapped, fresh.wrapped);
      }
      const freshOrigin = analyzeOriginAst(ast, optionsAt(offset));
      const reusedOrigin = analyzeOriginAst(ast, optionsAt(offset), prepared);
      assert.equal(reusedOrigin._tag, freshOrigin._tag);
      if (freshOrigin._tag === 'OriginFound' && reusedOrigin._tag === 'OriginFound') {
        assert.equal(reusedOrigin.origin.node, freshOrigin.origin.node);
      }
    });
  });

  test('preserves call-mediated mutation results with cached callee indexes', () => {
    const mutation = increment('parameter', 'value', 10);
    const helper: ClangNode = {
      kind: 'FunctionDecl', id: 'mutate', name: 'mutate', loc: { file: '/fixture.cpp' },
      inner: [
        { kind: 'ParmVarDecl', id: 'parameter', name: 'value', type: { qualType: 'State &' } },
        { kind: 'CompoundStmt', inner: [mutation] }
      ]
    };
    const call: ClangNode = {
      kind: 'CallExpr', range: { begin: { offset: 50 }, end: { offset: 65, tokLen: 1 } },
      inner: [reference('mutate', 'mutate', 50), reference('state', 'state', 57)]
    };
    const ast = foldAst([call, member('state', 'state', 100)], [helper]);
    const prepared = prepareAst(ast);
    const options = { file: '/fixture.cpp', sourceText: ' '.repeat(200), cursorByteOffset: 106 };
    const fresh = analyzeAst(ast, options);
    const cached = analyzeAst(ast, options, prepared);
    assert.equal(fresh._tag, 'MutationFound');
    assert.equal(cached._tag, 'MutationFound');
    if (fresh._tag === 'MutationFound' && cached._tag === 'MutationFound') {
      assert.equal(cached.mutation.node, fresh.mutation.node);
      assert.equal(cached.mutation.node, mutation);
    }
  });
});

describe('indexed cursor selection', () => {
  const selectionFunction = (
    id: string,
    start: number,
    length: number | undefined,
    options: { readonly file?: string; readonly dependent?: boolean; readonly nested?: boolean; readonly named?: boolean } = {}
  ): ClangNode => {
    const selected: ClangNode = {
      kind: 'DeclRefExpr', referencedDecl: { id, ...(options.named === false ? {} : { name: id }) },
      range: { begin: { offset: start, ...(length === undefined ? {} : { tokLen: length }) }, end: { offset: start } }
    };
    return {
      kind: 'FunctionDecl', id: 'fn-' + id, name: 'fn-' + id,
      loc: { file: options.file ?? '/fixture.cpp' }, dependent: options.dependent,
      inner: [
        { kind: 'ParmVarDecl', id, name: id, type: { qualType: 'int' } },
        { kind: 'CompoundStmt', inner: options.nested ? [{ kind: 'ParenExpr', inner: [selected] }] : [selected] }
      ]
    };
  };
  const selectedOrigin = (functions: readonly ClangNode[], cursorByteOffset: number): string | undefined => {
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: functions };
    const result = analyzeOriginAst(ast, { file: '/fixture.cpp', sourceText: ' '.repeat(200), cursorByteOffset }, prepareAst(ast));
    return result._tag === 'OriginFound' ? result.origin.node.id : undefined;
  };

  test('finds an overlapping interval far before the nearest start offset', () => {
    assert.equal(selectedOrigin([
      selectionFunction('spanning', 10, 100),
      ...Array.from({ length: 50 }, (_, index) => selectionFunction('short-' + index, 20 + index, 1))
    ], 95), 'spanning');
  });

  test('keeps the first AST occurrence when sorting changes interval order', () => {
    assert.equal(selectedOrigin([
      selectionFunction('first', 11, 4), selectionFunction('second', 10, 4)
    ], 12), 'first');
  });

  test('prefers narrower tokens before concrete template instances and depth', () => {
    assert.equal(selectedOrigin([
      selectionFunction('concrete', 10, 10, { nested: true }),
      selectionFunction('dependent', 10, 1, { dependent: true })
    ], 10), 'dependent');
  });

  test('prefers a concrete instance over a deeper dependent expression', () => {
    assert.equal(selectedOrigin([
      selectionFunction('dependent', 10, 4, { dependent: true, nested: true }),
      selectionFunction('concrete', 10, 4)
    ], 12), 'concrete');
  });

  test('prefers the deepest expression after token width and dependency tie', () => {
    assert.equal(selectedOrigin([
      selectionFunction('shallow', 10, 4), selectionFunction('deep', 10, 4, { nested: true })
    ], 12), 'deep');
  });

  test('keeps files separate and excludes the token end offset', () => {
    const functions = [
      selectionFunction('header', 10, 1, { file: '/helper.h' }),
      selectionFunction('source', 10, 4)
    ];
    assert.equal(selectedOrigin(functions, 10), 'source');
    assert.equal(selectedOrigin(functions, 14), undefined);
  });

  test('resolves missing token lengths and spellings using each query source', () => {
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [selectionFunction('value', 10, undefined, { named: false })] };
    const prepared = prepareAst(ast);
    const options = { file: '/fixture.cpp', sourceText: ' '.repeat(10) + '值_value', cursorByteOffset: 15 };
    const result = analyzeOriginAst(ast, options, prepared);
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') assert.equal(result.origin.node.id, 'value');
    assert.equal(analyzeOriginAst(ast, { ...options, sourceText: ' '.repeat(10) + 'x' }, prepared)._tag, 'AnalysisFailure');
  });

  test('uses UTF-8 spelling length when the token length is missing', () => {
    assert.equal(selectedOrigin([selectionFunction('状态', 10, undefined)], 15), '状态');
    assert.equal(selectedOrigin([selectionFunction('状态', 10, undefined)], 16), undefined);
  });
});

describe('latest-call pruning', () => {
  const helper = (id: string, mutation: ClangNode): ClangNode => ({
    kind: 'FunctionDecl', id, name: id, loc: { file: '/fixture.cpp' },
    inner: [
      { kind: 'ParmVarDecl', id: id + '-param', name: 'value', type: { qualType: 'State &' } },
      { kind: 'CompoundStmt', inner: [mutation] }
    ]
  });
  const call = (id: string, offset: number): ClangNode => ({
    kind: 'CallExpr', callee: { id, name: id },
    range: { begin: { offset }, end: { offset: offset + 10, tokLen: 1 } },
    inner: [reference(id, id, offset), reference('state', 'state', offset + 3)]
  });
  const first = increment('first-param', 'value', 10);
  const second = increment('second-param', 'value', 20);
  const helpers = [helper('first', first), helper('second', second)];

  test('uses source order when call AST order is different', () => {
    const result = analyze(foldAst([call('first', 70), call('second', 30), member('state', 'state', 100)], helpers));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, first);
  });

  test('preserves AST precedence for calls sharing a macro offset', () => {
    const result = analyze(foldAst([call('first', 70), call('second', 70), member('state', 'state', 100)], helpers));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, first);
  });

  test('keeps a later direct write ahead of older helper mutations', () => {
    const direct = increment('state', 'state', 80);
    const result = analyze(foldAst([call('first', 70), direct, member('state', 'state', 100)], helpers));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, direct);
      assert.equal(result.via, 'direct');
    }
  });

  test('keeps direct-write precedence when a call shares its offset', () => {
    const direct = increment('state', 'state', 70);
    const result = analyze(foldAst([call('first', 70), direct, member('state', 'state', 100)], helpers));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, direct);
  });

  test('uses source order for writes and retains the first write on ties', () => {
    const direct = increment('state', 'state', 80);
    const result = analyze(foldAst([
      direct, increment('state', 'state', 30), increment('state', 'state', 80), member('state', 'state', 100)
    ]));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, direct);
  });

  test('skips calls after the cursor and incomplete calls before it', () => {
    const incomplete = { ...call('second', 90), range: { begin: { offset: 90 }, end: { offset: 120, tokLen: 1 } } };
    const result = analyze(foldAst([
      call('second', 140), incomplete, call('first', 50), member('state', 'state', 100)
    ], helpers));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, first);
  });
});

describe('large function indexes', () => {
  test('keeps unrelated variable writes separate from the selected state', () => {
    const mutation = increment('state', 'state', 10);
    const unrelated = Array.from({ length: 2000 }, (_, index) => increment('other-' + index, 'other', 20 + index * 10));
    const ast = foldAst([mutation, ...unrelated, member('state', 'state', 21_000)]);
    const result = analyzeAst(ast, { file: '/fixture.cpp', sourceText: '', cursorByteOffset: 21_006 }, prepareAst(ast));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, mutation);
  });

  test('finds an early mutation when most indexed writes are after the cursor', () => {
    const mutation = increment('state', 'state', 10);
    const future = Array.from({ length: 2000 }, (_, index) => increment('state', 'state', 200 + index * 10));
    const ast = foldAst([...future, mutation, member('state', 'state', 100)]);
    const result = analyze(ast);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, mutation);
  });
});

describe('reference path indexes', () => {
  const alias = (id: string, initial: ClangNode): ClangNode => ({
    kind: 'VarDecl', id, name: id, type: { qualType: 'State &' }, inner: [initial]
  });

  test('normalizes long reference chains for writes and origin navigation', () => {
    const initial: ClangNode = { kind: 'VarDecl', id: 'state', name: 'state', inner: [{ kind: 'InitListExpr' }] };
    const aliases = Array.from({ length: 1200 }, (_, index) => alias('alias-' + index,
      reference(index === 0 ? 'state' : 'alias-' + (index - 1), 'state', 1)));
    const mutation = increment('alias-1199', 'alias', 30);
    const ast = foldAst([initial, ...aliases, mutation, member('state', 'state', 100)]);
    const prepared = prepareAst(ast);
    const options = { file: '/fixture.cpp', sourceText: '', cursorByteOffset: 106 };
    const result = analyzeAst(ast, options, prepared);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, mutation);
    const resultOrigin = analyzeOriginAst(ast, options, prepared);
    assert.equal(resultOrigin._tag, 'OriginFound');
    if (resultOrigin._tag === 'OriginFound') assert.equal(resultOrigin.origin.node, initial);
  });

  test('preserves member prefixes when normalizing nested aliases', () => {
    const first = alias('first', member('state', 'state', 1));
    const second = alias('second', member('first', 'first', 10));
    const mutation = increment('second', 'second', 30);
    const ast = foldAst([first, second, mutation, member('state', 'state', 100)]);
    const result = analyze(ast);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, mutation);
  });

  test('retains root-specific cycle handling for malformed legacy aliases', () => {
    const first = alias('first', reference('second', 'second', 1));
    const second = alias('second', reference('first', 'first', 10));
    const ast = foldAst([first, second, reference('first', 'first', 80), reference('second', 'second', 100)]);
    const prepared = prepareAst(ast);
    [{ cursorByteOffset: 81, declaration: first }, { cursorByteOffset: 101, declaration: second }].map(({ cursorByteOffset, declaration }) => {
      const result = analyzeOriginAst(ast, { file: '/fixture.cpp', sourceText: '', cursorByteOffset }, prepared);
      assert.equal(result._tag, 'OriginFound');
      if (result._tag === 'OriginFound') assert.equal(result.origin.node, declaration);
    });
  });
});

describe('member receiver traces', () => {
  const thisMember = (name: string, offset: number): ClangNode => ({
    kind: 'MemberExpr', name, inner: [{ kind: 'CXXThisExpr' }],
    range: { begin: { offset }, end: { offset, tokLen: name.length } }
  });
  const method = (id: string, symbol: string, body: readonly ClangNode[]): ClangNode => ({
    kind: 'CXXMethodDecl', id, name: id, symbol, loc: { file: '/fixture.cpp' },
    inner: [{ kind: 'CompoundStmt', inner: body }]
  });
  const memberCall = (callee: string, symbol: string, receiver: ClangNode, start: number): ClangNode => ({
    kind: 'CXXMemberCallExpr', callee: { id: callee, name: callee, symbol },
    range: { begin: { offset: start }, end: { offset: start + 20, tokLen: 1 } },
    inner: [{ kind: 'MemberExpr', name: callee, referencedMemberDecl: callee, inner: [receiver] }]
  });
  const variable = (id: string, offset: number): ClangNode => ({
    kind: 'VarDecl', id, name: id, inner: [{ kind: 'InitListExpr' }],
    range: { begin: { offset }, end: { offset: offset + id.length, tokLen: 1 } }
  });
  const caller = (id: string, statements: readonly ClangNode[]): ClangNode => ({
    kind: 'FunctionDecl', id, name: id, loc: { file: '/fixture.cpp' },
    inner: [{ kind: 'CompoundStmt', inner: statements }]
  });
  const receiver = (id: string, offset: number): ClangNode => ({
    kind: 'DeclRefExpr', referencedDecl: { id, name: id },
    range: { begin: { offset }, end: { offset, tokLen: id.length } }
  });
  const writeIncrement = (rootId: string, rootName: string, offset: number): ClangNode => ({
    kind: 'UnaryOperator', opcode: '++',
    inner: [{ kind: 'MemberExpr', name: 'records', inner: [reference(rootId, rootName, offset)],
      range: { begin: { offset }, end: { offset: offset + rootName.length + 8, tokLen: 1 } } }],
    range: { begin: { offset }, end: { offset: offset + rootName.length + 10, tokLen: 1 } }
  });
  const cursorOptions = { file: '/fixture.cpp', sourceText: ' '.repeat(400), cursorByteOffset: 101 };

  test('maps implicit this to the calling object for mutations', () => {
    const write = writeIncrement('account', 'account', 30);
    const call = memberCall('audit', 'audit-symbol', receiver('account', 60), 50);
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      method('audit', 'audit-symbol', [thisMember('records', 100)]),
      caller('run', [variable('account', 10), write, call])
    ] };
    const prepared = prepareAst(ast);
    const first = analyzeQuery('mutation', ast, cursorOptions, prepared);
    assert.equal(first.result._tag, 'MutationFound');
    if (first.result._tag === 'MutationFound') {
      assert.equal(first.result.mutation.node, write);
      assert.equal(first.result.frames?.length, 1);
      assert.equal(first.result.frames?.[0].parameterIndex, undefined);
      assert.deepEqual(first.result.frames?.[0].receiver, { rootId: 'account', rootName: 'account', members: ['records'] });
    }
    // Local success must not suppress external caller discovery for `audit`.
    assert.equal(first.boundaries.length, 1);
    assert.equal(first.boundaries[0].name, 'audit');
    const settled = analyzeQuery('mutation', ast, { ...cursorOptions, externalCallers: new Map([[first.boundaries[0].wrapped.node, []]]) }, prepared);
    assert.equal(settled.boundaries.length, 0);
    assert.equal(settled.result._tag, 'MutationFound');
  });

  test('maps implicit this to the calling object for origins', () => {
    const declaration = variable('account', 10);
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      method('audit', 'audit-symbol', [thisMember('records', 100)]),
      caller('run', [declaration, memberCall('audit', 'audit-symbol', receiver('account', 60), 50)])
    ] };
    const result = analyzeOriginAst(ast, cursorOptions, prepareAst(ast));
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') {
      assert.equal(result.kind, 'initialization');
      assert.equal(result.origin.node, declaration);
      assert.deepEqual(result.frames?.[0].receiver?.members, ['records']);
    }
  });

  test('maps pointer member calls and keeps this-member suffixes', () => {
    const write: ClangNode = {
      kind: 'BinaryOperator', opcode: '+=',
      inner: [{ kind: 'MemberExpr', name: 'records', inner: [receiver('pointer', 20)], range: { begin: { offset: 20 }, end: { offset: 28, tokLen: 1 } } },
        { kind: 'IntegerLiteral' }],
      range: { begin: { offset: 20 }, end: { offset: 30, tokLen: 1 } }
    };
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      method('audit', 'audit-symbol', [thisMember('records', 100)]),
      caller('run', [variable('account', 10), variable('pointer', 12), write,
        memberCall('audit', 'audit-symbol', { kind: 'ImplicitCastExpr', inner: [receiver('pointer', 60)] }, 50)])
    ] };
    const result = analyzeAst(ast, cursorOptions, prepareAst(ast));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, write);
      assert.equal(result.frames?.[0].receiver?.rootName, 'pointer');
    }
  });

  test('maps two-level member access through the receiver', () => {
    const nestedThis: ClangNode = {
      kind: 'MemberExpr', name: 'records',
      inner: [{ kind: 'MemberExpr', name: 'bank', inner: [{ kind: 'CXXThisExpr' }],
        range: { begin: { offset: 90 }, end: { offset: 95, tokLen: 1 } } }],
      range: { begin: { offset: 90 }, end: { offset: 100, tokLen: 7 } }
    };
    const write: ClangNode = {
      kind: 'UnaryOperator', opcode: '++',
      inner: [{ kind: 'MemberExpr', name: 'records',
        inner: [{ kind: 'MemberExpr', name: 'bank', inner: [reference('session', 'session', 30)],
          range: { begin: { offset: 30 }, end: { offset: 37, tokLen: 1 } } }],
        range: { begin: { offset: 30 }, end: { offset: 45, tokLen: 1 } } }],
      range: { begin: { offset: 30 }, end: { offset: 47, tokLen: 1 } }
    };
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      method('audit', 'audit-symbol', [nestedThis]),
      caller('run', [variable('session', 10), write, memberCall('audit', 'audit-symbol', receiver('session', 60), 50)])
    ] };
    const result = analyzeAst(ast, cursorOptions, prepareAst(ast));
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.equal(result.mutation.node, write);
      assert.deepEqual(result.frames?.[0].receiver, { rootId: 'session', rootName: 'session', members: ['bank', 'records'] });
    }
  });

  test('keeps distinct object paths when two objects call the same method', () => {
    const firstWrite = writeIncrement('first', 'first', 30);
    const secondWrite = writeIncrement('second', 'second', 30);
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      method('audit', 'audit-symbol', [thisMember('records', 100)]),
      caller('run_a', [variable('first', 10), firstWrite, memberCall('audit', 'audit-symbol', receiver('first', 60), 50)]),
      caller('run_b', [variable('second', 10), secondWrite, memberCall('audit', 'audit-symbol', receiver('second', 60), 50)])
    ] };
    const result = analyzeAst(ast, cursorOptions, prepareAst(ast));
    assert.equal(result._tag, 'CandidatesFound');
    if (result._tag === 'CandidatesFound') {
      assert.equal(result.candidates.length, 2);
      assert.deepEqual(result.candidates.map((candidate) => candidate.frames[0].receiver?.rootName).sort(), ['first', 'second']);
    }
  });

  test('reports a boundary instead of guessing an unresolvable receiver', () => {
    const unsupported: ClangNode = { kind: 'CallExpr', range: { begin: { offset: 60 }, end: { offset: 65, tokLen: 1 } } };
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [
      method('audit', 'audit-symbol', [thisMember('records', 100)]),
      caller('run', [variable('account', 10), memberCall('audit', 'audit-symbol', unsupported, 50)])
    ] };
    const prepared = prepareAst(ast);
    const first = analyzeQuery('mutation', ast, cursorOptions, prepared);
    assert.equal(first.result._tag, 'AnalysisFailure');
    assert.equal(first.boundaries.length, 1);
    const settled = analyzeQuery('mutation', ast, { ...cursorOptions, externalCallers: new Map([[first.boundaries[0].wrapped.node, []]]) }, prepared);
    assert.equal(settled.result._tag, 'AnalysisFailure');
    assert.equal(settled.boundaries.length, 0);
  });
});

describe('caller origin and fold context', () => {
  const helper = (id: string, body: readonly ClangNode[], qualType = 'State &'): ClangNode => ({
    kind: 'FunctionDecl', id, name: id, loc: { file: '/fixture.cpp' },
    inner: [{ kind: 'ParmVarDecl', id: id + '-state', name: 'value', type: { qualType } }, { kind: 'CompoundStmt', inner: body }]
  });
  const call = (callee: string, root: string, offset: number): ClangNode => ({
    kind: 'CallExpr', callee: { id: callee, name: callee },
    range: { begin: { offset }, end: { offset: offset + 9, tokLen: 1 } },
    inner: [reference(callee, callee, offset), reference(root, 'value', offset + 2)]
  });
  test('traces three helper parameter mappings to a fold seed', () => {
    const ast = foldAst([call('outer', 'state', 50)], [
      helper('leaf', [member('leaf-state', 'value', 100)]),
      helper('middle', [call('leaf', 'middle-state', 30)]),
      helper('outer', [call('middle', 'outer-state', 20)])
    ]);
    const result = origin(ast);
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') assert.equal(result.origin.node.kind, 'CXXConstructExpr');
  });
  test('preserves every intermediate call frame', () => {
    const mutation = increment('state', 'state', 10);
    const ast = foldAst([mutation, call('outer', 'state', 50), call('outer', 'state', 70)], [
      helper('leaf', [member('leaf-state', 'value', 100)]),
      helper('middle', [call('leaf', 'middle-state', 30)]),
      helper('outer', [call('middle', 'outer-state', 20)])
    ]);
    const result = analyze(ast);
    assert.equal(result._tag, 'CandidatesFound');
    if (result._tag === 'CandidatesFound') assert.deepEqual(result.candidates.map((candidate) => candidate.frames.map((frame) => frame.caller.name)),
      [['middle', 'outer', 'operator()'], ['middle', 'outer', 'operator()']]);
  });
  test('maps a member argument without dropping the callee member suffix', () => {
    const write: ClangNode = { ...increment('state', 'state', 10), inner: [{ ...member('state', 'state', 10),
      inner: [member('state', 'state', 10)] }] };
    const mappedCall = { ...call('leaf', 'state', 50), inner: [reference('leaf', 'leaf', 50), member('state', 'state', 52)] };
    const ast = foldAst([write, mappedCall], [helper('leaf', [member('leaf-state', 'value', 100)])]);
    const result = analyze(ast);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, write);
  });
  test('keeps origin paths distinct even when they reach the same seed', () => {
    const ast = foldAst([call('leaf', 'state', 30), call('leaf', 'state', 60)], [helper('leaf', [member('leaf-state', 'value', 100)])]);
    const result = origin(ast);
    assert.equal(result._tag, 'OriginCandidatesFound');
    if (result._tag === 'OriginCandidatesFound') {
      assert.equal(result.candidates.length, 2);
      assert.equal(result.candidates[0].origin, result.candidates[1].origin);
      assert.notEqual(result.candidates[0].frames[0].callsite, result.candidates[1].frames[0].callsite);
    }
  });
  test('wraps in the calling fold through an independent helper', () => {
    const mutation = increment('state', 'state', 70);
    const ast = foldAst([call('leaf', 'state', 30), mutation], [helper('leaf', [member('leaf-state', 'value', 100)])]);
    const result = analyze(ast);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') { assert.equal(result.mutation.node, mutation); assert.equal(result.wrapped, true); }
  });
  ['State', 'State &', 'State *'].map((qualType) => test('traces origin and entry value for ' + qualType, () => {
    const mutation = increment('state', 'state', 10);
    const ast = foldAst([mutation, call('leaf', 'state', 30)], [helper('leaf', [member('leaf-state', 'value', 100)], qualType)]);
    assert.equal(origin(ast)._tag, 'OriginFound');
    const result = analyze(ast);
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.equal(result.mutation.node, mutation);
  }));
  test('terminates recursive calls at an explicit parameter boundary', () => {
    const ast: ClangNode = { kind: 'TranslationUnitDecl', inner: [helper('leaf', [call('leaf', 'leaf-state', 30), member('leaf-state', 'value', 100)])] };
    const result = origin(ast);
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') assert.match(result.boundary ?? '', /Recursive/);
    assert.equal(analyze(ast)._tag, 'AnalysisFailure');
  });
  test('does not resolve an unknown declaration ID using a matching name', () => {
    const ast = foldAst([{ ...call('leaf', 'state', 30), callee: undefined,
      inner: [reference('unresolved', 'leaf', 30), reference('state', 'value', 32)] }], [helper('leaf', [increment('leaf-state', 'value', 10)])]);
    assert.equal(analyze(ast)._tag, 'AnalysisFailure');
  });
});
