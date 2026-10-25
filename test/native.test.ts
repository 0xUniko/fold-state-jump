import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, prepareAst, type ClangNode } from '../src/analysis';

const executable = path.resolve('native/build/fold-state-jump-ast');
const source = path.resolve('test/fixtures/native-paths.cpp');
const sourceText = readFileSync(source, 'utf8');
const lineOffset = (marker: string): number => {
  const offset = sourceText.indexOf(marker);
  assert.ok(offset >= 0, 'Missing marker: ' + marker);
  return sourceText.lastIndexOf('\n', offset) + 1;
};
const cases = [
  ['backward-parameter-index', 'bank.records', 'indexed-entry'],
  ['backward-leaf', 'bank.records', 'backward-entry'],
  ['backward-copy', 'bank.records', 'copy-entry'],
  ['backward-copy-isolation', 'bank.records', 'copy-entry'],
  ['backward-pointer', 'bank->records', 'pointer-entry'],
  ['backward-overload', 'bank.records', 'overload-entry'],
  ['backward-template', 'bank.records', 'template-entry'],
  ['alias-bank', 'bank_state.bank', 'alias-records'],
  ['alias-records', 'bank_state.bank.records', 'alias-records'],
  ['full-records', 'session_state.bank_state.bank.records', 'alias-records'],
  ['counters', 'session_state.bank_state.counters', 'counters'],
  ['whole-session', 'session_state', 'counters'],
  ['sibling-isolation', 'bank_state.bank.records', 'alias-records'],
  ['assignment-records', 'bank_state.bank.records', 'bank-assignment'],
  ['assignment-bank', 'bank_state.bank', 'bank-assignment'],
  ['helper-records', 'bank_state.bank.records', 'helper-records'],
  ['helper-parent', 'bank_state', 'helper-records'],
  ['member-helper', 'bank_state.bank.records', 'member-helper'],
  ['copy-isolation', 'bank_state.bank.records', 'isolation'],
  ['captured-read', 'session_state.bank_state.bank.records', 'before-capture'],
  ['captured-alias', 'bank_state.bank.records', 'before-capture'],
  ['uncalled-capture', 'session_state.bank_state.bank.records', 'before-capture'],
  ['copy-capture-isolation', 'session_state.bank_state.bank.records', 'before-capture'],
  ['called-capture', 'session_state.bank_state.bank.records', 'called-capture'],
  ['immediate-capture', 'session_state.bank_state.bank.records', 'immediate-capture'],
  ['generic-bank', 'bank_state.bank', 'generic-records'],
  ['generic-records', 'bank_state.bank.records', 'generic-records'],
  ['nested-counters', 'session_state.bank_state.counters', 'nested-counters'],
  ['nested-session', 'session_state', 'nested-counters'],
  ['after-nested-counters', 'session_state.bank_state.counters', 'nested-counters'],
  ['collection-mutation', 'records', 'push-back'],
  ['pointer-helper', 'bank_state.bank.records', 'pointer-helper'],
  ['multi-hop', 'bank_state.bank.records', 'helper-records'],
  ['receiver', 'bank.records', 'receiver'],
  ['concrete-nested', 'session_state.bank_state.counters', 'concrete-nested'],
  ['deferred-reference', 'session_state.bank_state.counters', 'deferred-reference'],
  ['deferred-stored', 'session_state.bank_state.counters', 'deferred-stored'],
  ['reference-invocation-time', 'session_state.bank_state.bank.records', 'reference-invocation-time'],
  ['copy-construction-time', 'session_state.bank_state.bank.records', 'reference-invocation-time']
] as const;

