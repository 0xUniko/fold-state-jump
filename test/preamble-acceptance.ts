// bun build test/preamble-acceptance.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-acceptance.mjs
// node /tmp/fsj-preamble-acceptance.mjs /path/to/nano-infer 3 docs/measurements/preamble-production.json
// Append --fallback-only and use a separate report to recheck fallback after a lifecycle-only change.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { availableParallelism, cpus, release, tmpdir, totalmem } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Effect, Ref } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, prepareAst, type ClangNode } from '../src/analysis';
import { makeAstCache, loadPreparedAst } from '../src/ast-cache';
import { buildIdentity, fingerprintFile, validateDependencies } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { disposePreamblePool, extractWithPreamble, makePreamblePool } from '../src/preamble';
import { resolveCompileCommand, type CompileCommand } from '../src/services';
import { resultSignature } from './result-signature';

assert.ok(process.argv[2], 'Pass the nano-infer checkout path as the first argument.');
const root = path.resolve(process.argv[2]);
const repetitions = Number(process.argv[3] ?? 3);
const fallbackOnly = process.argv[5] === '--fallback-only';
assert.ok(Number.isSafeInteger(repetitions) && repetitions >= 1 && repetitions <= 10);
const executable = path.resolve('native/build/fold-state-jump-ast');
type Event = Readonly<Record<string, unknown>>;
type Extracted = Effect.Success<ReturnType<typeof extractVerifiedAst>>;
type Measured = { readonly extracted: Extracted; readonly ms: number; readonly nodeCpuMicros: ReturnType<typeof process.cpuUsage>; readonly events: readonly Event[] };

