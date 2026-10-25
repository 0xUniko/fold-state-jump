import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { extractVerifiedAst } from '../src/extraction';
import { sha256, validateDependencies } from '../src/dependencies';
import { clearPreamblePool, disposePreamblePool, extractWithPreamble, makePreamblePool } from '../src/preamble';
import { type CompileCommand } from '../src/services';
import { clearPchStorage, pchStorageStats, readPchEntry } from '../src/pch-storage';
import { compareQueries, normalizeAst } from './preamble-query-checks';

const executable = path.resolve('native/build/fold-state-jump-ast');
type Event = Readonly<Record<string, unknown>>;
type Pool = ReturnType<typeof makePreamblePool>;
const has = (events: readonly Event[], name: string) => events.some((event) => event.event === name);
const sourceText = '#include "state.h"\n#if __has_include("optional.h")\n#include "optional.h"\n#endif\nvoid f(State &s) { s.value = VALUE; s.value++; }\n';
const fixture = async (action: (input: {
  readonly directory: string; readonly pchDirectory: string; readonly source: string; readonly alternate: string;
  readonly header: string; readonly transitive: string; readonly command: CompileCommand; readonly pool: Pool;
  readonly run: (options?: { readonly pool?: Pool; readonly source?: string; readonly command?: CompileCommand;
    readonly executable?: string; readonly intent?: 'foreground' | 'prewarm'; readonly signal?: AbortSignal; readonly onEvent?: (event: Event) => void }) => Promise<Effect.Success<ReturnType<typeof extractVerifiedAst>>>;
  readonly cold: (source?: string, command?: CompileCommand) => Promise<Effect.Success<ReturnType<typeof extractVerifiedAst>>>;
  readonly take: () => readonly Event[];
}) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-ssd-preamble-test-'));
  const pchDirectory = path.join(directory, '.cache', 'fold-state-jump', 'pch');
  const source = path.join(directory, 'main.cpp');
  const alternate = path.join(directory, 'other.cpp');
  const header = path.join(directory, 'state.h');
  const transitive = path.join(directory, 'value.h');
  const pool = makePreamblePool();
  const events = Ref.makeUnsafe<readonly Event[]>([]);
  const command: CompileCommand = { compiler: '/usr/lib/llvm-23/bin/clang++', cwd: directory,
    args: ['-std=c++17', '-I' + path.join(directory, 'generated'), '-I' + directory, source] };
  const run = (options: { readonly pool?: Pool; readonly source?: string; readonly command?: CompileCommand; readonly executable?: string; readonly intent?: 'foreground' | 'prewarm'; readonly signal?: AbortSignal; readonly onEvent?: (event: Event) => void } = {}) => {
    const selected = options.source ?? source;
    const signal = options.signal ?? AbortSignal.timeout(30000);
    return Effect.runPromise(extractWithPreamble(options.pool ?? pool, selected,
      options.command ?? { ...command, args: [...command.args.slice(0, -1), selected] }, options.executable ?? executable, 67108864, signal,
      (event) => { Effect.runSync(Ref.update(events, (events) => [...events, event])); options.onEvent?.(event); }, pchDirectory, options.intent), { signal });
  };
  const cold = (selected = source, selectedCommand: CompileCommand = { ...command, args: [...command.args.slice(0, -1), selected] }) =>
    Effect.runPromise(extractVerifiedAst(selected, selectedCommand, executable, 67108864, AbortSignal.timeout(30000)));
  try {
    await mkdir(pchDirectory, { recursive: true });
    await writeFile(source, sourceText);
    await writeFile(alternate, sourceText.replace('void f(', 'void g('));
    await writeFile(header, '#include "value.h"\nstruct State { int value; };\n');
    await writeFile(transitive, '#define VALUE 1\n');
    await action({ directory, pchDirectory, source, alternate, header, transitive, command, pool, run, cold,
      take: () => Effect.runSync(Ref.getAndSet(events, [])) });
  } finally {
    await Effect.runPromise(disposePreamblePool(pool));
    await rm(directory, { recursive: true, force: true });
  }
};

