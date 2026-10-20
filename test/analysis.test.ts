import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAst, analyzeOriginAst, buildTree, byteOffsetFromUtf16, utf16OffsetFromByte, expressionPath, type ClangNode, type WrappedNode } from '../src/analysis';

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
