import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Effect, Ref, Schema, Semaphore } from 'effect';
import { prepareAst, type ClangNode } from './analysis';
import { buildIdentity, decodeNativeDependencies, fingerprintFile, reusableCommand, sha256,
  validateDependencies, verifyDependencies, type DependencyManifest } from './dependencies';
import { extractVerifiedAst } from './extraction';
import { makeExtractionCommand, type CompileCommand } from './services';
import { prunePchHistory, recordPchInvalidation, suppressPchBuild, resetPchHistory, type PchHistory } from './pch-policy';
import { preparePchStorage, inspectPchEntry, invalidatePchEntry, publishPchEntry, createPchStage, removePchStage } from './pch-storage';

type NativeFailure = { readonly _tag: 'NativeFailure'; readonly message: string };
type Report = (event: Readonly<Record<string, unknown>>) => void;
type Connection = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly closed: Promise<void>;
  readonly diagnostics: Ref.Ref<string>;
  readonly stage: Ref.Ref<string | undefined>;
};
type StagedWorker = { readonly _tag: 'Staged'; readonly identity: string; readonly connection: Connection };
type PublishedWorker = { readonly _tag: 'Published'; readonly identity: string; readonly connection: Connection;
  readonly artifactIdentity: string;
  readonly prefixHash: string; readonly bounds: number; readonly dependencies: DependencyManifest;
  readonly directory?: string;
  readonly idle: ReturnType<typeof setTimeout> };
type PoolState = { readonly closed: boolean; readonly worker?: StagedWorker | PublishedWorker };
export type PreamblePool = { readonly state: Ref.Ref<PoolState>; readonly permit: Semaphore.Semaphore;
  readonly idleMs: number; readonly requestTimeoutMs: number;
  readonly buildPolicy: 'adaptive' | 'eager'; readonly history: Ref.Ref<PchHistory> };
export const makePreamblePool = (idleMs = 5 * 60 * 1000, requestTimeoutMs = 120000,
  buildPolicy: 'adaptive' | 'eager' = 'adaptive'): PreamblePool => ({
  state: Ref.makeUnsafe<PoolState>({ closed: false }), permit: Semaphore.makeUnsafe(1), idleMs, requestTimeoutMs, buildPolicy, history: Ref.makeUnsafe<PchHistory>([])
});

const responseSchema = Schema.Struct({ ok: Schema.Boolean, ms: Schema.optional(Schema.Number),
  reason: Schema.optional(Schema.String),
  loadFailure: Schema.optional(Schema.Literals(['ArtifactRejected', 'InputsChanged'])),
  pchBytes: Schema.optional(Schema.Number), bounds: Schema.optional(Schema.Number),
  prefixHash: Schema.optional(Schema.String), sourceHash: Schema.optional(Schema.String),
  endsAtStartOfLine: Schema.optional(Schema.Boolean), invocationHash: Schema.optional(Schema.String),
  pchPath: Schema.optional(Schema.String),
  pchHash: Schema.optional(Schema.String),
  dependencies: Schema.optional(Schema.Unknown), ast: Schema.optional(Schema.Unknown) });
const decodeResponse = Schema.decodeUnknownSync(responseSchema);
const live = (connection: Connection) => connection.child.exitCode === null && connection.child.signalCode === null && !connection.child.killed;

const stop = async (connection: Connection): Promise<void> => {
  try {
    if (!live(connection)) { await connection.closed; return; }
    const deadline = setTimeout(() => connection.child.kill('SIGKILL'), 1000);
    connection.child.kill();
    try { await connection.closed; } finally { clearTimeout(deadline); }
  } finally {
    const stage = Effect.runSync(Ref.getAndSet(connection.stage, undefined));
    if (stage) await removePchStage(stage);
  }
};
const dropWorker = Effect.fnUntraced(function* (pool: PreamblePool) {
  const state = yield* Ref.get(pool.state);
  yield* Ref.set(pool.state, { closed: state.closed });
  if (state.worker?._tag === 'Published') clearTimeout(state.worker.idle);
  if (state.worker) yield* Effect.promise(() => stop(state.worker!.connection));
});
export const clearPreamblePool = (pool: PreamblePool) => pool.permit.withPermit(Effect.gen(function* () {
  yield* dropWorker(pool);
  yield* Ref.set(pool.history, []);
}));
export const disposePreamblePool = Effect.fnUntraced(function* (pool: PreamblePool) {
  yield* Ref.update(pool.state, (state) => ({ ...state, closed: true }));
  yield* clearPreamblePool(pool);
});

