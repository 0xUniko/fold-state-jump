// Opt-in read-only real-project integration; no Extension Host or language server.
// bun test/project-state-audit.ts /path/to/nano-infer
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeQuery, byteOffsetFromUtf16, expressionPath, prepareAst, type WrappedNode } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const root = path.resolve(process.argv[2] ?? '/home/huawei/nano-infer');
const executable = path.resolve('native/build/fold-state-jump-ast');
const directory = process.env.FSJ_AUDIT_AST_DIRECTORY;
if (directory) await mkdir(directory, { recursive: true });
const cases = [
  { name: 'batch-return', file: 'minicpm-v-4_7/pipeline.h', snippet: 'return {std::move(session_state), std::move(logits)};', expression: 'session_state' },
  { name: 'layer-borrow', file: 'minicpm-v-4_7/pipeline.h', snippet: 'return LayerExecution{&session_state,', expression: 'session_state' },
  { name: 'prefill-helper', file: 'minicpm-v-4_7/pipeline.h', snippet: 'finish_prefill_read(bank_state, std::move(current));', expression: 'bank_state' },
  { name: 'layer-seed', file: 'minicpm-v-4_7/pipeline.h', snippet: 'LayerExecution{&session_state, nullptr}', expression: 'session_state' },
  { name: 'generation-wrap', file: 'minicpm-v-4_7/cli.cpp', snippet: 'if (generation.done || generation.batch_state.session_state.position >=', expression: 'position' },
  { name: 'generation-done', file: 'minicpm-v-4_7/cli.cpp', snippet: 'if (generation.done || generation.batch_state.session_state.position >=', expression: 'done' },
  { name: 'generation-seed', file: 'minicpm-v-4_7/cli.cpp', snippet: 'Generation{std::move(batch_state), {}, false}', expression: 'batch_state' },
  { name: 'chat-return', file: 'minicpm-v-4_7/cli.cpp', snippet: 'return {std::move(generation.batch_state.session_state), std::move(history)};', expression: 'session_state' },
  { name: 'clear-input', file: 'minicpm-v-4_7/cli.cpp', snippet: 'std::move(interactive->chat_state.session_state)})', expression: 'session_state' },
  { name: 'pending-presence', file: 'minicpm-v-4_7/ffn.h', snippet: 'if (bank_state.pending &&', expression: 'pending' },
  { name: 'pending-contained', file: 'minicpm-v-4_7/ffn.h', snippet: 'bank_state.pending->reservation.layer', expression: 'pending' },
  { name: 'pending-reset', file: 'minicpm-v-4_7/ffn.h', snippet: 'bank_state.pending.reset();', expression: 'pending' },
  { name: 'prefill-counter', file: 'minicpm-v-4_7/ffn.h', snippet: 'return {current.layer, std::move(current.slot_ids),', expression: 'current' },
  { name: 'slot-index', file: 'minicpm-v-4_7/experts.h', snippet: 'plan.slots.ages[slot.index] = ++plan.slots.tick;', expression: 'ages' },
  { name: 'prefetch-return', file: 'minicpm-v-4_7/experts.h', snippet: 'return bank_state;\n}\n\n// 将一次读取', expression: 'bank_state' },
  { name: 'read-progress', file: 'minicpm-v-4_7/expert_io.h', snippet: 'if (--progress.remaining != 0)', expression: 'remaining' },
  { name: 'future-result', file: 'minicpm-v-4_7/expert_io.h', snippet: 'std::get<std::future<SharedReadCompletion>>(read_ticket.read_result)', expression: 'read_result' },
  { name: 'queue-count', file: 'minicpm-v-4_7/expert_io.h', snippet: 'if (!queue.queue_state.count)', expression: 'count' },
  { name: 'attention-cache', file: 'deepseek-v4-flash/attention_pipeline.h', snippet: 'const auto &cache = state.cache->layers.at(il);', expression: 'cache' },
  { name: 'attention-return', file: 'deepseek-v4-flash/attention_pipeline.h', snippet: 'AttentionState(state.position.advance(static_cast<int>(tokens.size())),', expression: 'position' },
  { name: 'ffn-runtime', file: 'deepseek-v4-flash/ffn_service.h', snippet: 'const auto &weights = state.banks[index]->weights;', expression: 'banks' },
  { name: 'ffn-service', file: 'deepseek-v4-flash/ffn_service.h', snippet: 'handle_request(state.ffn, *ready);', expression: 'ffn' },
  { name: 'rpc-variant', file: 'shared/ffn_rpc.h', snippet: 'return begin_shutdown(std::move(state));', expression: 'state' },
  { name: 'deepseek-prefill', file: 'deepseek-v4-flash/attention_node.cpp', snippet: 'auto &previous = std::get<BatchResult>(state);', expression: 'state' },
  { name: 'deepseek-generation', file: 'deepseek-v4-flash/attention_node.cpp', snippet: 'auto &current = std::get<BatchResult>(state);', expression: 'state' }
] as const;

