'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { byteOffsetFromUtf16, utf16OffsetFromByte, expressionPath } = require('../src/analysis');

test('converts UTF-16 editor offsets to UTF-8 byte offsets', () => {
  const source = 'a😀b';
  assert.equal(byteOffsetFromUtf16(source, 3), 5);
  assert.equal(utf16OffsetFromByte(source, 5), 3);
});

test('resolves nested member paths from Clang-like AST nodes', () => {
  const state = { node: { kind: 'DeclRefExpr', referencedDecl: { id: 'state-id', name: 'state' } }, children: [] };
  const a = { node: { kind: 'MemberExpr', name: 'a' }, children: [state] };
  const b = { node: { kind: 'MemberExpr', name: 'b' }, children: [a] };
  assert.deepEqual(expressionPath(b), { rootId: 'state-id', rootName: 'state', members: ['a', 'b'] });
});
