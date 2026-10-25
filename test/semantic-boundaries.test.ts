import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeQuery, byteOffsetFromUtf16, prepareAst } from '../src/analysis';

const file = path.resolve('test/fixtures/semantic-boundaries.cpp');
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
const query = (name: string, expression = 'value', mode: 'mutation' | 'origin' = 'mutation') =>
  analyzeQuery(mode, prepared.ast, { file, sourceText: text, cursorByteOffset: selected(name, expression) }, prepared);

describe('verified state transitions (real Clang AST)', () => {
  ['unknown-ref', 'unknown-ptr', 'shared-reference', 'shared-pointer', 'shared-reference-alias', 'shared-pointer-alias', 'callback-unknown', 'alias-unknown', 'constructor-effect', 'thread-effect', 'possible-alias'].map((name) =>
    it('stops before an unverified effect: ' + name, () => {
      const result = query(name).result;
      assert.equal(result._tag, 'AnalysisFailure', name);
      if (result._tag === 'AnalysisFailure') assert.match(result.reason, /Unverified call effect|Shared storage/);
    }));
  it('stops at a shared smart-pointer effect without inventing pointee identity', () => {
    const result = query('shared-smart').result;
    assert.equal(result._tag, 'AnalysisFailure');
    if (result._tag === 'AnalysisFailure') assert.match(result.reason, /Unverified call effect|Shared storage|expression path/);
  });
  ['lambda-unknown', 'lambda-helper'].map((name) => it('requires a verified reference-capture invocation: ' + name, () => {
    const result = query(name).result;
    assert.equal(result._tag, 'AnalysisFailure');
    if (result._tag === 'AnalysisFailure') assert.match(result.reason, /invocation/);
    const origin = query(name, 'value', 'origin').result;
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') assert.match(origin.boundary ?? '', /invocation/);
  }));
  ['unrelated', 'lambda-direct', 'lambda-snapshot', 'assignment-order', 'pointer-binding', 'pointer-copy', 'readonly-callback'].map((name) => it('retains the exact proven write: ' + name, () => {
    const result = query(name, name === 'pointer-binding' ? 'p' : 'value').result;
    assert.equal(result._tag, 'MutationFound');
    if (result._tag !== 'MutationFound') return;
    assert.equal(result.mutation.file, file);
    const start = result.mutation.node.range!.begin!.offset!;
    const end = text.indexOf('// @write ' + name + '\n');
    assert.ok(start >= text.lastIndexOf('\n', end) + 1 && start < end, name);
    assert.equal(result.wrapped, false);
    assert.equal(result.frames?.length, name === 'lambda-direct' ? 1 : 0);
  }));
  it('returns an explicit boundary for a function result instead of an older unrelated write', () => {
    const result = query('returned').result;
    assert.equal(result._tag, 'AnalysisFailure');
    if (result._tag === 'AnalysisFailure') assert.match(result.reason, /Unsupported argument expression: CallExpr/);
  });
  it('does not infer fold wrap-around from a substring in a different callable name', () => {
    const result = query('similar-name').result;
    assert.equal(result._tag, 'AnalysisFailure');
  });
});
