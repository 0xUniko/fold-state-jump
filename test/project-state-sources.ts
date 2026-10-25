// Opt-in real source/Clang integration. Candidate files are explicit inputs;
// this harness does not invoke a language server or scan the workspace.
// bun test/project-state-sources.ts /path/to/nano-infer
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeQuery, byteOffsetFromUtf16, callerLinksAt, prepareAst, type CallerLink, type ClangNode, type FunctionInfo, type TraceFrame, type WrappedNode } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const root = path.resolve(process.argv[2] ?? '/home/huawei/nano-infer');
const executable = path.resolve('native/build/fold-state-jump-ast');
const inputs = await ['pipeline.h', 'cli.cpp'].reduce(async (work, name) => {
  const inputs = await work;
  const file = path.join(root, 'minicpm-v-4_7', name);
  const text = await readFile(file, 'utf8');
  const command = await Effect.runPromise(resolveCompileCommand(file, [root], 'clang++'));
  const started = performance.now();
  const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, executable), 67108864, AbortSignal.timeout(120000)));
  assert.equal(await readFile(file, 'utf8'), text, 'Source changed during extraction');
  const prepared = prepareAst(JSON.parse(astText) as ClangNode);
  console.log(JSON.stringify({ file, extractAndPrepareMs: performance.now() - started, astBytes: Buffer.byteLength(astText) }));
  if (process.env.FSJ_PROJECT_AST_DIRECTORY) await writeFile(path.join(process.env.FSJ_PROJECT_AST_DIRECTORY, 'fold-' + name + '-current.json'), astText);
  return [...inputs, { file, text, prepared }];
}, Promise.resolve([] as { file: string; text: string; prepared: ReturnType<typeof prepareAst> }[]));
const pipeline = inputs[0];
const cli = inputs[1];
const sourceTextByFile = new Map(inputs.map((input) => [input.file, input.text]));
const seed = pipeline.text.indexOf('BatchState{std::move(session.session_state), {}}');
assert.ok(seed >= 0);
const options = { file: pipeline.file, sourceText: pipeline.text, sourceTextByFile,
  cursorByteOffset: byteOffsetFromUtf16(pipeline.text, pipeline.text.indexOf('session_state', seed)) };
const verify = (fn: FunctionInfo): readonly CallerLink[] => inputs.flatMap((input) => input.prepared.index.calls.flatMap((call) => {
  const calleeRange = call.children[0]?.node.range;
  if (call.node.callee?.symbol !== fn.wrapped.node.symbol || !calleeRange?.begin || !calleeRange.end) return [];
  return callerLinksAt(input.prepared, call.file, calleeRange.begin.offset!, calleeRange.end.offset! + (calleeRange.end.tokLen ?? 1), fn);
}));
const expand = (mode: 'mutation' | 'origin', externalCallers = new Map<ClangNode, readonly CallerLink[]>(), rounds = 0): ReturnType<typeof analyzeQuery> => {
  assert.ok(rounds < 20, 'Caller expansion did not terminate');
  const query = analyzeQuery(mode, pipeline.prepared.ast, { ...options, externalCallers }, pipeline.prepared);
  if (query.boundaries.length === 0) return query;
  return expand(mode, query.boundaries.reduce((externalCallers, fn) =>
    new Map([...externalCallers, [fn.wrapped.node, verify(fn)]]), externalCallers), rounds + 1);
};
const location = (node: WrappedNode) => {
  const text = sourceTextByFile.get(node.file)!;
  const offset = node.node.range?.begin?.offset ?? 0;
  return { file: path.basename(node.file), line: Buffer.from(text).subarray(0, offset).toString('utf8').split('\n').length, offset };
};
const frames = (frames: readonly TraceFrame[]) => frames.map((frame) => ({ caller: frame.caller.name,
  ...location(frame.callsite), parameterIndex: frame.parameterIndex, argument: frame.argument }));
const mutation = expand('mutation');
assert.equal(mutation.result._tag, 'MutationFound', JSON.stringify(mutation.diagnostics));
if (mutation.result._tag === 'MutationFound') {
  const result = mutation.result;
  assert.equal(result.mutation.file, cli.file);
  assert.ok(Buffer.from(cli.text).subarray(result.mutation.node.range!.begin!.offset!).toString('utf8').startsWith('generation.batch_state = take_batch_state('));
  assert.equal(result.wrapped, true);
  assert.deepEqual(result.frames?.map((frame) => frame.caller.name), ['run_batch', 'operator()']);
  assert.deepEqual(result.frames?.map((frame) => frame.argument?.members), [['session_state'], ['batch_state', 'session_state']]);
  console.log(JSON.stringify({ mode: 'mutation', target: location(result.mutation), wrapped: result.wrapped, frames: frames(result.frames ?? []), diagnostics: mutation.diagnostics }, null, 2));
}
const origin = expand('origin');
const origins = origin.result._tag === 'OriginCandidatesFound' ? origin.result.candidates
  : origin.result._tag === 'OriginFound' ? [origin.result] : [];
assert.equal(origins.length, 3);
assert.deepEqual(origins.map((candidate) => candidate.frames?.[0].caller.name).sort(), ['run_batch', 'run_batch', 'run_embeddings']);
origins.map((candidate) => {
  assert.equal(candidate.origin.file, cli.file);
  assert.equal(candidate.kind, 'initialization');
  const embeddings = candidate.frames?.[0].caller.name === 'run_embeddings';
  const generation = candidate.frames?.[1].argument?.rootName === 'generation';
  assert.equal(candidate.origin.node.kind, embeddings ? 'CXXBindTemporaryExpr' : 'CXXFunctionalCastExpr');
  const seed = embeddings ? 'std::move(batch_state),\n' : generation
    ? 'Generation{std::move(batch_state), {}, false}' : 'BatchState{std::move(session_state), {}}';
  assert.equal(candidate.origin.node.range?.begin?.offset, byteOffsetFromUtf16(cli.text, cli.text.indexOf(seed)));
  assert.equal(candidate.frames?.length, 2);
  assert.deepEqual(candidate.frames?.[0].argument?.members, ['session_state']);
  assert.ok(['batch_state', 'generation'].includes(candidate.frames?.[1].argument?.rootName ?? ''));
});
console.log(JSON.stringify({ mode: 'origin', candidates: origins.map((candidate) => ({ target: location(candidate.origin), frames: frames(candidate.frames ?? []) })), diagnostics: origin.diagnostics }, null, 2));
console.log('Real pipeline seed: all CLI argument mappings, generation wrap, and three fold seed origins verified. Language-server discovery was not exercised.');