const start = (command: CompileCommand, report: Report): Connection => {
  const child = spawn(command.compiler, ['--preamble-worker', ...command.args], {
    cwd: command.cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
  });
  const diagnostics = Ref.makeUnsafe('');
  const stage = Ref.makeUnsafe<string | undefined>(undefined);
  const closed = new Promise<void>((resolve) => child.once('close', () => {
    process.removeListener('exit', onExit);
    report({ event: 'native-exit', pid: child.pid, code: child.exitCode, worker: true });
    const staged = Effect.runSync(Ref.getAndSet(stage, undefined));
    if (staged) void removePchStage(staged).finally(resolve);
    else resolve();
  }));
  const onExit = () => { child.kill(); };
  process.once('exit', onExit);
  // Always observe errors, including startup failures before an exchange.
  child.on('error', (error) => Effect.runSync(Ref.set(diagnostics, String(error))));
  child.stdin.on('error', (error) => Effect.runSync(Ref.set(diagnostics, String(error))));
  child.stderr.on('data', (chunk: Buffer) => Effect.runSync(Ref.update(diagnostics,
    (diagnostics) => (diagnostics + chunk.toString('utf8')).slice(-12000))));
  return { child, closed, diagnostics, stage };
};

// A permit covers the entire request, verification and publication. Only one
// exchange can own stdout at a time. Cancellation kills and reaps the worker
// before releasing that permit, including while no stdout has arrived yet.
const exchange = (connection: Connection, operation: 'build' | 'parse' | Readonly<Record<string, unknown>>, maxBytes: number,
  signal: AbortSignal, requestTimeoutMs: number): Effect.Effect<ReturnType<typeof decodeResponse>, NativeFailure> =>
  Effect.callback((resume) => {
    const state = Ref.makeUnsafe<{ readonly chunks: readonly Buffer[]; readonly bytes: number; readonly done: boolean }>({ chunks: [], bytes: 0, done: false });
    const finish = (result: Effect.Effect<ReturnType<typeof decodeResponse>, NativeFailure>) => {
      if (Effect.runSync(Ref.get(state)).done) return;
      Effect.runSync(Ref.update(state, (state) => ({ ...state, done: true })));
      cleanup();
      resume(result);
    };
    const fail = (message: string) => finish(Effect.fail({ _tag: 'NativeFailure', message: message + '\n' + Effect.runSync(Ref.get(connection.diagnostics)) }));
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
        catch: (error): NativeFailure => ({ _tag: 'NativeFailure', message: 'Invalid preamble response: ' + String(error) }) }));
    };
    const close = () => fail('Preamble worker exited');
    const communication = (error: Error) => fail('Preamble communication failed: ' + error.message);
    const aborted = () => fail('Preamble request cancelled');
    const deadline = setTimeout(() => fail('Preamble worker timed out'), requestTimeoutMs);
    const cleanup = () => {
      clearTimeout(deadline);
      signal.removeEventListener('abort', aborted);
      connection.child.stdout.removeListener('data', data);
      connection.child.removeListener('close', close);
      connection.child.removeListener('error', communication);
      connection.child.stdin.removeListener('error', communication);
      connection.child.stdout.removeListener('error', communication);
    };
    connection.child.stdout.on('data', data);
    connection.child.once('close', close);
    connection.child.once('error', communication);
    connection.child.stdin.once('error', communication);
    connection.child.stdout.once('error', communication);
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted || !live(connection)) fail('Preamble worker unavailable or request cancelled');
    else connection.child.stdin.write((typeof operation === 'string' ? operation : JSON.stringify(operation)) + '\n');
    return Effect.sync(cleanup);
  });

const prefixMatches = async (source: string, worker: Pick<PublishedWorker, 'bounds' | 'prefixHash'>): Promise<boolean> => {
  const buffer = await readFile(source);
  return buffer.length >= worker.bounds && sha256(buffer.subarray(0, worker.bounds)) === worker.prefixHash;
};

