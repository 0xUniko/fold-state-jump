// Opt-in end-to-end measurements; run sequentially, never as a default test.
// bun test/investigation.ts <source> [extractor] [samples=5] [manifest=false]
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Effect } from 'effect';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

const source = path.resolve(process.argv[2] ?? 'test/fixtures/native-paths.cpp');
const executable = path.resolve(process.argv[3] ?? 'native/build/fold-state-jump-ast');
const repetitions = Number(process.argv[4] ?? 5);
const manifest = process.argv[5] === 'true';
assert.ok(Number.isSafeInteger(repetitions) && repetitions > 0);
const directory = await mkdtemp(path.join(tmpdir(), 'fsj-measure-'));
const measure = <A>(action: () => A) => {
  const start = performance.now();
  const value = action();
  return { value, ms: performance.now() - start };
};
try {
  const samples = await Array.from({ length: repetitions }).reduce<Promise<Record<string, unknown>[]>>(async (samples, _, index) => {
    const previous = await samples;
    const resolveStart = performance.now();
    const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
    const resolveMs = performance.now() - resolveStart;
    const extraction = makeExtractionCommand(command, executable);
    const args = manifest
      ? [...extraction.args.slice(0, 2), '--cache-manifest', path.join(directory, 'manifest.json'), ...extraction.args.slice(2)]
      : extraction.args;
    const start = performance.now();
    const text = await Effect.runPromise(runClangAst({ ...extraction, compiler: '/usr/bin/time', args: [
      '-o', path.join(directory, 'time.txt'), '-f', '%U %S %M %I %O', executable, ...args
    ] }, 67108864, AbortSignal.timeout(180000)));
    const nativeMs = performance.now() - start;
    const parsed = measure(() => JSON.parse(text) as ClangNode);
    const prepared = measure(() => prepareAst(parsed.value));
    const sourceText = await readFile(source, 'utf8');
    const offsets = [...new Set(prepared.value.index.all.filter((node) =>
      path.resolve(node.file) === source && ['DeclRefExpr', 'MemberExpr', 'CXXDependentScopeMemberExpr'].includes(node.node.kind)
    ).flatMap((node) => node.node.range?.end?.offset === undefined ? [] : [node.node.range.end.offset]))];
    const query = () => offsets.map((cursorByteOffset) => {
      const options = { file: source, sourceText, cursorByteOffset };
      return [analyzeAst(parsed.value, options, prepared.value), analyzeOriginAst(parsed.value, options, prepared.value)];
    });
    const queries = measure(query);
    assert.equal(query().length, offsets.length);
    const [userSeconds, systemSeconds, peakRssKiB, inputBlocks, outputBlocks] = (await readFile(path.join(directory, 'time.txt'), 'utf8')).trim().split(' ').map(Number);
    if (index === 0 && process.env.FSJ_AST_OUTPUT) await writeFile(process.env.FSJ_AST_OUTPUT, text);
    return [...previous, { resolveMs, nativeMs, parseMs: parsed.ms, prepareMs: prepared.ms, queryAllMs: queries.ms,
      queryCount: offsets.length * 2, astBytes: Buffer.byteLength(text), userSeconds, systemSeconds, peakRssKiB,
      inputBlocks, outputBlocks, host: process.memoryUsage(),
      ...(manifest ? { manifestBytes: Buffer.byteLength(await readFile(path.join(directory, 'manifest.json'))),
        reusable: JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')).reusable } : {}) }];
  }, Promise.resolve([] as Record<string, unknown>[]));
  const percentile = (key: string, fraction: number) => {
    const values = samples.reduce<number[]>((values, sample) => { values.push(sample[key] as number); return values.sort((a, b) => a - b); }, []);
    return values[Math.ceil(values.length * fraction) - 1];
  };
  console.log(JSON.stringify({ source, executable, repetitions, manifest, samples,
    nativeP50: percentile('nativeMs', .5), nativeP95: percentile('nativeMs', .95) }, null, 2));
} finally { await rm(directory, { recursive: true, force: true }); }
