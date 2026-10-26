// bun test/return-sources-performance.ts baseline-analysis.ts baseline-extractor nano-infer-root [runs=5] [queries=100] [input]
// Interleaved cold extractions, identical bytes/flags/cursors, warm query batches.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Effect } from 'effect';
import * as current from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const baseline: Pick<typeof current, 'prepareAst' | 'analyzeQuery'> = await import(path.resolve(process.argv[2]!));
const root = path.resolve(process.argv[4]!);
const runs = Number(process.argv[5] ?? 5);
const repetitions = Number(process.argv[6] ?? 100);
assert.ok(runs >= 3 && Number.isSafeInteger(runs));
assert.ok(repetitions > 0 && Number.isSafeInteger(repetitions));
const variants = [
  { name: 'before', module: baseline, extractor: path.resolve(process.argv[3]!) },
  { name: 'after', module: current, extractor: path.resolve('native/build/fold-state-jump-ast') }
] as const;
const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
const currentSourceSha256 = sha256(await readFile('src/analysis.ts'));
const baselineSourceSha256 = sha256(await readFile(process.argv[2]!));
const inputs = [
  { name: 'micro', file: path.resolve('test/fixtures/return-sources.cpp'), queries: [
    ['parameter', '// @select parameter', 'value'], ['relay', '// @select relay', 'value'],
    ['aggregate', '// @select aggregate-left', 'value'], ['branches', '// @select branches', 'value'],
    ['partial', '// @select partial', 'value'], ['capture', '// @select capture', 'value']
  ] },
  { name: 'pipeline.h', file: path.join(root, 'minicpm-v-4_7/pipeline.h'), queries: [
    ['batch-return', 'return {std::move(session_state), std::move(logits)};', 'session_state'],
    ['layer-seed', 'LayerExecution{&session_state, nullptr}', 'session_state']
  ] },
  { name: 'cli.cpp', file: path.join(root, 'minicpm-v-4_7/cli.cpp'), queries: [
    ['generation-wrap', 'if (generation.done || generation.batch_state.session_state.position >=', 'position'],
    ['generation-done', 'if (generation.done || generation.batch_state.session_state.position >=', 'done'],
    ['generation-seed', 'Generation{std::move(batch_state), {}, false}', 'batch_state'],
    ['chat-return', 'return {std::move(generation.batch_state.session_state), std::move(history)};', 'session_state']
  ] }
] as const;
// This projection counts the added index metadata without serializing existing
// wrapper trees again. It measures logical JSON bytes, not JS heap allocation.
const reference = (wrapped: current.WrappedNode) => ({ file: wrapped.file, kind: wrapped.node.kind, offset: wrapped.node.range?.begin?.offset });
const summary = (source: current.ReturnSource): unknown => {
  switch (source.kind) {
    case 'storage': return source;
    case 'unsupported': return source;
    case 'initialization': return { kind: source.kind, origin: reference(source.origin) };
    case 'transparent':
    case 'preserved-copy': return { kind: source.kind, expression: reference(source.expression), source: summary(source.source) };
    case 'aggregate': return { kind: source.kind, origin: reference(source.origin), fields: source.fields.map((field) => ({ name: field.name, source: summary(field.source) })) };
    case 'call': return { kind: source.kind, callsite: reference(source.callsite), callee: source.callee.id, members: source.members };
  }
};
const measurements = await inputs.filter((input) => !process.argv[7] || input.name === process.argv[7]).reduce<Promise<unknown[]>>(async (work, input) => {
  const measurements = await work;
  const text = await readFile(input.file, 'utf8');
  const sourceSha256 = sha256(text);
  const command = input.name === 'micro' ? { compiler: 'clang++', args: ['-std=c++20', input.file], cwd: process.cwd() }
    : await Effect.runPromise(resolveCompileCommand(input.file, [root], 'clang++', process.env.FSJ_PROJECT_COMPILE_COMMANDS));
  const queries = input.queries.map(([name, snippet, token]) => {
    const start = text.indexOf(snippet);
    assert.ok(start >= 0, name);
    const offset = input.name === 'micro' ? text.lastIndexOf(token, start) : text.indexOf(token, start);
    assert.ok(offset >= 0, name);
    return { name, offset: current.byteOffsetFromUtf16(text, offset) };
  });
  const samples = await Array.from({ length: runs }).reduce<Promise<unknown[]>>(async (work, _, run) => {
    const samples = await work;
    const orderedVariants: ReadonlyArray<(typeof variants)[number]> = run % 2 === 0 ? variants : [variants[1], variants[0]];
    return orderedVariants.reduce<Promise<unknown[]>>(async (work, variant) => {
      const samples = await work;
      const started = performance.now();
      const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, variant.extractor), 67108864, AbortSignal.timeout(120000)));
      const extractMs = performance.now() - started;
      assert.equal(await readFile(input.file, 'utf8'), text);
      const parseStarted = performance.now();
      const ast = JSON.parse(astText);
      const parseMs = performance.now() - parseStarted;
      const prepareStarted = performance.now();
      const prepared = variant.module.prepareAst(ast);
      const prepareMs = performance.now() - prepareStarted;
      const returnStarted = performance.now();
      const rebuilt = variant.name === 'after' ? Array.from({ length: 20 }).map(() => current.buildReturnSources(prepared.index)) : [];
      const returnSummaryMs = rebuilt.length ? (performance.now() - returnStarted) / rebuilt.length : 0;
      const returnSources = [...(prepared.index.returnSourcesByFunctionId ?? [])];
      const returnMetadataBytes = Buffer.byteLength(JSON.stringify(returnSources.map(([id, branches]) => ({ id,
        branches: branches.map((branch) => ({ statement: reference(branch.statement), source: summary(branch.source) })) }))));
      console.error(JSON.stringify({ input: input.name, variant: variant.name, run, stage: 'prepared', extractMs, prepareMs }));
      const timings = queries.flatMap((query) => (['origin', 'mutation'] as const).map((mode) => {
        const options = { file: input.file, sourceText: text, cursorByteOffset: query.offset };
        const execute = () => variant.module.analyzeQuery(mode, ast, options, prepared);
        Array.from({ length: Math.min(100, Math.max(10, Math.floor(repetitions / 10))) }).map(execute);
        const queryStarted = performance.now();
        const results = Array.from({ length: repetitions }).map(execute);
        const queryUs = (performance.now() - queryStarted) * 1000 / repetitions;
        assert.ok(results.every((q) => q.result._tag === results[0].result._tag));
        return { name: query.name, mode, queryUs, result: results[0].result._tag, returnMapping: results[0].returnMapping };
      }));
      console.error(JSON.stringify({ input: input.name, variant: variant.name, run, extractMs, prepareMs, returnSummaryMs }));
      return [...samples, { variant: variant.name, run, extractMs, parseMs, prepareMs, returnSummaryMs,
        astBytes: Buffer.byteLength(astText), storageMetadataBytes: Buffer.byteLength(JSON.stringify(ast.storageTypes ?? {})),
        returnMetadataBytes, returnBranches: returnSources.reduce((count, [, branches]) => count + branches.length, 0), timings }];
    }, Promise.resolve(samples));
  }, Promise.resolve([] as unknown[]));
  return [...measurements, { input: input.name, file: input.file, sourceSha256, command, queries, samples }];
}, Promise.resolve([] as unknown[]));
assert.equal(sha256(await readFile('src/analysis.ts')), currentSourceSha256, 'Analyzer changed during measurement');
console.log(JSON.stringify({ runs, repetitions, baselineModule: process.argv[2],
  compileCommandsSha256: sha256(await readFile(process.env.FSJ_PROJECT_COMPILE_COMMANDS!)),
  variants: await Promise.all(variants.map(async (variant) => ({ name: variant.name, extractor: variant.extractor, extractorSha256: sha256(await readFile(variant.extractor)) }))),
  currentSourceSha256, baselineSourceSha256,
  measurements }, null, 2));
