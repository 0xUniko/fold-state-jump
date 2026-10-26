// Read-only nano-infer regression with real compile commands and verified
// cross-extraction caller links. bun test/project-pending.ts /path/to/nano-infer
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeQuery, callerLinksAt, expressionPath, prepareAst, byteOffsetFromUtf16,
  type WrappedNode, type ReturnSource, type TraceFrame } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst, type CompileCommand } from '../src/services';

const root = path.resolve(process.argv[2] ?? '/home/huawei/nano-infer');
const extractor = path.resolve('native/build/fold-state-jump-ast');
const extracted = await ['pipeline.h', 'ffn.h'].reduce(async (work, name) => {
  const files = await work;
  const file = path.join(root, 'minicpm-v-4_7', name);
  const sourceText = await readFile(file, 'utf8');
  const command = await Effect.runPromise(resolveCompileCommand(file, [root], 'clang++', process.env.FSJ_PROJECT_COMPILE_COMMANDS));
  const started = performance.now();
  const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, extractor), 67108864, AbortSignal.timeout(120000)));
  const extractMs = performance.now() - started;
  assert.equal(await readFile(file, 'utf8'), sourceText);
  const prepared = prepareAst(JSON.parse(astText));
  if (process.env.FSJ_AUDIT_AST_DIRECTORY) {
    await mkdir(process.env.FSJ_AUDIT_AST_DIRECTORY, { recursive: true });
    await writeFile(path.join(process.env.FSJ_AUDIT_AST_DIRECTORY, 'minicpm-v-4_7-' + name + '.json'), astText);
  }
  return [...files, { file, sourceText, prepared, command, astBytes: Buffer.byteLength(astText), extractMs }];
}, Promise.resolve([] as readonly { readonly file: string; readonly sourceText: string; readonly prepared: ReturnType<typeof prepareAst>;
  readonly command: CompileCommand;
  readonly astBytes: number; readonly extractMs: number }[]));
const [pipeline, header] = extracted;
const sourceTextByFile = new Map(await Promise.all([...new Set(extracted.flatMap(({ prepared }) => prepared.index.all.map((wrapped) => wrapped.file)))]
  .filter((file) => file.startsWith(root + '/')).map(async (file) => [file, await readFile(file, 'utf8')] as const)));
const location = (wrapped: WrappedNode) => {
  const sourceText = sourceTextByFile.get(wrapped.file)!;
  const offset = wrapped.node.range?.begin?.offset ?? 0;
  return { file: path.relative(root, wrapped.file), offset, line: Buffer.from(sourceText).subarray(0, offset).toString().split('\n').length,
    text: Buffer.from(sourceText).subarray(offset, offset + 130).toString().split('\n')[0] };
};
const start = header.prepared.index.functions.find((fn) => fn.name === 'start_decode_layer')!;
const callOffset = byteOffsetFromUtf16(pipeline.sourceText, pipeline.sourceText.indexOf('start_decode_layer(bank_context, bank_state, index,'));
const links = callerLinksAt(pipeline.prepared, pipeline.file, callOffset, callOffset + 'start_decode_layer'.length, start);
assert.equal(links.length, 1, 'Clang symbol, overload and source call must match across independent extractor processes');
const externalCallers = new Map([[start.wrapped.node, links]]);
const condition = header.sourceText.indexOf('if (bank_state.pending &&');
const cursors = [
  { name: 'presence', offset: header.sourceText.indexOf('pending', condition) },
  { name: 'contained', offset: header.sourceText.indexOf('pending', header.sourceText.indexOf('&&', condition)) },
  { name: 'reset', offset: header.sourceText.indexOf('pending.reset()', condition) }
];
const frameJson = (frame: TraceFrame) => ({ caller: frame.caller.name, call: location(frame.callsite), parameterIndex: frame.parameterIndex,
  argument: frame.argument && { root: frame.argument.rootName, members: frame.argument.members },
  fold: frame.fold && { kind: frame.fold.kind, initial: location(frame.fold.initial), returned: location(frame.fold.statement),
    target: { root: frame.fold.target.rootName, members: frame.fold.target.members }, source: frame.fold.source,
    invariantObservations: frame.fold.invariantObservations.map(location) } });
