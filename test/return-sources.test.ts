import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeQuery, prepareAst, type ClangNode, type WrappedNode, type TraceFrame } from '../src/analysis';

const file = path.resolve('test/fixtures/return-sources.cpp');
const text = readFileSync(file, 'utf8');
const extracted = spawnSync(path.resolve('native/build/fold-state-jump-ast'), ['--source', file, '--', '-std=c++20'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
assert.equal(extracted.status, 0, extracted.stderr);
const prepared = prepareAst(JSON.parse(extracted.stdout) as ClangNode);
const lineAt = (marker: string) => {
  const end = text.indexOf(marker + '\n');
  assert.ok(end >= 0, marker);
  return { start: text.lastIndexOf('\n', end) + 1, end };
};
const at = (name: string, token = 'value') => {
  const line = lineAt('// @select ' + name);
  const offset = text.lastIndexOf(token, line.end);
  assert.ok(offset >= line.start && offset < line.end, name);
  return Buffer.byteLength(text.slice(0, offset));
};
const query = (name: string, mode: 'mutation' | 'origin' = 'mutation', token = 'value') =>
  analyzeQuery(mode, prepared.ast, { file, sourceText: text, cursorByteOffset: at(name, token) }, prepared);
const expectAt = (wrapped: WrappedNode, marker: string) => {
  const line = lineAt(marker);
  assert.equal(wrapped.file, file);
  assert.ok(wrapped.node.range?.begin?.offset !== undefined);
  assert.ok(wrapped.node.range.begin.offset >= line.start && wrapped.node.range.begin.offset < line.end,
    marker + ': ' + wrapped.node.range.begin.offset);
};
const returns = (frames: readonly TraceFrame[]) => frames.flatMap((frame) => frame.returned ? [{
  caller: frame.caller.name, callee: frame.returned.callee.name, members: frame.returned.members,
  callKind: frame.callsite.node.kind
}] : []);

describe('return source mapping (real Clang AST)', () => {
  const cases = [
    ['direct', ['direct'], []],
    ['parameter', ['identity'], [['value']]],
    ['relay', ['relay', 'identity'], [['value'], ['value']]],
    ['field', ['field'], [['right', 'value']]],
    ['aggregate-left', ['aggregate'], [['value']]],
    ['aggregate-right', ['aggregate'], [['value']]],
    ['nested', ['nested_field', 'aggregate'], [['value'], ['value']]],
    ['repeated', ['identity', 'identity'], [['value']]],
    ['lambda-source', ['operator()'], [['value']]],
    ['receiver', ['get'], []],
    ['constructed', ['constructed_state'], [['value']]],
    ['constructed-managed', ['constructed_managed'], [['value']]]
  ] as const;
  cases.map(([name, callees, arguments_]) => it('maps exact mutation, origin, and field paths: ' + name, () => {
    (['mutation', 'origin'] as const).map((mode) => {
      const q = query(name, mode);
      const result = q.result;
      assert.deepEqual(q.returnMapping, { kind: 'complete' });
      assert.deepEqual(q.diagnostics, []);
      assert.ok(result._tag === 'MutationFound' || result._tag === 'OriginFound', JSON.stringify(q.diagnostics));
      expectAt(result._tag === 'MutationFound' ? result.mutation : result.origin, '// @' + (mode === 'mutation' ? 'write ' : 'origin ') + name);
      assert.deepEqual(returns(result.frames ?? []).map((frame) => frame.callee), callees);
      // The sink frame has no argument path: its actual argument is a call.
      assert.equal(result.frames?.[0].argument, undefined);
      const argumentsAtReturns = (result.frames ?? []).slice(1).flatMap((frame) => frame.argument ? [frame.argument.members] : []);
      assert.deepEqual(argumentsAtReturns, arguments_);
      if (name === 'receiver') {
        assert.equal(result.frames?.at(-1)?.receiver?.rootName, 'receiver');
        assert.deepEqual(result.frames?.at(-1)?.receiver?.members, ['state', 'value']);
      }
      (result.frames ?? []).filter((frame) => frame.returned).map((frame) => {
        assert.equal(frame.callsite.node.callee?.id, frame.returned!.callee.id);
        assert.equal(frame.returned!.statement.node.kind, 'ReturnStmt');
        assert.equal(frame.callsite.file, file);
      });
      assert.ok(!q.boundaries.some((fn) => callees.includes(fn.name as never)), 'bound returns must not discover unrelated callers');
    });
  }));

  it('keeps aggregate fields distinct and uses semantic initializer order', () => {
    const fn = prepared.index.functions.find((fn) => fn.name === 'aggregate')!;
    const branch = prepared.index.returnSourcesByFunctionId.get(fn.id)![0];
    assert.equal(branch.source.kind, 'transparent');
    const source = branch.source.kind === 'transparent' ? branch.source.source : assert.fail('cast');
    assert.equal(source.kind, 'aggregate');
    if (source.kind !== 'aggregate') return;
    assert.deepEqual(source.fields.map((field) => field.name), ['left', 'right']);
    const left = query('aggregate-left').result;
    const right = query('aggregate-right').result;
    assert.equal(left._tag, 'MutationFound');
    assert.equal(right._tag, 'MutationFound');
    if (left._tag !== 'MutationFound' || right._tag !== 'MutationFound') return;
    assert.deepEqual(left.frames?.filter((frame) => frame.returned).map((frame) => frame.returned?.members), [['left', 'value']]);
    assert.deepEqual(right.frames?.filter((frame) => frame.returned).map((frame) => frame.returned?.members), [['right', 'value']]);
    assert.equal(left.frames?.at(-1)?.parameterIndex, 1);
    assert.equal(right.frames?.at(-1)?.parameterIndex, 0);
  });

  it('keeps every return branch and its exact actual argument separate', () => {
    (['mutation', 'origin'] as const).map((mode) => {
      const q = query('branches', mode);
      const result = q.result;
      assert.ok(result._tag === 'CandidatesFound' || result._tag === 'OriginCandidatesFound');
      assert.equal(result.candidates.length, 2);
      assert.deepEqual(result.candidates.map((candidate) => candidate.frames.at(-1)?.argument?.rootName), ['first', 'second']);
      assert.deepEqual(result.candidates.map((candidate) => candidate.frames.at(-1)?.parameterIndex), [0, 1]);
      result.candidates.map((candidate, n) => expectAt('mutation' in candidate ? candidate.mutation : candidate.origin,
        '// @' + (mode === 'mutation' ? 'write ' : 'origin ') + ['branch-first', 'branch-second'][n]));
      assert.deepEqual(q.returnMapping, { kind: 'complete' });
      assert.deepEqual(q.diagnostics, []);
    });
  });

  const localCases = [
    ['moved', 'moved', 'CallExpr', ['value']],
    ['forwarded', 'forwarded', 'CallExpr', ['value']],
    ['operator', 'operator+', 'CXXOperatorCallExpr', ['value']],
    ['member-operator', 'operator()', 'CXXOperatorCallExpr', ['value']],
    ['lambda', 'operator()', 'CXXOperatorCallExpr', ['value']],
    ['capture', 'operator()', 'CXXOperatorCallExpr', undefined],
    ['pointer', 'dereference', 'CallExpr', ['value']],
    ['element', 'element', 'CallExpr', ['values', '[1]', 'value']]
  ] as const;
  localCases.map(([name, callee, callKind, members]) => it('traces the exact call and pre-return time: ' + name, () => {
    const q = query(name);
    const result = q.result;
    assert.equal(result._tag, 'MutationFound', JSON.stringify(q.diagnostics));
    if (result._tag !== 'MutationFound') return;
    expectAt(result.mutation, '// @write ' + name);
    assert.deepEqual(returns(result.frames ?? []), [{ caller: name.replaceAll('-', '_') + '_entry', callee, callKind, members: ['value'] }]);
    assert.deepEqual(result.frames?.at(-1)?.argument?.members, members);
    assert.deepEqual(q.returnMapping, { kind: 'complete' });
    assert.deepEqual(q.diagnostics, []);
  }));

  it('preserves a proven branch while reporting the unavailable branch in both modes', () => {
    (['mutation', 'origin'] as const).map((mode) => {
      const q = query('partial', mode);
      const result = q.result;
      assert.ok(result._tag === 'MutationFound' || result._tag === 'OriginFound');
      expectAt(result._tag === 'MutationFound' ? result.mutation : result.origin, '// @' + (mode === 'mutation' ? 'write ' : 'origin ') + 'partial');
      assert.deepEqual(returns(result.frames ?? []).map((frame) => frame.callee), ['partial']);
      assert.equal(q.returnMapping?.kind, 'incomplete');
      assert.deepEqual(result.returnMapping, { kind: 'complete' });
      if (q.returnMapping?.kind === 'incomplete') assert.deepEqual(q.returnMapping.reasons, q.diagnostics);
      assert.equal(q.diagnostics?.length, 1);
      assert.match(q.diagnostics![0], /return: .*unknown \(definition unavailable\)/);
      const fn = prepared.index.functions.find((fn) => fn.name === 'partial')!;
      const branches = prepared.index.returnSourcesByFunctionId.get(fn.id)!;
      assert.equal(branches.length, 2);
      assert.ok(q.diagnostics![0].includes(file + ':' + branches[1].statement.node.range?.begin?.offset));
    });
  });

  it('terminates recursive returns without losing the direct branch', () => {
    const q = query('recursive');
    assert.equal(q.result._tag, 'MutationFound');
    if (q.result._tag === 'MutationFound') expectAt(q.result.mutation, '// @write recursive');
    assert.equal(q.returnMapping?.kind, 'incomplete');
    assert.match(q.diagnostics?.join(' ') ?? '', /Recursive return source; stopped at recursive/);
  });

  it('uses only writes executing on the corresponding return branch', () => {
    const q = query('local-branches');
    assert.equal(q.result._tag, 'CandidatesFound');
    if (q.result._tag !== 'CandidatesFound') return;
    assert.equal(q.result.candidates.length, 2);
    q.result.candidates.map((candidate, n) => expectAt(candidate.mutation, '// @write ' + ['local-first', 'local-second'][n]));
    assert.deepEqual(q.diagnostics, []);
    assert.deepEqual(q.returnMapping, { kind: 'complete' });
  });

  it('does not classify the three-argument std::move algorithm as transparent', () => {
    const call = prepared.index.calls.find((call) => call.node.callee?.qualifiedName === 'std::move' && call.children.length === 4)!;
    assert.ok(call);
    assert.equal(call.node.storageOperation, undefined);
    const q = query('algorithm', 'mutation', 'result');
    assert.equal(q.result._tag, 'AnalysisFailure');
    assert.match(q.diagnostics?.join(' ') ?? '', /std::move \(definition unavailable\)/);
  });

  it('excludes a lexically unreachable return rather than inventing a second source', () => {
    const fn = prepared.index.functions.find((fn) => fn.name === 'unreachable')!;
    assert.equal(prepared.index.returnsByFunctionId.get(fn.id)?.length, 2);
    assert.equal(prepared.index.returnSourcesByFunctionId.get(fn.id)?.length, 1);
    const q = query('unreachable');
    assert.equal(q.result._tag, 'MutationFound');
    if (q.result._tag === 'MutationFound') expectAt(q.result.mutation, '// @write unreachable');
    assert.deepEqual(q.returnMapping, { kind: 'complete' });
    assert.deepEqual(q.diagnostics, []);
  });

  const negativeCases = [
    ['arithmetic', 'result', /BinaryOperator/],
    ['custom', 'value', /field preservation is not verified/],
    ['optional', 'result', /CXXConstructExpr/],
    ['rebound', 'value', /Pointer was rebound/],
    ['conditional-write', 'value', /Mutation execution on this return branch is not verified/],
    ['reference-time', 'value', /Returned borrow observation after local initialization is not verified/],
    ['pointer-time', 'value', /Returned borrow observation after local initialization is not verified/],
    ['unstructured', 'value', /Unstructured return control flow \(goto\) is not verified/],
    ['dangling', 'value', /Return borrow lifetime from callee-owned storage is not verified/],
    ['dangling-pointer', 'value', /Return borrow lifetime from callee-owned storage is not verified/],
    ['dangling-aggregate', 'value', /Return borrow lifetime from callee-owned storage is not verified/]
  ] as const;
  negativeCases.map(([name, token, reason]) => it('does not invent a mutation: ' + name, () => {
    const q = query(name, 'mutation', token);
    assert.equal(q.result._tag, 'AnalysisFailure');
    if (q.result._tag !== 'AnalysisFailure') return;
    assert.match(q.result.reason, reason);
    assert.match(q.diagnostics?.join(' ') ?? '', reason);
    if (name.startsWith('dangling')) {
      const origin = query(name, 'origin');
      assert.equal(origin.result._tag, 'OriginFound');
      if (origin.result._tag !== 'OriginFound') return;
      assert.equal(origin.result.kind, 'parameter');
      assert.equal(origin.result.origin.node.kind, 'ParmVarDecl');
      expectAt(origin.result.origin, '// @select ' + name);
      assert.match(origin.result.boundary ?? '', /Argument source could not be resolved/);
      assert.equal(origin.returnMapping?.kind, 'incomplete');
      assert.match(origin.diagnostics?.join(' ') ?? '', reason);
    }
  }));
});


describe('loop-carried return evidence', () => {
  it('keeps a proven zero-iteration branch separate from the unproved recurrence', () => {
    const fn = prepared.index.functions.find((fn) => fn.name === 'counted_state')!;
    const branches = prepared.index.returnSourcesByFunctionId.get(fn.id)!;
    assert.equal(branches.length, 2);
    const source = branches[1].source;
    const loopState = source.kind === 'preserved-copy' ? source.source : source;
    assert.equal(loopState.kind, 'loop-carried');
    if (loopState.kind !== 'loop-carried') return;
    assert.equal(loopState.target.rootId, loopState.declaration.node.id);
    expectAt(loopState.declaration, '// @initial counted');
    assert.equal(loopState.initial?.node.kind, 'CXXConstructExpr');
    assert.equal(loopState.updates.length, 1);
    assert.equal(loopState.updates[0].kind, 'replacement');
    assert.equal(loopState.updates[0].loop.node.kind, 'ForStmt');
    expectAt(loopState.updates[0].statement, '// @update counted');
    (['mutation', 'origin'] as const).map((mode) => {
      const q = query('counted', mode);
      assert.equal(q.returnMapping?.kind, 'incomplete');
      assert.match(q.diagnostics?.join(' ') ?? '', /Loop-carried return value of accumulator.*recurrence proof/);
      const result = q.result;
      assert.ok(result._tag === 'MutationFound' || result._tag === 'OriginFound');
      expectAt(result._tag === 'MutationFound' ? result.mutation : result.origin, '// @' + (mode === 'mutation' ? 'write ' : 'origin ') + 'counted');
      assert.deepEqual(result.returnMapping, { kind: 'complete' });
      assert.ok(result.frames?.some((frame) => frame.returned?.statement.node.range?.begin?.offset === branches[0].statement.node.range?.begin?.offset));
    });
  });
  it('does not turn loop storage assignment or field mutation into a proved final value', () => {
    const q = query('mutated');
    assert.equal(q.result._tag, 'AnalysisFailure');
    assert.equal(q.returnMapping?.kind, 'incomplete');
    assert.match(q.diagnostics?.join(' ') ?? '', /Zero-iteration and repeated-iteration values/);
    const fn = prepared.index.functions.find((fn) => fn.name === 'mutated_state')!;
    const source = prepared.index.returnSourcesByFunctionId.get(fn.id)![0].source;
    const loopState = source.kind === 'preserved-copy' ? source.source : source;
    assert.equal(loopState.kind, 'loop-carried');
    if (loopState.kind !== 'loop-carried') return;
    assert.equal(loopState.updates[0].kind, 'mutation');
  });
  it('does not attribute a nested lambda loop to the enclosing return', () => {
    const q = query('nested-iteration');
    assert.equal(q.result._tag, 'MutationFound');
    assert.deepEqual(q.returnMapping, { kind: 'complete' });
    assert.deepEqual(q.diagnostics, []);
  });
});


it('distinguishes excluded system bodies from genuinely unavailable definitions', () => {
  const algorithm = prepared.index.calls.find((call) => call.node.callee?.qualifiedName === 'std::move' && call.children.length === 4)!;
  assert.equal(algorithm.node.callee?.definition?.kind, 'system-excluded');
  const unknown = prepared.index.calls.find((call) => call.node.callee?.qualifiedName === 'unknown')!;
  assert.deepEqual(unknown.node.callee?.definition, { kind: 'unavailable' });
  const direct = prepared.index.calls.find((call) => call.node.callee?.qualifiedName === 'direct')!;
  assert.equal(direct.node.callee?.definition?.kind, 'user');
});


it('keeps a disjoint returned field complete without attaching another field recurrence', () => {
  (['mutation', 'origin'] as const).map((mode) => {
    const q = query('disjoint-iteration', mode);
    assert.deepEqual(q.returnMapping, { kind: 'complete' });
    assert.deepEqual(q.diagnostics, []);
    const result = q.result;
    assert.ok(result._tag === 'MutationFound' || result._tag === 'OriginFound');
    expectAt(result._tag === 'MutationFound' ? result.mutation : result.origin,
      '// @' + (mode === 'mutation' ? 'write ' : 'origin ') + 'disjoint-iteration');
  });
});

it('marks a returned receiver boundary as partial on that candidate itself', () => {
  const q = query('unavailable-receiver', 'origin');
  assert.equal(q.returnMapping?.kind, 'incomplete');
  assert.equal(q.result._tag, 'OriginFound');
  if (q.result._tag !== 'OriginFound') return;
  assert.equal(q.result.kind, 'parameter');
  assert.equal(q.result.returnMapping?.kind, 'incomplete');
  assert.match(q.result.boundary ?? '', /Unsupported receiver expression/);
  if (q.returnMapping?.kind === 'incomplete' && q.result.returnMapping?.kind === 'incomplete')
    assert.deepEqual(q.result.returnMapping.reasons, q.returnMapping.reasons);
});

it('scopes discovery diagnostics to caller sets actually used by the final query', () => {
  const sink = prepared.index.functions.find((fn) => fn.name === 'parameter_sink')!;
  const identity = prepared.index.functions.find((fn) => fn.name === 'identity')!;
  const unrelated = prepared.index.functions.find((fn) => fn.name === 'direct')!;
  const q = analyzeQuery('mutation', prepared.ast, { file, sourceText: text, cursorByteOffset: at('parameter'),
    callerDiagnostics: new Map([
      [sink.wrapped.node, ['Relevant caller set is incomplete.']],
      [identity.wrapped.node, ['Unrelated callers of the bound return function.']],
      [unrelated.wrapped.node, ['Unrelated old discovery failure.']]
    ]) }, prepared);
  assert.equal(q.result._tag, 'MutationFound');
  assert.deepEqual(q.diagnostics, ['Relevant caller set is incomplete.']);
  assert.deepEqual(q.returnMapping, { kind: 'complete' });
});

it('retains caller branch constraints after leaving the last return binding', () => {
  const q = query('exclusive');
  assert.equal(q.result._tag, 'AnalysisFailure');
  assert.match(q.diagnostics?.join(' ') ?? '', /Mutation execution before this return-source call is not verified/);
  const shared = query('shared-branch');
  assert.equal(shared.result._tag, 'MutationFound');
  if (shared.result._tag === 'MutationFound') expectAt(shared.result.mutation, '// @write shared-branch');
  assert.deepEqual(shared.returnMapping, { kind: 'complete' });
  assert.deepEqual(shared.diagnostics, []);
});
