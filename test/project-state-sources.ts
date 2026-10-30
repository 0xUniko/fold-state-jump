// Opt-in real source/Clang integration. Candidate files are explicit inputs;
// FSJ_CLANGD=/path/to/clangd enables actual LSP providers; otherwise only
// provider responses are mocked. This harness does not launch Extension Host.
// bun test/project-state-sources.ts /path/to/nano-infer
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import type * as vscode from 'vscode';
import { analyzeQuery, byteOffsetFromUtf16, utf16OffsetFromByte, expressionPath, callerLinksAt, prepareAst, type CallerLink, type ClangNode, type FunctionInfo, type TraceFrame, type WrappedNode } from '../src/analysis';
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
// Both provider modes use the production discovery union, byte offsets,
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
const clangd = process.env.FSJ_CLANGD ? await (await import('./clangd-callers')).startClangd(process.env.FSJ_CLANGD, root, inputs) : undefined;
const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void } };
mock.module('vscode', () => ({ commands: { executeCommand: clangd?.executeCommand ?? (async (command: string, target: any, position: any) => {
  if (command === 'vscode.prepareCallHierarchy') return declarationsAt(target.fsPath, position).map((fn) => ({ name: fn.name, symbol: fn.wrapped.node.symbol }));
  if (command === 'vscode.provideIncomingCalls') return providerCalls([target.symbol]).map((location) =>
    ({ from: { uri: location.uri }, fromRanges: [location.range, location.range] }));
  assert.equal(command, 'vscode.executeReferenceProvider');
  const found = providerCalls(declarationsAt(target.fsPath, position).map((fn) => fn.wrapped.node.symbol));
  return [...found, { uri: target, range: { start: position, end: position } }];
}) } }));
const { discoverCallerLocations } = await import('../src/caller-discovery');
const verify = async (fn: FunctionInfo): Promise<readonly CallerLink[]> => {
  const text = sourceTextByFile.get(fn.file);
  assert.ok(text !== undefined, fn.file);
  const document = { uri: uri(fn.file), getText: () => text, positionAt: (offset: number) => positionAt(text, offset) } as unknown as vscode.TextDocument;
  const locations = await discoverCallerLocations(fn, document, AbortSignal.timeout(120000));
  return locations.locations.flatMap((location) => {
    const input = inputs.find((input) => input.file === location.uri.fsPath);
    assert.ok(input);
    const links = callerLinksAt(input.prepared, input.file,
      byteOffsetFromUtf16(input.text, offsetAt(input.text, location.range.start)),
      byteOffsetFromUtf16(input.text, offsetAt(input.text, location.range.end)), fn);
    console.log(JSON.stringify({ event: 'verify-caller', function: fn.name, symbol: fn.wrapped.node.symbol,
      file: input.file, range: location.range, links: links.map((link) => ({
        caller: link.caller.name, calleeSymbol: link.callsite.node.callee?.symbol, callRange: link.callsite.node.range })) }));
    return links;
  });
};
const expand = async (mode: 'mutation' | 'origin', options: { readonly cursorByteOffset: number }, externalCallers = new Map<ClangNode, readonly CallerLink[]>(), rounds = 0): Promise<ReturnType<typeof analyzeQuery>> => {
  assert.ok(rounds < 20, 'Caller expansion did not terminate');
  const query = analyzeQuery(mode, pipeline.prepared.ast, { file: pipeline.file, sourceText: pipeline.text, sourceTextByFile, ...options, externalCallers }, pipeline.prepared);
  if (query.boundaries.length === 0) return query;
  const verified = await Promise.all(query.boundaries.map(async (fn) => [fn.wrapped.node, await verify(fn)] as const));
  return expand(mode, options, new Map([...externalCallers, ...verified]), rounds + 1);
};
const location = (node: WrappedNode) => {
  const text = sourceTextByFile.get(node.file)!;
  const offset = node.node.range?.begin?.offset ?? 0;
  return { file: path.basename(node.file), line: Buffer.from(text).subarray(0, offset).toString('utf8').split('\n').length, offset };
};
const frames = (frames: readonly TraceFrame[]) => frames.map((frame) => ({ caller: frame.caller.name,
  ...location(frame.callsite), calleeSymbol: frame.callsite.node.callee?.symbol, parameterIndex: frame.parameterIndex, argument: frame.argument }));