const queries = cursors.flatMap(({ name, offset }) => {
  const cursorByteOffset = byteOffsetFromUtf16(header.sourceText, offset);
  const selected = header.prepared.index.all.find((wrapped) => wrapped.node.kind === 'MemberExpr' && wrapped.node.name === 'pending' &&
    wrapped.node.range?.end?.offset === cursorByteOffset)!;
  assert.deepEqual([expressionPath(selected)?.rootName, expressionPath(selected)?.members], ['bank_state', ['pending']]);
  return (['mutation', 'origin'] as const).flatMap((mode) => [false, true].map((connected) => {
    const q = analyzeQuery(mode, header.prepared.ast, { file: header.file, sourceText: header.sourceText, sourceTextByFile,
      cursorByteOffset, externalCallers: connected ? externalCallers : undefined }, header.prepared);
    const result = q.result;
    if (!connected) {
      if (mode === 'mutation') {
        assert.equal(result._tag, 'AnalysisFailure');
        if (result._tag === 'AnalysisFailure') assert.match(result.reason, /No verified caller is available for start_decode_layer/);
      } else {
        assert.equal(result._tag, 'OriginFound');
        if (result._tag === 'OriginFound') {
          assert.equal(result.origin.node, start.params[1].node);
          assert.match(result.boundary ?? '', /No verified caller/);
        }
      }
    } else if (mode === 'mutation') {
      assert.equal(result._tag, 'MutationFound', JSON.stringify(q.diagnostics));
      if (result._tag !== 'MutationFound') assert.fail();
      assert.equal(result.mutation.file, header.file);
      assert.equal(result.mutation.node.opcode, '=');
      assert.equal(expressionPath(result.mutation.children[1])?.rootName, 'bank_state');
      assert.deepEqual(expressionPath(result.mutation.children[1])?.members, []);
      assert.ok(location(result.mutation).text.startsWith('bank_state ='));
      const replacementCall = pipeline.prepared.index.calls.find((call) => call.ancestors.includes(result.mutation.node))!;
      assert.equal(replacementCall.node.callee?.name, 'begin_decode_prefetch');
      const returnedFunction = pipeline.prepared.index.functionsById.get(replacementCall.node.callee!.id)!;
      const replacementFunction = pipeline.prepared.index.enclosingFunctions.get(result.mutation)!;
      assert.equal(replacementFunction.name, 'finish_decode_layer');
      assert.equal(expressionPath(result.mutation.children[1])?.rootId, replacementFunction.params[1].node.id);
      assert.equal(returnedFunction.params[1].node.type?.qualType, 'BankState');
      assert.ok(!/[&*]/.test(returnedFunction.params[1].node.type!.qualType!));
      assert.equal(returnedFunction.params[1].node.type?.storageId, result.mutation.children[1].node.type?.storageId);
      assert.notEqual(returnedFunction.params[1].node.id, replacementFunction.params[1].node.id);
      const movedArgument = replacementCall.children[2];
      const includesBank = (wrapped: WrappedNode): boolean => wrapped.node.kind === 'DeclRefExpr' &&
        wrapped.node.referencedDecl?.id === replacementFunction.params[1].node.id || wrapped.children.some(includesBank);
      assert.ok(includesBank(movedArgument), 'the by-value argument comes from this exact caller storage');
      const returns = pipeline.prepared.index.returnSourcesByFunctionId.get(returnedFunction.id)!;
      const storageSource = (source: ReturnSource): ReturnSource => source.kind === 'transparent' || source.kind === 'preserved-copy'
        ? storageSource(source.source) : source;
      assert.equal(returns.length, 2, 'empty-prefetch early return and final return');
      returns.map((branch) => {
        const source = storageSource(branch.source);
        assert.equal(source.kind, 'storage');
        if (source.kind === 'storage') assert.equal(source.target.rootId, returnedFunction.params[1].node.id);
      });
      const pendingWrite = pipeline.prepared.index.writesByFunctionId.get(returnedFunction.id)!.get(returnedFunction.params[1].node.id!)!
        .find((write) => write.target.members.join('.') === 'pending')!;
      assert.ok(location(pendingWrite.mutation).text.startsWith('bank_state.pending ='));
      assert.ok(pendingWrite.mutation.ancestors.some((node) => node.kind === 'IfStmt'), 'prefetch installation remains conditional');
      assert.ok(result.mutation.ancestors.some((node) => node.kind === 'IfStmt'), 'caller replacement requires a next layer');
      assert.notEqual(pendingWrite.mutation.node, result.mutation.node, 'by-value local update is installed only through caller replacement');
      const frames = result.frames!;
      assert.equal(frames.length, 5);
      assert.equal(frames[0].parameterIndex, 1);
      assert.deepEqual(frames[0].argument?.members, ['session_state', '*', 'bank_state', 'pending']);
      assert.equal(frames.at(-1)?.parameterIndex, 1);
      assert.deepEqual(frames.at(-1)?.argument?.members, ['session_state', '*', 'bank_state', 'pending']);
      const fold = frames.find((frame) => frame.fold)!.fold!;
      assert.equal(fold.kind, 'borrow-preserved');
      assert.deepEqual(fold.source, fold.target);
      assert.ok(location(fold.initial).text.startsWith('LayerExecution{&session_state, nullptr}'));
      assert.ok(location(fold.statement).text.startsWith('return LayerExecution{&session_state,'));
      assert.equal(fold.invariantObservations.length, 1, 'Decode case uses the invariant captured phase');
      assert.equal(result.wrapped, true);
      assert.deepEqual(q.boundaries, [], 'external caller discovery is explicitly complete for this regression');
      assert.equal(q.diagnostics?.length, 1);
      assert.match(q.diagnostics![0], /first iteration uses the initial state/);
      assert.equal(q.returnMapping, undefined, 'navigation stops at replacement; it does not claim all RHS paths produce pending');
    } else {
      assert.equal(result._tag, 'OriginFound');
      if (result._tag !== 'OriginFound') assert.fail();
      assert.ok(location(result.origin).text.startsWith('LayerExecution{&session_state, nullptr}'));
      assert.match(result.boundary ?? '', /initial storage.*current member value/);
      assert.deepEqual(result.frames?.[0].argument?.members, ['session_state', '*', 'bank_state', 'pending']);
      assert.deepEqual(q.boundaries, []);
      assert.deepEqual(q.diagnostics, []);
    }
    return { name, mode, connected, tag: result._tag, reason: result._tag === 'AnalysisFailure' ? result.reason : undefined,
      target: result._tag === 'MutationFound' ? location(result.mutation) : result._tag === 'OriginFound' ? location(result.origin) : undefined,
      boundary: result._tag === 'OriginFound' ? result.boundary : undefined,
      wrapped: result._tag === 'MutationFound' ? result.wrapped : undefined,
      frames: result._tag === 'MutationFound' || result._tag === 'OriginFound' ? result.frames?.map(frameJson) : undefined,
      diagnostics: q.diagnostics, returnMapping: q.returnMapping, externalOwners: q.boundaries.map((fn) => fn.name) };
  }));
});
console.log(JSON.stringify({ files: extracted.map(({ file, command, astBytes, extractMs }) => ({ file, command, astBytes, extractMs })), queries }, null, 2));
