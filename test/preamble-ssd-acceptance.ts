// bun build test/preamble-ssd-acceptance.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-ssd-acceptance.mjs
// node /tmp/fsj-preamble-ssd-acceptance.mjs /path/to/nano-infer docs/measurements/preamble-ssd.json
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { availableParallelism, cpus, release, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Effect, Ref } from 'effect';
import { fingerprintFile } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { disposePreamblePool, extractWithPreamble, makePreamblePool } from '../src/preamble';
import { resolveCompileCommand, type CompileCommand } from '../src/services';
import { checkTargets, compareQueries } from './preamble-query-checks';

type Event = Readonly<Record<string, unknown>>;
type Extracted = Effect.Success<ReturnType<typeof extractVerifiedAst>>;
type Input = { readonly name: string; readonly source: string; readonly command: CompileCommand; readonly pchDirectory: string };
const executable = path.resolve('native/build/fold-state-jump-ast');
const maxAstBytes = 67108864;
const names = ['pipeline.h', 'ffn.h', 'experts.h'] as const;
const sequence = ['pipeline.h', 'ffn.h', 'experts.h', 'pipeline.h', 'ffn.h'] as const;
const measure = async (run: (report: (event: Event) => void) => Promise<Extracted>) => {
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const startedAt = performance.now();
  const cpu = process.cpuUsage();
  const extracted = await run((event) => Effect.runSync(Ref.update(events, (events) => [...events, event])));
  return { extracted, ms: performance.now() - startedAt, nodeCpuMicros: process.cpuUsage(cpu), events: Effect.runSync(Ref.get(events)) };
};
const compact = ({ ms, events, nodeCpuMicros }: Awaited<ReturnType<typeof measure>>) => ({ ms, nodeCpuMicros, events });
const cold = (input: Input) => measure((report) => Effect.runPromise(extractVerifiedAst(input.source, input.command,
  executable, maxAstBytes, AbortSignal.timeout(180000), report)));
const run = (pool: ReturnType<typeof makePreamblePool>, input: Input) => measure((report) => Effect.runPromise(
  extractWithPreamble(pool, input.source, input.command, executable, maxAstBytes, AbortSignal.timeout(180000), report, input.pchDirectory)));
const memory = async (events: readonly Event[]) => {
  const pid = [...events].reverse().find((event) => ['native-start', 'native-active', 'native-idle'].includes(String(event.event)))?.pid;
  if (typeof pid !== 'number') return {};
  const status = await readFile('/proc/' + pid + '/status', 'utf8').catch(() => '');
  return { pid, ...Object.fromEntries(status.split('\n').filter((line) => /^(VmSize|VmHWM|VmRSS|RssAnon):/.test(line))
    .map((line) => { const [name, value] = line.split(':'); return [name, value.trim()]; })) };
};
const bytesUnder = async (directory: string): Promise<number> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries.reduce<Promise<number>>(async (total, entry) => await total + (entry.isDirectory()
    ? await bytesUnder(path.join(directory, entry.name)) : entry.isFile() ? (await stat(path.join(directory, entry.name))).size : 0), Promise.resolve(0));
};
const assertNoBuild = (events: readonly Event[]) => {
  assert.equal(events.some((event) => event.event === 'preamble-build'), false, JSON.stringify(events));
  assert.equal(events.some((event) => event.event === 'preamble-fallback'), false, JSON.stringify(events));
  assert.ok(events.some((event) => ['preamble-load', 'preamble-reuse'].includes(String(event.event))), JSON.stringify(events));
};

