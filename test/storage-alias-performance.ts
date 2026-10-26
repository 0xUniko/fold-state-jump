// bun test/storage-alias-performance.ts [analysis-module] [extractor] [runs=5] [queries=1000]
// Both versions receive identical C++ bytes, compile flags, file path and cursors.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
const { analyzeQuery, prepareAst }: typeof import('../src/analysis') = await import(process.argv[2] ?? '../src/analysis');
const extractor = path.resolve(process.argv[3] ?? 'native/build/fold-state-jump-ast');
const runs = Number(process.argv[4] ?? 5);
const repetitions = Number(process.argv[5] ?? 1000);
assert.ok(Number.isSafeInteger(runs) && runs >= 3);
assert.ok(Number.isSafeInteger(repetitions) && repetitions > 0);
const count = 100;
const workloads = [
  { name: 'aggregate', type: 'Holder', target: 'Holder related{{&state}};', value: 'related',
    unrelated: (n: number) => `Holder holder${n}{{&other}}; storage.push_back(holder${n});` },
  { name: 'pointer', type: 'State *', target: 'State *related = &state;', value: 'related',
    unrelated: (n: number) => `State *pointer${n} = &other; storage.push_back(pointer${n});` },
  { name: 'view', type: 'std::span<State>', target: 'std::span<State> related(&state, 1);', value: 'related',
    unrelated: (n: number) => `std::span<State> view${n}(&other, 1); storage.push_back(view${n});` },
  { name: 'value', type: 'State', target: '', value: 'state',
    unrelated: (n: number) => `State copy${n} = other; storage.push_back(copy${n});` }
] as const;
const file = '/tmp/fsj-storage-performance.cpp';
const text = '#include <vector>\n#include <span>\nstruct State { int value; };\nstruct Inner { State *pointer; };\nstruct Holder { Inner inner; };\nvoid consume(int);\n' +
  workloads.map((workload) => `void ${workload.name}(State &state, State &other) {\nstd::vector<${workload.type}> storage;\n${workload.target}\nstate.value = 1;\nstorage.push_back(${workload.value});\n` +
    Array.from({ length: count }, (_, n) => workload.unrelated(n)).join('\n') + `\nconsume(state.value); // @select ${workload.name}\n}\n`).join('\n');
writeFileSync(file, text);
const sourceSha256 = createHash('sha256').update(text).digest('hex');
const timings = Array.from({ length: runs }).map((_, run) => {
  const extractStart = performance.now();
  const extracted = spawnSync(extractor, ['--source', file, '--', '-std=c++20'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const extractMs = performance.now() - extractStart;
  assert.equal(extracted.status, 0, extracted.stderr);
  assert.equal(readFileSync(file, 'utf8'), text);
  const parseStart = performance.now();
  const ast = JSON.parse(extracted.stdout);
  const parseMs = performance.now() - parseStart;
  const prepareStart = performance.now();
  const prepared = prepareAst(ast);
  const prepareMs = performance.now() - prepareStart;
  const queries = workloads.map(({ name }) => {
    const end = text.indexOf('// @select ' + name);
    const cursorByteOffset = text.lastIndexOf('value', end);
    const options = { file, sourceText: text, cursorByteOffset };
    const query = () => analyzeQuery('mutation', ast, options, prepared).result;
    const fingerprint = (result: ReturnType<typeof query>) => result._tag === 'MutationFound'
      ? [result._tag, result.mutation.node.range?.begin?.offset, result.wrapped, result.frames?.length]
      : result._tag === 'AnalysisFailure' ? [result._tag, result.reason] : assert.fail(result._tag);
    const expected = fingerprint(query());
    Array.from({ length: 100 }).map(query);
    const start = performance.now();
    const results = Array.from({ length: repetitions }).map(query);
    const queryUs = (performance.now() - start) * 1000 / repetitions;
    // Stability is measured here; correctness uses the separate exact fixtures.
    results.map((result) => assert.deepEqual(fingerprint(result), expected));
    return { name, queryUs, result: expected };
  });
  return { run, extractMs, parseMs, prepareMs, astBytes: Buffer.byteLength(extracted.stdout), queries };
});
console.log(JSON.stringify({ sourceSha256, count, runs, repetitions, module: process.argv[2] ?? '../src/analysis', extractor, timings }, null, 2));
