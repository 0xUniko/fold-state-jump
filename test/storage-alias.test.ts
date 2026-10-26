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
  'callback-projection-invoke', 'cyclic-unknown', 'known-receiver-alias', 'receiver-related', 'pointer-alias-write', 'helper-unknown-after', 'helper-pointer-after', 'known-callback', 'callback-unknown', 'nested-callback-unknown', 'erased-pointer', 'inherited-pointer', 'mixed-unknown', 'deep-unknown', 'callback-call',
  'aggregate', 'nested', 'reference-member', 'aggregate-assignment', 'aggregate-unknown',
  'span', 'span-unknown', 'local-ref-get', 'local-cref-get', 'direct-cref', 'stored-ref', 'stored-cref',
  'wrapper-copy', 'shared-copy', 'unique-move', 'pointer-pointee', 'pointer-rebound', 'pointer-late-bound',
  'conditional-rebound', 'const-mutable', 'copy-snapshot', 'pointer-snapshot', 'span-copy', 'array-view',
  'unknown-rebind', 'shared-move', 'unique-local-move', 'indirect-ref', 'ref-pointer', 'ref-holder', 'wrapper-move', 'unknown-factory', 'allocated-aggregate', 'retained-wrapper', 'unknown-pointer-alias', 'sum-provenance', 'frozen-reference', 'reference-live-pointer', 'reference-live-field'
];
const successes = ['callback-projection-read', 'known-receiver-disjoint', 'readonly-receiver-alias', 'receiver-unrelated', 'pointer-alias-later-write', 'pointer-disjoint-write', 'empty-callback', 'callback-later-write', 'unrelated-inherited-pointer', 'mixed-known', 'value-member', 'unrelated-holder', 'aggregate-reset', 'aggregate-direct', 'span-unrelated',
  'cref-only', 'unique-unrelated', 'pointer-known-rebound', 'copy-unrelated-snapshot', 'proved-readonly', 'nominal-resource', 'allocated-value', 'readonly-wrapper-get', 'wrapper-value-copy', 'unrelated-wrapper-get', 'sum-unrelated', 'frozen-unrelated-reference', 'reference-live-unrelated-pointer', 'reference-live-unrelated-field'];
describe('storage identity and alias boundaries (real Clang AST)', () => {
  it('resolves every field, element and pointee in the interned type graph', () => {
    prepared.index.all.filter((wrapped) => wrapped.node.receiverStorageId).map((wrapped) =>
      assert.ok(prepared.ast.storageTypes?.[wrapped.node.receiverStorageId!], wrapped.node.receiverStorageId ?? wrapped.node.kind));
    Object.values(prepared.ast.storageTypes ?? {}).map((storage) => {
      const references = storage.kind === 'aggregate' ? storage.fields.map((field) => field.storageId)
        : storage.kind === 'pointer' || storage.kind === 'reference' ? [storage.pointee]
        : storage.kind === 'array' ? [storage.element] : [];
      references.map((storageId) => assert.ok(prepared.ast.storageTypes?.[storageId], storageId));
      assert.ok(!storage.reachability.identities.includes('?'));
      if (storage.reachability.kind === 'incomplete') assert.ok(storage.reachability.reasons.length > 0);
    });
  });
  it('completes deep finite type graphs without truncating field descriptors', () => {
    const declaration = [...prepared.index.declarations.values()].find((wrapped) => wrapped.node.type?.qualType === 'Deep69');
    assert.ok(declaration?.storage);
    assert.equal(declaration.storage.kind, 'aggregate');
    assert.equal(declaration.storage.reachability.kind, 'complete');
    const state = [...prepared.index.declarations.values()].find((wrapped) => wrapped.node.name === 'state' && wrapped.node.type?.qualType === 'State &')?.storage;
    assert.ok(state);
    assert.ok(declaration.storage.reachability.identities.includes(state.identity));
  });
  it('uses a later verified helper write after an unknown callback', () => {
    const result = query('helper-unknown-before');
    assert.equal(result._tag, 'MutationFound');
    if (result._tag !== 'MutationFound') assert.fail('helper-unknown-before');
    const line = marked('helper-unknown-before', 'helper-write');
    assert.equal(result.mutation.file, file);
    assert.equal(result.mutation.node.range?.begin?.offset, line.start + text.slice(line.start, line.end).search(/\S/));
    assert.deepEqual(result.frames?.map((frame) => frame.caller.name), ['helper_before']);
    assert.equal(result.wrapped, false);
  });
  it('retains object Origin across uncertain mutation effects', () => {
    const line = marked('callback-unknown', 'select');
    const result = analyzeQuery('origin', prepared.ast, { file, sourceText: text,
      cursorByteOffset: text.lastIndexOf('value', line.end) }, prepared).result;
    assert.equal(result._tag, 'OriginFound');
    if (result._tag !== 'OriginFound') assert.fail('callback-unknown origin');
    assert.equal(result.origin.node.kind, 'ParmVarDecl');
    assert.match(result.boundary ?? '', /No verified caller/);
  });
  it('reports the pointer Origin boundary at the actual rebinding offset', () => {
    const line = marked('rebind-pointee', 'select');
    const result = analyzeQuery('origin', prepared.ast, { file, sourceText: text,
      cursorByteOffset: text.lastIndexOf('value', line.end) }, prepared).result;
    assert.equal(result._tag, 'OriginFound');
    if (result._tag !== 'OriginFound') assert.fail('rebind-pointee origin');
    const boundary = marked('rebind-pointee', 'boundary');
    assert.match(result.boundary ?? '', /Pointer was rebound/);
    assert.ok(result.boundary?.includes(file + ':' + (boundary.start + text.slice(boundary.start, boundary.end).search(/\S/)) + ':'));
  });
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
      const reason = name === 'callback-projection-invoke' ? /Unverified call effect.*: operator\(\);/ :
        name === 'known-receiver-alias' ? /Unverified call effect.*: set_value;/ :
        name === 'pointer-alias-write' ? /Unverified aliased write/ :
        name === 'helper-pointer-after' ? /Unverified call effect.*: helper_pointer_after;/ :
        name === 'helper-unknown-after' ? /Unverified call effect.*: helper_unknown_after;/ :
        name === 'callback-call' ? /Unverified call effect.*: operator\(\);/ :
        name === 'rebind-pointee' ? /Pointer was rebound; pointee identity is not verified/ :
        name === 'const-mutable' ? /Unverified call effect.*: readonly;/ :
        name.endsWith('-get') || name === 'retained-wrapper' ? /Unverified call effect.*: get;/ :
        name === 'aggregate-unknown' ? /Unverified call effect.*: unknown_holder;/ :
        name === 'span-unknown' ? /Unverified call effect.*: unknown_view;/ :
        name === 'sum-provenance' ? /Unverified call effect.*: finish;/ : /stores the target address or reference/;
      assert.match(result.reason, reason, name);
      const line = marked(name, 'boundary');
      const offset = Number(/:(\d+): /.exec(result.reason)?.[1]);
      assert.equal(offset, line.start + (name === 'retained-wrapper' ? text.slice(line.start, line.end).indexOf('wrapper.get') :
        name === 'callback-projection-invoke' ? text.slice(line.start, line.end).indexOf('(*callback)') :
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