const selections = [
  ['declaration', 'SessionState session_state, Input input'],
  ['guard', 'session_state.position + nt'],
  ['fold-seed', 'std::move(session_state.caches)']
] as const;
const summary = (query: ReturnType<typeof analyzeQuery>) => {
  const result = query.result;
  const candidates = result._tag === 'OriginCandidatesFound' || result._tag === 'CandidatesFound' ? result.candidates
    : result._tag === 'OriginFound' || result._tag === 'MutationFound' ? [result] : [];
  return { result: result._tag, candidates: candidates.map((candidate) => ({
    target: location('origin' in candidate ? candidate.origin : candidate.mutation),
    frames: frames(candidate.frames ?? []), boundary: 'boundary' in candidate ? candidate.boundary : undefined
  })), diagnostics: query.diagnostics, boundaries: query.boundaries.map((fn) => ({ name: fn.name, symbol: fn.wrapped.node.symbol })) };
};
try {
  await selections.reduce(async (work, [name, snippet]) => {
    await work;
    const start = pipeline.text.indexOf(snippet);
    assert.ok(start >= 0, snippet);
    const cursorByteOffset = byteOffsetFromUtf16(pipeline.text, start + snippet.indexOf('session_state'));
    const options = { cursorByteOffset };
    const selected = pipeline.prepared.index.all.filter((node) =>
      (node.node.name === 'session_state' || node.node.kind === 'DeclRefExpr' && node.node.referencedDecl?.name === 'session_state') &&
      (node.node.loc?.offset ?? node.node.range?.begin?.offset) === cursorByteOffset).map((node) => {
        const fn = pipeline.prepared.index.enclosingFunctions.get(node)!;
        return { kind: node.node.kind, id: node.node.id, owner: fn.name, symbol: fn.wrapped.node.symbol,
          path: expressionPath(node), parameterIndex: fn.params.findIndex((param) => param.node.id === expressionPath(node)?.rootId) };
      });
    console.log(JSON.stringify({ selection: name, cursorByteOffset, nodes: selected }));
    const origin = await expand('origin', options);
    const origins = origin.result._tag === 'OriginCandidatesFound' ? origin.result.candidates
      : origin.result._tag === 'OriginFound' ? [origin.result] : [];
    assert.equal(origins.length, 3, JSON.stringify(summary(origin)));
    assert.deepEqual(origins.map((candidate) => candidate.frames?.[0].caller.name).sort(), ['run_batch', 'run_batch', 'run_embeddings']);
    origins.map((candidate) => {
      assert.equal(candidate.origin.file, cli.file);
      assert.equal(candidate.kind, 'initialization');
      const embeddings = candidate.frames?.[0].caller.name === 'run_embeddings';
      const generation = candidate.frames?.[1].argument?.rootName === 'generation';
      const seed = embeddings ? 'std::move(batch_state),\n' : generation
        ? 'Generation{std::move(batch_state), {}, false, 0, 0}' : 'BatchState{std::move(session_state), {}}';
      assert.equal(candidate.origin.node.range?.begin?.offset, byteOffsetFromUtf16(cli.text, cli.text.indexOf(seed)));
      assert.equal(candidate.frames?.length, 2);
      assert.deepEqual(candidate.frames?.[0].argument?.members, []);
      assert.deepEqual(candidate.frames?.[1].argument?.members, generation ? ['batch_state', 'session_state'] : ['session_state']);
      assert.ok(candidate.frames?.every((frame) => frame.parameterIndex === 0));
      assert.ok(candidate.frames?.[0].callsite.node.callee?.symbol?.includes(embeddings ? 'EmbeddingInput' : 'TokenInput'));
    });
    const mutation = await expand('mutation', options);
    console.log(JSON.stringify({ selection: name, mode: 'origin', ...summary(origin) }, null, 2));
    console.log(JSON.stringify({ selection: name, mode: 'mutation', ...summary(mutation) }, null, 2));
    assert.equal(mutation.result._tag, 'MutationFound', JSON.stringify(summary(mutation)));
    if (mutation.result._tag === 'MutationFound') {
      const result = mutation.result;
      assert.equal(result.mutation.file, cli.file);
      assert.ok(Buffer.from(cli.text).subarray(result.mutation.node.range!.begin!.offset!).toString('utf8').startsWith('generation.batch_state ='));
      assert.equal(result.wrapped, true);
      assert.equal(result.frames?.filter((frame) => frame.fold).length, 1, 'retain the recurrence witness');
      assert.deepEqual(result.frames?.filter((frame) => !frame.fold).map((frame) => frame.caller.name), ['run_batch', 'operator()']);
      assert.deepEqual(result.frames?.filter((frame) => !frame.fold).map((frame) => frame.argument?.members), [[], ['batch_state', 'session_state']]);
      assert.ok(mutation.diagnostics?.some((reason) => reason.includes('No mutation is verified on this fold return path')));
    }
  }, Promise.resolve());
  console.log('Current execute declaration and uses: both concrete instances, three CLI seeds and generation source-order wrap verified. Provider mode: ' + (process.env.FSJ_CLANGD ? 'actual clangd LSP' : 'mocked') + '. No Extension Host/UI was started.');
} finally { await clangd?.close(); }
