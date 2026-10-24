import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { Effect, Ref, Schema, Semaphore } from 'effect';
import { prepareAst, type ClangNode } from './analysis';
import { buildIdentity, decodeNativeDependencies, fingerprintFile, reusableCommand, sha256,
  validateDependencies, verifyDependencies, type DependencyManifest } from './dependencies';
import { extractVerifiedAst } from './extraction';
import { makeExtractionCommand, type CompileCommand } from './services';

type Report = (event: Readonly<Record<string, unknown>>) => void;
type Connection = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly closed: Promise<void>;
  readonly diagnostics: Ref.Ref<string>;
};
type StagedWorker = { readonly _tag: 'Staged'; readonly identity: string; readonly connection: Connection };
type PublishedWorker = { readonly _tag: 'Published'; readonly identity: string; readonly connection: Connection;
  readonly prefixHash: string; readonly bounds: number; readonly dependencies: DependencyManifest;
  readonly idle: ReturnType<typeof setTimeout> };
type PoolState = { readonly closed: boolean; readonly worker?: StagedWorker | PublishedWorker };
export type PreamblePool = { readonly state: Ref.Ref<PoolState>; readonly permit: Semaphore.Semaphore; readonly idleMs: number };
export const makePreamblePool = (idleMs = 5 * 60 * 1000): PreamblePool => ({
  state: Ref.makeUnsafe<PoolState>({ closed: false }), permit: Semaphore.makeUnsafe(1), idleMs
});

const responseSchema = Schema.Struct({ ok: Schema.Boolean, ms: Schema.optional(Schema.Number),
  pchBytes: Schema.optional(Schema.Number), bounds: Schema.optional(Schema.Number),
  prefixHash: Schema.optional(Schema.String), sourceHash: Schema.optional(Schema.String),
  dependencies: Schema.optional(Schema.Unknown), ast: Schema.optional(Schema.Unknown) });
const decodeResponse = Schema.decodeUnknownSync(responseSchema);
const live = (connection: Connection) => connection.child.exitCode === null && connection.child.signalCode === null && !connection.child.killed;

const stop = async (connection: Connection): Promise<void> => {
  if (!live(connection)) { await connection.closed; return; }
  const deadline = setTimeout(() => connection.child.kill('SIGKILL'), 1000);
  connection.child.kill();
  try { await connection.closed; } finally { clearTimeout(deadline); }
};
const dropWorker = Effect.fnUntraced(function* (pool: PreamblePool) {
  const state = yield* Ref.get(pool.state);
  yield* Ref.set(pool.state, { closed: state.closed });
  if (state.worker?._tag === 'Published') clearTimeout(state.worker.idle);
  if (state.worker) yield* Effect.promise(() => stop(state.worker!.connection));
});
export const clearPreamblePool = (pool: PreamblePool) => pool.permit.withPermit(dropWorker(pool));
export const disposePreamblePool = Effect.fnUntraced(function* (pool: PreamblePool) {
  yield* Ref.update(pool.state, (state) => ({ ...state, closed: true }));
  yield* clearPreamblePool(pool);
});

const start = (command: CompileCommand, report: Report): Connection => {
  const child = spawn(command.compiler, ['--preamble-worker', ...command.args], {
    cwd: command.cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
  });
  const diagnostics = Ref.makeUnsafe('');
  const closed = new Promise<void>((resolve) => child.once('close', () => {
    process.removeListener('exit', onExit);
    report({ event: 'native-exit', pid: child.pid, code: child.exitCode, worker: true });
    resolve();
  }));
  const onExit = () => { child.kill(); };
  process.once('exit', onExit);
  // Always observe errors, including startup failures before an exchange.
  child.on('error', (error) => Effect.runSync(Ref.set(diagnostics, String(error))));
  child.stdin.on('error', (error) => Effect.runSync(Ref.set(diagnostics, String(error))));
  child.stderr.on('data', (chunk: Buffer) => Effect.runSync(Ref.update(diagnostics,
    (diagnostics) => (diagnostics + chunk.toString('utf8')).slice(-12000))));
  return { child, closed, diagnostics };
};