// Only process-local declaration addresses are normalized. Array and candidate
// order, types, offsets and all reference relationships remain observable.
const normalizeAst = (ast: ClangNode): ClangNode => {
  const identifiers = (value: unknown): readonly string[] => Array.isArray(value)
    ? value.flatMap(identifiers)
    : value !== null && typeof value === 'object'
      ? Object.entries(value).flatMap(([key, value]) => ['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string'
        ? [value] : identifiers(value)) : [];
  const identities = identifiers(ast).reduce((identities, identity) => {
    if (!identities.has(identity)) identities.set(identity, String(identities.size));
    return identities;
  }, new Map<string, string>());
  const normalized = (value: unknown): unknown => Array.isArray(value) ? value.map(normalized)
    : value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, value]) =>
      [key, ['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string' ? identities.get(value) : normalized(value)])) : value;
  return normalized(ast) as ClangNode;
};
const prepared = (extracted: Extracted) => prepareAst(normalizeAst(JSON.parse(extracted.astText) as ClangNode));
const compareQueries = async (source: string, cold: Extracted, reused: Extracted) => {
  const sourceText = await readFile(source, 'utf8');
  const coldPrepared = prepared(cold);
  const reusedPrepared = prepared(reused);
  const offsets = [...new Set(coldPrepared.index.all.filter((node) => path.resolve(node.file) === source &&
    ['MemberExpr', 'DeclRefExpr', 'CXXDependentScopeMemberExpr'].includes(node.node.kind))
    .flatMap((node) => node.node.range?.end?.offset === undefined ? [] : [node.node.range.end.offset]))];
  assert.ok(offsets.length > 0);
  const queries = offsets.reduce((queries, cursorByteOffset) => {
    const options = { file: source, sourceText, cursorByteOffset };
    [analyzeAst, analyzeOriginAst].map((analyze) => assert.deepEqual(
      resultSignature(analyze(reusedPrepared.ast, options, reusedPrepared)),
      resultSignature(analyze(coldPrepared.ast, options, coldPrepared)), source + ':' + cursorByteOffset));
    return queries + 2;
  }, 0);
  return { positions: offsets.length, queries, differences: 0 };
};
const pipelineCases = [
  { snippet: '++session_state.bank_state.counters.graph_builds;', expression: 'session_state.bank_state.counters',
    expected: { _tag: 'Mutation', file: 'pipeline.h', snippet: '++session_state.bank_state.counters.graph_reuses' } },
  { snippet: 'return {std::move(session_state), std::move(logits)};', expression: 'session_state',
    expected: { _tag: 'Mutation', file: 'pipeline.h', snippet: 'session_state.rope_position = next_rope' } },
  { snippet: 'auto &session_state = batch_state.session_state;', expression: 'session_state',
    expected: { _tag: 'Origin', kind: 'initialization' } },
  { snippet: 'finish_prefill_read(bank_state, std::move(current));', expression: 'bank_state',
    expected: { _tag: 'Mutation', file: 'ffn.h', snippet: 'bank_state.slots = std::move(plan.slots)' } },
  { snippet: 'return LayerExecution{&session_state,', expression: 'session_state',
    expected: { _tag: 'Mutation', file: 'ffn.h', snippet: 'bank_state =' } }
] as const;
const checkTargets = async (source: string, extracted: Extracted) => {
  const sourceText = await readFile(source, 'utf8');
  const sourcePrepared = prepared(extracted);
  const optionsAt = (offset: number) => ({ file: source, sourceText, cursorByteOffset: byteOffsetFromUtf16(sourceText, offset) });
  const bankChecks = [...sourceText.matchAll(/bank_state\.bank(?:\.records)?/g)].flatMap((match) =>
    ['bank', ...(match[0].endsWith('.records') ? ['records'] : [])].map((member) => {
      const result = analyzeOriginAst(sourcePrepared.ast, optionsAt(match.index + match[0].lastIndexOf('.' + member) + 1), sourcePrepared);
      assert.equal(result._tag, 'OriginFound');
      if (result._tag === 'OriginFound') {
        assert.equal(result.kind, 'parameter');
        assert.equal(result.origin.node.kind, 'ParmVarDecl');
      }
      return member;
    }));
  const pipelineChecks = path.basename(source) === 'pipeline.h' ? pipelineCases : [];
  await Promise.all(pipelineChecks.map(async (projectCase) => {
    const start = sourceText.indexOf(projectCase.snippet);
    assert.ok(start >= 0, projectCase.snippet);
    const offset = sourceText.indexOf(projectCase.expression, start) + projectCase.expression.lastIndexOf('.') + 1;
    const result = projectCase.expected._tag === 'Origin'
      ? analyzeOriginAst(sourcePrepared.ast, optionsAt(offset), sourcePrepared)
      : analyzeAst(sourcePrepared.ast, optionsAt(offset), sourcePrepared);
    switch (projectCase.expected._tag) {
      case 'Origin':
        assert.equal(result._tag, 'OriginFound');
        if (result._tag === 'OriginFound') assert.equal(result.kind, projectCase.expected.kind);
        break;
      case 'Mutation': {
        assert.equal(result._tag, 'MutationFound', projectCase.snippet);
        if (result._tag !== 'MutationFound') return;
        assert.equal(path.basename(result.mutation.file), projectCase.expected.file);
        const mutationOffset = result.mutation.node.range?.begin?.offset;
        assert.ok(mutationOffset !== undefined);
        assert.ok(Buffer.from(await readFile(result.mutation.file, 'utf8')).subarray(mutationOffset).toString('utf8')
          .startsWith(projectCase.expected.snippet), projectCase.snippet);
        break;
      }
    }
  }));
  return bankChecks.length + pipelineChecks.length;
};
const measure = async (run: (report: (event: Event) => void) => Promise<Extracted>): Promise<Measured> => {
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const startedAt = performance.now();
  const cpu = process.cpuUsage();
  const extracted = await run((event) => Effect.runSync(Ref.update(events, (events) => [...events, event])));
  return { extracted, ms: performance.now() - startedAt, nodeCpuMicros: process.cpuUsage(cpu), events: Effect.runSync(Ref.get(events)) };
};
const cold = (source: string, command: CompileCommand) => measure((report) => Effect.runPromise(
  extractVerifiedAst(source, command, executable, 67108864, AbortSignal.timeout(180000), report)));
