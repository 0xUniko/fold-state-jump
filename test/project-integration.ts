import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, prepareAst, type ClangNode } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

// Optional real-project checks: bun test/project-integration.ts /path/to/nano-infer
const root = path.resolve(process.argv[2] ?? '/home/huawei/nano-infer');
const executable = path.resolve('native/build/fold-state-jump-ast');

type ProjectCase = {
  readonly snippet: string;
  readonly expression: string;
  readonly expected:
    | { readonly _tag: 'Mutation'; readonly file: string; readonly snippet: string }
    | { readonly _tag: 'Origin'; readonly kind: 'initialization' | 'parameter' };
};

const pipelineCases: readonly ProjectCase[] = [
  {
    snippet: '++session_state.bank_state.counters.graph_builds;', expression: 'session_state.bank_state.counters',
    expected: { _tag: 'Mutation', file: 'pipeline.h', snippet: '++session_state.bank_state.counters.graph_reuses' }
  },
  {
    snippet: 'return {std::move(session_state), std::move(logits)};', expression: 'session_state',
    expected: { _tag: 'Mutation', file: 'pipeline.h', snippet: 'session_state.rope_position = next_rope' }
  },
  {
    snippet: 'auto &session_state = batch_state.session_state;', expression: 'session_state',
    expected: { _tag: 'Origin', kind: 'initialization' }
  },
  {
    snippet: 'finish_prefill_read(bank_state, std::move(current));', expression: 'bank_state',
    expected: { _tag: 'Mutation', file: 'ffn.h', snippet: 'bank_state.slots = std::move(plan.slots)' }
  },
  {
    snippet: 'return LayerExecution{&session_state,', expression: 'session_state',
    expected: { _tag: 'Mutation', file: 'ffn.h', snippet: 'bank_state =' }
  }
];

await ['ffn.h', 'experts.h', 'pipeline.h'].reduce(async (previous, name) => {
  await previous;
  const file = path.join(root, 'minicpm-v-4_7', name);
  const sourceText = await readFile(file, 'utf8');
  console.log('Extracting ' + file);
  const command = await Effect.runPromise(resolveCompileCommand(file, [root], 'clang++'));
  const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, executable), 67108864, AbortSignal.timeout(120000)));
  assert.equal(await readFile(file, 'utf8'), sourceText, 'Source changed during extraction');
  const ast = JSON.parse(astText) as ClangNode;
  const prepared = prepareAst(ast);
  const optionsAt = (offset: number) => ({ file, sourceText, cursorByteOffset: byteOffsetFromUtf16(sourceText, offset) });
  const analyze = (offset: number) => analyzeAst(ast, optionsAt(offset), prepared);
  const origin = (offset: number) => analyzeOriginAst(ast, optionsAt(offset), prepared);
  const bankChecks = [...sourceText.matchAll(/bank_state\.bank(?:\.records)?/g)].flatMap((match) =>
    ['bank', ...(match[0].endsWith('.records') ? ['records'] : [])].map((member) => {
      const offset = match.index + match[0].lastIndexOf('.' + member) + 1;
      const result = origin(offset);
      assert.equal(result._tag, 'OriginFound', name + ':' + sourceText.slice(0, offset).split('\n').length + ' ' + member);
      if (result._tag === 'OriginFound') {
        // In pipeline.h, build_language_graphs is called from the execute fold;
        // these captures already reach its seed on feat/multi-funcs.
        const executeFold = name === 'pipeline.h' && offset < sourceText.indexOf('Session clear_session(');
        assert.equal(result.kind, executeFold ? 'initialization' : 'parameter');
        assert.equal(result.origin.node.kind, executeFold ? 'CXXFunctionalCastExpr' : 'ParmVarDecl');
        if (executeFold) {
          assert.equal(result.origin.file, file);
          assert.equal(result.origin.node.range?.begin?.offset,
            byteOffsetFromUtf16(sourceText, sourceText.indexOf('BatchState{std::move(session.session_state), {}}')));
          assert.deepEqual(result.frames?.map((frame) => frame.argument?.members), [['session_state', 'bank_state', 'bank']]);
        }
      }
      return offset;
    }));
  const pipelineChecks = (name === 'pipeline.h' ? pipelineCases : []).map(async (projectCase) => {
    const start = sourceText.indexOf(projectCase.snippet);
    assert.ok(start >= 0, 'Missing snippet: ' + projectCase.snippet);
    const offset = sourceText.indexOf(projectCase.expression, start) + projectCase.expression.lastIndexOf('.') + 1;
    const result = projectCase.expected._tag === 'Origin' ? origin(offset) : analyze(offset);
    switch (projectCase.expected._tag) {
      case 'Origin':
        assert.equal(result._tag, 'OriginFound', projectCase.snippet);
        if (result._tag === 'OriginFound') assert.equal(result.kind, projectCase.expected.kind);
        break;
      case 'Mutation': {
        assert.equal(result._tag, 'MutationFound', projectCase.snippet + ': ' + result._tag);
        if (result._tag !== 'MutationFound') break;
        assert.equal(path.basename(result.mutation.file), projectCase.expected.file);
        const mutationText = await readFile(result.mutation.file, 'utf8');
        const mutationOffset = result.mutation.node.range?.begin?.offset;
        assert.ok(mutationOffset !== undefined);
        assert.ok(Buffer.from(mutationText).subarray(mutationOffset).toString('utf8').startsWith(projectCase.expected.snippet), projectCase.snippet);
        break;
      }
    }
    return offset;
  });
  await Promise.all(pipelineChecks);
  console.log(name + ': ' + (bankChecks.length + pipelineChecks.length) + ' jump targets verified');
}, Promise.resolve());