const expectLoad = (events: readonly Event[]) => {
  assert.ok(has(events, 'preamble-load'), JSON.stringify(events));
  assert.equal(has(events, 'preamble-build'), false, JSON.stringify(events));
  assert.equal(has(events, 'preamble-fallback'), false, JSON.stringify(events));
};
const expectRebuild = (events: readonly Event[]) => {
  assert.equal(has(events, 'preamble-reuse'), false, JSON.stringify(events));
  assert.equal(has(events, 'preamble-load'), false, JSON.stringify(events));
  assert.ok(has(events, 'preamble-build') || has(events, 'preamble-fallback'), JSON.stringify(events));
};

// This is a host-VALID manifest and checksum pair. Only the Native runtime
// observation is inconsistent; readPchEntry must accept it before each injection.
const rejectNativeProof = async (directory: string) => {
  const name = (await readdir(directory)).find((name) => name.endsWith('.json'))!;
  const filename = path.join(directory, name);
  const manifest = JSON.parse(await readFile(filename, 'utf8'));
  manifest.nativeDependencies.runtime[0].stamp = 'native-rejection-injected';
  manifest.proofHash = sha256(JSON.stringify([manifest.dependencies, manifest.nativeDependencies]));
  await writeFile(filename, JSON.stringify(manifest));
  assert.ok(await readPchEntry(directory, manifest.identity), 'Host must accept the injected Native-only rejection');
  return manifest.identity as string;
};
const equalAst = (plain: Effect.Success<ReturnType<typeof extractVerifiedAst>>, recovered: Effect.Success<ReturnType<typeof extractVerifiedAst>>) =>
  assert.deepEqual(normalizeAst(JSON.parse(recovered.astText)), normalizeAst(JSON.parse(plain.astText)));