const preambleExtraction = Effect.fnUntraced(function* (
  pool: PreamblePool, source: string, command: CompileCommand, executable: string,
  maxAstBytes: number, signal: AbortSignal, report: Report, directory: string | undefined, intent: 'foreground' | 'prewarm'
) {
  if ((yield* Ref.get(pool.state)).closed || signal.aborted) return yield* Effect.fail(new Error('Preamble pool closed or request cancelled'));
  const state = yield* Ref.get(pool.state);
  const retained = state.worker;
  if (retained?._tag === 'Published') clearTimeout(retained.idle);
  const identity = yield* Effect.tryPromise({ try: () => buildIdentity(source, command, executable, {}), catch: (error) => new Error(String(error)) });
  const before = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
  yield* Ref.update(pool.history, (history) => prunePchHistory(history, performance.now()));
  // Even on a file switch, this is direct evidence that the last prefix was
  // invalidated before it could be reused. Body edits are absent from this proof.
  const retainedDependenciesValid = retained?._tag === 'Published' && live(retained.connection)
    ? yield* validateDependencies(retained.dependencies) : true;
  if (retained?._tag === 'Published' && !retainedDependenciesValid && retained.directory) {
    yield* Ref.update(pool.history, (history) => recordPchInvalidation(history, retained.directory!, retained.artifactIdentity, performance.now()));
    report({ event: 'preamble-invalidated', kind: 'DependenciesChanged', identity: retained.artifactIdentity, observed: 'active-worker' });
  }
  const reusable = retained?._tag === 'Published' && retained.identity === identity && retained.directory === directory && live(retained.connection) &&
    retainedDependenciesValid && (yield* Effect.tryPromise({ try: () => prefixMatches(source, retained), catch: (error) => new Error(String(error)) }));
  if (!reusable) yield* dropWorker(pool);
  const connection = yield* Effect.uninterruptible(Effect.gen(function* () {
    const connection = reusable ? retained.connection : yield* Effect.try({
      try: () => start(makeExtractionCommand(command, executable), report), catch: (error) => new Error(String(error))
    });
    yield* Ref.update(pool.state, (state) => ({ ...state, worker: { _tag: 'Staged' as const, connection, identity } }));
    return connection;
  }));
  report({ event: reusable ? 'native-active' : 'native-start', pid: connection.child.pid, worker: true });
  const storage = !reusable && directory ? yield* Effect.promise(() => preparePchStorage(directory)) : undefined;
  // Ask Clang for the exact prefix boundary and effective cc1 environment.
  // Full-source hashes only guard this request; they never key a PCH artifact.
  const description = storage ? yield* exchange(connection, { operation: 'describe' }, maxAstBytes, signal, pool.requestTimeoutMs) : undefined;
  if (description && (!description.ok || !description.bounds || !description.prefixHash || !description.invocationHash ||
      description.endsAtStartOfLine === undefined || description.sourceHash !== before.sha256)) {
    return yield* Effect.fail(new Error('PCH identity unavailable'));
  }
  const artifactIdentity = description ? sha256(JSON.stringify({ identity, prefixHash: description.prefixHash,
    bounds: description.bounds, endsAtStartOfLine: description.endsAtStartOfLine, invocationHash: description.invocationHash }))
    : reusable ? retained.artifactIdentity : identity;
  if (storage) {
    const locked = yield* exchange(connection, { operation: 'lock', lockPath: path.join(storage, artifactIdentity + '.lock') }, maxAstBytes, signal, pool.requestTimeoutMs);
    if (!locked.ok) return yield* Effect.fail(new Error('PCH build lock unavailable'));
  }
  const lookup = storage ? yield* Effect.promise(() => inspectPchEntry(storage, artifactIdentity)) : undefined;
  const diskEntry = lookup?._tag === 'Verified' ? lookup.entry : undefined;
  const diskPrefixValid = diskEntry && (yield* Effect.tryPromise({ try: () => prefixMatches(source, diskEntry), catch: (error) => new Error(String(error)) }));
  const diskDependenciesValid = diskEntry && (yield* validateDependencies(diskEntry.dependencies));
  const loadable = diskEntry && diskPrefixValid && diskDependenciesValid;
  if (diskEntry && !loadable) {
    report({ event: 'preamble-invalidated', kind: diskPrefixValid ? 'DependenciesChanged' : 'PrefixChanged', identity: artifactIdentity });
    if (!diskDependenciesValid && storage) yield* Ref.update(pool.history,
      (history) => recordPchInvalidation(history, storage, artifactIdentity, performance.now()));
    if (storage && lookup?._tag === 'Verified') yield* Effect.promise(() => invalidatePchEntry(storage, lookup));
  }
  if (lookup?._tag === 'Miss') report({ event: 'preamble-miss', kind: 'Absent', identity: artifactIdentity });
  if (lookup?._tag === 'Invalid') report({ event: 'preamble-invalidated', kind: 'HostRejected', reason: lookup.reason, identity: artifactIdentity });
  // Valid artifacts always take precedence. Only construction is suppressed;
  // ordinary extraction is an intentional policy result, not a Native failure.
  if (!reusable && !loadable && storage && intent === 'foreground' && pool.buildPolicy === 'adaptive' &&
      suppressPchBuild(yield* Ref.get(pool.history), storage, performance.now())) {
    report({ event: 'preamble-policy-skip', reason: 'Repeated dependency invalidations', identity: artifactIdentity });
    yield* dropWorker(pool); // Reap the lock owner before starting ordinary Clang.
    return { _tag: 'PolicySkip' as const };
  }
  const restored = loadable ? yield* Effect.gen(function* () {
    report({ event: 'preamble-load-attempt', pid: connection.child.pid, identity: artifactIdentity });
    const loaded = yield* exchange(connection, { operation: 'load', pchPath: diskEntry.pchPath, pchHash: diskEntry.pchHash,
      bounds: diskEntry.bounds, endsAtStartOfLine: diskEntry.endsAtStartOfLine, prefixHash: diskEntry.prefixHash,
      invocationHash: diskEntry.invocationHash, dependencies: diskEntry.nativeDependencies }, maxAstBytes, signal, pool.requestTimeoutMs);
    if (!loaded.ok) {
      report({ event: 'preamble-native-rejected', kind: loaded.loadFailure ?? 'Unclassified', reason: loaded.reason, identity: artifactIdentity });
      if (!loaded.loadFailure || !storage || lookup?._tag !== 'Verified') {
        return yield* Effect.fail(new Error('SSD PCH load rejection unclassified'));
      }
      const invalidated = loaded.loadFailure === 'ArtifactRejected'
        ? yield* Effect.promise(() => invalidatePchEntry(storage, lookup)) : undefined;
      if (invalidated !== undefined) report({ event: 'preamble-artifact-invalidated', identity: artifactIdentity, invalidated });
      // A positive response alone does not authorize reuse of the old request.
      // Reobserve the full source, host context, exact cc1 identity and old
      // dependency proof. A changed input takes the ordinary verified path.
      const current = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
      const currentIdentity = yield* Effect.tryPromise({ try: () => buildIdentity(source, command, executable, {}), catch: (error) => new Error(String(error)) });
      if (!live(connection) || signal.aborted) return yield* Effect.fail({ _tag: 'NativeFailure' as const, message: 'PCH recovery worker unavailable or request cancelled' });
      if (invalidated === false) return yield* Effect.fail(new Error('PCH recovery artifact replaced'));
      if (current.real !== before.real || current.sha256 !== before.sha256 || currentIdentity !== identity ||
          !(yield* validateDependencies(diskEntry.dependencies))) {
        return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'PCH recovery inputs changed' });
      }
      const currentDescription = yield* exchange(connection, { operation: 'describe' }, maxAstBytes, signal, pool.requestTimeoutMs);
      if (!currentDescription.ok || currentDescription.sourceHash !== before.sha256 || currentDescription.bounds !== description?.bounds ||
          currentDescription.prefixHash !== description?.prefixHash || currentDescription.invocationHash !== description?.invocationHash ||
          currentDescription.endsAtStartOfLine !== description?.endsAtStartOfLine) {
        return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'PCH recovery compilation context changed' });
      }
      if (loaded.loadFailure === 'InputsChanged') {
        // Stable fresh observations establish that the stored identity proof,
        // rather than this request's input, was inconsistent with Clang.
        const invalidated = yield* Effect.promise(() => invalidatePchEntry(storage, lookup));
        report({ event: 'preamble-artifact-invalidated', identity: artifactIdentity, invalidated });
        if (!invalidated) return yield* Effect.fail(new Error('PCH recovery artifact replaced'));
      }
      report({ event: 'preamble-recovery', action: 'rebuild-once', identity: artifactIdentity });
      return { _tag: 'RecoveryNeeded' as const, dependencies: diskEntry.dependencies };
    }
    const native = yield* Effect.try({ try: () => decodeNativeDependencies(loaded.dependencies), catch: (error) => new Error(String(error)) });
    if (!(yield* verifyDependencies(native))?.reusable || !(yield* validateDependencies(diskEntry.dependencies))) {
      return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'SSD PCH dependency proof changed during load' });
    }
    report({ event: 'preamble-load', pid: connection.child.pid, ms: loaded.ms, pchBytes: loaded.pchBytes, identity: artifactIdentity });
    return { ...diskEntry, _tag: 'Loaded' as const };
  }) : { _tag: 'BuildNeeded' as const };
  const proof = reusable ? retained : restored._tag === 'Loaded' ? restored : yield* Effect.gen(function* () {
    if (restored._tag === 'RecoveryNeeded' && !(yield* validateDependencies(restored.dependencies))) {
      return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'PCH recovery dependencies changed before construction' });
    }
    const stage = storage ? yield* Effect.uninterruptible(Effect.promise(async () => {
      const stage = await createPchStage(storage);
      Effect.runSync(Ref.set(connection.stage, stage));
      return stage;
    })) : undefined;
    if (storage && !stage) return yield* Effect.fail(new Error('PCH staging unavailable'));
    const built = yield* exchange(connection, stage ? { operation: 'build', storagePath: stage } : 'build', maxAstBytes, signal, pool.requestTimeoutMs);
    report({ event: 'preamble-build', pid: connection.child.pid, ms: built.ms, pchBytes: built.pchBytes, identity: artifactIdentity });
    if (!built.ok || !built.bounds || !built.prefixHash || !built.sourceHash ||
        !built.dependencies || (built.pchBytes ?? 0) > 256 * 1024 * 1024) {
      return yield* Effect.fail(new Error('Preamble construction unavailable'));
    }
    if (built.sourceHash !== before.sha256) return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'Source changed during PCH construction' });
    if (description && (built.bounds !== description.bounds || built.prefixHash !== description.prefixHash ||
        built.endsAtStartOfLine !== description.endsAtStartOfLine || built.invocationHash !== description.invocationHash)) {
      return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'PCH identity changed during construction' });
    }
    if (storage && (!built.pchPath || !built.pchHash || !/^[a-f0-9]{64}$/.test(built.pchHash))) {
      return yield* Effect.fail(new Error('PCH artifact integrity proof unavailable'));
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
    const publication = storage && built.pchPath && built.pchHash && built.invocationHash && built.endsAtStartOfLine !== undefined
      ? { stagedPchPath: built.pchPath, pchHash: built.pchHash, entry: { identity: artifactIdentity, prefixHash: built.prefixHash, bounds: built.bounds,
          endsAtStartOfLine: built.endsAtStartOfLine, invocationHash: built.invocationHash,
          dependencies, nativeDependencies: native } } : undefined;
    const prefix = { _tag: 'Built' as const, prefixHash: built.prefixHash, bounds: built.bounds, dependencies, publication };
    return restored._tag === 'RecoveryNeeded'
      ? { ...prefix, _tag: 'Recovered' as const, recoveryDependencies: restored.dependencies } : prefix;
  });
  const prefixWorker = { prefixHash: proof.prefixHash, bounds: proof.bounds, dependencies: proof.dependencies,
    _tag: 'Published' as const, identity, artifactIdentity, connection, directory };
  // Validate independently before CanReuse, including a newly built artifact.
  if (!(yield* Effect.tryPromise({ try: () => prefixMatches(source, prefixWorker), catch: (error) => new Error(String(error)) })) ||
      !(yield* validateDependencies(proof.dependencies))) return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'Preamble inputs changed' });
  const parsed = yield* exchange(connection, 'parse', maxAstBytes, signal, pool.requestTimeoutMs);
  if (!parsed.ok || !parsed.ast || !parsed.dependencies) return yield* Effect.fail(new Error('Preamble parse rejected'));
  const native = yield* Effect.try({ try: () => decodeNativeDependencies(parsed.dependencies), catch: (error) => new Error(String(error)) });
  if (native.runtime.length === 0 || !native.paths.some((file) => file.path === source && file.sha256 === before.sha256)) {
    return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'Incomplete AST dependency proof' });
  }
  const dependencies = yield* verifyDependencies(native);
  const after = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
  const afterIdentity = yield* Effect.tryPromise({ try: () => buildIdentity(source, command, executable, {}), catch: (error) => new Error(String(error)) });
  if (!dependencies?.reusable || !(yield* validateDependencies(proof.dependencies)) ||
      proof._tag === 'Recovered' && !(yield* validateDependencies(proof.recoveryDependencies)) || before.real !== after.real || before.sha256 !== after.sha256 || identity !== afterIdentity || signal.aborted) {
    return yield* Effect.fail({ _tag: 'InputsChanged' as const, message: 'Preamble inputs changed during analysis' });
  }
  const astText = JSON.stringify(parsed.ast);
  if (Buffer.byteLength(astText) > maxAstBytes) return yield* Effect.fail(new Error('Preamble AST exceeds byte limit'));
  const prepared = yield* Effect.try({ try: () => prepareAst(parsed.ast as ClangNode), catch: (error) => new Error(String(error)) });
  // Commit only after both prefix and remainder proofs passed verification.
  if (storage && (proof._tag === 'Built' || proof._tag === 'Recovered') && proof.publication) {
    const publication = proof.publication;
    const published = yield* Effect.uninterruptible(Effect.promise(() =>
      publishPchEntry(storage, publication.entry, publication.stagedPchPath, publication.pchHash)));
    report({ event: 'preamble-disk-write', identity: artifactIdentity, written: !!published, pchBytes: published?.pchBytes });
  }
  if (storage) {
    const unlocked = yield* exchange(connection, { operation: 'unlock' }, maxAstBytes, signal, pool.requestTimeoutMs);
    if (!unlocked.ok) return yield* Effect.fail(new Error('PCH build lock release failed'));
  }
  const idle = setTimeout(() => { void stop(connection); }, pool.idleMs);
  idle.unref();
  yield* Ref.set(pool.state, { closed: (yield* Ref.get(pool.state)).closed, worker: { ...prefixWorker, idle } });
  if (directory && (reusable || restored._tag === 'Loaded' || intent === 'prewarm')) yield* Ref.update(pool.history, (history) => resetPchHistory(history, directory));
  if (!reusable) report({ event: 'preamble-published', pid: connection.child.pid, identity: artifactIdentity });
  report({ event: reusable ? 'preamble-reuse' : 'preamble-parse', pid: connection.child.pid, ms: parsed.ms,
    pchBytes: parsed.pchBytes, identity: artifactIdentity });
  report({ event: 'native-idle', pid: connection.child.pid, worker: true });
  return { _tag: 'Extracted' as const, extracted: { prepared, astText, astBytes: Buffer.byteLength(astText), dependencies, cacheable: true } };
});

