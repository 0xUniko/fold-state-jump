import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const { analyzeQuery, prepareAst }: typeof import('../src/analysis') =
  await import(process.env.FSJ_ANALYSIS_MODULE ?? '../src/analysis');

const file = path.resolve('test/fixtures/storage-alias.cpp');
const text = readFileSync(file, 'utf8');
const extracted = spawnSync(path.resolve(process.env.FSJ_AST_EXTRACTOR ?? 'native/build/fold-state-jump-ast'), ['--source', file, '--', '-std=c++20'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
assert.equal(extracted.status, 0, extracted.stderr);
const prepared = prepareAst(JSON.parse(extracted.stdout));
const marked = (name: string, marker: string) => {
  const end = text.indexOf('// @' + marker + ' ' + name + '\n');
  assert.ok(end >= 0, name);
  const start = text.lastIndexOf('\n', end) + 1;
  return { start, end, code: text.slice(start, end).trim() };
};
const query = (name: string, expression = 'value') => {
  const line = marked(name, 'select');
  const offset = text.lastIndexOf(expression, line.end);
  assert.ok(offset < line.end && offset >= line.start, name);
  return analyzeQuery('mutation', prepared.ast, { file, sourceText: text, cursorByteOffset: offset }, prepared).result;
};
const failures = [
  'aggregate', 'nested', 'reference-member', 'aggregate-assignment', 'aggregate-unknown',
  'span', 'span-unknown', 'local-ref-get', 'local-cref-get', 'direct-cref', 'stored-ref', 'stored-cref',
  'wrapper-copy', 'shared-copy', 'unique-move', 'pointer-pointee', 'pointer-rebound', 'pointer-late-bound',
  'conditional-rebound', 'const-mutable', 'copy-snapshot', 'pointer-snapshot', 'span-copy', 'array-view',
  'unknown-rebind', 'shared-move', 'unique-local-move', 'indirect-ref', 'ref-pointer', 'ref-holder', 'wrapper-move', 'unknown-factory', 'allocated-aggregate', 'retained-wrapper', 'unknown-pointer-alias', 'sum-provenance', 'frozen-reference', 'reference-live-pointer', 'reference-live-field'
];
const successes = ['value-member', 'unrelated-holder', 'aggregate-reset', 'aggregate-direct', 'span-unrelated',
  'cref-only', 'unique-unrelated', 'pointer-known-rebound', 'copy-unrelated-snapshot', 'proved-readonly', 'nominal-resource', 'allocated-value', 'readonly-wrapper-get', 'wrapper-value-copy', 'unrelated-wrapper-get', 'sum-unrelated', 'frozen-unrelated-reference', 'reference-live-unrelated-pointer', 'reference-live-unrelated-field'];
describe('storage identity and alias boundaries (real Clang AST)', () => {
  it('resolves every emitted storage type reference', () => {
    prepared.index.all.filter((wrapped) => wrapped.node.type?.storageId).map((wrapped) =>
      assert.ok(wrapped.storage, wrapped.node.type?.qualType ?? wrapped.node.kind));
  });
  [...failures.map((name) => [name, 'value'] as const), ['string-view', 'state'],
    ['pointer-address', 'pointer'], ['rebind-pointee', 'value']].map(([name, expression]) =>
    it('stops at the exact unproved effect: ' + name, () => {
      const result = query(name, expression);
      assert.equal(result._tag, 'AnalysisFailure', name);
      if (result._tag !== 'AnalysisFailure') assert.fail(name);
      const reason = name === 'rebind-pointee' ? /Pointer was rebound; pointee identity is not verified/ :
        name === 'const-mutable' ? /Unverified call effect.*: readonly;/ :
        name.endsWith('-get') || name === 'retained-wrapper' ? /Unverified call effect.*: get;/ :
        name === 'aggregate-unknown' ? /Unverified call effect.*: unknown_holder;/ :
        name === 'span-unknown' ? /Unverified call effect.*: unknown_view;/ :
        name === 'sum-provenance' ? /Unverified call effect.*: finish;/ : /stores the target address or reference/;
      assert.match(result.reason, reason, name);
      const line = marked(name, 'boundary');
      const offset = Number(/:(\d+): /.exec(result.reason)?.[1]);
      assert.equal(offset, line.start + (name === 'retained-wrapper' ? text.slice(line.start, line.end).indexOf('wrapper.get') :
        text.slice(line.start, line.end).search(/\S/)), result.reason);
      assert.ok(result.reason.includes(file + ':'), result.reason);
    }));
  [...successes.map((name) => [name, 'value'] as const), ['string-value', 'state'],
    ['pointer-self', 'pointer'], ['rebind-self', 'pointer']].map(([name, expression]) =>
    it('retains the exact proven write: ' + name, () => {
      const result = query(name, expression);
      assert.equal(result._tag, 'MutationFound', name);
      if (result._tag !== 'MutationFound') assert.fail(name);
      const line = marked(name, 'write');
      assert.equal(result.mutation.file, file);
      assert.equal(result.mutation.node.range?.begin?.offset, line.start + text.slice(line.start, line.end).search(/\S/));
      assert.equal(result.wrapped, false);
      assert.deepEqual(result.frames, []);
    }));
});