// A permit covers the entire request, verification and publication. Only one
// exchange can own stdout at a time. Cancellation kills and reaps the worker
// before releasing that permit, including while no stdout has arrived yet.
const exchange = (connection: Connection, operation: 'build' | 'parse', maxBytes: number,
  signal: AbortSignal): Effect.Effect<ReturnType<typeof decodeResponse>, Error> =>
  Effect.callback((resume) => {
    const state = Ref.makeUnsafe<{ readonly chunks: readonly Buffer[]; readonly bytes: number; readonly done: boolean }>({ chunks: [], bytes: 0, done: false });
    const finish = (result: Effect.Effect<ReturnType<typeof decodeResponse>, Error>) => {
      if (Effect.runSync(Ref.get(state)).done) return;
      Effect.runSync(Ref.update(state, (state) => ({ ...state, done: true })));
      cleanup();
      resume(result);
    };
    const fail = (message: string) => finish(Effect.fail(new Error(message + '\n' + Effect.runSync(Ref.get(connection.diagnostics)))));
    const data = (chunk: Buffer) => {
      const current = Effect.runSync(Ref.get(state));
      const bytes = current.bytes + chunk.length;
      if (bytes > maxBytes + 16 * 1024 * 1024) { fail('Preamble response exceeds byte limit'); return; }
      const separator = chunk.indexOf(0x1e);
      const chunks = [...current.chunks, separator < 0 ? chunk : chunk.subarray(0, separator)];
      Effect.runSync(Ref.set(state, { chunks, bytes, done: false }));
      if (separator < 0) return;
      if (separator !== chunk.length - 1) { fail('Unexpected data after preamble response'); return; }
      finish(Effect.try({ try: () => decodeResponse(JSON.parse(Buffer.concat(chunks).toString('utf8'))),
        catch: (error) => new Error('Invalid preamble response: ' + String(error)) }));
    };
    const close = () => fail('Preamble worker exited');
    const aborted = () => fail('Preamble request cancelled');
    const deadline = setTimeout(() => fail('Preamble worker timed out'), 120000);
    const cleanup = () => {
      clearTimeout(deadline);
      signal.removeEventListener('abort', aborted);
      connection.child.stdout.removeListener('data', data);
      connection.child.removeListener('close', close);
    };
    connection.child.stdout.on('data', data);
    connection.child.once('close', close);
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted || !live(connection)) fail('Preamble worker unavailable or request cancelled');
    else connection.child.stdin.write(operation + '\n');
    return Effect.sync(cleanup);
  });

const prefixMatches = async (source: string, worker: Pick<PublishedWorker, 'bounds' | 'prefixHash'>): Promise<boolean> => {
  const buffer = await readFile(source);
  return buffer.length >= worker.bounds && sha256(buffer.subarray(0, worker.bounds)) === worker.prefixHash;
};

