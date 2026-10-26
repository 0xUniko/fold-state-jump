// Identical source, command and cursors for saved/current analyzer + extractor.
// bun test/pending-performance.ts [module] [extractor] [runs=3] [queries=100]
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Effect } from 'effect';
import { makeExtractionCommand, resolveCompileCommand, runClangAst, type CompileCommand } from '../src/services';
const { prepareAst, analyzeQuery }: typeof import('../src/analysis') = await import(process.argv[2] ?? '../src/analysis');
const extractor = path.resolve(process.argv[3] ?? 'native/build/fold-state-jump-ast');
const runs = Number(process.argv[4] ?? 3);
const queries = Number(process.argv[5] ?? 100);
assert.ok(Number.isSafeInteger(runs) && runs >= 3);
assert.ok(Number.isSafeInteger(queries) && queries > 0);
const root = process.env.FSJ_PERFORMANCE_PROJECT;
const file = path.resolve(root ? path.join(root, 'minicpm-v-4_7/pipeline.h') : 'test/fixtures/pending-fold.cpp');
const sourceText = await readFile(file, 'utf8');
const queryFile = root ? path.join(root, 'minicpm-v-4_7/ffn.h') : file;
const queryText = await readFile(queryFile, 'utf8');
const condition = queryText.indexOf('if (bank_state.pending &&');
assert.ok(condition >= 0);
const offsets = [queryText.indexOf('pending', condition), queryText.indexOf('pending', queryText.indexOf('&&', condition)), queryText.indexOf('pending.reset()', condition)];
const command: CompileCommand = root
  ? await Effect.runPromise(resolveCompileCommand(file, [root], 'clang++', process.env.FSJ_PROJECT_COMPILE_COMMANDS))
  : { compiler: 'clang++', cwd: process.cwd(), args: ['-std=c++23', file] };
type Timing = { readonly run: number; readonly extractMs: number; readonly parseMs: number; readonly prepareMs: number;
  readonly astBytes: number; readonly samples: readonly { readonly cursor: number; readonly mode: string; readonly tag: string; readonly queryUs: number }[] };
const timings = await Array.from({ length: runs }, (_, run) => run).reduce<Promise<readonly Timing[]>>(async (work, run) => {
  const timings = await work;
  const started = performance.now();
  const astText = await Effect.runPromise(runClangAst(makeExtractionCommand(command, extractor), 67108864, AbortSignal.timeout(120000)));
  const extractMs = performance.now() - started;
  assert.equal(await readFile(file, 'utf8'), sourceText);
  assert.equal(await readFile(queryFile, 'utf8'), queryText);
  const parseStarted = performance.now();
  const ast = JSON.parse(astText);
  const parseMs = performance.now() - parseStarted;
  const prepareStarted = performance.now();
  const prepared = prepareAst(ast);
  const prepareMs = performance.now() - prepareStarted;
  const sourceTextByFile = new Map([[file, sourceText], [queryFile, queryText]]);
  const samples = offsets.flatMap((offset, cursor) => (['origin', 'mutation'] as const).map((mode) => {
    const options = { file: queryFile, sourceText: queryText, sourceTextByFile, cursorByteOffset: Buffer.byteLength(queryText.slice(0, offset)) };
    const query = () => analyzeQuery(mode, ast, options, prepared);
    const tag = query().result._tag;
    Array.from({ length: 20 }).map(query);
    const started = performance.now();
    const results = Array.from({ length: queries }).map(query);
    const queryUs = (performance.now() - started) * 1000 / queries;
    assert.ok(results.every((result) => result.result._tag === tag));
    return { cursor, mode, tag, queryUs };
  }));
  return [...timings, { run, extractMs, parseMs, prepareMs, astBytes: Buffer.byteLength(astText), samples }];
}, Promise.resolve([]));
const result = { file, sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
  querySha256: createHash('sha256').update(queryText).digest('hex'), command, extractor, runs, queries, timings };
console.log(JSON.stringify(result, null, 2));
if (process.env.FSJ_PERFORMANCE_OUTPUT) await writeFile(process.env.FSJ_PERFORMANCE_OUTPUT, JSON.stringify(result, null, 2) + '\n');
