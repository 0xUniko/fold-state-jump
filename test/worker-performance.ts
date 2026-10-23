// bun test/worker-performance.ts <saved ast.json> <source> [samples=15]
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';
import { resultSignature } from './result-signature';
const source = path.resolve(process.argv[3]);
const sourceText = await readFile(source, 'utf8');
const astText = await readFile(process.argv[2], 'utf8');
const repetitions = Number(process.argv[4] ?? 15);
const mainSamples = await Array.from({ length: repetitions }).reduce<Promise<readonly Record<string, number>[]>>(async (samples) => {
  const previous = await samples;
  const start = performance.now();
  const lag = new Promise<number>((resolve) => setTimeout(() => resolve(performance.now() - start), 0));
  const ast = JSON.parse(astText) as ClangNode;
  const parseMs = performance.now() - start;
  const prepareStart = performance.now();
  prepareAst(ast);
  const prepareMs = performance.now() - prepareStart;
  return [...previous, { parseMs, prepareMs, timerLagMs: await lag }];
}, Promise.resolve([]));
const ast = JSON.parse(astText) as ClangNode;
const prepared = prepareAst(ast);
const offsets = [...new Set(prepared.index.all.filter((node) => path.resolve(node.file) === source &&
  ['MemberExpr', 'DeclRefExpr', 'CXXDependentScopeMemberExpr'].includes(node.node.kind))
  .flatMap((node) => node.node.range?.end?.offset === undefined ? [] : [node.node.range.end.offset]))];
const workerStart = performance.now();
const timer = new Promise<number>((resolve) => setTimeout(() => resolve(performance.now() - workerStart), 0));
const worker = new Worker(process.argv[5] ? pathToFileURL(path.resolve(process.argv[5])) : new URL('./analysis-worker.ts', import.meta.url), { workerData: { source, sourceText, astText } });
const nextMessage = () => new Promise<Record<string, unknown>>((resolve, reject) => {
  const onMessage = (value: Record<string, unknown>) => { worker.off('error', onError); resolve(value); };
  const onError = (error: Error) => { worker.off('message', onMessage); reject(error); };
  worker.once('message', onMessage); worker.once('error', onError);
});
try {
  const ready = await nextMessage();
  const startupMs = performance.now() - workerStart;
  const startupTimerLagMs = await timer;
  const querySamples = await offsets.reduce<Promise<readonly number[]>>(async (samples, cursorByteOffset, id) => {
    const previous = await samples;
    const start = performance.now();
    const response = nextMessage();
    worker.postMessage({ id, file: source, version: 1, cursorByteOffset });
    const result = await response;
    const ms = performance.now() - start;
    const options = { file: source, sourceText, cursorByteOffset };
    assert.deepEqual(result.mutation, resultSignature(analyzeAst(ast, options, prepared)));
    assert.deepEqual(result.origin, resultSignature(analyzeOriginAst(ast, options, prepared)));
    return [...previous, ms];
  }, Promise.resolve([]));
  console.log(JSON.stringify({ source, repetitions, mainSamples, worker: { startupMs, startupTimerLagMs, ready,
    queries: querySamples.length, samplesMs: querySamples, allSignaturesEqual: true }, host: process.memoryUsage() }, null, 2));
} finally { await worker.terminate(); }