const preambleExtraction = Effect.fnUntraced(function* (
  pool: PreamblePool, source: string, command: CompileCommand, executable: string,
  maxAstBytes: number, signal: AbortSignal, report: Report
) {
  if ((yield* Ref.get(pool.state)).closed || signal.aborted) return yield* Effect.fail(new Error('Preamble pool closed or request cancelled'));
  const state = yield* Ref.get(pool.state);
  const retained = state.worker;
  if (retained?._tag === 'Published') clearTimeout(retained.idle);
  const identity = yield* Effect.tryPromise({ try: () => buildIdentity(source, command, executable, {}), catch: (error) => new Error(String(error)) });
  const before = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
  const reusable = retained?._tag === 'Published' && retained.identity === identity && live(retained.connection) &&
    (yield* Effect.tryPromise({ try: () => prefixMatches(source, retained), catch: (error) => new Error(String(error)) })) &&
    (yield* validateDependencies(retained.dependencies));
  if (!reusable) yield* dropWorker(pool);
  const connection = yield* Effect.uninterruptible(Effect.gen(function* () {
    const connection = reusable ? retained.connection : yield* Effect.try({
      try: () => start(makeExtractionCommand(command, executable), report), catch: (error) => new Error(String(error))
    });
    yield* Ref.update(pool.state, (state) => ({ ...state, worker: { _tag: 'Staged' as const, connection, identity } }));
    return connection;
  }));
  report({ event: reusable ? 'native-active' : 'native-start', pid: connection.child.pid, worker: true });
  const proof = reusable ? retained : yield* Effect.gen(function* () {
    const built = yield* exchange(connection, 'build', maxAstBytes, signal);
    report({ event: 'preamble-build', pid: connection.child.pid, ms: built.ms, pchBytes: built.pchBytes });
    if (!built.ok || !built.bounds || !built.prefixHash || built.sourceHash !== before.sha256 ||
        !built.dependencies || (built.pchBytes ?? 0) > 256 * 1024 * 1024) {
      return yield* Effect.fail(new Error('Preamble construction unavailable'));
    }
    const native = yield* Effect.try({ try: () => decodeNativeDependencies(built.dependencies), catch: (error) => new Error(String(error)) });
    if (native.runtime.length === 0 || !native.paths.some((file) => file.sha256 !== '')) {
      return yield* Effect.fail(new Error('Incomplete preamble dependency proof'));
    }
    // Self-inclusion can make the full main file a genuine header dependency.
    // Do not erase that dependency merely to permit body edits.
    if (native.paths.some((file) => file.path === source || file.real === before.real)) return yield* Effect.fail(new Error('Preamble includes its own source'));
    const dependencies = yield* verifyDependencies(native);
    if (!dependencies?.reusable) return yield* Effect.fail(new Error('Preamble dependency proof unavailable'));
    const prefix = { prefixHash: built.prefixHash, bounds: built.bounds, dependencies };
    return prefix;
  });
  const prefixWorker = { ...proof, _tag: 'Published' as const, identity, connection };
  // Validate independently before CanReuse, including a newly built artifact.
  if (!(yield* Effect.tryPromise({ try: () => prefixMatches(source, prefixWorker), catch: (error) => new Error(String(error)) })) ||
      !(yield* validateDependencies(proof.dependencies))) return yield* Effect.fail(new Error('Preamble inputs changed'));
  const parsed = yield* exchange(connection, 'parse', maxAstBytes, signal);
  if (!parsed.ok || !parsed.ast || !parsed.dependencies) return yield* Effect.fail(new Error('Preamble parse rejected'));
  const native = yield* Effect.try({ try: () => decodeNativeDependencies(parsed.dependencies), catch: (error) => new Error(String(error)) });
  if (native.runtime.length === 0 || !native.paths.some((file) => file.path === source && file.sha256 === before.sha256)) {
    return yield* Effect.fail(new Error('Incomplete AST dependency proof'));
  }
  const dependencies = yield* verifyDependencies(native);
  const after = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
  const afterIdentity = yield* Effect.tryPromise({ try: () => buildIdentity(source, command, executable, {}), catch: (error) => new Error(String(error)) });
  if (!dependencies?.reusable || before.real !== after.real || before.sha256 !== after.sha256 || identity !== afterIdentity || signal.aborted) {
    return yield* Effect.fail(new Error('Preamble inputs changed during analysis'));
  }
  const astText = JSON.stringify(parsed.ast);
  if (Buffer.byteLength(astText) > maxAstBytes) return yield* Effect.fail(new Error('Preamble AST exceeds byte limit'));
  const prepared = yield* Effect.try({ try: () => prepareAst(parsed.ast as ClangNode), catch: (error) => new Error(String(error)) });
  // Logical atomic publication: the permit excludes all consumers until both
  // proofs and the extracted AST have passed validation. There is no disk PCH.
  const idle = setTimeout(() => { void stop(connection); }, pool.idleMs);
  idle.unref();
  yield* Ref.set(pool.state, { closed: (yield* Ref.get(pool.state)).closed, worker: { ...prefixWorker, idle } });
  if (!reusable) report({ event: 'preamble-published', pid: connection.child.pid });
  report({ event: reusable ? 'preamble-reuse' : 'preamble-parse', pid: connection.child.pid, ms: parsed.ms, pchBytes: parsed.pchBytes });
  report({ event: 'native-idle', pid: connection.child.pid, worker: true });
  return { prepared, astText, astBytes: Buffer.byteLength(astText), dependencies, cacheable: true };
});

export const extractWithPreamble = Effect.fnUntraced(function* (
  pool: PreamblePool, source: string, command: CompileCommand, executable: string,
  maxAstBytes: number, signal: AbortSignal, report: Report = () => {}
) {
  if (signal.aborted || (yield* Ref.get(pool.state)).closed) return yield* Effect.fail(new Error('Analysis cancelled or preamble pool closed'));
  return yield* pool.permit.withPermit(Effect.gen(function* () {
    if (signal.aborted || (yield* Ref.get(pool.state)).closed) return yield* Effect.fail(new Error('Analysis cancelled or preamble pool closed'));
    const unsupported = process.platform !== 'linux' || !reusableCommand(command) ||
      !/\.(h|hh|hpp|hxx|cc|cpp|cxx|c\+\+)$/i.test(source) ||
      command.args.some((arg, index) => /^(--cuda|-arch|-fopenmp|-fsycl)/.test(arg) ||
        arg.startsWith('-x') && arg !== '-x' && !['-xc++', '-xc++-header'].includes(arg) ||
        arg === '-x' && !['c++', 'c++-header'].includes(command.args[index + 1] ?? ''));
    if (unsupported) {
      yield* dropWorker(pool);
      report({ event: 'preamble-fallback', reason: 'Unsupported compilation context' });
      return yield* extractVerifiedAst(source, command, executable, maxAstBytes, signal, report);
    }
    const extracted = yield* preambleExtraction(pool, source, command, executable, maxAstBytes, signal, report).pipe(
      Effect.onError(() => dropWorker(pool)),
      Effect.catch((error) => Effect.gen(function* () {
        report({ event: 'preamble-fallback', reason: error.message });
        if (signal.aborted || (yield* Ref.get(pool.state)).closed) return yield* Effect.fail(error);
        return yield* extractVerifiedAst(source, command, executable, maxAstBytes, signal, report);
      }))
    );
    return extracted;
  }).pipe(Effect.onInterrupt(() => dropWorker(pool))));
});