export const extractWithPreamble = Effect.fnUntraced(function* (
  pool: PreamblePool, source: string, command: CompileCommand, executable: string,
  maxAstBytes: number, signal: AbortSignal, report: Report = () => {}, directory?: string, intent: 'foreground' | 'prewarm' = 'foreground'
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
      report({ event: 'preamble-fallback', kind: 'Unsupported', reason: 'Unsupported compilation context' });
      return yield* extractVerifiedAst(source, command, executable, maxAstBytes, signal, report);
    }
    const result = yield* preambleExtraction(pool, source, command, executable, maxAstBytes, signal, report, directory, intent).pipe(
      Effect.onError(() => dropWorker(pool)),
      Effect.catch((error) => Effect.gen(function* () {
        report({ event: 'preamble-fallback', kind: '_tag' in error ? error._tag : 'PreambleUnavailable', reason: error.message });
        if (signal.aborted || (yield* Ref.get(pool.state)).closed) return yield* Effect.fail(error);
        return { _tag: 'ColdFallback' as const };
      }))
    );
    switch (result._tag) {
      case 'Extracted': return result.extracted;
      case 'PolicySkip':
      case 'ColdFallback': return yield* extractVerifiedAst(source, command, executable, maxAstBytes, signal, report);
    }
  }).pipe(Effect.onInterrupt(() => dropWorker(pool))));
}, Effect.mapError((error) => new Error(error.message)));