describe('persistent SSD preamble integration', { skip: !existsSync(executable) || process.platform !== 'linux' }, () => {
  test('host-accepted Native rejection invalidates and rebuilds once in the same healthy worker', () => fixture(async (input) => {
    await input.run(); input.take();
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    const identity = await rejectNativeProof(input.pchDirectory);
    const recovered = await input.run();
    const events = input.take();
    assert.equal(events.filter((event) => event.event === 'preamble-native-rejected').length, 1, JSON.stringify(events));
    assert.equal(events.filter((event) => event.event === 'preamble-recovery').length, 1);
    assert.equal(events.filter((event) => event.event === 'preamble-build').length, 1);
    assert.equal(events.filter((event) => event.event === 'native-start').length, 1, 'Recovery must use the healthy original worker');
    assert.ok(events.some((event) => event.event === 'preamble-artifact-invalidated' && event.invalidated));
    assert.equal(has(events, 'preamble-fallback'), false);
    assert.ok(await readPchEntry(input.pchDirectory, identity));
    const plain = await input.cold(); equalAst(plain, recovered);
    await compareQueries(input.source, plain, recovered);
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    const next = await input.run();
    expectLoad(input.take()); equalAst(plain, next);
  }));

  test('failed recovery builds only once, parses cold and never reloads the rejected pair', () => fixture(async (input) => {
    await input.run(); input.take();
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    await rejectNativeProof(input.pchDirectory);
    const recovered = await input.run({ onEvent: (event) => {
      if (event.event === 'preamble-recovery') writeFileSync(input.source, sourceText.replace('s.value++;', 's.value += 7;'));
    } });
    const events = input.take();
    assert.equal(events.filter((event) => event.event === 'preamble-recovery').length, 1);
    assert.equal(events.filter((event) => event.event === 'preamble-build').length, 1);
    assert.ok(has(events, 'preamble-fallback'));
    assert.equal((await pchStorageStats(input.pchDirectory)).entries, 0);
    equalAst(await input.cold(), recovered);
    await input.run();
    const next = input.take();
    assert.equal(has(next, 'preamble-native-rejected'), false);
    assert.ok(has(next, 'preamble-build'));
  }));

  test('source, prefix, dependency and command changes during rejection prevent recovery publication', () => fixture(async (input) => {
    await ['source', 'prefix', 'dependency', 'command'].reduce(async (previous, change) => {
      await previous;
      await input.run(); input.take();
      await clearPreamblePool(input.pool).pipe(Effect.runPromise);
      await rejectNativeProof(input.pchDirectory);
      const command = { ...input.command, args: [...input.command.args] };
      const recovered = await input.run({ command, onEvent: (event) => {
        if (event.event !== 'preamble-native-rejected') return;
        if (change === 'source') writeFileSync(input.source, sourceText.replace('s.value++;', 's.value += 8;'));
        if (change === 'prefix') writeFileSync(input.source, '#define NEW_PREFIX 1\n' + sourceText);
        if (change === 'dependency') writeFileSync(input.transitive, '#define VALUE 8\n');
        if (change === 'command') command.args.unshift('-DCONTEXT_CHANGED=1');
      } });
      const events = input.take();
      assert.ok(has(events, 'preamble-native-rejected'));
      assert.ok(has(events, 'preamble-fallback'));
      assert.equal(has(events, 'preamble-recovery'), false, JSON.stringify(events));
      assert.equal(has(events, 'preamble-build'), false);
      assert.equal(has(events, 'preamble-disk-write'), false);
      equalAst(await input.cold(input.source, command), recovered);
    }, Promise.resolve());
  }));

  test('cancellation and crash after rejection reap the lock owner without recovery on a dead worker', () => fixture(async (input) => {
    await ['cancel', 'crash'].reduce(async (previous, fault) => {
      await previous;
      await input.run(); input.take();
      await clearPreamblePool(input.pool).pipe(Effect.runPromise);
      await rejectNativeProof(input.pchDirectory);
      const controller = new AbortController();
      const observed = Ref.makeUnsafe<readonly Event[]>([]);
      const running = input.run({ signal: controller.signal, onEvent: (event) => {
        Effect.runSync(Ref.update(observed, (events) => [...events, event]));
        if (event.event !== 'preamble-native-rejected') return;
        if (fault === 'cancel') controller.abort();
        else {
          const pid = Effect.runSync(Ref.get(observed)).find((event) => event.event === 'native-start')!.pid as number;
          process.kill(pid, 'SIGKILL');
        }
      } });
      if (fault === 'cancel') await assert.rejects(running);
      else equalAst(await input.cold(), await running);
      const events = input.take();
      assert.equal(has(events, 'preamble-build'), false);
      assert.equal(has(events, 'preamble-disk-write'), false);
      const pid = events.find((event) => event.event === 'native-start')!.pid as number;
      assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
      assert.equal((await readdir(input.pchDirectory)).some((name) => name.startsWith('stage-')), false);
      // Acquiring the same identity again also proves the kernel lock was released.
      await input.run(); input.take();
    }, Promise.resolve());
  }));

  test('two independent pools recover one rejected artifact without racing publication', () => fixture(async (input) => {
    await input.run(); input.take();
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    await rejectNativeProof(input.pchDirectory);
    const other = makePreamblePool();
    try {
      const recovered = await Promise.all([input.run(), input.run({ pool: other })]);
      const events = input.take();
      assert.equal(events.filter((event) => event.event === 'preamble-native-rejected').length, 1);
      assert.equal(events.filter((event) => event.event === 'preamble-build').length, 1);
      assert.equal(events.filter((event) => event.event === 'preamble-load').length, 1);
      const plain = await input.cold(); recovered.map((sample) => equalAst(plain, sample));
    } finally { await Effect.runPromise(disposePreamblePool(other)); }
  }));

  test('repeated confirmed dependency invalidation suppresses foreground builds and prewarm restores them', () => fixture(async (input) => {
    await input.run(); input.take();
    await writeFile(input.transitive, '#define VALUE 2\n');
    await input.run({ source: input.alternate });
    assert.ok(has(input.take(), 'preamble-build'), 'First invalidation does not suppress construction');
    await writeFile(input.transitive, '#define VALUE 3\n');
    const skipped = await input.run();
    const events = input.take();
    assert.ok(has(events, 'preamble-policy-skip'), JSON.stringify(events));
    assert.equal(has(events, 'preamble-build'), false);
    assert.equal(has(events, 'preamble-fallback'), false);
    equalAst(await input.cold(), skipped);
    await input.run();
    assert.ok(has(input.take(), 'preamble-policy-skip'));
    const warmed = await input.run({ intent: 'prewarm' });
    const warmEvents = input.take();
    assert.ok(has(warmEvents, 'preamble-build'));
    assert.equal(has(warmEvents, 'preamble-policy-skip'), false);
    equalAst(await input.cold(), warmed);
    await input.run();
    assert.ok(has(input.take(), 'preamble-reuse'));
    await input.run({ source: input.alternate });
    assert.ok(has(input.take(), 'preamble-build'), 'A successful prewarm resets suppression');
  }));

  test('host-verified invalid Clang bytes are rejected by load and replaced after one recovery', () => fixture(async (input) => {
    await input.run(); input.take();
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    const filename = (await readdir(input.pchDirectory)).find((name) => name.endsWith('.json'))!;
    const manifest = JSON.parse(await readFile(path.join(input.pchDirectory, filename), 'utf8'));
    const bytes = Buffer.from('invalid serialized Clang PCH');
    await writeFile(path.join(input.pchDirectory, manifest.identity + '.pch'), bytes);
    await writeFile(path.join(input.pchDirectory, filename), JSON.stringify({ ...manifest, pchBytes: bytes.length, pchHash: sha256(bytes) }));
    assert.ok(await readPchEntry(input.pchDirectory, manifest.identity));
    const recovered = await input.run();
    const events = input.take();
    assert.ok(events.some((event) => event.event === 'preamble-native-rejected' && event.reason === 'load-format'), JSON.stringify(events));
    assert.equal(events.filter((event) => event.event === 'preamble-build').length, 1);
    assert.equal(has(events, 'preamble-fallback'), false);
    equalAst(await input.cold(), recovered);
  }));

  test('clear waits for recovery publication and preserves user files and persistent lock inodes', () => fixture(async (input) => {
    await input.run(); input.take();
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    const identity = await rejectNativeProof(input.pchDirectory);
    const lock = path.join(input.pchDirectory, identity + '.lock');
    const inode = (await stat(lock)).ino;
    const userFile = path.join(input.pchDirectory, 'notes.txt');
    await writeFile(userFile, 'keep');
    const clearing = Ref.makeUnsafe<Promise<boolean> | undefined>(undefined);
    const recovered = await input.run({ onEvent: (event) => {
      if (event.event === 'preamble-native-rejected') Effect.runSync(Ref.set(clearing, clearPchStorage(input.pchDirectory, executable)));
    } });
    const pending = Effect.runSync(Ref.get(clearing));
    assert.ok(pending); await pending;
    assert.equal((await pchStorageStats(input.pchDirectory)).entries, 0);
    assert.equal(await readFile(userFile, 'utf8'), 'keep');
    assert.equal((await stat(lock)).ino, inode);
    equalAst(await input.cold(), recovered);
  }));

  test('timeout during the one recovery build reaps worker, temporary directory and advisory lock', () => fixture(async (input) => {
    const wrapper = path.join(input.directory, 'recovery-timeout.py');
    const nativePid = path.join(input.directory, 'native-pid');
    const fault = path.join(input.directory, 'fault');
    await writeFile(wrapper, `#!/usr/bin/python3
import functools, json, os, signal, subprocess, sys, time
native = ${JSON.stringify(executable)}
if '--preamble-worker' not in sys.argv:
    os.execv(native, [native] + sys.argv[1:])
child = subprocess.Popen([native] + sys.argv[1:], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
with open(${JSON.stringify(nativePid)}, 'w') as pid:
    pid.write(str(child.pid))
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
def request(line):
    operation = json.loads(line) if line.startswith('{') else {'operation': line.strip()}
    if os.path.exists(${JSON.stringify(fault)}) and operation['operation'] == 'build':
        time.sleep(30)
    child.stdin.write(line.encode()); child.stdin.flush()
    response = b''.join(iter(lambda: child.stdout.read(1) or sys.exit(1), b'\\x1e')) + b'\\x1e'
    sys.stdout.buffer.write(response); sys.stdout.buffer.flush()
try:
    functools.reduce(lambda _, line: request(line), sys.stdin, None)
finally:
    child.terminate(); child.wait()
`);
    await chmod(wrapper, 0o700);
    await input.run({ executable: wrapper }); input.take();
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    await rejectNativeProof(input.pchDirectory);
    await writeFile(fault, 'timeout');
    const pool = makePreamblePool(300000, 1000);
    try {
      const recovered = await input.run({ pool, executable: wrapper });
      const events = input.take();
      assert.equal(events.filter((event) => event.event === 'preamble-recovery').length, 1, JSON.stringify(events));
      assert.ok(events.some((event) => event.event === 'preamble-fallback' && event.kind === 'NativeFailure' && /timed out/.test(String(event.reason))));
      const pid = events.find((event) => event.event === 'native-start')!.pid as number;
      assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
      const actualNativePid = Number(await readFile(nativePid, 'utf8'));
      assert.throws(() => process.kill(actualNativePid, 0), { code: 'ESRCH' });
      assert.equal((await readdir(input.pchDirectory)).some((name) => name.startsWith('stage-')), false);
      equalAst(await input.cold(), recovered);
      await rm(fault);
      await input.run({ pool, executable: wrapper });
      assert.ok(has(input.take(), 'preamble-build'), 'Lock released after timeout');
    } finally { await Effect.runPromise(disposePreamblePool(pool)); }
  }));

  test('dependency changes after recovery admission still prevent publication', () => fixture(async (input) => {
    await input.run(); input.take(); await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    await rejectNativeProof(input.pchDirectory);
    const recovered = await input.run({ onEvent: (event) => {
      if (event.event === 'preamble-recovery') writeFileSync(input.transitive, '#define VALUE 9\n');
    } });
    const events = input.take();
    assert.ok(has(events, 'preamble-fallback'));
    assert.equal(has(events, 'preamble-disk-write'), false);
    assert.equal((await pchStorageStats(input.pchDirectory)).entries, 0);
    equalAst(await input.cold(), recovered);
  }));

  test('valid SSD artifacts take priority over suppression in the same namespace', () => fixture(async (input) => {
    const stable = path.join(input.directory, 'stable.cpp');
    await writeFile(path.join(input.directory, 'stable.h'), '#define VALUE 7\nstruct State { int value; };\n');
    await writeFile(stable, '#include "stable.h"\nvoid f(State &s) { s.value = VALUE; s.value++; }\n');
    await input.run({ source: stable }); input.take();
    await input.run(); input.take();
    await writeFile(input.transitive, '#define VALUE 2\n');
    await input.run({ source: input.alternate }); input.take();
    await writeFile(input.transitive, '#define VALUE 3\n');
    await input.run(); assert.ok(has(input.take(), 'preamble-policy-skip'));
    const loaded = await input.run({ source: stable });
    expectLoad(input.take()); equalAst(await input.cold(stable), loaded);
  }));

  test('Native identity rejection recovers only when fresh request observations remain stable', () => fixture(async (input) => {
    await input.run(); input.take(); await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    const filename = (await readdir(input.pchDirectory)).find((name) => name.endsWith('.json'))!;
    const metadata = path.join(input.pchDirectory, filename);
    const manifest = JSON.parse(await readFile(metadata, 'utf8'));
    await writeFile(metadata, JSON.stringify({ ...manifest, invocationHash: '0'.repeat(64) }));
    assert.ok(await readPchEntry(input.pchDirectory, manifest.identity));
    const recovered = await input.run();
    const recoveredEvents = input.take();
    assert.ok(recoveredEvents.some((event) => event.event === 'preamble-native-rejected' && event.kind === 'InputsChanged'));
    assert.ok(has(recoveredEvents, 'preamble-recovery'));
    equalAst(await input.cold(), recovered);
    await clearPreamblePool(input.pool).pipe(Effect.runPromise);
    const changed = await input.run({ onEvent: (event) => {
      if (event.event === 'preamble-load-attempt') writeFileSync(input.source, '#define CHANGED_PREFIX 1\n' + sourceText);
    } });
    const events = input.take();
    assert.ok(events.some((event) => event.event === 'preamble-native-rejected' && event.kind === 'InputsChanged'));
    assert.equal(has(events, 'preamble-recovery'), false);
    assert.equal(has(events, 'preamble-disk-write'), false);
    assert.ok(has(events, 'preamble-fallback'));
    equalAst(await input.cold(), changed);
    assert.ok(await readPchEntry(input.pchDirectory, manifest.identity), 'Changed request must preserve the valid old-prefix artifact');
  }));

  test('switches files and reloads the first artifact without rebuilding after a body edit', () => fixture(async (input) => {
    await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    const artifacts = await readdir(input.pchDirectory);
    assert.ok(artifacts.some((name) => name.endsWith('.pch')), JSON.stringify(artifacts));
    await input.run({ source: input.alternate });
    assert.ok(has(input.take(), 'preamble-build'));
    await writeFile(input.source, sourceText.replace('s.value++;', 's.value += 2; s.value++;'));
    const restored = await input.run();
    expectLoad(input.take());
    await compareQueries(input.source, await input.cold(), restored);
    assert.ok((await readdir(input.pchDirectory)).filter((name) => name.endsWith('.pch')).length >= 2);
  }));

  test('a new native process loads a persistent artifact with complete merged body dependencies', () => fixture(async (input) => {
    await writeFile(path.join(input.directory, 'body.h'), '#define BODY 4\n');
    await input.run();
    const built = input.take();
    const pid = built.find((event) => event.event === 'native-start')?.pid;
    assert.equal(typeof pid, 'number');
    await Effect.runPromise(disposePreamblePool(input.pool));
    assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
    const restarted = makePreamblePool();
    try {
      await writeFile(input.source, sourceText.replace('s.value++;', '\n#include "body.h"\ns.value += BODY; s.value++;'));
      const restored = await input.run({ pool: restarted });
      const events = input.take();
      expectLoad(events);
      assert.notEqual(events.find((event) => event.event === 'native-start')?.pid, pid);
      assert.ok(restored.dependencies.paths.some((file) => file.path === input.transitive));
      assert.ok(restored.dependencies.paths.some((file) => file.path === path.join(input.directory, 'body.h')));
      await compareQueries(input.source, await input.cold(), restored);
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('the complete AST dependency proof survives removal of the native temporary PCH', () => fixture(async (input) => {
    const extracted = await input.run();
    input.take();
    await Effect.runPromise(disposePreamblePool(input.pool));
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), true);
    assert.equal(extracted.dependencies.paths.some((file) => /stage-[a-f0-9-]+\/preamble-[a-f0-9]+\.pch$/.test(file.path)), false);
  }));

  test('restores a PCH built with large recursive headers that Clang can memory-map', () => fixture(async (input) => {
    await writeFile(input.transitive, '#define VALUE 1\n' + '// force a large Clang header input buffer\n'.repeat(8192));
    const initial = await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    assert.ok(initial.dependencies.paths.some((file) => file.path === input.transitive));
    await Effect.runPromise(disposePreamblePool(input.pool));
    const restarted = makePreamblePool();
    try {
      const restored = await input.run({ pool: restarted });
      expectLoad(input.take());
      await compareQueries(input.source, await input.cold(), restored);
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('same-size recursive header modification with restored mtime rejects a disk artifact', () => fixture(async (input) => {
    await input.run(); input.take();
    await Effect.runPromise(disposePreamblePool(input.pool));
    const metadata = await stat(input.transitive);
    await writeFile(input.transitive, '#define VALUE 2\n');
    await utimes(input.transitive, metadata.atime, metadata.mtime);
    const restarted = makePreamblePool();
    try {
      const changed = await input.run({ pool: restarted });
      expectRebuild(input.take());
      await compareQueries(input.source, await input.cold(), changed);
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('prefix, macros, compile flags and new include candidates cannot restore the old artifact', () => fixture(async (input) => {
    await input.run(); input.take();
    await writeFile(input.source, '#define PREFIX 2\n' + sourceText);
    await input.run(); expectRebuild(input.take());
    await [
      { ...input.command, args: ['-DVALUE=3', ...input.command.args] },
      { ...input.command, args: input.command.args.map((arg) => arg === '-std=c++17' ? '-std=c++20' : arg) }
    ].reduce(async (previous, command) => {
      await previous;
      const changed = await input.run({ command });
      expectRebuild(input.take());
      await compareQueries(input.source, await input.cold(input.source, command), changed);
    }, Promise.resolve());
    await input.run(); input.take();
    await writeFile(path.join(input.directory, 'optional.h'), '#define OPTIONAL 1\n');
    const changed = await input.run();
    expectRebuild(input.take());
    await compareQueries(input.source, await input.cold(), changed);
  }));

  test('truncated PCH and incomplete metadata recover automatically', () => fixture(async (input) => {
    await input.run(); input.take();
    await Effect.runPromise(disposePreamblePool(input.pool));
    const artifacts = await readdir(input.pchDirectory);
    const pch = artifacts.find((name) => name.endsWith('.pch'));
    assert.ok(pch);
    await writeFile(path.join(input.pchDirectory, pch), 'truncated');
    const restarted = makePreamblePool();
    try {
      const recovered = await input.run({ pool: restarted });
      expectRebuild(input.take());
      await compareQueries(input.source, await input.cold(), recovered);
      await Effect.runPromise(disposePreamblePool(restarted));
      const metadata = (await readdir(input.pchDirectory)).find((name) => name.endsWith('.json'));
      assert.ok(metadata);
      await writeFile(path.join(input.pchDirectory, metadata), '{"incomplete":true}');
      const again = makePreamblePool();
      try {
        const recovered = await input.run({ pool: again });
        expectRebuild(input.take());
        await compareQueries(input.source, await input.cold(), recovered);
      } finally { await Effect.runPromise(disposePreamblePool(again)); }
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('damaging the native temporary PCH after build cannot affect parsing or publish damaged bytes', () => fixture(async (input) => {
    const extracted = await input.run({ onEvent: (event) => {
      if (event.event !== 'preamble-build') return;
      const staging = readdirSync(input.pchDirectory).find((name) => name.startsWith('stage-'));
      assert.ok(staging);
      const stagingDirectory = path.join(input.pchDirectory, staging);
      const pch = readdirSync(stagingDirectory).find((name) => /^preamble-[a-f0-9]+\.pch$/.test(name));
      assert.ok(pch);
      writeFileSync(path.join(stagingDirectory, pch), 'damaged after native build');
    } });
    const events = input.take();
    assert.ok(has(events, 'preamble-build'));
    assert.ok(events.some((event) => event.event === 'preamble-disk-write' && event.written === false), JSON.stringify(events));
    assert.equal((await readdir(input.pchDirectory)).some((name) => name.endsWith('.json') || name.endsWith('.pch')), false);
    await compareQueries(input.source, await input.cold(), extracted);
    await Effect.runPromise(disposePreamblePool(input.pool));
    const restarted = makePreamblePool();
    try {
      const recovered = await input.run({ pool: restarted });
      assert.ok(has(input.take(), 'preamble-build'));
      await compareQueries(input.source, await input.cold(), recovered);
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('independent pools coordinate construction of the same artifact', () => fixture(async (input) => {
    const other = makePreamblePool();
    try {
      const results = await Promise.all([input.run(), input.run({ pool: other })]);
      const events = input.take();
      assert.equal(events.filter((event) => event.event === 'preamble-build').length, 1, JSON.stringify(events));
      assert.ok(has(events, 'preamble-load'));
      const plain = await input.cold();
      await Promise.all(results.map((result) => compareQueries(input.source, plain, result)));
    } finally { await Effect.runPromise(disposePreamblePool(other)); }
  }));

  test('a PCH symlink is never followed or overwritten', () => fixture(async (input) => {
    await input.run(); input.take();
    await Effect.runPromise(disposePreamblePool(input.pool));
    const pch = (await readdir(input.pchDirectory)).find((name) => name.endsWith('.pch'));
    assert.ok(pch);
    const userFile = path.join(input.directory, 'user-data');
    await writeFile(userFile, 'user content must survive');
    await rm(path.join(input.pchDirectory, pch));
    await symlink(userFile, path.join(input.pchDirectory, pch));
    const restarted = makePreamblePool();
    try {
      const recovered = await input.run({ pool: restarted });
      await compareQueries(input.source, await input.cold(), recovered);
      assert.equal(await readFile(userFile, 'utf8'), 'user content must survive');
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('clearing removes owned PCH artifacts while preserving lock inodes and user files', () => fixture(async (input) => {
    await input.run(); input.take();
    const before = await pchStorageStats(input.pchDirectory);
    assert.equal(before.entries, 1);
    assert.ok(before.bytes > 0);
    await Effect.runPromise(disposePreamblePool(input.pool));
    const userFile = path.join(input.pchDirectory, 'notes.txt');
    await writeFile(userFile, 'retain user content');
    const lockNames = (await readdir(input.pchDirectory)).filter((name) => name.endsWith('.lock'));
    const locks = await Promise.all(lockNames.map(async (name) => ({ name, inode: (await stat(path.join(input.pchDirectory, name))).ino })));
    await clearPchStorage(input.pchDirectory, executable);
    assert.deepEqual(await pchStorageStats(input.pchDirectory), { entries: 0, bytes: 0 });
    assert.equal(await readFile(userFile, 'utf8'), 'retain user content');
    await Promise.all(locks.map(async (lock) => assert.equal((await stat(path.join(input.pchDirectory, lock.name))).ino, lock.inode)));
    const restarted = makePreamblePool();
    try {
      const rebuilt = await input.run({ pool: restarted });
      expectRebuild(input.take());
      await compareQueries(input.source, await input.cold(), rebuilt);
    } finally { await Effect.runPromise(disposePreamblePool(restarted)); }
  }));

  test('worker crash and idle expiry preserve valid artifacts for a fresh native process', () => fixture(async (input) => {
    const shortLived = makePreamblePool(30);
    try {
      await input.run({ pool: shortLived });
      const first = input.take();
      const pid = first.find((event) => event.event === 'native-start')?.pid;
      assert.equal(typeof pid, 'number');
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
      await input.run({ pool: shortLived });
      const restored = input.take();
      expectLoad(restored);
      const restoredPid = restored.find((event) => event.event === 'native-start')?.pid;
      assert.equal(typeof restoredPid, 'number');
      process.kill(restoredPid as number, 'SIGKILL');
      await Effect.runPromise(disposePreamblePool(shortLived));
      const recovered = await input.run();
      expectLoad(input.take());
      await compareQueries(input.source, await input.cold(), recovered);
    } finally { await Effect.runPromise(disposePreamblePool(shortLived)); }
  }));

  test('an unresponsive worker times out, is reaped and falls back to ordinary Clang parsing', () => fixture(async (input) => {
    const wrapper = path.join(input.directory, 'timeout-extractor.py');
    await writeFile(wrapper, '#!/usr/bin/python3\nimport os, sys, time\nif "--preamble-worker" in sys.argv:\n    time.sleep(30)\nelse:\n    os.execv(' + JSON.stringify(executable) + ', [' + JSON.stringify(executable) + '] + sys.argv[1:])\n');
    await chmod(wrapper, 0o700);
    const pool = makePreamblePool(300000, 50);
    const events = Ref.makeUnsafe<readonly Event[]>([]);
    try {
      const extracted = await Effect.runPromise(extractWithPreamble(pool, input.source, input.command, wrapper, 67108864,
        AbortSignal.timeout(30000), (event) => Effect.runSync(Ref.update(events, (events) => [...events, event])), input.pchDirectory));
      const observed = Effect.runSync(Ref.get(events));
      assert.ok(observed.some((event) => event.event === 'preamble-fallback' && /timed out/.test(String(event.reason))), JSON.stringify(observed));
      const pid = observed.find((event) => event.event === 'native-start' && event.worker)?.pid;
      assert.equal(typeof pid, 'number');
      assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
      assert.equal((await readdir(input.pchDirectory)).some((name) => name.startsWith('stage-')), false);
      await compareQueries(input.source, await input.cold(), extracted);
    } finally { await Effect.runPromise(disposePreamblePool(pool)); }
  }));

  test('cancellation after the native disk build removes its unpublished staging directory', () => fixture(async (input) => {
    const controller = new AbortController();
    await assert.rejects(input.run({ signal: controller.signal, onEvent: (event) => {
      if (event.event === 'preamble-build') controller.abort();
    } }));
    const events = input.take();
    assert.ok(has(events, 'preamble-build'));
    assert.equal(has(events, 'preamble-published'), false);
    const pid = events.find((event) => event.event === 'native-start')?.pid;
    assert.equal(typeof pid, 'number');
    assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
    const remaining = await readdir(input.pchDirectory);
    assert.equal(remaining.some((name) => name.startsWith('stage-') || name.endsWith('.json') || name.endsWith('.pch')), false, JSON.stringify(remaining));
    const recovered = await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    await compareQueries(input.source, await input.cold(), recovered);
  }));

  test('cancellation reaps its worker and leaves no published incomplete artifact', () => fixture(async (input) => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(input.run({ signal: controller.signal }));
    assert.equal(has(input.take(), 'preamble-published'), false);
    assert.deepEqual(await readdir(input.pchDirectory), []);
    const active = new AbortController();
    await assert.rejects(input.run({ signal: active.signal, onEvent: (event) => {
      if (event.event === 'native-start') active.abort();
    } }));
    const events = input.take();
    const pid = events.find((event) => event.event === 'native-start')?.pid;
    assert.equal(typeof pid, 'number');
    assert.throws(() => process.kill(pid as number, 0), { code: 'ESRCH' });
    assert.equal(has(events, 'preamble-published'), false);
    assert.equal((await readdir(input.pchDirectory)).some((name) => name.endsWith('.json') || name.endsWith('.pch')), false);
    const recovered = await input.run();
    assert.ok(has(input.take(), 'preamble-build'));
    await compareQueries(input.source, await input.cold(), recovered);
  }));
});
