import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, type ClangNode } from '../src/analysis';

const executable = path.resolve('native/build/fold-state-jump-ast');
const source = path.resolve('test/fixtures/native-paths.cpp');
const sourceText = readFileSync(source, 'utf8');
const lineOffset = (marker: string): number => {
  const offset = sourceText.indexOf(marker);
  assert.ok(offset >= 0, 'Missing marker: ' + marker);
  return sourceText.lastIndexOf('\n', offset) + 1;
};
const cases = [
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
    const options = { file: source, sourceText, cursorByteOffset: byteOffsetFromUtf16(sourceText, offset + expression.lastIndexOf('.') + 1) };
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
  test('retains distinct caller paths', () => {
    const result = analyzeCase('caller-mutations', 'bank_state.bank.records');
    assert.equal(result._tag, 'CandidatesFound');
    if (result._tag === 'CandidatesFound') {
      assert.equal(result.candidates.length, 2);
      assert.notEqual(result.candidates[0].mutation.node.range?.begin?.offset, result.candidates[1].mutation.node.range?.begin?.offset);
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
