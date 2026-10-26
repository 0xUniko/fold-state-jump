import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeQuery, expressionPath, prepareAst, type ReturnSource, type WrappedNode } from '../src/analysis';

const file = path.resolve('test/fixtures/pending-fold.cpp');
const sourceText = readFileSync(file, 'utf8');
const extracted = spawnSync(path.resolve('native/build/fold-state-jump-ast'), ['--source', file, '--', '-std=c++23'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
assert.equal(extracted.status, 0, extracted.stderr);
const prepared = prepareAst(JSON.parse(extracted.stdout));
const line = (marker: string) => {
  const end = sourceText.indexOf(marker + '\n');
  assert.ok(end >= 0, marker);
  return { start: sourceText.lastIndexOf('\n', end) + 1, end };
};
const query = (name: string, mode: 'mutation' | 'origin' = 'mutation') => {
  const selected = line('// @select ' + name);
  const offset = sourceText.lastIndexOf(name === 'custom-arrow' ? 'layer' : 'pending', selected.end);
  assert.ok(offset >= selected.start && offset < selected.end, name);
  return analyzeQuery(mode, prepared.ast, { file, sourceText, cursorByteOffset: Buffer.byteLength(sourceText.slice(0, offset)) }, prepared);
};
const expectAt = (wrapped: WrappedNode, marker: string) => {
  const expected = line(marker);
  const offset = wrapped.node.range?.begin?.offset;
  assert.equal(wrapped.file, file);
  assert.ok(offset !== undefined && offset >= expected.start && offset < expected.end, marker + ': ' + offset);
};

describe('optional projections and fold recurrence (native AST)', () => {
  ['exists', 'arrow', 'reset'].map((name) => it('traces the previous iteration through a preserved SessionState pointer: ' + name, () => {
    const q = query(name);
    assert.equal(q.result._tag, 'MutationFound', JSON.stringify(q.diagnostics));
    if (q.result._tag !== 'MutationFound') return;
    expectAt(q.result.mutation, '// @write replacement');
    assert.equal(q.result.wrapped, true);
    assert.equal(q.returnMapping, undefined);
    assert.equal(q.diagnostics?.length, 1);
    assert.match(q.diagnostics![0], /first iteration uses the initial state/);
    assert.deepEqual(q.boundaries.map((fn) => fn.name), ['start']);
    const frames = q.result.frames!;
    assert.deepEqual(frames.map((frame) => frame.fold ? 'fold_left' : frame.callsite.node.callee?.name), ['start', 'operator()', 'fold_left', 'operator()', 'finish']);
    assert.deepEqual(frames[0].argument?.members, ['session_state', '*', 'bank_state', 'pending']);
    const fold = frames.find((frame) => frame.fold)!.fold!;
    assert.equal(fold.kind, 'borrow-preserved');
    assert.deepEqual(fold.source, fold.target);
    assert.deepEqual(fold.target.members, ['session_state', '*', 'bank_state', 'pending']);
    expectAt(fold.initial, '// @seed execute');
    expectAt(fold.statement, '// @return execute');
    assert.equal(fold.invariantObservations.length, 1);
    const replacement = q.result.mutation;
    const returnedCall = prepared.index.calls.find((call) => call.ancestors.includes(replacement.node))!;
    assert.equal(returnedCall.node.callee?.name, 'begin_prefetch');
    const returnedFunction = prepared.index.functionsById.get(returnedCall.node.callee!.id)!;
    assert.equal(returnedFunction.params[0].node.parameterEffect, 'value');
    const returns = prepared.index.returnSourcesByFunctionId.get(returnedFunction.id)!;
    assert.equal(returns.length, 2);
    const storageSource = (source: ReturnSource): ReturnSource => source.kind === 'transparent' || source.kind === 'preserved-copy' ? storageSource(source.source) : source;
    returns.map((branch) => {
      const source = storageSource(branch.source);
      if (source.kind !== 'storage') return assert.fail(source.kind);
      assert.equal(source.target.rootId, returnedFunction.params[0].node.id);
    });
    const fieldWrite = prepared.index.writesByFunctionId.get(returnedFunction.id)!.get(returnedFunction.params[0].node.id!)![0];
    expectAt(fieldWrite.mutation, '// @write pending');
    assert.deepEqual(fieldWrite.target.members, ['pending']);
    // A by-value local update is not the caller's mutation. The replacement
    // above is the transition that installs the returned BankState.
    assert.notEqual(fieldWrite.target.rootId, expressionPath(replacement.children[1])?.rootId);
    const origin = query(name, 'origin');
    assert.equal(origin.result._tag, 'OriginFound');
    if (origin.result._tag !== 'OriginFound') return;
    expectAt(origin.result.origin, '// @seed execute');
    assert.match(origin.result.boundary ?? '', /initial storage.*current member value/);
    assert.equal(origin.result.kind, 'initialization');
  }));

  ['local-exists', 'local-arrow', 'local-reset'].map((name) => it('keeps optional presence and arrow reads free of mutation effects: ' + name, () => {
    const q = query(name);
    assert.equal(q.result._tag, 'MutationFound');
    if (q.result._tag !== 'MutationFound') return;
    expectAt(q.result.mutation, '// @write optional');
    assert.deepEqual(q.diagnostics, []);
    assert.equal(q.result.wrapped, false);
  }));
  it('indexes optional reset as the real transition after consumption', () => {
    const q = query('after-reset');
    assert.equal(q.result._tag, 'MutationFound');
    if (q.result._tag === 'MutationFound') expectAt(q.result.mutation, '// @select local-reset');
  });
  [
    ['custom-arrow', /operator->/],
    ['projected-write', /aliased write/],
    ['projected-escape', /opaque/],
    ['different-return', /returned storage identity/],
    ['unverified-effect', /opaque/],
    ['unstable-phase', /opaque/],
    ['retained-variant', /opaque/],
    ['first-layer', /No earlier mutation before local initialization/],
    ['singleton', /at most one iteration/]
  ].map(([name, reason]) => it('retains the proof boundary: ' + name, () => {
    const q = query(name as string);
    assert.equal(q.result._tag, 'AnalysisFailure', JSON.stringify(q.diagnostics));
    if (q.result._tag === 'AnalysisFailure') assert.match(q.result.reason, reason as RegExp);
  }));
  it('preserves optional contained storage paths and qualifies every native operation', () => {
    const arrow = prepared.index.calls.find((call) => call.node.storageOperation === 'optional-arrow')!;
    assert.match(arrow.node.callee?.qualifiedName ?? '', /^std::optional/);
    const layer = prepared.index.all.find((wrapped) => wrapped.node.kind === 'MemberExpr' && wrapped.node.name === 'layer' &&
      wrapped.node.range?.begin?.offset === arrow.node.range?.begin?.offset)!;
    assert.deepEqual(expressionPath(layer)?.members, ['pending', 'reservation', 'layer']);
    const custom = prepared.index.calls.find((call) => call.node.callee?.qualifiedName === 'UserArrow::operator->')!;
    assert.equal(custom.node.storageOperation, undefined);
    assert.ok(prepared.index.calls.some((call) => call.node.storageOperation === 'optional-observe'));
    assert.ok(prepared.index.all.some((wrapped) => wrapped.node.variantAlternative));
    assert.ok(prepared.index.calls.some((call) => call.node.variantProjection));
  });
  it('keeps the first-layer empty origin separate from a prior-iteration write', () => {
    const q = query('first-layer', 'origin');
    assert.equal(q.result._tag, 'OriginFound');
    if (q.result._tag === 'OriginFound') {
      expectAt(q.result.origin, '// @origin first-layer');
      assert.equal(q.result.boundary, undefined);
    }
  });
  it('executes empty, predicted and mismatching reservation branches', () => {
    const executable = '/tmp/fsj-pending-runtime-' + process.pid;
    const compiled = spawnSync('/usr/lib/llvm-23/bin/clang++', ['-std=c++23', '-DFSJ_PENDING_RUNTIME', file, '-o', executable], { encoding: 'utf8' });
    assert.equal(compiled.status, 0, compiled.stderr);
    try {
      const ran = spawnSync(executable, [], { encoding: 'utf8' });
      assert.equal(ran.status, 0, ran.stderr);
    } finally { rmSync(executable, { force: true }); }
  });
});
