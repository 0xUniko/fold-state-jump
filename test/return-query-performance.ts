// bun test/return-query-performance.ts baseline-analysis.ts cli-ast.json cli.cpp [runs=7] [queries=1000]
// Identical archived real AST for both modules; no native extraction in timing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as current from '../src/analysis';
const baseline: Pick<typeof current, 'prepareAst' | 'analyzeQuery'> = await import(path.resolve(process.argv[2]!));
const astText = readFileSync(process.argv[3]!, 'utf8');
const file = path.resolve(process.argv[4]!);
const text = readFileSync(file, 'utf8');
const ast = JSON.parse(astText);
const runs = Number(process.argv[5] ?? 7);
const repetitions = Number(process.argv[6] ?? 1000);
assert.ok(Number.isSafeInteger(runs) && runs >= 3 && Number.isSafeInteger(repetitions) && repetitions > 0);
const variants = [
  { name: 'before', module: baseline, prepared: baseline.prepareAst(ast) },
  { name: 'after', module: current, prepared: current.prepareAst(ast) }
] as const;
const cases = [
  ['generation-wrap', 'if (generation.done || generation.batch_state.session_state.position >=', 'position'],
  ['generation-done', 'if (generation.done || generation.batch_state.session_state.position >=', 'done'],
  ['generation-seed', 'Generation{std::move(batch_state), {}, false}', 'batch_state'],
  ['chat-return', 'return {std::move(generation.batch_state.session_state), std::move(history)};', 'session_state']
] as const;
const timings = cases.flatMap(([name, snippet, token]) => {
  const start = text.indexOf(snippet);
  assert.ok(start >= 0);
  const offset = text.indexOf(token, start);
  assert.ok(offset >= start && offset < start + snippet.length);
  const options = { file, sourceText: text, cursorByteOffset: current.byteOffsetFromUtf16(text, offset) };
  return (['origin', 'mutation'] as const).map((mode) => {
    variants.map((variant) => Array.from({ length: 200 }).reduce<current.AnalysisQuery>(() =>
      variant.module.analyzeQuery(mode, ast, options, variant.prepared), variant.module.analyzeQuery(mode, ast, options, variant.prepared)));
    const samples = Array.from({ length: runs }).flatMap((_, run) => {
      const ordered: ReadonlyArray<(typeof variants)[number]> = run % 2 ? [variants[1], variants[0]] : variants;
      return ordered.map((variant) => {
        const started = performance.now();
        const q = Array.from({ length: repetitions }).reduce<current.AnalysisQuery>(() =>
          variant.module.analyzeQuery(mode, ast, options, variant.prepared), variant.module.analyzeQuery(mode, ast, options, variant.prepared));
        const queryUs = (performance.now() - started) * 1000 / (repetitions + 1);
        return { variant: variant.name, run, queryUs, result: q.result._tag, returnMapping: q.returnMapping };
      });
    });
    return { name, mode, offset: options.cursorByteOffset, samples };
  });
});
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
console.log(JSON.stringify({ runs, repetitions, astSha256: hash(astText), sourceSha256: hash(text),
  currentSourceSha256: hash(readFileSync('src/analysis.ts', 'utf8')), baselineSourceSha256: hash(readFileSync(process.argv[2]!, 'utf8')), timings }, null, 2));
