// bun test/project-return-sources.ts /path/to/nano-infer
// Independent assertions on the original audit cursors and remaining boundary.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeQuery, byteOffsetFromUtf16, prepareAst } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const root = path.resolve(process.argv[2] ?? '/home/huawei/nano-infer');
const file = path.join(root, 'minicpm-v-4_7/cli.cpp');
const text = await readFile(file, 'utf8');
const command = await Effect.runPromise(resolveCompileCommand(file, [root], 'clang++', process.env.FSJ_PROJECT_COMPILE_COMMANDS));
const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, path.resolve('native/build/fold-state-jump-ast')), 67108864, AbortSignal.timeout(120000)));
assert.equal(await readFile(file, 'utf8'), text);
const prepared = prepareAst(JSON.parse(astText));
const prefill = prepared.index.functions.find((fn) => fn.name === 'prefill')!;
assert.ok(prefill);
const branches = prepared.index.returnSourcesByFunctionId.get(prefill.id)!;
assert.equal(branches.length, 1, 'nested lambdas must not contribute returns to prefill');
assert.equal(branches[0].source.kind, 'unsupported');
const returnOffset = branches[0].statement.node.range!.begin!.offset!;
assert.equal(returnOffset, byteOffsetFromUtf16(text, text.indexOf('return ranges::fold_left(', text.indexOf('inline BatchState prefill('))));
const cases = [
  { name: 'generation-seed', snippet: 'Generation{std::move(batch_state), {}, false}', expression: 'batch_state', line: 471, originLine: 448 },
  { name: 'chat-return', snippet: 'return {std::move(generation.batch_state.session_state), std::move(history)};', expression: 'session_state', line: 513, originLine: 469 }
] as const;
cases.map((test) => {
  const start = text.indexOf(test.snippet);
  assert.ok(start >= 0);
  const offset = text.indexOf(test.expression, start);
  assert.ok(offset >= start && offset < start + test.snippet.length);
  assert.equal(text.slice(0, offset).split('\n').length, test.line);
  const options = { file, sourceText: text, cursorByteOffset: byteOffsetFromUtf16(text, offset) };
  const q = analyzeQuery('mutation', prepared.ast, options, prepared);
  assert.equal(q.result._tag, 'AnalysisFailure', 'no fabricated mutation through a system range adapter');
  assert.equal(q.returnMapping?.kind, 'incomplete');
  assert.match(q.diagnostics?.join(' ') ?? '', /ranges::fold_left_fn::operator\(\) \(definition unavailable\)/);
  if (test.name === 'generation-seed') {
    assert.equal(q.diagnostics?.length, 2);
    assert.ok(q.diagnostics![1].startsWith(file + ':' + returnOffset + ' return: '), 'prefill return must actually be traversed');
    assert.match(q.diagnostics![0], /return source of prefill/);
  } else assert.equal(q.diagnostics?.length, 1);
  const origin = analyzeQuery('origin', prepared.ast, options, prepared);
  assert.equal(origin.result._tag, 'OriginFound');
  if (origin.result._tag !== 'OriginFound') return;
  assert.equal(origin.result.origin.file, file);
  assert.equal(Buffer.from(text).subarray(0, origin.result.origin.node.range!.begin!.offset!).toString().split('\n').length, test.originLine);
  assert.equal(origin.result.kind, 'initialization');
  assert.deepEqual(origin.result.frames, []);
  console.log(JSON.stringify({ name: test.name, line: test.line, returnMapping: q.returnMapping, diagnostics: q.diagnostics, originLine: test.originLine }));
});
console.log('Original return-source audit cursors: prefill return traversal and system fold definition boundary verified.');
