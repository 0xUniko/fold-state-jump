import { describe, expect, test } from 'bun:test';
import { byteOffsetFromUtf16, utf16OffsetFromByte, expressionPath, type WrappedNode } from '../src/analysis';

const wrapped = (node: WrappedNode['node'], children: readonly WrappedNode[] = []): WrappedNode => ({
  node,
  children,
  ancestors: [],
  file: '/fixture.cpp'
});

describe('source offsets', () => {
  test('converts UTF-16 editor offsets to UTF-8 byte offsets', () => {
    const source = 'a😀b';
    expect(byteOffsetFromUtf16(source, 3)).toBe(5);
    expect(utf16OffsetFromByte(source, 5)).toBe(3);
  });
});

describe('expression paths', () => {
  test('resolves nested member paths from the declaration identity', () => {
    const state = wrapped({ kind: 'DeclRefExpr', referencedDecl: { id: 'state-id', name: 'state' } });
    const a = wrapped({ kind: 'MemberExpr', name: 'a' }, [state]);
    const b = wrapped({ kind: 'MemberExpr', name: 'b' }, [a]);
    expect(expressionPath(b)).toEqual({
      rootId: 'state-id',
      rootName: 'state',
      members: ['a', 'b']
    });
  });

  test('returns no path for an unsupported expression', () => {
    expect(expressionPath(wrapped({ kind: 'IntegerLiteral' }))).toBeNull();
  });
});
