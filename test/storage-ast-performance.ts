// bun test/storage-ast-performance.ts ast.json [analysis-module] [runs=5]
// Measures archived real extractions; extraction time is recorded by the audit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { prepareAst }: typeof import('../src/analysis') = await import(process.argv[3] ?? '../src/analysis');
const astText = readFileSync(process.argv[2]!, 'utf8');
const runs = Number(process.argv[4] ?? 5);
assert.ok(Number.isSafeInteger(runs) && runs >= 3);
const timings = Array.from({ length: runs }, (_, run) => {
  const parseStart = performance.now();
  const ast = JSON.parse(astText);
  const parseMs = performance.now() - parseStart;
  const prepareStart = performance.now();
  const prepared = prepareAst(ast);
  const prepareMs = performance.now() - prepareStart;
  assert.ok(prepared.index.all.length > 0);
  return { run, parseMs, prepareMs, storageMetadataBytes: Buffer.byteLength(JSON.stringify(ast.storageTypes ?? {})) };
});
console.log(JSON.stringify({ astFile: process.argv[2], module: process.argv[3] ?? '../src/analysis', runs,
  astSha256: createHash('sha256').update(astText).digest('hex'), astBytes: Buffer.byteLength(astText), timings }, null, 2));
