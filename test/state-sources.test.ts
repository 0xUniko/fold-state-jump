import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeQuery, callerLinksAt, prepareAst, type ClangNode, type AnalysisOptions } from '../src/analysis';

const executable = path.resolve('native/build/fold-state-jump-ast');
const file = path.resolve('test/fixtures/state-sources.cpp');
const externalFile = path.resolve('test/fixtures/state-sources-external.cpp');
const text = readFileSync(file, 'utf8');
const externalText = readFileSync(externalFile, 'utf8');
const line = (text: string, marker: string) => {
  const end = text.indexOf(marker + '\n');
  assert.ok(end >= 0, marker);
  return { start: text.lastIndexOf('\n', end) + 1, end };
};
const at = (text: string, name: string, expression: string) => {
  const range = line(text, '// @select ' + name);
  const start = text.indexOf(expression, range.start);
  assert.ok(start >= range.start && start < range.end, name);
  return Buffer.byteLength(text.slice(0, start));
};
const expectAt = (node: { readonly file: string; readonly node: ClangNode }, name: string, kind: 'write' | 'origin', source = text, sourceFile = file) => {
  assert.equal(node.file, sourceFile);
  const range = line(source, '// @' + kind + ' ' + name);
  assert.ok(node.node.range?.begin?.offset !== undefined);
  assert.ok(node.node.range.begin.offset >= range.start && node.node.range.begin.offset < range.end, name + ': ' + node.node.range.begin.offset);
};
const extract = (file: string) => {
  const result = spawnSync(executable, ['--source', file, '--', '-std=c++17'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return prepareAst(JSON.parse(result.stdout));
};

describe('native state value sources', { skip: !existsSync(executable) }, () => {
  const prepared = extract(file);
  const query = (name: string, expression: string, mode: 'mutation' | 'origin' = 'mutation', extra: Partial<AnalysisOptions> = {}) =>
    analyzeQuery(mode, prepared.ast, { file, sourceText: text, cursorByteOffset: at(text, name, expression), ...extra }, prepared);
  const cases = [
    ['direct', ['direct_entry'], [['session_state']]],
    ['moved', ['moved_entry'], [['session_state']]],
    ['aggregate', ['aggregate_entry'], [[]]],
    ['nested', ['nested_entry'], [[]]],
    ['helpers', ['helper_one', 'helper_two', 'helper_entry'], [['session_state'], ['session_state'], []]]
  ] as const;
  cases.map(([name, callers, members]) => it('maps the complete seed entry path: ' + name, () => {
    const mutation = query(name, 'session_state');
    assert.equal(mutation.result._tag, 'MutationFound', JSON.stringify(mutation.diagnostics));
    if (mutation.result._tag !== 'MutationFound') return;
    expectAt(mutation.result.mutation, name, 'write');
    assert.equal(mutation.result.wrapped, false, 'a seed is outside the fold lambda');
    assert.deepEqual(mutation.result.frames?.map((frame) => frame.caller.name), callers);
    assert.deepEqual(mutation.result.frames?.map((frame) => frame.argument?.members), members);
    assert.deepEqual(mutation.result.frames?.map((frame) => frame.parameterIndex), callers.map(() => 0));
    const origin = query(name, 'session_state', 'origin');
    assert.equal(origin.result._tag, 'OriginFound');
    if (origin.result._tag !== 'OriginFound') return;
    expectAt(origin.result.origin, name, 'origin');
    assert.deepEqual(origin.result.frames?.map((frame) => [frame.caller.name, frame.argument?.members]), callers.map((caller, index) => [caller, members[index]]));
  }));
  it('verifies cross-TU calls by USR and maps the aggregate field', () => {
    const external = extract(externalFile);
    const options = { file: externalFile, sourceText: externalText, cursorByteOffset: at(externalText, 'external', 'session_state') };
    const initial = analyzeQuery('mutation', external.ast, options, external);
    assert.equal(initial.boundaries.length, 1);
    const call = text.indexOf('external_seed({');
    const links = callerLinksAt(prepared, file, call, call + 'external_seed'.length, initial.boundaries[0]);
    assert.equal(links.length, 1);
    const externalCallers = new Map([[initial.boundaries[0].wrapped.node, links]]);
    (['mutation', 'origin'] as const).map((mode) => {
      const query = analyzeQuery(mode, external.ast, { ...options, externalCallers }, external);
      assert.equal(query.boundaries.length, 0);
      if (query.result._tag === 'MutationFound') expectAt(query.result.mutation, 'external', 'write');
      else if (query.result._tag === 'OriginFound') expectAt(query.result.origin, 'external', 'origin');
      else assert.fail(query.result._tag);
      const frames = query.result.frames!;
      assert.deepEqual(frames.map((frame) => [frame.caller.name, frame.parameterIndex, frame.argument?.rootName, frame.argument?.members]),
        [['external_entry', 0, 'state', []]]);
    });
  });
  it('retains the source file and field mapping of a caller defined in a header', () => {
    const headerFile = path.resolve('test/fixtures/state-sources.h');
    const headerText = readFileSync(headerFile, 'utf8');
    const external = extract(externalFile);
    const options = { file: externalFile, sourceText: externalText, cursorByteOffset: at(externalText, 'external', 'session_state') };
    const initial = analyzeQuery('mutation', external.ast, options, external);
    const call = headerText.indexOf('external_seed({');
    const links = callerLinksAt(prepared, headerFile, call, call + 'external_seed'.length, initial.boundaries[0]);
    assert.equal(links.length, 1);
    const externalCallers = new Map([[initial.boundaries[0].wrapped.node, links]]);
    (['mutation', 'origin'] as const).map((mode) => {
      const result = analyzeQuery(mode, external.ast, { ...options, externalCallers }, external).result;
      if (result._tag === 'MutationFound') expectAt(result.mutation, 'header', 'write', headerText, headerFile);
      else if (result._tag === 'OriginFound') expectAt(result.origin, 'header', 'origin', headerText, headerFile);
      else assert.fail(result._tag);
      assert.deepEqual(result.frames?.map((frame) => [frame.caller.name, frame.argument?.rootName, frame.argument?.members]), [['header_entry', 'state', []]]);
    });
  });
  it('keeps each caller and its latest pre-call mutation separate', () => {
    const mutation = query('alternatives', 'value');
    assert.equal(mutation.result._tag, 'CandidatesFound');
    if (mutation.result._tag !== 'CandidatesFound') return;
    assert.equal(mutation.result.candidates.length, 2);
    mutation.result.candidates.map((candidate, index) => {
      expectAt(candidate.mutation, index === 0 ? 'alternative-a' : 'alternative-b', 'write');
      assert.deepEqual(candidate.frames.map((frame) => [frame.caller.name, frame.argument?.rootName, frame.argument?.members]),
        [[index === 0 ? 'alternatives_a' : 'alternatives_b', index === 0 ? 'first' : 'second', ['value']]]);
    });
    const origin = query('alternatives', 'value', 'origin');
    assert.equal(origin.result._tag, 'OriginCandidatesFound');
    if (origin.result._tag === 'OriginCandidatesFound') origin.result.candidates.map((candidate, index) =>
      expectAt(candidate.origin, index === 0 ? 'alternative-a' : 'alternative-b', 'origin'));
  });
  it('observes a local copy at construction time', () => {
    const mutation = query('local-copy', 'value');
    assert.equal(mutation.result._tag, 'MutationFound');
    if (mutation.result._tag === 'MutationFound') expectAt(mutation.result.mutation, 'local-copy', 'write');
  });
  it('preserves the suffix through one helper and an aggregate reference alias', () => {
    (['single', 'alias'] as const).map((name) => {
      (['mutation', 'origin'] as const).map((mode) => {
        const result = query(name, 'value', mode).result;
        if (result._tag === 'MutationFound') expectAt(result.mutation, name, 'write');
        else if (result._tag === 'OriginFound') expectAt(result.origin, name, 'origin');
        else assert.fail(result._tag);
        assert.deepEqual(result.frames?.map((frame) => [frame.caller.name, frame.argument?.members]), name === 'single'
          ? [['single_helper', ['session_state', 'value']], ['single_entry', ['value']]]
          : [['alias_entry', ['session_state', 'value']]]);
      });
    });
  });
  it('separates pre-fold seed mutations, round wrap-around, and post-fold writes', () => {
    (['fold-seed', 'fold-round', 'fold-after'] as const).map((name) => {
      const result = query(name, name === 'fold-seed' ? 'session_state' : 'value').result;
      assert.equal(result._tag, 'MutationFound');
      if (result._tag !== 'MutationFound') return;
      expectAt(result.mutation, name, 'write');
      assert.equal(result.wrapped, name === 'fold-round');
    });
    const origin = query('fold-round', 'value', 'origin').result;
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') {
      assert.equal(origin.kind, 'initialization');
      assert.equal(origin.origin.node.kind, 'CXXFunctionalCastExpr');
      const seed = line(text, '// @select fold-seed');
      assert.ok(origin.origin.node.range!.begin!.offset! >= seed.start && origin.origin.node.range!.begin!.offset! < seed.end);
    }
    const noWrite = query('no-fold-write', 'value').result;
    assert.equal(noWrite._tag, 'AnalysisFailure');
    if (noWrite._tag === 'AnalysisFailure') assert.match(noWrite.reason, /No mutation is verified on this fold return path/);
  });
  ['custom', 'custom-parent', 'factory'].map((name) => it('retains an explicit expression boundary: ' + name, () => {
    const mutation = query(name, 'value');
    assert.equal(mutation.result._tag, 'AnalysisFailure');
    if (mutation.result._tag === 'AnalysisFailure') assert.match(mutation.result.reason, /Unsupported argument expression/);
    const origin = query(name, 'value', 'origin');
    assert.equal(origin.result._tag, 'OriginFound');
    if (origin.result._tag === 'OriginFound') {
      assert.equal(origin.result.kind, 'parameter');
      assert.match(origin.result.boundary ?? '', /Unsupported argument expression/);
      assert.equal(origin.result.frames?.length, 1);
    }
  }));
  it('stops whole-object tracing when a nested custom constructor changes its value', () => {
    const result = query('custom-whole', 'parent').result;
    assert.equal(result._tag, 'AnalysisFailure');
    if (result._tag === 'AnalysisFailure') assert.match(result.reason, /field preservation is not verified/);
    const origin = query('custom-whole', 'parent', 'origin').result;
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') assert.match(origin.boundary ?? '', /field preservation is not verified/);
  });
  ['custom-capture', 'pointer-capture'].map((name) => it('does not infer copied capture identity: ' + name, () => {
    const mutation = query(name, 'value').result;
    assert.equal(mutation._tag, 'AnalysisFailure');
    if (mutation._tag === 'AnalysisFailure') assert.match(mutation.reason, /Copy capture.*not verified/);
    const origin = query(name, 'value', 'origin').result;
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') {
      assert.equal(origin.kind, 'parameter');
      assert.equal(origin.origin.node.kind, 'LambdaExpr');
      assert.match(origin.boundary ?? '', /Copy capture.*not verified/);
    }
  }));
  ['reference-member-copy', 'pointer-member-copy'].map((name) => it('stops at shared subobject identity in a copied record: ' + name, () => {
    const mutation = query(name, 'value').result;
    assert.equal(mutation._tag, 'AnalysisFailure');
    if (mutation._tag === 'AnalysisFailure') assert.match(mutation.reason, /field preservation is not verified/);
    const origin = query(name, 'value', 'origin').result;
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') assert.match(origin.boundary ?? '', /field preservation is not verified/);
  }));
  it('does not treat optional of a custom value as a storage-transfer move', () => {
    const mutation = query('optional-copy', 'session').result;
    assert.equal(mutation._tag, 'AnalysisFailure');
    if (mutation._tag === 'AnalysisFailure') assert.match(mutation.reason, /field preservation is not verified/);
    const origin = query('optional-copy', 'session', 'origin').result;
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') assert.match(origin.boundary ?? '', /field preservation is not verified/);
  });
  it('does not confuse pointer rebinding with a pointee write', () => {
    const rebind = query('rebind', 'p');
    assert.equal(rebind.result._tag, 'AnalysisFailure');
    if (rebind.result._tag === 'AnalysisFailure') assert.match(rebind.result.reason, /Pointer was rebound/);
    const pointer = query('pointer', 'p');
    assert.equal(pointer.result._tag, 'MutationFound');
    if (pointer.result._tag === 'MutationFound') expectAt(pointer.result.mutation, 'pointer', 'write');
    const stable = query('stable-pointee', 'p');
    assert.equal(stable.result._tag, 'MutationFound');
    if (stable.result._tag === 'MutationFound') expectAt(stable.result.mutation, 'stable-pointee', 'write');
    const nested = query('nested-rebind', 'p').result;
    assert.equal(nested._tag, 'AnalysisFailure');
    if (nested._tag === 'AnalysisFailure') assert.match(nested.reason, /Pointer was rebound/);
    assert.equal(query('pointer-subscript', 'p').result._tag, 'AnalysisFailure');
    const helper = query('pointer-helper-rebind', 'p').result;
    assert.equal(helper._tag, 'AnalysisFailure');
    if (helper._tag === 'AnalysisFailure') assert.match(helper.reason, /Pointer was rebound/);
  });
  it('uses the cursor time for pointee origins instead of later pointer assignments', () => {
    const mutation = query('pointer-before', 'value').result;
    assert.equal(mutation._tag, 'MutationFound');
    if (mutation._tag === 'MutationFound') expectAt(mutation.mutation, 'pointer-before', 'write');
    const before = query('pointer-before', 'value', 'origin').result;
    assert.equal(before._tag, 'OriginFound');
    if (before._tag === 'OriginFound') expectAt(before.origin, 'pointer-before', 'origin');
    const after = query('pointer-after', 'value', 'origin').result;
    assert.equal(after._tag, 'OriginFound');
    if (after._tag === 'OriginFound') {
      assert.equal(after.kind, 'parameter');
      assert.match(after.boundary ?? '', /Pointer was rebound/);
    }
  });
  it('preserves constant element identity and stops at unknown subscripts', () => {
    const known = query('array-zero', 'values');
    assert.equal(known.result._tag, 'MutationFound');
    if (known.result._tag === 'MutationFound') expectAt(known.result.mutation, 'array-zero', 'write');
    const unknown = query('array-unknown', 'values');
    assert.equal(unknown.result._tag, 'AnalysisFailure');
    if (unknown.result._tag === 'AnalysisFailure') assert.match(unknown.result.reason, /Unsupported write identity/);
    const helper = query('array-helper', 'value').result;
    assert.equal(helper._tag, 'AnalysisFailure');
    if (helper._tag === 'AnalysisFailure') assert.match(helper.reason, /Unsupported write identity/);
  });
  it('labels source-order candidates without claiming runtime reachability', () => {
    const result = query('conditional', 'value');
    assert.equal(result.result._tag, 'MutationFound');
    if (result.result._tag === 'MutationFound') expectAt(result.result.mutation, 'conditional', 'write');
  });
  it('does not fabricate a mutation for an initialized field', () => {
    const mutation = query('no-mutation', 'value');
    assert.equal(mutation.result._tag, 'AnalysisFailure');
    if (mutation.result._tag === 'AnalysisFailure') assert.match(mutation.result.reason, /initialized here/);
    const origin = query('no-mutation', 'value', 'origin');
    assert.equal(origin.result._tag, 'OriginFound');
    if (origin.result._tag === 'OriginFound') assert.equal(origin.result.origin.node.kind, 'IntegerLiteral');
  });
});