// This suite exercises the native JSON contract as well as the TypeScript analyzer.
// It is skipped only on machines where the optional native tool has not been built.
describe('native member paths', { skip: !existsSync(executable) }, () => {
  const extraction = spawnSync(executable, ['--source', source, '--', '-std=c++17'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(extraction.status, 0, extraction.stderr);
  const ast = JSON.parse(extraction.stdout) as ClangNode;
  const analyzeCase = (name: string, expression: string, target: 'mutation' | 'origin' = 'mutation') => {
    const start = lineOffset('// @case ' + name + '\n');
    const offset = sourceText.indexOf(expression, start);
    assert.ok(offset >= start && offset < sourceText.indexOf('// @case', start), 'Missing expression: ' + expression);
    const options = { file: source, sourceText, cursorByteOffset: byteOffsetFromUtf16(sourceText,
      offset + Math.max(expression.lastIndexOf('.') + 1, expression.lastIndexOf('->') >= 0 ? expression.lastIndexOf('->') + 2 : 0)) };
    return target === 'origin' ? analyzeOriginAst(ast, options) : analyzeAst(ast, options);
  };
  cases.map(([name, expression, mutation]) => test(name, () => {
    const result = analyzeCase(name, expression);
    assert.equal(result._tag, 'MutationFound', JSON.stringify(result._tag === 'AnalysisFailure' ? result : { _tag: result._tag }));
    if (result._tag !== 'MutationFound') return;
    assert.equal(result.mutation.file, source);
    const offset = result.mutation.node.range?.begin?.offset;
    const start = byteOffsetFromUtf16(sourceText, lineOffset('// @write ' + mutation + '\n'));
    const end = byteOffsetFromUtf16(sourceText, sourceText.indexOf('// @write ' + mutation + '\n'));
    assert.ok(offset !== undefined && offset >= start && offset < end, 'Wrong mutation for ' + name + ': ' + offset);
  }));
  [
    ['backward-parameter-index', 'bank.records', 'indexed-entry', 'initialization'],
    ['backward-copy', 'bank.records', 'copy-entry', 'initialization'],
    ['backward-pointer', 'bank->records', 'pointer-entry', 'initialization'],
    ['backward-overload', 'bank.records', 'overload-entry', 'initialization'],
    ['backward-template', 'bank.records', 'template-entry', 'initialization'],
    ['parameter-origin', 'parameter.bank', 'parameter', 'parameter'],
    ['bank-origin', 'bank_state.bank', 'local', 'initialization'],
    ['records-origin', 'bank_state.bank.records', 'local', 'initialization'],
    ['alias-origin', 'bank_state_alias.bank.records', 'session', 'initialization']
  ].map(([name, expression, origin, kind]) => test(name, () => {
    const result = analyzeCase(name, expression, 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag !== 'OriginFound') return;
    assert.equal(result.kind, kind);
    const offset = result.origin.node.range?.begin?.offset;
    const start = byteOffsetFromUtf16(sourceText, lineOffset('// @origin ' + origin + '\n'));
    const end = byteOffsetFromUtf16(sourceText, sourceText.indexOf('// @origin ' + origin + '\n'));
    assert.ok(offset !== undefined && offset >= start && offset < end, 'Wrong origin for ' + name);
  }));
  test('retains template specializations sharing the same source callsite', () => {
    const origin = analyzeCase('backward-specializations', 'bank.records', 'origin');
    assert.equal(origin._tag, 'OriginCandidatesFound');
    if (origin._tag === 'OriginCandidatesFound') {
      assert.equal(origin.candidates.length, 2);
      assert.notEqual(origin.candidates[0].frames[0].caller.wrapped.node.symbol, origin.candidates[1].frames[0].caller.wrapped.node.symbol);
      assert.equal(origin.candidates[0].frames[0].callsite.node.range?.begin?.offset, origin.candidates[1].frames[0].callsite.node.range?.begin?.offset);
    }
    const mutation = analyzeCase('backward-specializations', 'bank.records');
    assert.equal(mutation._tag, 'CandidatesFound');
    if (mutation._tag === 'CandidatesFound') assert.equal(mutation.candidates.length, 2);
  });
  test('exports stable semantic symbols for overloads across extractor processes', () => {
    const repeated = spawnSync(executable, ['--source', source, '--', '-std=c++17'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    assert.equal(repeated.status, 0, repeated.stderr);
    const symbols = (ast: ClangNode) => prepareAst(ast).index.functions.filter((fn) => fn.name === 'overload_leaf').map((fn) => fn.wrapped.node.symbol).sort();
    assert.equal(new Set(symbols(ast)).size, 3);
    assert.ok(symbols(ast).every(Boolean));
    assert.deepEqual(symbols(ast), symbols(JSON.parse(repeated.stdout)));
  });
  test('maps the actual parameter index, including its complete member suffix', () => {
    const result = analyzeCase('backward-parameter-index', 'bank.records', 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') {
      assert.equal(result.frames?.[0].parameterIndex, 1);
      assert.deepEqual(result.frames?.[0].argument?.members, ['records']);
    }
  });
  test('traces independent helpers to the fold seed', () => {
    const result = analyzeCase('backward-leaf', 'bank.records', 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') {
      assert.equal(result.kind, 'initialization');
      assert.equal(result.origin.node.range?.begin?.offset, byteOffsetFromUtf16(sourceText, sourceText.indexOf('SessionState{}', sourceText.indexOf('SessionState backward_fold'))));
    }
  });
  test('keeps distinct fold seeds and wrap-around contexts with every frame', () => {
    const origin = analyzeCase('backward-wrap', 'bank.records', 'origin');
    assert.equal(origin._tag, 'OriginCandidatesFound');
    if (origin._tag === 'OriginCandidatesFound') {
      assert.equal(origin.candidates.length, 2);
      assert.ok(origin.candidates.every((candidate) => candidate.frames.length === 2));
      assert.notEqual(origin.candidates[0].origin, origin.candidates[1].origin);
    }
    const result = analyzeCase('backward-wrap', 'bank.records');
    assert.equal(result._tag, 'CandidatesFound');
    if (result._tag === 'CandidatesFound') {
      assert.equal(result.candidates.length, 2);
      assert.ok(result.candidates.every((candidate) => candidate.wrapped && candidate.frames.length === 2));
      assert.deepEqual(result.candidates.map((candidate) => candidate.mutation.node.range?.begin?.offset).sort(),
        ['wrap-a', 'wrap-b'].map((marker) => byteOffsetFromUtf16(sourceText, lineOffset('// @write ' + marker + '\n') + 4)).sort());
    }
  });
  test('recursive paths stop conservatively', () => {
    assert.equal(analyzeCase('backward-recursive', 'bank.records')._tag, 'AnalysisFailure');
    const result = analyzeCase('backward-recursive', 'bank.records', 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') assert.match(result.boundary ?? '', /Recursive/);
  });
  test('retains distinct caller paths', () => {
    const result = analyzeCase('caller-mutations', 'bank_state.bank.records');
    assert.equal(result._tag, 'CandidatesFound');
    if (result._tag === 'CandidatesFound') {
      assert.equal(result.candidates.length, 2);
      assert.notEqual(result.candidates[0].mutation.node.range?.begin?.offset, result.candidates[1].mutation.node.range?.begin?.offset);
    }
  });
  const markerRange = (prefix: string, marker: string): readonly [number, number] => [
    byteOffsetFromUtf16(sourceText, lineOffset('// @' + prefix + ' ' + marker + '\n')),
    byteOffsetFromUtf16(sourceText, sourceText.indexOf('// @' + prefix + ' ' + marker + '\n'))
  ];
  const within = (offset: number | undefined, range: readonly [number, number]) =>
    offset !== undefined && offset >= range[0] && offset < range[1];
  test('maps implicit this mutations back to every calling object', () => {
    const result = analyzeCase('this-mutation', 'records');
    assert.equal(result._tag, 'CandidatesFound');
    if (result._tag !== 'CandidatesFound') return;
    const markers = ['this-caller', 'this-caller-b', 'this-pointer', 'this-forward'];
    const ranges = markers.map((marker) => markerRange('write', marker));
    assert.equal(result.candidates.length, markers.length);
    assert.ok(result.candidates.every((candidate) => candidate.frames.length === 1));
    assert.ok(result.candidates.every((candidate) => candidate.frames[0].parameterIndex === undefined));
    assert.ok(result.candidates.every((candidate) => candidate.frames[0].receiver !== undefined));
    assert.deepEqual(result.candidates.map((candidate) => ranges.findIndex((range) =>
      within(candidate.mutation.node.range?.begin?.offset, range))).sort(), ranges.map((_, index) => index));
    const pointer = result.candidates.find((candidate) =>
      within(candidate.mutation.node.range?.begin?.offset, ranges[2]));
    assert.equal(pointer?.frames[0].receiver?.rootName, 'pointer');
  });
  test('maps implicit this origins to initializations and parameter boundaries', () => {
    const result = analyzeCase('this-mutation', 'records', 'origin');
    assert.equal(result._tag, 'OriginCandidatesFound');
    if (result._tag !== 'OriginCandidatesFound') return;
    assert.equal(result.candidates.length, 4);
    const initializations = result.candidates.filter((candidate) => candidate.kind === 'initialization');
    const parameters = result.candidates.filter((candidate) => candidate.kind === 'parameter');
    assert.equal(initializations.length, 3);
    assert.equal(parameters.length, 1);
    assert.match(parameters[0].boundary ?? '', /No verified caller/);
    assert.ok(initializations.some((candidate) => within(candidate.origin.node.range?.begin?.offset, markerRange('origin', 'this-caller'))));
    assert.ok(initializations.some((candidate) => within(candidate.origin.node.range?.begin?.offset, markerRange('origin', 'this-caller-b'))));
    assert.ok(initializations.every((candidate) => candidate.frames[0].receiver !== undefined));
  });
  ['stored', 'immediate', 'default-copy', 'default-reference', 'nested', 'algorithm', 'generic']
    .map((name) => test('traces captured this origin: ' + name, () => {
      const result = analyzeCase('lambda-this-' + name, 'records', 'origin');
      assert.equal(result._tag, 'OriginCandidatesFound');
      if (result._tag !== 'OriginCandidatesFound') return;
      const ranges = ['lambda-this-a', 'lambda-this-b'].map((marker) => markerRange('origin', marker));
      assert.equal(result.candidates.length, 2);
      assert.ok(result.candidates.every((candidate) => candidate.kind === 'initialization' && !candidate.boundary));
      assert.deepEqual(result.candidates.map((candidate) => ranges.findIndex((range) =>
        within(candidate.origin.node.range?.begin?.offset, range))).sort(), [0, 1]);
      assert.ok(result.candidates.every((candidate) => candidate.frames.length === 1 && candidate.frames[0].receiver?.rootName === 'account'));
    }));
  test('uses captured pointer construction context across an unrelated invoking object', () => {
    const result = analyzeCase('lambda-this-escaped', 'records', 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag !== 'OriginFound') return;
    assert.equal(result.kind, 'initialization');
    assert.ok(within(result.origin.node.range?.begin?.offset, markerRange('origin', 'lambda-this-a')));
    assert.equal(result.frames?.[0].caller.name, 'lambda_bank_a');
    assert.equal(result.frames?.[0].receiver?.rootName, 'account');
  });
  ['copy', 'nested-copy', 'unavailable'].map((name) => test('stops at captured receiver boundary: ' + name, () => {
    const result = analyzeCase('lambda-this-' + name, 'records', 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag !== 'OriginFound') return;
    assert.equal(result.kind, 'parameter');
    assert.match(result.boundary ?? '', name === 'unavailable' ? /No verified caller/ : /Object copy capture/);
    assert.equal(analyzeCase('lambda-this-' + name, 'records')._tag, 'AnalysisFailure');
  }));
  test('observes invocation-time mutation for a stored this pointer capture', () => {
    const result = analyzeCase('lambda-this-stored', 'records');
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') assert.ok(within(result.mutation.node.range?.begin?.offset, markerRange('write', 'lambda-this-invocation')));
  });
  test('preserves this-member suffixes through the receiver object', () => {
    const result = analyzeCase('this-nested', 'bank.records');
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.ok(within(result.mutation.node.range?.begin?.offset, markerRange('write', 'this-nested-caller')));
      assert.equal(result.frames?.[0].receiver?.rootName, 'session');
      assert.deepEqual(result.frames?.[0].receiver?.members, ['bank', 'records']);
    }
    const origin = analyzeCase('this-nested', 'bank.records', 'origin');
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') {
      assert.equal(origin.kind, 'initialization');
      assert.ok(within(origin.origin.node.range?.begin?.offset, markerRange('origin', 'this-nested')));
    }
  });
  test('resolves overloaded member functions by their semantic identity', () => {
    const result = analyzeCase('this-overload', 'records');
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.ok(within(result.mutation.node.range?.begin?.offset, markerRange('write', 'this-overload-caller')));
      assert.equal(result.frames?.[0].caller.name, 'audited_multi_run');
    }
  });
  test('traces member receivers into fold lambdas', () => {
    const result = analyzeCase('this-fold', 'bank.records');
    assert.equal(result._tag, 'MutationFound');
    if (result._tag === 'MutationFound') {
      assert.ok(within(result.mutation.node.range?.begin?.offset, markerRange('write', 'this-fold-caller')));
      assert.equal(result.via, 'call');
    }
    const origin = analyzeCase('this-fold', 'bank.records', 'origin');
    assert.equal(origin._tag, 'OriginFound');
    if (origin._tag === 'OriginFound') {
      assert.equal(origin.kind, 'initialization');
      assert.ok(within(origin.origin.node.range?.begin?.offset, markerRange('origin', 'this-fold')));
    }
  });
  [['session_state', 'whole object'], ['session_state.bank_state', 'intermediate member']]
    .map(([expression, name]) => test('selects the clicked path: ' + name, () => {
      const result = analyzeCase('counters', expression);
      assert.equal(result._tag, 'MutationFound');
      if (result._tag !== 'MutationFound') return;
      assert.equal(result.mutation.node.range?.begin?.offset,
        byteOffsetFromUtf16(sourceText, sourceText.indexOf('++session_state.bank_state.counters.hits;')));
    }));
  test('does not invent an initialization for an uninitialized scalar', () => {
    assert.equal(analyzeCase('uninitialized', 'records')._tag, 'AnalysisFailure');
  });
  test('keeps an uninstantiated copy capture separate from its source', () => {
    assert.equal(analyzeCase('deferred-copy', 'session_state.bank_state.counters')._tag, 'AnalysisFailure');
    const result = analyzeCase('deferred-copy', 'session_state.bank_state.counters', 'origin');
    assert.equal(result._tag, 'OriginFound');
    if (result._tag === 'OriginFound') assert.equal(result.kind, 'parameter');
  });
  [['external-helper', 'bank_state.bank.records'], ['generic-external', 'session_state.bank_state.bank.records']]
    .map(([name, expression]) => test('retains helper-header mutations: ' + name, () => {
      const result = analyzeCase(name, expression);
      assert.equal(result._tag, 'MutationFound');
      if (result._tag !== 'MutationFound') return;
      const helper = path.resolve('test/fixtures/native-paths-helper.h');
      assert.equal(result.mutation.file, helper);
      const helperText = readFileSync(helper, 'utf8');
      assert.equal(result.mutation.node.range?.begin?.offset, helperText.indexOf('++bank_state'));
    }));
});
