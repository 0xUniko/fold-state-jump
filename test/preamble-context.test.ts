import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { analyzeAst, analyzeOriginAst, prepareAst, type ClangNode } from '../src/analysis';
import { validateDependencies } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { disposePreamblePool, extractWithPreamble, makePreamblePool } from '../src/preamble';
import type { CompileCommand } from '../src/services';
import { resultSignature } from './result-signature';

const executable = path.resolve('native/build/fold-state-jump-ast');
const gccRoot = '/usr/lib/gcc';
const nativeArchitecture = process.arch === 'x64' ? 'x86_64' : process.arch === 'arm64' ? 'aarch64' : process.arch;
// Discover an installed native crtbegin without running GCC or requiring a
// particular package version. Parsing never links this object or a fake binary.
const gcc = !existsSync(gccRoot) ? undefined : readdirSync(gccRoot)
  .filter((triple) => triple.startsWith(nativeArchitecture + '-') && triple.includes('linux'))
  .flatMap((triple) => readdirSync(path.join(gccRoot, triple))
    .filter((version) => /^\d+(?:\.\d+)*$/.test(version) && existsSync(path.join(gccRoot, triple, version, 'crtbegin.o')))
    .map((version) => ({ triple, version, crtbegin: path.join(gccRoot, triple, version, 'crtbegin.o') })))
  .reduce<{ readonly triple: string; readonly version: string; readonly crtbegin: string } | undefined>(
    (gcc, candidate) => !gcc || Number(candidate.version.split('.')[0]) > Number(gcc.version.split('.')[0]) ? candidate : gcc, undefined);

const sourceText = '#include <context.h>\nvoid f(State &s) { s.value = VALUE; s.value++; }\n';
type Event = Readonly<Record<string, unknown>>;

const normalizeAst = (ast: ClangNode): ClangNode => {
  const identifiers = (value: unknown): readonly string[] => Array.isArray(value) ? value.flatMap(identifiers)
    : value !== null && typeof value === 'object' ? Object.entries(value).flatMap(([key, value]) =>
      ['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string' ? [value] : identifiers(value)) : [];
  const identities = identifiers(ast).reduce((identities, identity) => {
    if (!identities.has(identity)) identities.set(identity, String(identities.size));
    return identities;
  }, new Map<string, string>());
  const normalized = (value: unknown): unknown => Array.isArray(value) ? value.map(normalized)
    : value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, value]) =>
      [key, ['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string' ? identities.get(value) : normalized(value)])) : value;
  return normalized(ast) as ClangNode;
};

const compareQueries = (source: string, cold: { readonly astText: string }, actual: { readonly astText: string }) => {
  const coldPrepared = prepareAst(normalizeAst(JSON.parse(cold.astText) as ClangNode));
  const actualPrepared = prepareAst(normalizeAst(JSON.parse(actual.astText) as ClangNode));
  assert.deepEqual(actualPrepared.ast, coldPrepared.ast, 'Toolchain change produced a stale compact AST');
  const options = { file: source, sourceText, cursorByteOffset: sourceText.lastIndexOf('s.value') + 2 };
  [analyzeAst, analyzeOriginAst].map((analyze) => assert.deepEqual(
    resultSignature(analyze(actualPrepared.ast, options, actualPrepared)),
    resultSignature(analyze(coldPrepared.ast, options, coldPrepared))));
};

describe('preamble driver context', { skip: process.platform !== 'linux' || !existsSync(executable) || !gcc }, () => {
  test('a newly discovered GCC installation rejects the retained context and recovers through cold parsing', async () => {
    assert.ok(gcc);
    const directory = await mkdtemp(path.join(tmpdir(), 'fsj-preamble-context-'));
    const toolchain = path.join(directory, 'toolchain');
    const source = path.join(directory, 'main.cpp');
    const pool = makePreamblePool();
    const events = Ref.makeUnsafe<readonly Event[]>([]);
    const report = (event: Event) => Effect.runSync(Ref.update(events, (events) => [...events, event]));
    const take = () => Effect.runSync(Ref.getAndSet(events, []));
    const command: CompileCommand = { compiler: '/usr/lib/llvm-23/bin/clang++', cwd: directory,
      args: ['-std=c++17', '--target=' + gcc.triple, '--gcc-toolchain=' + toolchain, source] };
    const run = () => Effect.runPromise(extractWithPreamble(pool, source, command, executable, 16777216,
      AbortSignal.timeout(30000), report));
    const cold = () => Effect.runPromise(extractVerifiedAst(source, command, executable, 16777216,
      AbortSignal.timeout(30000)));
    const install = async (version: string, content: string): Promise<string> => {
      const installation = path.join(toolchain, 'lib', 'gcc', gcc.triple, version);
      const include = path.join(toolchain, 'include', 'c++', version);
      await mkdir(installation, { recursive: true });
      await mkdir(include, { recursive: true });
      // Only crtbegin is a symlink. Symlinking the installation directory would
      // redirect GCC's relative include discovery back into the real system.
      await symlink(gcc.crtbegin, path.join(installation, 'crtbegin.o'));
      const header = path.join(include, 'context.h');
      await writeFile(header, content);
      return header;
    };
    // Outrank system installations even if the driver's default search roots
    // are also probed, without assuming a particular installed GCC release.
    const oldVersion = String(Number(gcc.version.split('.')[0]) + 100);
    const newVersion = String(Number(oldVersion) + 1);
    try {
      await writeFile(source, sourceText);
      const oldHeader = await install(oldVersion, '#define VALUE 1\nstruct State { int value; };\n');
      const first = await run();
      assert.ok(take().some((event) => event.event === 'preamble-build'));
      assert.ok(first.dependencies.paths.some((file) => file.real === oldHeader), 'Fixture did not select the fake GCC include directory');
      compareQueries(source, await cold(), first);
      await run();
      assert.ok(take().some((event) => event.event === 'preamble-reuse'));

      const newHeader = await install(newVersion, '#define VALUE 2\nstruct State { long value; };\n');
      // None of the old positive or negative include candidates changed. The
      // fresh driver's cc1 context must independently reject the old Preamble.
      assert.equal(await Effect.runPromise(validateDependencies(first.dependencies)), true);
      const changed = await run();
      const changedEvents = take();
      assert.equal(changedEvents.some((event) => event.event === 'preamble-reuse'), false);
      assert.ok(changedEvents.some((event) => event.event === 'preamble-fallback' && event.reason === 'Preamble parse rejected'),
        JSON.stringify(changedEvents));
      assert.ok(changed.dependencies.paths.some((file) => file.real === newHeader), 'Cold fallback did not rediscover the new toolchain');
      assert.notDeepEqual(normalizeAst(JSON.parse(first.astText) as ClangNode), normalizeAst(JSON.parse(changed.astText) as ClangNode));
      const changedCold = await cold();
      compareQueries(source, changedCold, changed);

      const rebuilt = await run();
      assert.ok(take().some((event) => event.event === 'preamble-build'));
      compareQueries(source, changedCold, rebuilt);
      const reused = await run();
      assert.ok(take().some((event) => event.event === 'preamble-reuse'));
      compareQueries(source, changedCold, reused);
    } finally {
      await Effect.runPromise(disposePreamblePool(pool));
      await rm(directory, { recursive: true, force: true });
    }
  });
});
