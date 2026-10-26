// Read-only investigation against an AST extracted with the system-body filter
// disabled in a temporary extractor (reproduction in docs/return-delivery.md).
// bun test/system-return-probe.ts /tmp/full-cli.json /path/to/nano-infer
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { analyzeQuery, byteOffsetFromUtf16, prepareAst, type ReturnSource, type WrappedNode } from '../src/analysis';
const astFile = path.resolve(process.argv[2]!);
const root = path.resolve(process.argv[3] ?? '/home/huawei/nano-infer');
const file = path.join(root, 'minicpm-v-4_7/cli.cpp');
const astText = await readFile(astFile, 'utf8');
const text = await readFile(file, 'utf8');
const prepared = prepareAst(JSON.parse(astText));
const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
const reference = (wrapped: WrappedNode) => ({ kind: wrapped.node.kind, file: wrapped.file,
  offset: wrapped.node.range?.begin?.offset, callee: wrapped.node.callee?.qualifiedName });
const sourceEvidence = (source: ReturnSource): unknown => {
  switch (source.kind) {
    case 'transparent':
    case 'preserved-copy': return { kind: source.kind, expression: reference(source.expression), source: sourceEvidence(source.source) };
    case 'loop-carried': return { kind: source.kind, target: source.target, declaration: reference(source.declaration),
      initial: source.initial && reference(source.initial), updates: source.updates.map((update) => ({ kind: update.kind,
        target: update.target, loop: reference(update.loop), statement: reference(update.statement),
        ...(update.kind === 'replacement' ? { value: reference(update.value) } : {}) })) };
    case 'call': return { kind: source.kind, callsite: reference(source.callsite), callee: source.callee.id, members: source.members };
    case 'aggregate': return { kind: source.kind, fields: source.fields.map((field) => ({ name: field.name, source: sourceEvidence(field.source) })) };
    case 'storage':
    case 'unsupported': return source;
    case 'initialization': return { kind: source.kind, origin: reference(source.origin) };
  }
};
const folds = prepared.index.functions.filter((fn) => fn.file.endsWith('/range/v3/algorithm/fold_left.hpp'));
assert.ok(folds.some((fn) => fn.params.length === 3), 'instantiated range overload must be retained');
assert.ok(folds.some((fn) => fn.params.length === 4), 'instantiated iterator overload must be retained');
const queries = [
  ['generation-seed', 'Generation{std::move(batch_state), {}, false}', 'batch_state'],
  ['chat-return', 'return {std::move(generation.batch_state.session_state), std::move(history)};', 'session_state']
].map(([name, snippet, token]) => {
  const start = text.indexOf(snippet);
  assert.ok(start >= 0);
  const options = { file, sourceText: text, cursorByteOffset: byteOffsetFromUtf16(text, text.indexOf(token, start)) };
  const query = analyzeQuery('mutation', prepared.ast, options, prepared);
  assert.equal(query.result._tag, 'AnalysisFailure', name + ': never invent a final accumulator mutation');
  assert.match(query.diagnostics?.join(' ') ?? '', /Loop-carried return value/);
  return { name, cursorByteOffset: options.cursorByteOffset, result: query.result, returnMapping: query.returnMapping,
    boundaries: query.boundaries.map((fn) => ({ name: fn.name, file: fn.file })), diagnostics: query.diagnostics };
});
console.log(JSON.stringify({ scope: 'Single diagnostic experiment; no performance claim. All transitively called system definitions retained in a temporary extractor.',
  astBytes: Buffer.byteLength(astText), astSha256: sha256(astText), sourceSha256: sha256(text),
  analysisSha256: sha256(await readFile('src/analysis.ts')), functions: prepared.index.functions.length,
  systemHeaderSha256: sha256(await readFile(folds[0].file)),
  folds: folds.map((fn) => ({ id: fn.id, file: fn.file, name: fn.name, parameters: fn.params.map((parameter) => parameter.node.name),
    branches: prepared.index.returnSourcesByFunctionId.get(fn.id)?.map((branch) => ({ statement: reference(branch.statement), source: sourceEvidence(branch.source) })) })), queries }, null, 2));
