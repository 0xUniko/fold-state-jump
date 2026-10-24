// Opt-in Node benchmark; reuses a saved native AST/manifest and never runs Clang.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Effect } from 'effect';
import { buildIdentity, decodeNativeDependencies, validateDependencies, verifyDependencies, type DependencyManifest } from '../src/dependencies';
import { resolveCompileCommandCached, emptyCompileDatabaseCache } from '../src/services';
import { loadPreparedAst, makeAstCache } from '../src/ast-cache';
import { prepareAst, type ClangNode } from '../src/analysis';

const [manifestPath, sourcePath, astPath, repetitionsText = '51', baselinePath, phaseOrder = 'normal'] = process.argv.slice(2);
if (!manifestPath || !sourcePath || !astPath || !baselinePath) throw new Error('Arguments: native-manifest source ast repetitions baseline-dependencies-module');
const source = path.resolve(sourcePath);
const repetitions = Number(repetitionsText);
assert.ok(Number.isSafeInteger(repetitions) && repetitions >= 20);
const baseline: typeof import('../src/dependencies') = await import(path.resolve(baselinePath));
const native = decodeNativeDependencies(JSON.parse(await readFile(manifestPath, 'utf8')));
const dependencies = await Effect.runPromise(verifyDependencies(native));
assert.ok(dependencies?.reusable, 'Saved manifest must still match the current source/runtime');
const prepared = prepareAst(JSON.parse(await readFile(astPath, 'utf8')) as ClangNode);
const executable = path.resolve('native/build/fold-state-jump-ast');
const roots = [path.dirname(source)];
const resolved = await Effect.runPromise(resolveCompileCommandCached(source, roots, 'clang++', emptyCompileDatabaseCache));
const command = resolved.command;
const identity = await buildIdentity(source, command, executable, {});
const ast = { prepared, astBytes: Buffer.byteLength(await readFile(astPath)), dependencies };
const cache = makeAstCache();
const request = { source, documentVersion: 1, buildIdentity: identity };
await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed(ast), validateDependencies));
const subset = (tag: DependencyManifest['guards'][number]['_tag']): DependencyManifest =>
  ({ ...dependencies, guards: dependencies.guards.filter((guard) => guard._tag === tag) });
const memory = async (validate: typeof validateDependencies) => {
  const before = await Effect.runPromise(resolveCompileCommandCached(source, roots, 'clang++', resolved.cache));
  const identityBefore = await buildIdentity(source, before.command, executable, {});
  const result = await Effect.runPromise(loadPreparedAst(cache, { ...request, buildIdentity: identityBefore },
    Effect.fail(new Error('Unexpected native extraction')), validate));
  assert.equal(result._tag, 'ExtractionReady');
  if (result._tag === 'ExtractionReady') assert.equal(result.hit, 'memory');
  const after = await Effect.runPromise(resolveCompileCommandCached(source, roots, 'clang++', before.cache));
  assert.equal(await buildIdentity(source, after.command, executable, {}), identityBefore);
  return true;
};
const phases = [
  { name: 'command', run: async () => !!await Effect.runPromise(resolveCompileCommandCached(source, roots, 'clang++', resolved.cache)) },
  { name: 'identity', run: async () => await buildIdentity(source, command, executable, {}) === identity },
  ...(['StatFile', 'HashFile', 'StatDirectory', 'ReadDirectory'] as const).flatMap((tag) => subset(tag).guards.length ? [
    { name: 'v1:' + tag, run: () => Effect.runPromise(baseline.validateDependencies(subset(tag))) },
    { name: 'v2:' + tag, run: () => Effect.runPromise(validateDependencies(subset(tag))) }
  ] : []),
  { name: 'v1:dependencies', run: () => Effect.runPromise(baseline.validateDependencies(dependencies)) },
  { name: 'v2:dependencies', run: () => Effect.runPromise(validateDependencies(dependencies)) },
  { name: 'v1:memory', run: () => memory(baseline.validateDependencies) },
  { name: 'v2:memory', run: () => memory(validateDependencies) }
];
const percentile = (samples: readonly number[], fraction: number) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * fraction) - 1];
const phasesOrdered = phaseOrder === 'reverse' ? phases.reduce<typeof phases>((phases, phase) => [phase, ...phases], []) : phases;
const measurements = await phasesOrdered.reduce<Promise<readonly unknown[]>>(async (pending, phase) => {
  const measurements = await pending;
  await phase.run(); // One unrecorded warmup, explicitly identical for each phase.
  const samples = await Array.from({ length: repetitions }).reduce<Promise<readonly { ms: number; cpuMicros: NodeJS.CpuUsage }[]>>(async (pending) => {
    const samples = await pending;
    const cpu = process.cpuUsage();
    const start = performance.now();
    assert.equal(await phase.run(), true);
    return [...samples, { ms: performance.now() - start, cpuMicros: process.cpuUsage(cpu) }];
  }, Promise.resolve([]));
  return [...measurements, { name: phase.name, samples, p50Ms: percentile(samples.map((sample) => sample.ms), .5),
    p95Ms: percentile(samples.map((sample) => sample.ms), .95),
    cpuP50Micros: percentile(samples.map((sample) => sample.cpuMicros.user + sample.cpuMicros.system), .5) }];
}, Promise.resolve([]));
console.log(JSON.stringify({ environment: { date: new Date().toISOString(), platform: process.platform, kernel: os.release(),
  cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), node: process.version,
  cwd: process.cwd(), argv: process.argv, limitations: 'Warm OS cache. Sequential phases, uncontrolled frequency/thermal/load/GC. No Clang or VS Code UI. Subsets include manifest filtering. Memory phases include two command/identity checks and unchanged analyzer/cache; not scheduler overhead.' },
  source, repetitions, phaseOrder, nativePaths: native.paths.length, nativeRuntimeImages: native.runtime.length,
  guards: dependencies.guards.reduce((counts, guard) => ({ ...counts, [guard._tag]: (counts[guard._tag] ?? 0) + 1 }), {} as Record<string, number>),
  proofBytes: Buffer.byteLength(JSON.stringify(dependencies)), host: process.memoryUsage(), measurements }, null, 2));
