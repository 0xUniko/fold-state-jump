import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Deferred, Effect } from 'effect';
import { extractVerifiedAst } from '../src/extraction';
import { buildIdentity, fingerprintFile, reusableCommand, validateDependencies, type DependencyManifest } from '../src/dependencies';
import { makeAstCache, loadPreparedAst, invalidateAstCache } from '../src/ast-cache';
import { prepareAst } from '../src/analysis';
import type { CompileCommand } from '../src/services';

const executable = path.resolve('native/build/fold-state-jump-ast');
const fixture = async (action: (directory: string) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-deps-'));
  try { await action(directory); } finally { await rm(directory, { recursive: true, force: true }); }
};
const prepared = prepareAst({ kind: 'TranslationUnitDecl' });
const proof = (files: readonly string[]): DependencyManifest => ({ schema: 1, reusable: true,
  paths: files.map((file) => ({ path: file, real: file, sha256: 'unused' })) });

describe('verified build inputs', () => {
  test('native tracks external/transitive headers, absent has_include and nonexistent -I directories', () => fixture(async (directory) => {
    await mkdir(path.join(directory, 'external'));
    const source = path.join(directory, 'main.cpp');
    const header = path.join(directory, 'external', 'state.h');
    const transitive = path.join(directory, 'external', 'macro.h');
    await writeFile(transitive, '#define VALUE 1\n');
    await writeFile(header, '#include "macro.h"\nstruct State { int value; };\n');
    await writeFile(source, '#include <state.h>\n#if __has_include("optional.h")\n#include "optional.h"\n#endif\nvoid f(State &s) { s.value = VALUE; }\n');
    const generated = path.join(directory, 'generated');
    const command: CompileCommand = { compiler: 'clang++', cwd: directory,
      args: ['-std=c++17', '-I' + generated, '-I' + path.dirname(header), source] };
    const extracted = await Effect.runPromise(extractVerifiedAst(source, command, executable, 67108864, AbortSignal.timeout(10000)));
    assert.equal(extracted.cacheable, true);
    assert.ok(extracted.dependencies.paths.some((file) => file.path === transitive));
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), true);
    await writeFile(path.join(directory, 'unrelated.cpp'), '// irrelevant');
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), true);
    await writeFile(transitive, '#define VALUE 2\n');
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), false);
    await writeFile(transitive, '#define VALUE 1\n');
    await writeFile(path.join(directory, 'optional.h'), '// generated');
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), false);
    await rm(path.join(directory, 'optional.h'));
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), true);
    await mkdir(generated);
    await writeFile(path.join(generated, 'state.h'), 'struct State { long value; };');
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), false);
    await rm(generated, { recursive: true });
    await rm(transitive);
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), false);
  }));

  test('hashes content despite restored timestamp and detects symlink retargeting', () => fixture(async (directory) => {
    const first = path.join(directory, 'first.h');
    const second = path.join(directory, 'second.h');
    const link = path.join(directory, 'link.h');
    await writeFile(first, 'one');
    await writeFile(second, 'one');
    await symlink(first, link);
    const dependency = { path: link, ...await fingerprintFile(link) };
    const dependencies: DependencyManifest = { schema: 1, reusable: true, paths: [dependency] };
    await rm(link);
    await symlink(second, link);
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    const secondDependency = { path: second, ...await fingerprintFile(second) };
    await writeFile(second, 'two');
    await utimes(second, 1, 1);
    assert.equal(await Effect.runPromise(validateDependencies({ ...dependencies, paths: [secondDependency] })), false);
  }));

  test('identity distinguishes flags, compiler selection, cwd, extractor and configuration', () => fixture(async (directory) => {
    const source = path.join(directory, 'main.cpp');
    const extractor = path.join(directory, 'extractor');
    await writeFile(source, 'int main() {}');
    await writeFile(extractor, 'v1');
    const command: CompileCommand = { compiler: 'clang++', cwd: directory, args: [source] };
    const identity = await buildIdentity(source, command, extractor, {});
    await [{ ...command, args: ['-DVALUE=2', source] }, { ...command, compiler: 'other++' },
      { ...command, cwd: path.dirname(directory) }, { ...command, buildConfiguration: 'other driver' }].reduce(async (previous, command) => {
      await previous;
      assert.notEqual(await buildIdentity(source, command, extractor, {}), identity);
    }, Promise.resolve());
    assert.notEqual(await buildIdentity(source, command, extractor, { database: 'other' }), identity);
    await writeFile(extractor, 'v2');
    assert.notEqual(await buildIdentity(source, command, extractor, {}), identity);
    assert.equal(reusableCommand({ ...command, args: ['@flags.rsp', source] }), false);
    assert.equal(reusableCommand({ ...command, args: ['-include-pch', 'state.pch', source] }), false);
  }));

  test('time-dependent builtins are parsed but never retained', () => fixture(async (directory) => {
    const source = path.join(directory, 'time.cpp');
    await writeFile(source, 'const char *f() { return __TIME__; }');
    const extracted = await Effect.runPromise(extractVerifiedAst(source, { compiler: 'clang++', cwd: directory, args: [source] }, executable, 67108864, AbortSignal.timeout(10000)));
    assert.equal(extracted.cacheable, false);
  }));
});

describe('dependency-aware memory transitions', () => {
  test('unrelated changes preserve a ready entry and related changes remove it', async () => {
    const cache = makeAstCache();
    const request = { source: '/a.cpp', documentVersion: 1, buildIdentity: 'config-1' };
    await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed({ prepared, astBytes: 1, dependencies: proof(['/shared.h']) })));
    await Effect.runPromise(invalidateAstCache(cache, '/unrelated.cpp'));
    assert.equal((await Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('unexpected')))))._tag, 'ExtractionReady');
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, { ...request, buildIdentity: 'config-2' }, Effect.fail(new Error('different configuration')))), /different configuration/);
    await Effect.runPromise(invalidateAstCache(cache, '/shared.h'));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('invalidated')))), /invalidated/);
  });

  test('in-flight unknown dependencies are checked against edits before publishing', async () => {
    const cache = makeAstCache();
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const extraction = Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(released);
      return { prepared, astBytes: 1, dependencies: proof(['/shared.h']) };
    });
    const pending = Effect.runPromise(loadPreparedAst(cache, { source: '/a.cpp', documentVersion: 1 }, extraction));
    await Effect.runPromise(Deferred.await(started));
    await Effect.runPromise(invalidateAstCache(cache, '/shared.h'));
    await Effect.runPromise(Deferred.succeed(released, undefined));
    assert.equal((await pending)._tag, 'AnalysisFailure');
  });

  test('unrelated edits do not discard an in-flight extraction', async () => {
    const cache = makeAstCache();
    const result = await Effect.runPromise(loadPreparedAst(cache, { source: '/a.cpp', documentVersion: 1 }, Effect.gen(function* () {
      yield* invalidateAstCache(cache, '/unrelated.cpp');
      return { prepared, astBytes: 1, dependencies: proof(['/shared.h']) };
    })));
    assert.equal(result._tag, 'ExtractionReady');
  });

  test('failed disk dependency validation re-extracts and uncacheable input is not retained', async () => {
    const cache = makeAstCache();
    const request = { source: '/a.cpp', documentVersion: 1 };
    await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed({ prepared, astBytes: 1, dependencies: proof(['/shared.h']) })));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('rebuild')), () => Effect.succeed(false))), /rebuild/);
    await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed({ prepared, astBytes: 1, cacheable: false })));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('no retention')))), /no retention/);
  });
});
