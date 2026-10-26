// Opt-in real source/Clang integration. Candidate files are explicit inputs;
// this harness does not invoke a language server or scan the workspace.
// bun test/project-state-sources.ts /path/to/nano-infer
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import type * as vscode from 'vscode';
import { analyzeQuery, byteOffsetFromUtf16, utf16OffsetFromByte, callerLinksAt, prepareAst, type CallerLink, type ClangNode, type FunctionInfo, type TraceFrame, type WrappedNode } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const root = path.resolve(process.argv[2] ?? '/home/huawei/nano-infer');
const executable = path.resolve('native/build/fold-state-jump-ast');
const inputs = await ['pipeline.h', 'cli.cpp'].reduce(async (work, name) => {
  const inputs = await work;
  const file = path.join(root, 'minicpm-v-4_7', name);
  const text = await readFile(file, 'utf8');
  const command = await Effect.runPromise(resolveCompileCommand(file, [root], 'clang++', process.env.FSJ_PROJECT_COMPILE_COMMANDS));
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
const positionAt = (text: string, offset: number) => ({ line: text.slice(0, offset).split('\n').length - 1,
  character: offset - text.lastIndexOf('\n', offset - 1) - 1 });
const offsetAt = (text: string, position: { readonly line: number; readonly character: number }) =>
  text.split('\n').slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.character;
const uri = (file: string) => ({ fsPath: file, toString: () => 'file://' + file });
// Mock only the provider output. The production discovery union, byte offsets,
// and Clang USR/call-range validation run below against the real project ASTs.
const declarationsAt = (file: string, position: { readonly line: number; readonly character: number }) => {
  const text = sourceTextByFile.get(file)!;
  const offset = byteOffsetFromUtf16(text, offsetAt(text, position));
  return inputs.flatMap((input) => input.prepared.index.functions.filter((fn) =>
    fn.file === file && fn.wrapped.node.loc?.offset === offset));
};
const providerCalls = (symbols: readonly (string | undefined)[]) => inputs.flatMap((input) => input.prepared.index.calls.flatMap((call) => {
  const range = call.children[0]?.node.range;
  if (!symbols.includes(call.node.callee?.symbol) || !call.node.callee?.symbol || !range?.begin || !range.end) return [];
  const text = sourceTextByFile.get(call.file);
  if (text === undefined) return [];
  return [{ uri: uri(call.file), range: {
    start: positionAt(text, utf16OffsetFromByte(text, range.begin.offset!)),
    end: positionAt(text, utf16OffsetFromByte(text, range.end.offset! + (range.end.tokLen ?? 1)))
  } }];
}));
const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void } };
mock.module('vscode', () => ({ commands: { executeCommand: async (command: string, target: any, position: any) => {
  if (command === 'vscode.prepareCallHierarchy') return declarationsAt(target.fsPath, position).map((fn) => ({ name: fn.name, symbol: fn.wrapped.node.symbol }));
  if (command === 'vscode.provideIncomingCalls') return providerCalls([target.symbol]).map((location) =>
    ({ from: { uri: location.uri }, fromRanges: [location.range, location.range] }));
  assert.equal(command, 'vscode.executeReferenceProvider');
  const found = providerCalls(declarationsAt(target.fsPath, position).map((fn) => fn.wrapped.node.symbol));
  return [...found, { uri: target, range: { start: position, end: position } }];
} } }));
const { discoverCallerLocations } = await import('../src/caller-discovery');
const seed = pipeline.text.indexOf('BatchState{std::move(session.session_state), {}}');
assert.ok(seed >= 0);
const options = { file: pipeline.file, sourceText: pipeline.text, sourceTextByFile,
  cursorByteOffset: byteOffsetFromUtf16(pipeline.text, pipeline.text.indexOf('session_state', seed)) };
const verify = async (fn: FunctionInfo): Promise<readonly CallerLink[]> => {
  const text = sourceTextByFile.get(fn.file);
  assert.ok(text !== undefined, fn.file);
  const document = { uri: uri(fn.file), getText: () => text, positionAt: (offset: number) => positionAt(text, offset) } as unknown as vscode.TextDocument;
  const locations = await discoverCallerLocations(fn, document, AbortSignal.timeout(120000));
  return locations.locations.flatMap((location) => {
    const input = inputs.find((input) => input.file === location.uri.fsPath);
    assert.ok(input);
    return callerLinksAt(input.prepared, input.file,
      byteOffsetFromUtf16(input.text, offsetAt(input.text, location.range.start)),
      byteOffsetFromUtf16(input.text, offsetAt(input.text, location.range.end)), fn);
  });
};
const expand = async (mode: 'mutation' | 'origin', externalCallers = new Map<ClangNode, readonly CallerLink[]>(), rounds = 0): Promise<ReturnType<typeof analyzeQuery>> => {
  assert.ok(rounds < 20, 'Caller expansion did not terminate');
  const query = analyzeQuery(mode, pipeline.prepared.ast, { ...options, externalCallers }, pipeline.prepared);
  if (query.boundaries.length === 0) return query;
  const verified = await Promise.all(query.boundaries.map(async (fn) => [fn.wrapped.node, await verify(fn)] as const));
  return expand(mode, new Map([...externalCallers, ...verified]), rounds + 1);
};
const location = (node: WrappedNode) => {
  const text = sourceTextByFile.get(node.file)!;
  const offset = node.node.range?.begin?.offset ?? 0;
  return { file: path.basename(node.file), line: Buffer.from(text).subarray(0, offset).toString('utf8').split('\n').length, offset };
};
const frames = (frames: readonly TraceFrame[]) => frames.map((frame) => ({ caller: frame.caller.name,
  ...location(frame.callsite), parameterIndex: frame.parameterIndex, argument: frame.argument }));
const mutation = await expand('mutation');
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
const origin = await expand('origin');
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
console.log('Real pipeline seed: CLI mappings, generation wrap, three seed origins, and production caller discovery/USR validation verified with mocked providers. No Extension Host or C++ language server was started.');