const compact = ({ ms, events, nodeCpuMicros }: Measured) => ({ ms, nodeCpuMicros, events });
const reuseEvent = (measured: Measured) => assert.ok(measured.events.some((event) => event.event === 'preamble-reuse'), JSON.stringify(measured.events));
const percentiles = (samples: readonly number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  return { p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
};
const repeated = <A>(run: (index: number) => Promise<A>) => Array.from({ length: repetitions }).reduce<Promise<readonly A[]>>(
  async (samples, _, index) => [...await samples, await run(index)], Promise.resolve([]));
const measureFallback = async (pool: ReturnType<typeof makePreamblePool>, source: string, command: CompileCommand,
  directory: string, retiredWorkerPid?: number) => {
  const forced = path.join(directory, 'forced.h');
  await writeFile(forced, '// Force the unsupported-context cold fallback.\n');
  const fallbackCommand = { ...command, args: ['-include', forced, ...command.args] };
  const fallback = await measure((report) => Effect.runPromise(extractWithPreamble(pool, source, fallbackCommand, executable,
    67108864, AbortSignal.timeout(180000), (event) => {
      if (retiredWorkerPid !== undefined && event.event === 'native-start' && !event.worker) {
        assert.throws(() => process.kill(retiredWorkerPid, 0), { code: 'ESRCH' });
      }
      report(event);
    })));
  assert.ok(fallback.events.some((event) => event.event === 'preamble-fallback'));
  const fallbackCold = await cold(source, fallbackCommand);
  return { automaticCold: compact(fallback), directCold: compact(fallbackCold),
    ...(retiredWorkerPid === undefined ? {} : { retiredWorkerPid, retiredWorkerReapedBeforeColdStart: true }),
    queries: await compareQueries(source, fallbackCold.extracted, fallback.extracted) };
};

const realProject = await (fallbackOnly ? [] : ['ffn.h', 'experts.h', 'pipeline.h']).reduce<Promise<readonly unknown[]>>(async (previous, name) => {
  const results = await previous;
  const source = path.join(root, 'minicpm-v-4_7', name);
  const before = await fingerprintFile(source);
  const command = await Effect.runPromise(resolveCompileCommand(source, [root], 'clang++'));
  const pool = makePreamblePool();
  const run = () => measure((report) => Effect.runPromise(extractWithPreamble(pool, source, command, executable, 67108864,
    AbortSignal.timeout(180000), report)));
  try {
    console.error('Preamble acceptance: ' + name + ' cold / build / reuse, sequential samples');
    const coldSamples = await repeated(() => cold(source, command));
    const first = await run();
    assert.ok(first.events.some((event) => event.event === 'preamble-build'));
    const buildQueries = await compareQueries(source, coldSamples[0].extracted, first.extracted);
    const samples = await repeated(async () => {
      const sample = await run();
      reuseEvent(sample);
      return { ...compact(sample), queries: await compareQueries(source, coldSamples[0].extracted, sample.extracted),
        jumpTargets: await checkTargets(source, sample.extracted) };
    });
    const jumpTargets = await checkTargets(source, first.extracted);
    assert.equal(jumpTargets, name === 'ffn.h' ? 14 : name === 'experts.h' ? 3 : 8);
    const pid = first.events.find((event) => event.event === 'native-start')?.pid;
    const workerStatus = typeof pid === 'number' ? await readFile('/proc/' + pid + '/status', 'utf8').catch(() => '') : '';
    const workerMemory = Object.fromEntries(workerStatus.split('\n')
      .filter((line) => /^(VmSize|VmHWM|VmRSS|RssAnon):/.test(line))
      .map((line) => { const [name, value] = line.split(':'); return [name, value.trim()]; }));
    const cache = makeAstCache();
    const identity = await buildIdentity(source, command, executable, {});
    const request = { source, documentVersion: 1, buildIdentity: identity };
    await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed(first.extracted), validateDependencies));
    const cacheHits = await repeated(async () => {
      const startedAt = performance.now();
      const hit = await Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('AST hit spawned native')), validateDependencies));
      assert.equal(hit._tag, 'ExtractionReady');
      return performance.now() - startedAt;
    });
    assert.deepEqual(await fingerprintFile(source), before, 'Real project was modified');
    return [...results, { source, sourceFingerprint: before, command, repetitions, jumpTargets, buildQueries,
      cold: { samples: coldSamples.map(compact), ...percentiles(coldSamples.map((sample) => sample.ms)) },
      firstBuildAndParse: compact(first), reuse: { samples, ...percentiles(samples.map((sample) => sample.ms)) },
      astHitsMs: cacheHits, workerMemory }];
  } finally { await Effect.runPromise(disposePreamblePool(pool)); }
}, Promise.resolve([]));

