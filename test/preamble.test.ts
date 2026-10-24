import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { existsSync, utimesSync, writeFileSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Deferred, Effect, Ref, Schedule } from 'effect';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';
import { extractVerifiedAst } from '../src/extraction';
import { makeAstCache, loadPreparedAst } from '../src/ast-cache';
import { buildIdentity, fingerprintFile, sha256, validateDependencies } from '../src/dependencies';
import { makeDiskCache, readDiskAst, writeDiskAst } from '../src/disk-cache';
import { disposePreamblePool, extractWithPreamble, makePreamblePool } from '../src/preamble';
import { disposePrewarm, makePrewarmScheduler, requestForeground, schedulePrewarm } from '../src/prewarm';
import { makeExtractionCommand, type CompileCommand } from '../src/services';
import { resultSignature } from './result-signature';

const executable = path.resolve('native/build/fold-state-jump-ast');
type Event = Readonly<Record<string, unknown>>;
type Extracted = Effect.Success<ReturnType<typeof extractVerifiedAst>>;
const sourceText = '#include <state.h>\n#if __has_include("optional.h")\n#include "optional.h"\n#endif\nvoid f(State &s) { s.value = VALUE; s.value++; }\n';

// Preserve declaration-reference relationships while replacing process addresses.
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

const compareQueries = async (source: string, cold: { readonly astText: string }, reused: { readonly astText: string }) => {
  const sourceText = await readFile(source, 'utf8');
  const coldPrepared = prepareAst(normalizeAst(JSON.parse(cold.astText) as ClangNode));
  const reusedPrepared = prepareAst(normalizeAst(JSON.parse(reused.astText) as ClangNode));
  assert.deepEqual(reusedPrepared.ast, coldPrepared.ast, 'Compact AST differs from cold parsing');
  const offsets = [...new Set(coldPrepared.index.all.filter((node) => path.resolve(node.file) === source &&
    ['MemberExpr', 'DeclRefExpr', 'CXXDependentScopeMemberExpr'].includes(node.node.kind))
    .flatMap((node) => node.node.range?.end?.offset === undefined ? [] : [node.node.range.end.offset]))];
  assert.ok(offsets.length > 0);
  offsets.map((cursorByteOffset) => {
    const options = { file: source, sourceText, cursorByteOffset };
    [analyzeAst, analyzeOriginAst].map((analyze) => assert.deepEqual(
      resultSignature(analyze(reusedPrepared.ast, options, reusedPrepared)),
      resultSignature(analyze(coldPrepared.ast, options, coldPrepared)), 'Query differs at ' + cursorByteOffset));
  });
};

const fixture = async (action: (input: {
  readonly directory: string; readonly source: string; readonly header: string; readonly transitive: string;
  readonly command: CompileCommand; readonly pool: ReturnType<typeof makePreamblePool>;
  readonly events: Ref.Ref<readonly Event[]>; readonly report: (event: Event) => void;
  readonly run: (command?: CompileCommand, signal?: AbortSignal) => Promise<Extracted>;
  readonly cold: (command?: CompileCommand) => Promise<Extracted>;
  readonly take: () => readonly Event[];
}) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-preamble-test-'));
  const source = path.join(directory, 'main.cpp');
  const header = path.join(directory, 'state.h');
  const transitive = path.join(directory, 'value.h');
  const pool = makePreamblePool();
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const report = (event: Event) => Effect.runSync(Ref.update(events, (events) => [...events, event]));
  const command: CompileCommand = { compiler: '/usr/lib/llvm-23/bin/clang++', cwd: directory,
    args: ['-std=c++17', '-I' + path.join(directory, 'generated'), '-I' + directory, source] };
  const run = (selected = command, signal = AbortSignal.timeout(30000)) =>
    Effect.runPromise(extractWithPreamble(pool, source, selected, executable, 67108864, signal, report), { signal });
  const cold = (selected = command) => Effect.runPromise(extractVerifiedAst(source, selected, executable, 67108864, AbortSignal.timeout(30000)));
  const take = () => Effect.runSync(Ref.getAndSet(events, []));
  try {
    await writeFile(source, sourceText);
    await writeFile(header, '#include "value.h"\nstruct State { int value; };\n');
    await writeFile(transitive, '#define VALUE 1\n');
    await action({ directory, source, header, transitive, command, pool, events, report, run, cold, take });
  } finally {
    await Effect.runPromise(disposePreamblePool(pool));
    await rm(directory, { recursive: true, force: true });
  }
};
const has = (events: readonly Event[], event: string) => events.some((entry) => entry.event === event);
const rebuilt = (events: readonly Event[]) => {
  assert.ok(has(events, 'preamble-build') || has(events, 'preamble-fallback'), JSON.stringify(events));
  assert.equal(has(events, 'preamble-reuse'), false, 'Invalid preamble was reused');
};

