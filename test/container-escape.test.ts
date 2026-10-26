import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeQuery, byteOffsetFromUtf16, prepareAst } from '../src/analysis';

const file = path.resolve('test/fixtures/container-escape.cpp');
const text = readFileSync(file, 'utf8');
const extracted = spawnSync(path.resolve('native/build/fold-state-jump-ast'), ['--source', file, '--', '-std=c++17'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
assert.equal(extracted.status, 0, extracted.stderr);
const prepared = prepareAst(JSON.parse(extracted.stdout));
const selected = (name: string, expression: string) => {
  const marker = text.indexOf('// @select ' + name + '\n');
  assert.ok(marker >= 0, name);
  const start = text.indexOf(expression, text.lastIndexOf('\n', marker) + 1);
  assert.ok(start >= 0 && start < marker, name);
  return byteOffsetFromUtf16(text, start);
};
const query = (name: string, expression = 'value') =>
  analyzeQuery('mutation', prepared.ast, { file, sourceText: text, cursorByteOffset: selected(name, expression) }, prepared);
const markedLine = (name: string, marker: string) => {
  const end = text.indexOf('// ' + marker + ' ' + name + '\n');
  assert.ok(end >= 0, name);
  return { start: text.lastIndexOf('\n', end) + 1, end };
};

describe('container argument escape (real Clang AST)', () => {
  ['push-back-pointer', 'push-back-refwrapper', 'emplace-pointer', 'emplace-back-refwrapper',
    'insert-pointer', 'insert-refwrapper', 'pointer-variable', 'alias-reference'].map((name) =>
    it('stops at the container call that stores the target: ' + name, () => {
      const result = query(name).result;
      assert.equal(result._tag, 'AnalysisFailure', name);
      if (result._tag !== 'AnalysisFailure') return;
      assert.match(result.reason, /stores the target address or reference/, name);
      const boundary = /:(\d+): Unverified call effect/.exec(result.reason);
      assert.ok(boundary, name);
      const offset = Number(boundary[1]);
      const line = markedLine(name, '@escape');
      assert.ok(offset >= line.start && offset < line.end, name);
    }));
});

describe('container calls without a target escape (real Clang AST)', () => {
  ['by-value-copy', 'unrelated-pointer', 'readonly-parameter', 'escape-then-direct-write'].map((name) =>
    it('retains the exact proven write: ' + name, () => {
      const result = query(name).result;
      assert.equal(result._tag, 'MutationFound', name);
      if (result._tag !== 'MutationFound') return;
      assert.equal(result.mutation.file, file);
      const start = result.mutation.node.range!.begin!.offset!;
      const line = markedLine(name, '@write');
      assert.ok(start >= line.start && start < line.end, name);
      assert.equal(result.wrapped, false);
      assert.equal(result.frames?.length ?? 0, 0);
    }));
  it('resolves a container mutation of the queried container itself', () => {
    const result = query('container-self', 'records').result;
    assert.equal(result._tag, 'MutationFound');
    if (result._tag !== 'MutationFound') return;
    const start = result.mutation.node.range!.begin!.offset!;
    const line = markedLine('container-self', '@write');
    assert.ok(start >= line.start && start < line.end);
    assert.equal(result.wrapped, false);
  });
});
