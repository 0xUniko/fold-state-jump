import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Engine, type QueryResult, type Mode } from '../src/state-trace/engine';

const root = path.resolve(import.meta.dir, '..');
const nano = '/home/huawei/nano-infer';
const oracleFile = path.join(root, 'research/oracle/nano-infer-oracle.jsonl');
const entries = readFileSync(oracleFile, 'utf8').split('\n').filter(Boolean).map((x) => JSON.parse(x));
const raw = (tu: string) => path.join(root, 'research/inventory/raw', tu + '.ndjson');
const tuFor = (file: string): string => {
  if (file.includes('attention_pipeline') || file.includes('attention_node')) return 'deepseek-v4-flash_attention_node';
  if (file.includes('ffn_service') || file.includes('dsv4_ffn')) return 'deepseek-v4-flash_ffn_node';
  if (file.includes('model_loader')) return 'shared_model_loader';
  if (file.includes('tests/')) return 'minicpm-v-4_7_tests_local_test';
  return 'minicpm-v-4_7_cli';
};
const programs = new Map<string, any>();
const getEngine = (tu: string) => {
  if (!programs.has(tu)) programs.set(tu, Engine.fromFiles([raw(tu)]));
  return programs.get(tu) as Engine;
};
const match = (actual: any, expected: any): boolean => {
  if (path.basename(actual.file) !== path.basename(expected.file) || actual.line !== expected.line) return false;
  const a = expected.anchor ?? '', x = actual.anchor ?? '';
  return !a || a.includes(x) || x.includes(a);
};
const results: any[] = [];
for (const entry of entries) {
  const q = entry.query;
  const file = path.join(nano, q.file);
  const rec: any = { id: entry.id, expectedKind: entry.expectation.kind, query: q };
  let out: QueryResult;
  try {
    out = getEngine(tuFor(q.file)).query({ file, line: q.line, column: q.column, mode: q.mode as Mode });
  } catch (e) {
    results.push({ ...rec, status: 'no-site', actualKind: 'None', targets: [], boundaries: [], error: String(e) });
    continue;
  }
  const required = entry.expectation.targets.filter((t: any) => t.required !== false);
  const matched = required.filter((x: any) => out.targets.some((a) => match(a, x)));
  const missing = required.filter((x: any) => !matched.includes(x));
  const real = out.targets.filter((t) => t.kind !== 'selected');
  let status = 'mismatch';
  if (entry.expectation.kind === 'Boundary' || entry.expectation.kind === 'Unsupported') {
    if (out.kind === 'Boundary' || out.kind === 'Unsupported' || out.boundaries.length) status = entry.expectation.kind === 'Boundary' ? 'correct-boundary' : 'unsupported-observed';
  } else if (entry.expectation.kind === 'NoPriorMutation') {
    if (out.kind === 'NoPriorMutation') status = 'correct-no-prior';
  } else if (entry.expectation.kind === 'Exact') {
    if (out.kind === 'Exact' && !missing.length) status = 'correct-exact';
    else if (!missing.length) status = 'targets-found-kind-mismatch';
  } else if (entry.expectation.kind === 'Multiple') {
    if ((out.kind === 'Multiple' || out.kind === 'Conditional') && !missing.length) status = 'correct-multiple';
  } else if (entry.expectation.kind === 'Conditional') {
    if ((out.kind === 'Conditional' || out.kind === 'Multiple' || out.kind === 'Boundary') && matched.length) status = 'correct-conditional';
  }
  results.push({ ...rec, status, actualKind: out.kind, matchedRequiredTargets: matched.length,
    requiredTargets: required.length, missingTargets: missing, actualTargets: out.targets,
    boundaries: out.boundaries, provenance: out.provenance });
}
const count = (key: string) => results.reduce((m, r) => (m[r[key]] = (m[r[key]] ?? 0) + 1, m), {} as Record<string, number>);
const report = {
  engine: 'TypeScript state-trace',
  entries: results.length,
  statusCounts: count('status'),
  expectedKindCounts: count('expectedKind'),
  actualKindCounts: count('actualKind'),
  requiredTargetRecall: `${results.reduce((n, r) => n + (r.matchedRequiredTargets ?? 0), 0)}/${results.reduce((n, r) => n + (r.requiredTargets ?? 0), 0)}`,
  results,
};
writeFileSync(path.join(root, 'research/measurements/oracle-run-ts.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ entries: report.entries, statusCounts: report.statusCounts, expectedKindCounts: report.expectedKindCounts, actualKindCounts: report.actualKindCounts, requiredTargetRecall: report.requiredTargetRecall }, null, 2));