if (process.argv[2] === '--restore') {
  const inputs = JSON.parse(await readFile(process.argv[3], 'utf8')) as readonly Input[];
  const pool = makePreamblePool();
  try {
    const restored = await inputs.reduce<Promise<readonly unknown[]>>(async (samples, input) => {
      const previous = await samples;
      const sample = await run(pool, input);
      assertNoBuild(sample.events);
      assert.ok(sample.events.some((event) => event.event === 'preamble-load'), JSON.stringify(sample.events));
      const plain = await cold(input);
      return [...previous, { name: input.name, restored: compact(sample), memory: await memory(sample.events),
        cold: compact(plain), queries: await compareQueries(input.source, plain.extracted, sample.extracted),
        jumpTargets: await checkTargets(input.source, sample.extracted) }];
    }, Promise.resolve([]));
    if (process.argv[4]) await writeFile(process.argv[4], JSON.stringify(restored));
    else console.log(JSON.stringify(restored));
  } finally { await Effect.runPromise(disposePreamblePool(pool)); }
} else {
  assert.ok(process.argv[2], 'Pass the nano-infer checkout path.');
  const root = path.resolve(process.argv[2]);
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-preamble-ssd-acceptance-'));
  const originals = await Promise.all(names.map(async (name) => ({ name,
    source: path.join(root, 'minicpm-v-4_7', name),
    text: await readFile(path.join(root, 'minicpm-v-4_7', name), 'utf8'),
    fingerprint: await fingerprintFile(path.join(root, 'minicpm-v-4_7', name)) })));
  const editedText = (name: string, text: string, revision: number) => {
    const needle = name === 'pipeline.h' ? 'session_state.rope_position = next_rope;'
      : name === 'ffn.h' ? 'bank_state.slots = std::move(plan.slots);'
      : 'bank_state.counters.prefetch_experts += plan.placements.size();';
    assert.ok(text.includes(needle), name + ': missing semantic edit marker');
    return text.replace(needle, (name === 'pipeline.h' ? 'session_state.rope_position' : 'bank_state.counters.prefetch_experts') +
      ' += ' + revision + ';\n  ' + needle);
  };
  const prepareInputs = async (mode: 'independent' | 'coupled'): Promise<readonly Input[]> => Promise.all(originals.map(async (original) => {
    const sourceDirectory = path.join(directory, mode, ...(mode === 'independent' ? [original.name] : []));
    await mkdir(sourceDirectory, { recursive: true });
    const source = path.join(sourceDirectory, original.name);
    await writeFile(source, original.text);
    const command = await Effect.runPromise(resolveCompileCommand(original.source, [root], 'clang++'));
    assert.equal(command.args.at(-1), original.source);
    return { name: original.name, source, pchDirectory: path.join(directory, mode, '.cache', 'fold-state-jump', 'pch'),
      command: { ...command, args: [...command.args.slice(0, -1), '-I' + path.dirname(original.source), source] } };
  }));
  const workflow = async (mode: 'independent' | 'coupled') => {
    const inputs = await prepareInputs(mode);
    const pool = makePreamblePool();
    const steps: readonly string[] = mode === 'independent' ? [...sequence, ...sequence] : sequence;
    try {
      const samples = await steps.reduce<Promise<readonly { readonly pch: ReturnType<typeof compact>; readonly cold: ReturnType<typeof compact>; readonly [key: string]: unknown }[]>>(
        async (samples, name, index) => {
          const previous = await samples;
          const input = inputs.find((input) => input.name === name)!;
          const original = originals.find((input) => input.name === name)!;
          const before = await fingerprintFile(input.source);
          await writeFile(input.source, editedText(name, original.text, index + 1));
          const after = await fingerprintFile(input.source);
          assert.notEqual(before.sha256, after.sha256, 'Full AST must be invalidated by every semantic body edit');
          console.error('SSD acceptance ' + mode + ': ' + (index + 1) + '/' + steps.length + ' ' + name);
          const sample = await run(pool, input);
          assert.equal(sample.events.some((event) => event.event === 'preamble-fallback'), false, JSON.stringify(sample.events));
          if (mode === 'independent' && index >= 3) assertNoBuild(sample.events);
          else assert.equal(sample.events.filter((event) => event.event === 'preamble-build').length, 1, JSON.stringify(sample.events));
          const plain = await cold(input);
          const jumpTargets = await checkTargets(input.source, sample.extracted);
          assert.equal(jumpTargets, name === 'pipeline.h' ? 8 : name === 'ffn.h' ? 14 : 3);
          const completed = [...previous, { step: index + 1, name, astChanged: true, astCacheUsed: false,
            pch: compact(sample), cold: compact(plain), memory: await memory(sample.events), jumpTargets,
            queries: await compareQueries(input.source, plain.extracted, sample.extracted) }];
          await writeFile(path.join(directory, mode + '-samples.json'), JSON.stringify(completed));
          return completed;
        }, Promise.resolve([]));
      const pids = samples.flatMap((sample) => sample.pch.events.filter((event) => event.event === 'native-start').map((event) => event.pid))
        .filter((pid): pid is number => typeof pid === 'number');
      await Effect.runPromise(disposePreamblePool(pool));
      pids.map((pid) => assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }));
      const restore = mode === 'independent' ? await (async () => {
        const inputFile = path.join(directory, 'restore-inputs.json');
        await writeFile(inputFile, JSON.stringify(inputs));
        console.error('SSD acceptance: separate Node process restoring all three PCHs');
        const outputFile = path.join(directory, 'restore-report.json');
        await promisify(execFile)(process.execPath,
          [fileURLToPath(import.meta.url), '--restore', inputFile, outputFile], { maxBuffer: 16 * 1024 * 1024, timeout: 300000 });
        return JSON.parse(await readFile(outputFile, 'utf8')) as unknown;
      })() : undefined;
      const summary = (selected: readonly (typeof samples)[number][]) => ({
        requests: selected.length,
        totalPchMs: selected.reduce((total, sample) => total + sample.pch.ms, 0),
        totalColdMs: selected.reduce((total, sample) => total + sample.cold.ms, 0),
        builds: selected.reduce((total, sample) => total + sample.pch.events.filter((event) => event.event === 'preamble-build').length, 0),
        loads: selected.reduce((total, sample) => total + sample.pch.events.filter((event) => event.event === 'preamble-load').length, 0),
        reuses: selected.reduce((total, sample) => total + sample.pch.events.filter((event) => event.event === 'preamble-reuse').length, 0)
      });
      return { mode, samples, initialFive: summary(samples.slice(0, 5)),
        ...(mode === 'independent' ? { warmFive: summary(samples.slice(5)) } : {}),
        restart: restore, nativePidsReaped: true, pchDiskBytes: await bytesUnder(path.join(directory, mode, '.cache', 'fold-state-jump', 'pch')),
        totalPchMs: samples.reduce((total, sample) => total + sample.pch.ms, 0),
        totalColdMs: samples.reduce((total, sample) => total + sample.cold.ms, 0),
        builds: samples.reduce((total, sample) => total + sample.pch.events.filter((event) => event.event === 'preamble-build').length, 0),
        loads: samples.reduce((total, sample) => total + sample.pch.events.filter((event) => event.event === 'preamble-load').length, 0),
        reuses: samples.reduce((total, sample) => total + sample.pch.events.filter((event) => event.event === 'preamble-reuse').length, 0) };
    } finally { await Effect.runPromise(disposePreamblePool(pool)); }
  };
  try {
    const independent = await workflow('independent');
    await writeFile(path.join(directory, 'independent-report.json'), JSON.stringify(independent));
    const coupled = await workflow('coupled');
    await Promise.all(originals.map(async (original) => assert.deepEqual(await fingerprintFile(original.source), original.fingerprint,
      'Original nano-infer source changed')));
    const report = { recordedAt: new Date().toISOString(), environment: { runtime: process.version, kernel: release(),
      cpu: cpus()[0]?.model, logicalCpus: availableParallelism() },
      method: ['Sequential real nano-infer header parses with semantic state mutation edits; direct extraction bypasses the complete AST cache.',
        'Independent mode repeats the five-request sequence twice, then restarts Node. The first and warm five are reported separately.',
        'Independent mode gives each main header its own directory and uses original read-only headers as recursive dependencies. It isolates file switching from legitimate dependency changes.',
        'Coupled mode copies pipeline.h, ffn.h and experts.h together. Editing ffn.h invalidates pipeline.h and editing experts.h invalidates ffn.h; those rebuilds are required.',
        'Each PCH result is compared against ordinary Clang parsing of that exact version at every supported mutation/origin cursor position. Candidate order is preserved.',
        'Warm OS filesystem caches, uncontrolled CPU scheduling, one machine. Node CPU excludes child CPU. No Extension Host/UI timing is claimed.'],
      independent, coupled };
    const reportText = JSON.stringify(report, (key, value) => key === 'command' ? undefined : value, 2)
      .replaceAll(root, '<nano-infer>').replaceAll(directory, '<isolated-fixture>').replaceAll(process.cwd(), '<fold-state-jump>') + '\n';
    if (process.argv[3]) await writeFile(process.argv[3], reportText);
    console.log(reportText);
    await rm(directory, { recursive: true, force: true });
  } catch (error) {
    console.error('Retained failed acceptance fixture: ' + directory);
    throw error;
  }
}
