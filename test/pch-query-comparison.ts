// Opt-in semantic comparison of two normalized compact AST snapshots.
// bun test/pch-query-comparison.ts <cold.json> <reused.json> <source>
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import assert from 'node:assert/strict';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';
import { resultSignature } from './result-signature';

const source = path.resolve(process.argv[4]);
const sourceText = await readFile(source, 'utf8');
const cold = JSON.parse(await readFile(process.argv[2], 'utf8')) as ClangNode;
const reused = JSON.parse(await readFile(process.argv[3], 'utf8')) as ClangNode;
const coldPrepared = prepareAst(cold);
const reusedPrepared = prepareAst(reused);
const offsets = [...new Set(coldPrepared.index.all.filter((node) => path.resolve(node.file) === source &&
  ['MemberExpr', 'DeclRefExpr', 'CXXDependentScopeMemberExpr'].includes(node.node.kind))
  .flatMap((node) => node.node.range?.end?.offset === undefined ? [] : [node.node.range.end.offset]))];
const comparisons = offsets.flatMap((cursorByteOffset) => {
  const options = { file: source, sourceText, cursorByteOffset };
  return [
    { command: 'mutation', cold: analyzeAst(cold, options, coldPrepared), reused: analyzeAst(reused, options, reusedPrepared) },
    { command: 'origin', cold: analyzeOriginAst(cold, options, coldPrepared), reused: analyzeOriginAst(reused, options, reusedPrepared) }
  ].map((comparison) => ({ cursorByteOffset, command: comparison.command,
    cold: resultSignature(comparison.cold), reused: resultSignature(comparison.reused) }));
});
const differences = comparisons.filter((comparison) => !isDeepStrictEqual(comparison.cold, comparison.reused));
console.log(JSON.stringify({ source, positions: offsets.length, queries: comparisons.length,
  equal: differences.length === 0, differences }, null, 2));
assert.ok(offsets.length > 0, 'Expected supported cursor positions');
assert.equal(differences.length, 0, 'Mutation/origin signatures differ');
