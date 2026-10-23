// Isolated experiment, never loaded by the extension.
import { parentPort, workerData } from 'node:worker_threads';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';
import { resultSignature } from './result-signature';
const { astText, sourceText, source } = workerData as { readonly astText: string; readonly sourceText: string; readonly source: string };
const start = performance.now();
const ast = JSON.parse(astText) as ClangNode;
const parseMs = performance.now() - start;
const prepareStart = performance.now();
const prepared = prepareAst(ast);
parentPort!.postMessage({ event: 'ready', parseMs, prepareMs: performance.now() - prepareStart });
parentPort!.on('message', (request: { readonly id: number; readonly file: string; readonly version: number; readonly cursorByteOffset: number }) => {
  if (request.file !== source || request.version !== 1) throw new Error('Wrong worker version');
  const options = { file: source, sourceText, cursorByteOffset: request.cursorByteOffset };
  parentPort!.postMessage({ id: request.id, mutation: resultSignature(analyzeAst(ast, options, prepared)), origin: resultSignature(analyzeOriginAst(ast, options, prepared)) });
});