const directory = await mkdtemp(path.join(tmpdir(), 'fsj-preamble-acceptance-'));
const original = path.join(root, 'minicpm-v-4_7', 'pipeline.h');
const originalText = await readFile(original, 'utf8');
const originalHeader = path.join(path.dirname(original), 'ffn.h');
const originalHeaderText = await readFile(originalHeader, 'utf8');
const source = path.join(directory, 'pipeline.h');
const header = path.join(directory, 'ffn.h');
const originalCommand = await Effect.runPromise(resolveCompileCommand(original, [root], 'clang++'));
const command = { ...originalCommand, args: [...originalCommand.args.slice(0, -1), '-I' + path.dirname(original), source] };
const pool = makePreamblePool();
const run = () => measure((report) => Effect.runPromise(extractWithPreamble(pool, source, command, executable, 67108864,
  AbortSignal.timeout(180000), report)));
const editing = await (async () => {
  try {
    await writeFile(source, originalText);
    await writeFile(header, originalHeaderText);
    if (fallbackOnly) {
      console.error('Preamble acceptance: targeted final-code idle-worker fallback recheck');
      const needle = 'return {std::move(session_state), std::move(logits)};';
      await writeFile(source, originalText.replace(needle, 'session_state.rope_position += ' + repetitions + ';\n  ' + needle));
      await writeFile(header, originalHeaderText + '\n// isolated dependency edit\n');
      const retained = await run();
      const retiredWorkerPid = retained.events.find((event) => event.event === 'native-start')?.pid;
      assert.equal(typeof retiredWorkerPid, 'number');
      const fallback = await measureFallback(pool, source, command, directory, retiredWorkerPid as number);
      return { scope: 'Final TypeScript lifecycle refinement: unsupported context releases its idle worker before cold extraction.',
        command, idleWorkerBuild: compact(retained), fallback };
    }
    console.error('Preamble acceptance: isolated pipeline semantic body edits / header invalidation');
    const initialCold = await cold(source, command);
    const initial = await run();
    const initialQueries = await compareQueries(source, initialCold.extracted, initial.extracted);
    const bodySamples = await repeated(async (index) => {
      const needle = 'return {std::move(session_state), std::move(logits)};';
      assert.ok(originalText.includes(needle));
      // This changes a real state mutation as well as ranges after the edit.
      await writeFile(source, originalText.replace(needle, 'session_state.rope_position += ' + (index + 1) + ';\n  ' + needle));
      const reused = await run();
      reuseEvent(reused);
      const plain = await cold(source, command);
      return { reused: compact(reused), cold: compact(plain), queries: await compareQueries(source, plain.extracted, reused.extracted) };
    });
    await writeFile(header, originalHeaderText + '\n// isolated dependency edit\n');
    const headerChanged = await run();
    assert.equal(headerChanged.events.some((event) => event.event === 'preamble-reuse'), false);
    assert.ok(headerChanged.events.some((event) => ['preamble-build', 'preamble-fallback'].includes(String(event.event))));
    const headerCold = await cold(source, command);
    const headerQueries = await compareQueries(source, headerCold.extracted, headerChanged.extracted);
    const fallback = await measureFallback(pool, source, command, directory);
    const cancellations = await repeated(async () => {
      const cancelledPool = makePreamblePool();
      const controller = new AbortController();
      const events = Ref.makeUnsafe<readonly Event[]>([]);
      const startedAt = performance.now();
      try {
        await assert.rejects(Effect.runPromise(extractWithPreamble(cancelledPool, source, command, executable, 67108864,
          controller.signal, (event) => {
            Effect.runSync(Ref.update(events, (events) => [...events, event]));
            if (event.event === 'native-start') controller.abort();
          }), { signal: controller.signal }));
        const pid = Effect.runSync(Ref.get(events)).find((event) => event.event === 'native-start')?.pid;
        assert.equal(typeof pid, 'number');
        assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
        return { ms: performance.now() - startedAt, pid, reaped: true, events: Effect.runSync(Ref.get(events)) };
      } finally { await Effect.runPromise(disposePreamblePool(cancelledPool)); }
    });
    const totalPreambleMs = initial.ms + bodySamples.reduce((total, sample) => total + sample.reused.ms, 0);
    const totalColdMs = initialCold.ms + bodySamples.reduce((total, sample) => total + sample.cold.ms, 0);
    return { isolatedSource: source, command, initialCold: compact(initialCold), initial: compact(initial), initialQueries, bodySamples,
      headerChange: { preamble: compact(headerChanged), cold: compact(headerCold), queries: headerQueries },
      fallback, cancellations,
      repeatedEdits: { totalPreambleIncludingInitialBuildMs: totalPreambleMs, totalColdIncludingInitialMs: totalColdMs,
        comparablePreambleBodyMs: bodySamples.reduce((total, sample) => total + sample.reused.ms, 0),
        comparableColdBodyMs: bodySamples.reduce((total, sample) => total + sample.cold.ms, 0),
        note: 'Each workflow total includes its initial parse and the same semantic body edits; header invalidation is measured separately.' } };
  } finally {
    await Effect.runPromise(disposePreamblePool(pool));
    await rm(directory, { recursive: true, force: true });
  }
})();
assert.equal(await readFile(original, 'utf8'), originalText);
assert.equal(await readFile(originalHeader, 'utf8'), originalHeaderText);
const startupStarted = performance.now();
await promisify(execFile)(process.execPath, ['-e', 'process.stdout.write("startup-probe")']);
const report = { recordedAt: new Date().toISOString(), environment: { runtime: process.version, execPath: process.execPath,
  kernel: release(), cpu: cpus()[0]?.model, logicalCpus: availableParallelism(), totalMemory: totalmem() },
  repetitions, limits: ['Sequential samples on one machine with uncontrolled warm OS page cache and CPU scheduling.',
    'Node CPU excludes child CPU; native phase durations and PCH bytes are reported in events.',
    'N=3 p95 is the maximum sample, not a production tail estimate. No Extension Host/UI measurement.',
    'Preamble is process owned; restart rebuilds it. No persistent PCH or disk hit claim.'],
  emptyRuntimeStartupMs: performance.now() - startupStarted, realProject, editing };
const reportText = JSON.stringify({ ...report,
  publication: 'Project content fingerprints and resolved project build/include commands are omitted. Absolute project, fixture and executable paths use role names; only memory counters from process status are retained. Timing and query measurements are unchanged.'
}, (key, value) => ['sourceFingerprint', 'command'].includes(key) ? undefined : value, 2)
  .replaceAll(root, '<nano-infer>').replaceAll(directory, '<isolated-fixture>')
  .replaceAll(process.cwd(), '<fold-state-jump>').replaceAll(process.execPath, '<node>') + '\n';
if (process.argv[4]) await writeFile(process.argv[4], reportText);
console.log(reportText);
