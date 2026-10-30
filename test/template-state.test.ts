import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { analyzeQuery, callerLinksAt, prepareAst, type CallerLink, type ClangNode, type FunctionInfo } from '../src/analysis';

const executable = path.resolve('native/build/fold-state-jump-ast');
const header = path.resolve('test/fixtures/template-state.h');
const file = path.resolve('test/fixtures/template-state.cpp');
const text = readFileSync(header, 'utf8');
const callerText = readFileSync(file, 'utf8');
const extract = (file: string) => {
  const result = spawnSync(executable, ['--source', file, '--', '-std=c++17', '-x', 'c++'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  return prepareAst(JSON.parse(result.stdout) as ClangNode);
};
const at = (marker: string) => {
  const end = text.indexOf('// @' + marker);
  assert.ok(end >= 0);
  return text.lastIndexOf('state', end);
};

describe('concrete template selections from native Clang ASTs', { skip: !existsSync(executable) }, () => {
  const prepared = extract(header);
  const callers = extract(file);
  const links = (fn: FunctionInfo) => callers.index.calls.flatMap((call) => {
    const range = call.children[0]?.node.range;
    return range?.begin?.offset === undefined || range.end?.offset === undefined ? [] : callerLinksAt(callers, call.file,
      range.begin.offset, range.end.offset + (range.end.tokLen ?? 1), fn);
  });
  const query = (marker: string, mode: 'origin' | 'mutation', round = 0,
    externalCallers = new Map<ClangNode, readonly CallerLink[]>()): ReturnType<typeof analyzeQuery> => {
    assert.ok(round < 10);
    const result = analyzeQuery(mode, prepared.ast, { file: header, sourceText: text,
      sourceTextByFile: new Map([[header, text], [file, callerText]]), cursorByteOffset: at(marker), externalCallers }, prepared);
    return result.boundaries.length ? query(marker, mode, round + 1,
      new Map([...externalCallers, ...result.boundaries.map((fn) => [fn.wrapped.node, links(fn)] as const)])) : result;
  };
  ['member-declaration', 'member-use', 'free-declaration', 'free-use'].map((marker) => it('keeps both concrete call paths at ' + marker, () => {
    (['origin', 'mutation'] as const).map((mode) => {
      const result = query(marker, mode).result;
      assert.ok(result._tag === 'OriginCandidatesFound' || result._tag === 'CandidatesFound', result._tag);
      const candidates = result.candidates;
      assert.equal(candidates.length, 2);
      assert.deepEqual(candidates.map((candidate) => candidate.frames.at(-1)?.caller.name).sort(),
        marker.startsWith('free') ? ['free_embeddings', 'free_tokens'] : ['embeddings', 'tokens']);
      candidates.map((candidate) => {
        const target = 'origin' in candidate ? candidate.origin : candidate.mutation;
        assert.equal(target.file, file);
        const offset = target.node.range!.begin!.offset!;
        const end = callerText.indexOf('\n', offset);
        assert.ok(callerText.slice(offset, end).includes(mode === 'origin' ? '-origin' : '-write'));
        assert.ok(candidate.frames.every((frame) => frame.parameterIndex === 0));
        const embeddings = candidate.frames.at(-1)!.caller.name.endsWith('embeddings');
        assert.ok(candidate.frames[0].callsite.node.callee?.symbol?.includes(embeddings ? 'EmbeddingInput' : 'TokenInput'));
      });
    });
  }));
  it('accepts compiler-proven instantiations for a pattern but rejects overloads and explicit specializations', () => {
    const pattern = prepared.index.functions.find((fn) => fn.name === 'execute' && fn.wrapped.node.dependent && fn.wrapped.node.kind === 'FunctionDecl')!;
    const instances = callers.index.functions.filter((fn) => fn.wrapped.node.templatePatternSymbol === pattern.wrapped.node.symbol);
    assert.equal(instances.length, 2);
    const verified = links(pattern);
    assert.equal(verified.length, 2);
    assert.deepEqual(verified.map((link) => link.caller.name).sort(), ['free_embeddings', 'free_tokens']);
    const tokens = instances.find((fn) => fn.type.includes('TokenInput'))!;
    assert.deepEqual(links(tokens).map((link) => link.caller.name), ['free_tokens']);
    assert.deepEqual(links({ ...tokens, wrapped: { ...tokens.wrapped, node: { ...tokens.wrapped.node, symbol: undefined } } }), []);
    const call = verified[0].callsite;
    const argument = call.children[1];
    assert.deepEqual(callerLinksAt(callers, file, argument.node.range!.begin!.offset!, argument.node.range!.end!.offset!, pattern), []);
  });
  it('requires the concrete body before using a pattern relation from another TU', () => {
    const pattern = prepared.index.functions.find((fn) => fn.name === 'execute' && fn.wrapped.node.dependent && fn.wrapped.node.kind === 'FunctionDecl')!;
    const incomplete = prepareAst({ ...callers.ast, inner: callers.ast.inner?.filter((node) =>
      node.templatePatternSymbol !== pattern.wrapped.node.symbol) });
    const call = callers.index.calls.find((call) => call.node.callee?.templatePatternSymbol === pattern.wrapped.node.symbol)!;
    const range = call.children[0].node.range!;
    assert.deepEqual(callerLinksAt(incomplete, file, range.begin!.offset!, range.end!.offset! + range.end!.tokLen!, pattern), []);
  });
  it('keeps an explicit specialization on its own call path', () => {
    const result = query('specialization', 'origin').result;
    assert.equal(result._tag, 'OriginFound');
    if (result._tag !== 'OriginFound') return;
    assert.deepEqual(result.frames?.map((frame) => frame.caller.name), ['specialized']);
    assert.equal(result.origin.file, file);
  });
});
