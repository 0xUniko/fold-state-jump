import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAst, analyzeOriginAst, buildTree, byteOffsetFromUtf16, utf16OffsetFromByte, expressionPath, prepareAst, type ClangNode, type WrappedNode } from '../src/analysis';

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
                { kind: 'CompoundStmt', inner: statements }
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

describe('persistent AST ancestry', () => {
  test('preserves lexical ancestor order and sibling file inheritance', () => {
    const ast: ClangNode = {
      kind: 'TranslationUnitDecl',
      inner: [
        { kind: 'FunctionDecl', id: 'outer', loc: { file: '/a.cpp' }, inner: [
          { kind: 'CompoundStmt', inner: [
            { kind: 'DeclRefExpr', referencedDecl: { id: 'value', name: 'value' } }
          ] }
        ] },
        { kind: 'FunctionDecl', id: 'other', inner: [{ kind: 'CompoundStmt' }] }
      ]
    };
    const all = buildTree(ast).all;
    assert.deepEqual(all[3].ancestors.map((node) => node.kind), [
      'TranslationUnitDecl', 'FunctionDecl', 'CompoundStmt'
    ]);
    assert.deepEqual(all[3].ancestors.map((node) => node.id), [
      undefined, 'outer', undefined
    ]);
    assert.equal(all[4].file, '/a.cpp');
    assert.deepEqual(all[4].ancestors.map((node) => node.kind), ['TranslationUnitDecl']);
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
});