const files = [...new Set(cases.map((test) => test.file))];
type ExpectedMutation = { readonly file: string; readonly line: number; readonly anchor?: string; readonly wrapped: boolean; readonly callers: readonly string[] };
const mutations: Readonly<Record<string, ExpectedMutation>> = {
  'batch-return': { file: 'minicpm-v-4_7/pipeline.h', line: 1077, wrapped: false, callers: [] },
  'prefill-helper': { file: 'minicpm-v-4_7/ffn.h', line: 250, wrapped: false, callers: ['operator()'] },
  'layer-seed': { file: 'minicpm-v-4_7/pipeline.h', line: 883, wrapped: false, callers: ['operator()'] },
  'generation-wrap': { file: 'minicpm-v-4_7/cli.cpp', line: 492, wrapped: true, callers: [] },
  'generation-done': { file: 'minicpm-v-4_7/cli.cpp', line: 483, wrapped: true, callers: [] },
  'clear-input': { file: 'minicpm-v-4_7/cli.cpp', line: 644, wrapped: true, callers: [] },
  'prefetch-return': { file: 'minicpm-v-4_7/experts.h', line: 585, anchor: 'bank_state.pending =', wrapped: false, callers: [] },
  'ffn-runtime': { file: 'deepseek-v4-flash/ffn_service.h', line: 476, wrapped: false, callers: ['operator()'] }
};
const selectedPaths: Readonly<Record<string, readonly [string, readonly string[]]>> = {
  'batch-return': ['session_state', []], 'prefill-helper': ['bank_state', []], 'layer-seed': ['session_state', []],
  'generation-wrap': ['generation', ['batch_state', 'session_state', 'position']],
  'generation-done': ['generation', ['done']], 'clear-input': ['interactive', ['*', 'chat_state', 'session_state']],
  'prefetch-return': ['bank_state', []], 'read-progress': ['progress', ['remaining']], 'ffn-runtime': ['state', ['banks']]
};
const boundaries: Readonly<Record<string, RegExp>> = {
  'layer-borrow': /Unverified call effect on layer_execution\.session_state\.\*: finish_host_copies/,
  'generation-seed': /Unsupported argument expression: CallExpr/,
  'chat-return': /Unsupported argument expression: CXXOperatorCallExpr/,
  'pending-presence': /No verified caller is available for start_decode_layer/,
  'pending-contained': /No verified caller is available for start_decode_layer/,
  'pending-reset': /No verified caller is available for start_decode_layer/,
  'prefill-counter': /Unverified call effect on current\.: operator\(\)/,
  'slot-index': /Return copy\/move field preservation is not verified/,
  'read-progress': /Fold range has at most one iteration/,
  'future-result': /Unverified call effect on read_ticket\.read_result: get_if/,
  'queue-count': /No verified caller is available for take_io_task/,
  'attention-cache': /Return source unavailable: std::vector<LayerCaches>::at/,
  'attention-return': /No verified caller is available for run_batch/,
  'ffn-service': /Unverified call effect on state\.ffn: finish_request/,
  'rpc-variant': /No verified caller is available for advance/,
  'deepseek-prefill': /Unverified call effect on state\.: run_batch/,
  'deepseek-generation': /Unverified call effect on state\.: holds_alternative/
};
const origins: Readonly<Record<string, { readonly line: number; readonly boundary?: string; readonly callers?: readonly string[]; readonly foldMember?: boolean; readonly anchor?: string }>> = {
  'batch-return': { line: 801, foldMember: true }, 'layer-borrow': { line: 924, foldMember: true },
  'prefill-helper': { line: 924, callers: ['operator()'], foldMember: true }, 'layer-seed': { line: 801, foldMember: true },
  'generation-wrap': { line: 471, foldMember: true }, 'generation-done': { line: 471, foldMember: true }, 'generation-seed': { line: 448 },
  'chat-return': { line: 469 }, 'clear-input': { line: 625, foldMember: true },
  'pending-presence': { line: 262, boundary: 'No verified caller is available; stopped at the parameter.' },
  'pending-contained': { line: 262, boundary: 'No verified caller is available; stopped at the parameter.' },
  'pending-reset': { line: 262, boundary: 'No verified caller is available; stopped at the parameter.' },
  'prefill-counter': { line: 457, boundary: 'No verified caller is available; stopped at the parameter.', callers: ['finish_prefill_layer'] },
  'slot-index': { line: 433, anchor: 'selected, Planning{bank_state.slots, {}, {}, {}}', foldMember: true }, 'prefetch-return': { line: 511, anchor: 'BankState bank_state, int layer,', boundary: 'No verified caller is available; stopped at the parameter.' },
  'read-progress': { line: 790, foldMember: true }, 'future-result': { line: 497, boundary: 'No verified caller is available; stopped at the parameter.' },
  'queue-count': { line: 722, boundary: 'No verified caller is available; stopped at the parameter.' },
  'attention-cache': { line: 1716 }, 'attention-return': { line: 1683, boundary: 'No verified caller is available; stopped at the parameter.' },
  'ffn-runtime': { line: 484, foldMember: true }, 'ffn-service': { line: 671, foldMember: true },
  'rpc-variant': { line: 320, boundary: 'No verified caller is available; stopped at the parameter.' },
  'deepseek-prefill': { line: 44 }, 'deepseek-generation': { line: 59 }
};
await files.reduce(async (work, relative) => {
  await work;
  const file = path.join(root, relative);
  const text = await readFile(file, 'utf8');
  // These headers require target-specific generated protobuf includes. The
  // nearest file is main.cpp, whose target deliberately has no protobuf flags.
  const translationUnits: Readonly<Record<string, string>> = {
    'deepseek-v4-flash/attention_pipeline.h': 'deepseek-v4-flash/attention_node.cpp',
    'deepseek-v4-flash/ffn_service.h': 'deepseek-v4-flash/ffn_node.cpp',
    'shared/ffn_rpc.h': 'deepseek-v4-flash/ffn_node.cpp'
  };
  const translationUnit = translationUnits[relative];
  const resolved = await Effect.runPromise(resolveCompileCommand(path.join(root, translationUnit ?? relative), [root], 'clang++', process.env.FSJ_PROJECT_COMPILE_COMMANDS));
  const command = translationUnit ? { ...resolved, args: [...resolved.args.slice(0, -1), '-x', 'c++-header', file] } : resolved;
  const started = performance.now();
  const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, executable), 67108864, AbortSignal.timeout(120000)));
  assert.equal(await readFile(file, 'utf8'), text);
  if (directory) await writeFile(path.join(directory, relative.replaceAll('/', '-') + '.json'), astText);
  const prepared = prepareAst(JSON.parse(astText));
  const sourceTextByFile = new Map(await Promise.all([...new Set(prepared.index.all.map((wrapped) => wrapped.file))]
    .filter((file) => file.startsWith(root + '/') && !file.includes('/llama.cpp/') && !file.includes('/vcpkg'))
    .map(async (file) => [file, await readFile(file, 'utf8')] as const)));
  const location = (wrapped: WrappedNode) => {
    const text = sourceTextByFile.get(wrapped.file);
    assert.ok(text !== undefined, wrapped.file);
    const offset = wrapped.node.range?.begin?.offset ?? 0;
    return { file: path.relative(root, wrapped.file), line: Buffer.from(text).subarray(0, offset).toString().split('\n').length,
      text: Buffer.from(text).subarray(offset, offset + 110).toString().split('\n')[0] };
  };
  const queries = cases.filter((test) => test.file === relative).map((test) => {
    const start = text.indexOf(test.snippet);
    assert.ok(start >= 0, test.name + ': ' + test.snippet);
    const offset = text.indexOf(test.expression, start);
    assert.ok(offset >= start && offset < start + test.snippet.length);
    const options = { file, sourceText: text, sourceTextByFile, cursorByteOffset: byteOffsetFromUtf16(text, offset) };
    if (selectedPaths[test.name]) {
      const selectedPathsAtCursor = prepared.index.all.filter((wrapped) => wrapped.file === file && (
        wrapped.node.kind === 'MemberExpr' ? wrapped.node.range?.end?.offset === options.cursorByteOffset :
          wrapped.node.kind === 'DeclRefExpr' && wrapped.node.range?.begin?.offset === options.cursorByteOffset))
        .flatMap((wrapped) => { const target = expressionPath(wrapped); return target ? [[target.rootName, target.members]] : []; });
      assert.ok(selectedPathsAtCursor.some((target) => JSON.stringify(target) === JSON.stringify(selectedPaths[test.name])), test.name + ': member identity');
    }
    return { name: test.name, selected: { file: relative, line: text.slice(0, offset).split('\n').length },
      queries: (['mutation', 'origin'] as const).map((mode) => {
        const query = analyzeQuery(mode, prepared.ast, options, prepared);
        const result = query.result;
        if (mode === 'mutation') {
          const expected = mutations[test.name];
          if (expected) {
            assert.equal(result._tag, 'MutationFound', test.name + ': ' + JSON.stringify(query.diagnostics));
            if (result._tag === 'MutationFound' && result.wrapped) assert.ok(result.frames?.some((frame) => frame.fold), test.name + ': recurrence proof');
            if (result._tag !== 'MutationFound') assert.fail(test.name);
            assert.deepEqual([location(result.mutation).file, location(result.mutation).line, result.wrapped,
              result.frames?.filter((frame) => !frame.fold).map((frame) => frame.caller.name)], [expected.file, expected.anchor ? text.slice(0, text.indexOf(expected.anchor)).split('\n').length : expected.line, expected.wrapped, expected.callers], test.name);
          } else {
            assert.ok(boundaries[test.name], 'Missing mutation expectation: ' + test.name);
            assert.equal(result._tag, 'AnalysisFailure', test.name);
            if (result._tag !== 'AnalysisFailure') assert.fail(test.name);
            assert.match(result.reason, boundaries[test.name], test.name);
          }
        } else {
          const expected = origins[test.name];
          assert.ok(expected, 'Missing origin expectation: ' + test.name);
          assert.equal(result._tag, 'OriginFound', test.name);
          if (result._tag !== 'OriginFound') assert.fail(test.name);
          assert.deepEqual([location(result.origin).file, location(result.origin).line, result.kind, result.boundary,
            result.frames?.filter((frame) => !frame.fold).map((frame) => frame.caller.name)],
          [relative, expected.anchor ? text.slice(0, text.indexOf(expected.anchor)).split('\n').length : expected.line, expected.boundary ? 'parameter' : 'initialization',
            expected.foldMember ? 'Fold seed identifies the initial storage; the current member value may be carried from a previous iteration.' : expected.boundary, expected.callers ?? []], test.name);
        }
        const candidates = result._tag === 'MutationFound' || result._tag === 'OriginFound' ? [result] : [];
        return { mode, tag: result._tag, ...(result._tag === 'AnalysisFailure' ? { reason: result.reason } : {}),
          candidates: candidates.map((candidate) => ({
            target: location('mutation' in candidate ? candidate.mutation : candidate.origin),
            wrapped: 'wrapped' in candidate ? candidate.wrapped : undefined,
            boundary: 'boundary' in candidate ? candidate.boundary : undefined,
            frames: candidate.frames?.map((frame) => ({ caller: frame.caller.name, call: location(frame.callsite),
              argument: frame.argument && [frame.argument.rootName, frame.argument.members],
              receiver: frame.receiver && [frame.receiver.rootName, frame.receiver.members] }))
          })), diagnostics: query.diagnostics, externalOwners: query.boundaries.map((fn) => fn.name) };
      }) };
  });
  console.log(JSON.stringify({ file: relative, extractAndPrepareMs: performance.now() - started, astBytes: Buffer.byteLength(astText), queries }));
}, Promise.resolve());
