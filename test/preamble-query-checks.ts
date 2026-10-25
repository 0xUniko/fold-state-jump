import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, prepareAst, type ClangNode } from '../src/analysis';
import { extractVerifiedAst } from '../src/extraction';
import { resultSignature } from './result-signature';
type Extracted = Effect.Success<ReturnType<typeof extractVerifiedAst>>;

// Only process-local declaration addresses are normalized. Array and candidate
// order, types, offsets and all reference relationships remain observable.
export const normalizeAst = (ast: ClangNode): ClangNode => {
  const identifiers = (value: unknown): readonly string[] => Array.isArray(value)
    ? value.flatMap(identifiers)
    : value !== null && typeof value === 'object'
      ? Object.entries(value).flatMap(([key, value]) => ['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string'
        ? [value] : identifiers(value)) : [];
  const identities = identifiers(ast).reduce((identities, identity) => {
    if (!identities.has(identity)) identities.set(identity, String(identities.size));
    return identities;
  }, new Map<string, string>());
  const normalized = (value: unknown): unknown => Array.isArray(value) ? value.map(normalized)
    : value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, value]) =>
      [key, ['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string' ? identities.get(value) : normalized(value)])) : value;
  return normalized(ast) as ClangNode;
};
const prepared = (extracted: Extracted) => prepareAst(normalizeAst(JSON.parse(extracted.astText) as ClangNode));
export const compareQueries = async (source: string, cold: Extracted, reused: Extracted) => {
  const sourceText = await readFile(source, 'utf8');
  const coldPrepared = prepared(cold);
  const reusedPrepared = prepared(reused);
  const offsets = [...new Set(coldPrepared.index.all.filter((node) => path.resolve(node.file) === source &&
    ['MemberExpr', 'DeclRefExpr', 'CXXDependentScopeMemberExpr'].includes(node.node.kind))
    .flatMap((node) => node.node.range?.end?.offset === undefined ? [] : [node.node.range.end.offset]))];
  assert.ok(offsets.length > 0);
  const queries = offsets.reduce((queries, cursorByteOffset) => {
    const options = { file: source, sourceText, cursorByteOffset };
    [analyzeAst, analyzeOriginAst].map((analyze) => assert.deepEqual(
      resultSignature(analyze(reusedPrepared.ast, options, reusedPrepared)),
      resultSignature(analyze(coldPrepared.ast, options, coldPrepared)), source + ':' + cursorByteOffset));
    return queries + 2;
  }, 0);
  return { positions: offsets.length, queries, differences: 0 };
};
const pipelineCases = [
  { snippet: '++session_state.bank_state.counters.graph_builds;', expression: 'session_state.bank_state.counters',
    expected: { _tag: 'Mutation', file: 'pipeline.h', snippet: '++session_state.bank_state.counters.graph_reuses' } },
  { snippet: 'return {std::move(session_state), std::move(logits)};', expression: 'session_state',
    expected: { _tag: 'Mutation', file: 'pipeline.h', snippet: 'session_state.rope_position = next_rope' } },
  { snippet: 'auto &session_state = batch_state.session_state;', expression: 'session_state',
    expected: { _tag: 'Origin', kind: 'initialization' } },
  { snippet: 'finish_prefill_read(bank_state, std::move(current));', expression: 'bank_state',
    expected: { _tag: 'Mutation', file: 'ffn.h', snippet: 'bank_state.slots = std::move(plan.slots)' } },
  { snippet: 'return LayerExecution{&session_state,', expression: 'session_state',
    expected: { _tag: 'Mutation', file: 'ffn.h', snippet: 'bank_state =' } }
] as const;
export const checkTargets = async (source: string, extracted: Extracted) => {
  const sourceText = await readFile(source, 'utf8');
  const sourcePrepared = prepared(extracted);
  const optionsAt = (offset: number) => ({ file: source, sourceText, cursorByteOffset: byteOffsetFromUtf16(sourceText, offset) });
  const bankChecks = [...sourceText.matchAll(/bank_state\.bank(?:\.records)?/g)].flatMap((match) =>
    ['bank', ...(match[0].endsWith('.records') ? ['records'] : [])].map((member) => {
      const result = analyzeOriginAst(sourcePrepared.ast, optionsAt(match.index + match[0].lastIndexOf('.' + member) + 1), sourcePrepared);
      assert.equal(result._tag, 'OriginFound');
      if (result._tag === 'OriginFound') {
        assert.equal(result.kind, 'parameter');
        assert.equal(result.origin.node.kind, 'ParmVarDecl');
      }
      return member;
    }));
  const pipelineChecks = path.basename(source) === 'pipeline.h' ? pipelineCases : [];
  await Promise.all(pipelineChecks.map(async (projectCase) => {
    const start = sourceText.indexOf(projectCase.snippet);
    assert.ok(start >= 0, projectCase.snippet);
    const offset = sourceText.indexOf(projectCase.expression, start) + projectCase.expression.lastIndexOf('.') + 1;
    const result = projectCase.expected._tag === 'Origin'
      ? analyzeOriginAst(sourcePrepared.ast, optionsAt(offset), sourcePrepared)
      : analyzeAst(sourcePrepared.ast, optionsAt(offset), sourcePrepared);
    switch (projectCase.expected._tag) {
      case 'Origin':
        assert.equal(result._tag, 'OriginFound');
        if (result._tag === 'OriginFound') assert.equal(result.kind, projectCase.expected.kind);
        break;
      case 'Mutation': {
        assert.equal(result._tag, 'MutationFound', projectCase.snippet);
        if (result._tag !== 'MutationFound') return;
        assert.equal(path.basename(result.mutation.file), projectCase.expected.file);
        const mutationOffset = result.mutation.node.range?.begin?.offset;
        assert.ok(mutationOffset !== undefined);
        assert.ok(Buffer.from(await readFile(result.mutation.file, 'utf8')).subarray(mutationOffset).toString('utf8')
          .startsWith(projectCase.expected.snippet), projectCase.snippet);
        break;
      }
    }
  }));
  return bankChecks.length + pipelineChecks.length;
};