describe('production preamble integration', { skip: !existsSync(executable) || process.platform !== 'linux' }, () => {
  test('reuses the same prefix and a changed function body with identical cold query results', () => fixture(async (input) => {
    const first = await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    assert.ok(first.dependencies.paths.some((file) => file.path === input.transitive));
    const repeated = await input.run();
    assert.ok(has(input.take(), 'preamble-reuse'));
    await compareQueries(input.source, await input.cold(), repeated);
    await writeFile(input.source, sourceText.replace('s.value++;', 's.value += 2; s.value++;'));
    const edited = await input.run();
    assert.ok(has(input.take(), 'preamble-reuse'));
    await compareQueries(input.source, await input.cold(), edited);
  }));

  test('prefix and recursive same-size restored-mtime changes reject reuse', () => fixture(async (input) => {
    await input.run();
    input.take();
    await writeFile(input.source, '#define PREFIX 1\n' + sourceText);
    await compareQueries(input.source, await input.cold(), await input.run());
    rebuilt(input.take());
    const metadata = await stat(input.transitive);
    await writeFile(input.transitive, '#define VALUE 2\n');
    await utimes(input.transitive, metadata.atime, metadata.mtime);
    await compareQueries(input.source, await input.cold(), await input.run());
    rebuilt(input.take());
  }));

  test('flags, macros, include priority and newly generated include candidates invalidate', () => fixture(async (input) => {
    await input.run();
    input.take();
    await [
      { ...input.command, args: ['-DOTHER=1', ...input.command.args] },
      { ...input.command, args: input.command.args.map((arg) => arg === '-std=c++17' ? '-std=c++20' : arg) },
      { ...input.command, args: ['-I' + path.join(input.directory, 'other'), ...input.command.args] }
    ].reduce(async (previous, command) => {
      await previous;
      await compareQueries(input.source, await input.cold(command), await input.run(command));
      rebuilt(input.take());
    }, Promise.resolve());
    await input.run();
    input.take();
    await writeFile(path.join(input.directory, 'optional.h'), '#define OPTIONAL 1\n');
    await compareQueries(input.source, await input.cold(), await input.run());
    rebuilt(input.take());
    await mkdir(path.join(input.directory, 'generated'));
    await writeFile(path.join(input.directory, 'generated', 'state.h'), '#include "value.h"\nstruct State { long value; };\n');
    await compareQueries(input.source, await input.cold(), await input.run());
    rebuilt(input.take());
  }));

  test('AST hits bypass native work and concurrent requests use the existing single-flight', () => fixture(async (input) => {
    const cache = makeAstCache();
    const identity = await buildIdentity(input.source, input.command, executable, {});
    const request = { source: input.source, documentVersion: 1, buildIdentity: identity };
    const extract = extractWithPreamble(input.pool, input.source, input.command, executable, 67108864, AbortSignal.timeout(30000), input.report);
    const results = await Promise.all(Array.from({ length: 8 }, () => Effect.runPromise(loadPreparedAst(cache, request, extract, validateDependencies))));
    assert.ok(results.every((result) => result._tag === 'ExtractionReady'));
    assert.equal(input.take().filter((event) => event.event === 'preamble-build').length, 1);
    const hit = await Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('AST hit started native work')), validateDependencies));
    assert.equal(hit._tag, 'ExtractionReady');
    assert.deepEqual(input.take(), []);
  }));

  test('direct concurrent extraction serializes worker exchanges and constructs one preamble', () => fixture(async (input) => {
    const results = await Promise.all(Array.from({ length: 4 }, () => input.run()));
    const events = input.take();
    assert.equal(events.filter((event) => event.event === 'preamble-build').length, 1);
    assert.equal(events.filter((event) => event.event === 'preamble-reuse').length, 3);
    const plain = await input.cold();
    await Promise.all(results.map((result) => compareQueries(input.source, plain, result)));
  }));

  test('a PCH extraction restores through the existing disk AST cache after worker shutdown', () => fixture(async (input) => {
    const extracted = await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    const identity = await buildIdentity(input.source, input.command, executable, {});
    const disk = makeDiskCache(path.join(input.directory, 'ast'));
    assert.equal(await Effect.runPromise(writeDiskAst(disk, identity, extracted, new AbortController().signal)), true);
    await Effect.runPromise(disposePreamblePool(input.pool));
    input.take();
    const restored = await Effect.runPromise(loadPreparedAst(makeAstCache(),
      { source: input.source, documentVersion: 1, buildIdentity: identity },
      Effect.fail(new Error('Restarted AST hit started a native worker')), validateDependencies, readDiskAst(makeDiskCache(disk.directory), identity)));
    assert.equal(restored._tag, 'ExtractionReady');
    if (restored._tag === 'ExtractionReady') assert.deepEqual(restored.prepared.ast, extracted.prepared.ast);
    assert.deepEqual(input.take(), []);
  }));

  test('prefix macro and conditional order is preserved before included constexpr definitions', () => fixture(async (input) => {
    await writeFile(path.join(input.directory, 'mode.h'), 'constexpr int selected() { return MODE; }\n');
    await writeFile(input.source, '#define MODE 1\n#include "mode.h"\n#if MODE == 1\n#define INITIAL 1\n#else\n#define INITIAL 9\n#endif\n' +
      'struct State { int value; };\nvoid f(State &s) { static_assert(selected() == 1); s.value = selected() + INITIAL; s.value++; }\n');
    const first = await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    const reused = await input.run();
    assert.ok(has(input.take(), 'preamble-reuse'));
    const plain = await input.cold();
    await compareQueries(input.source, plain, first);
    await compareQueries(input.source, plain, reused);
  }));

  test('a self-including main file falls back instead of dropping its full-content dependency', () => fixture(async (input) => {
    await writeFile(input.source, '#ifndef FSJ_SELF_MAIN\n#define FSJ_SELF_MAIN\n#include "main.cpp"\n' + sourceText + '#endif\n');
    const extracted = await input.run();
    const events = input.take();
    assert.ok(has(events, 'preamble-fallback'));
    assert.equal(has(events, 'preamble-reuse'), false);
    await compareQueries(input.source, await input.cold(), extracted);
  }));

  test('idle expiration releases the artifact and the next request builds a fresh worker', () => fixture(async (input) => {
    const pool = makePreamblePool(20);
    const exited = Deferred.makeUnsafe<void>();
    const events = Ref.makeUnsafe<readonly Event[]>([]);
    const run = () => Effect.runPromise(extractWithPreamble(pool, input.source, input.command, executable, 67108864,
      AbortSignal.timeout(30000), (event) => {
        Effect.runSync(Ref.update(events, (events) => [...events, event]));
        if (event.event === 'native-exit') Effect.runSync(Deferred.succeed(exited, undefined));
      }));
    try {
      await run();
      await Effect.runPromise(Deferred.await(exited), { signal: AbortSignal.timeout(5000) });
      const firstEvents = Effect.runSync(Ref.getAndSet(events, []));
      const pid = firstEvents.find((event) => event.event === 'native-start')?.pid;
      assert.equal(typeof pid, 'number');
      assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
      await compareQueries(input.source, await input.cold(), await run());
      assert.ok(has(Effect.runSync(Ref.get(events)), 'preamble-build'));
    } finally { await Effect.runPromise(disposePreamblePool(pool)); }
  }));

  test('native worker stdin EOF exits without retaining a child or artifact', () => fixture(async (input) => {
    const command = makeExtractionCommand(input.command, executable);
    const child = spawn(executable, ['--preamble-worker', ...command.args], { cwd: input.directory, stdio: ['pipe', 'ignore', 'pipe'] });
    const closed = new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => resolve(code));
    });
    child.stderr.resume();
    const deadline = setTimeout(() => child.kill('SIGKILL'), 5000);
    try {
      child.stdin.end();
      assert.equal(await closed, 0);
      assert.throws(() => process.kill(child.pid!, 0), { code: 'ESRCH' });
    } finally {
      clearTimeout(deadline);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await closed.catch(() => undefined);
    }
  }));

  test('abrupt parent exit releases the native worker', () => fixture(async (input) => {
    const pidFile = path.join(input.directory, 'orphan-pid');
    const command = makeExtractionCommand(input.command, executable);
    const script = `
      const { spawn } = require('node:child_process');
      const { writeFileSync } = require('node:fs');
      const child = spawn(${JSON.stringify(executable)}, ${JSON.stringify(['--preamble-worker', ...command.args])}, {
        cwd: ${JSON.stringify(input.directory)}, stdio: ['pipe', 'pipe', 'ignore']
      });
      child.on('error', () => process.exit(1));
      child.stdout.on('data', (chunk) => {
        if (chunk.includes(0x1e)) {
          writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
          process.kill(process.pid, 'SIGKILL');
        }
      });
      child.stdin.write('build\\n');
      setTimeout(() => process.exit(2), 10000).unref();
    `;
    await assert.rejects(promisify(execFile)(process.execPath, ['-e', script]), { signal: 'SIGKILL' });
    const pid = Number(await readFile(pidFile, 'utf8'));
    assert.ok(Number.isSafeInteger(pid) && pid > 0);
    // Reaping an adopted child is asynchronous with respect to parent death.
    await Effect.runPromise(Effect.try({ try: () => assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }),
      catch: (error) => error }).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced(10) })));
  }));

  test('changed parse environment starts a compatible worker', () => fixture(async (input) => {
    await input.run();
    input.take();
    const before = process.env.CPATH;
    try {
      process.env.CPATH = path.join(input.directory, 'environment-includes');
      await compareQueries(input.source, await input.cold(), await input.run());
      rebuilt(input.take());
    } finally {
      if (before === undefined) delete process.env.CPATH;
      else process.env.CPATH = before;
    }
  }));

  test('duplicate prewarm and foreground callers share one build and independent cancellation', () => fixture(async (input) => {
    const scheduler = makePrewarmScheduler(input.report);
    const started = Deferred.makeUnsafe<void>();
    const task = { source: input.source, key: 'same-saved-version', reason: 'preamble-regression' };
    const work = (signal: AbortSignal) => Effect.runPromise(extractWithPreamble(input.pool, input.source, input.command,
      executable, 67108864, signal, (event) => {
        input.report(event);
        if (event.event === 'native-start') Effect.runSync(Deferred.succeed(started, undefined));
      }).pipe(Effect.map((extracted) => ({ _tag: 'ExtractionReady' as const, prepared: extracted.prepared, hit: 'load' as const,
        dependencies: extracted.dependencies }))), { signal });
    try {
      schedulePrewarm(scheduler, task, 0, work);
      await Effect.runPromise(Deferred.await(started));
      Array.from({ length: 8 }).map(() => schedulePrewarm(scheduler, task, 0, work));
      const controller = new AbortController();
      const cancelled = requestForeground(scheduler, task, controller.signal, work);
      const completed = requestForeground(scheduler, task, new AbortController().signal, work);
      controller.abort();
      await assert.rejects(cancelled);
      assert.equal((await completed)._tag, 'ExtractionReady');
      assert.equal(input.take().filter((event) => event.event === 'preamble-build').length, 1);
    } finally { await disposePrewarm(scheduler); }
  }));

  test('in-flight cancellation reaps the worker and the next request rebuilds', () => fixture(async (input) => {
    const controller = new AbortController();
    const events = Ref.makeUnsafe<readonly Event[]>([]);
    await assert.rejects(Effect.runPromise(extractWithPreamble(input.pool, input.source, input.command, executable, 67108864,
      controller.signal, (event) => {
        Effect.runSync(Ref.update(events, (events) => [...events, event]));
        if (event.event === 'native-start') controller.abort();
      }), { signal: controller.signal }));
    const pid = Effect.runSync(Ref.get(events)).find((event) => event.event === 'native-start')?.pid;
    assert.equal(typeof pid, 'number');
    assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
    await compareQueries(input.source, await input.cold(), await input.run());
    assert.ok(has(input.take(), 'preamble-build'));
  }));

  test('abort, worker crash, disposal and a fresh pool recover with correct cold results', () => fixture(async (input) => {
    const cancelled = new AbortController();
    cancelled.abort();
    await assert.rejects(input.run(input.command, cancelled.signal));
    await input.run();
    const events = input.take();
    const pid = events.find((event) => event.event === 'native-start')?.pid;
    assert.equal(typeof pid, 'number');
    process.kill(pid as number, 'SIGKILL');
    const recovered = await input.run();
    await compareQueries(input.source, await input.cold(), recovered);
    const recoveryEvents = input.take();
    assert.ok(has(recoveryEvents, 'preamble-build') || has(recoveryEvents, 'preamble-fallback'));
    await input.run();
    const nextEvents = input.take();
    assert.ok(has(nextEvents, 'preamble-build') || has(nextEvents, 'preamble-reuse'));
    await input.run();
    assert.ok(has(input.take(), 'preamble-reuse'));
    await Effect.runPromise(disposePreamblePool(input.pool));
    assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
    await assert.rejects(input.run(), /closed|disposed/);
    await assert.rejects(input.run({ ...input.command, args: ['-include', input.header, ...input.command.args] }), /closed|disposed/);
    const restarted = makePreamblePool();
    try {
      const restartedEvents = Ref.makeUnsafe<readonly Event[]>([]);
      const extracted = await Effect.runPromise(extractWithPreamble(restarted, input.source, input.command, executable, 67108864,
        AbortSignal.timeout(30000), (event) => Effect.runSync(Ref.update(restartedEvents, (events) => [...events, event]))));
      await compareQueries(input.source, await input.cold(), extracted);
      assert.ok(has(Effect.runSync(Ref.get(restartedEvents)), 'preamble-build'));
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('a dependency change at the build boundary cannot publish stale query results', () => fixture(async (input) => {
    const events = Ref.makeUnsafe<readonly Event[]>([]);
    const result = await Effect.runPromise(extractWithPreamble(input.pool, input.source, input.command, executable, 67108864,
      AbortSignal.timeout(30000), (event) => {
        const previous = Effect.runSync(Ref.get(events));
        Effect.runSync(Ref.update(events, (events) => [...events, event]));
        if (event.event === 'preamble-build' && !has(previous, 'preamble-build')) writeFileSync(input.transitive, '#define VALUE 2\n');
      })).then((result) => ({ _tag: 'Ready' as const, result }), (error) => ({ _tag: 'Rejected' as const, error }));
    if (result._tag === 'Ready') await compareQueries(input.source, await input.cold(), result.result);
    const recovered = await input.run();
    await compareQueries(input.source, await input.cold(), recovered);
  }));

  test('a dependency changed and restored during construction rejects the original proof', () => fixture(async (input) => {
    const metadata = await stat(input.transitive);
    const events = Ref.makeUnsafe<readonly Event[]>([]);
    const extracted = await Effect.runPromise(extractWithPreamble(input.pool, input.source, input.command, executable, 67108864,
      AbortSignal.timeout(30000), (event) => {
        const previous = Effect.runSync(Ref.get(events));
        Effect.runSync(Ref.update(events, (events) => [...events, event]));
        if (event.event === 'preamble-build' && !has(previous, 'preamble-build')) {
          writeFileSync(input.transitive, '#define VALUE 2\n');
          writeFileSync(input.transitive, '#define VALUE 1\n');
          utimesSync(input.transitive, metadata.atime, metadata.mtime);
        }
      }));
    const reported = Effect.runSync(Ref.get(events));
    assert.ok(has(reported, 'preamble-fallback'));
    assert.equal(has(reported, 'preamble-published'), false);
    await compareQueries(input.source, await input.cold(), extracted);
  }));

  test('unsupported forced includes take the ordinary cold path', () => fixture(async (input) => {
    const forced = path.join(input.directory, 'forced.h');
    await writeFile(forced, '#define FORCED 1\n');
    const command = { ...input.command, args: ['-include', forced, ...input.command.args] };
    await compareQueries(input.source, await input.cold(command), await input.run(command));
    assert.ok(has(input.take(), 'preamble-fallback'));
  }));

  test('interrupted and corrupt worker publication falls back without admitting an artifact', () => fixture(async (input) => {
    const wrapper = path.join(input.directory, 'extractor-wrapper');
    const sourceHash = (await fingerprintFile(input.source)).sha256;
    const bounds = sourceText.indexOf('void f');
    const prefixHash = sha256(Buffer.from(sourceText).subarray(0, bounds));
    const runtimeMetadata = await stat(executable, { bigint: true });
    const runtimeStamp = [runtimeMetadata.dev, runtimeMetadata.ino, runtimeMetadata.size, runtimeMetadata.mode,
      runtimeMetadata.mtimeNs, runtimeMetadata.ctimeNs].join(':');
    const base = { ok: true, bounds, prefixHash, sourceHash,
      dependencies: { schema: 1, reusable: true, runtime: [{ path: executable, stamp: runtimeStamp }],
        paths: [{ path: input.transitive, ...await fingerprintFile(input.transitive) }] } };
    await ['{"ok":true', 'corrupted\x1e', ...[
      { ...base, sourceHash: 'wrong' },
      { ...base, prefixHash: 'wrong' },
      { ...base, dependencies: { ...base.dependencies, runtime: [] } },
      { ...base, dependencies: { ...base.dependencies, paths: [] } },
      { ...base, dependencies: { ...base.dependencies,
        paths: [{ path: input.transitive, real: input.transitive, sha256: 'wrong' }] } },
      { ...base, dependencies: { ...base.dependencies, runtime: [{ path: executable, stamp: 'stale-runtime' }] } }
    ].map((response) => JSON.stringify(response) + '\x1e')].reduce(async (previous, response) => {
      await previous;
      await writeFile(wrapper, '#!' + process.execPath + '\n' +
        'const { spawnSync } = require("node:child_process");\n' +
        'if (process.argv.includes("--preamble-worker")) { process.stdout.write(' + JSON.stringify(response) + '); }\n' +
        'else { const result = spawnSync(' + JSON.stringify(executable) + ', process.argv.slice(2), { stdio: "inherit" }); process.exit(result.status ?? 1); }\n');
      await chmod(wrapper, 0o755);
      const extracted = await Effect.runPromise(extractWithPreamble(input.pool, input.source, input.command, wrapper,
        67108864, AbortSignal.timeout(30000), input.report));
      await compareQueries(input.source, await input.cold(), extracted);
      const events = input.take();
      assert.ok(has(events, 'preamble-fallback'));
      assert.equal(has(events, 'preamble-published'), false);
    }, Promise.resolve());
  }));
});
