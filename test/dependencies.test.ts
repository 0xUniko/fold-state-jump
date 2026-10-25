import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, utimes, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Deferred, Effect } from 'effect';
import { extractVerifiedAst } from '../src/extraction';
import { buildIdentity, hasFineChangeTimestamps, fingerprintFile, reusableCommand, validateDependencies, verifyDependencies, type DependencyManifest } from '../src/dependencies';
import { makeAstCache, loadPreparedAst, invalidateAstCache, affectedAstSources } from '../src/ast-cache';
import { prepareAst } from '../src/analysis';
import type { CompileCommand } from '../src/services';

const executable = path.resolve('native/build/fold-state-jump-ast');
const fixture = async (action: (directory: string) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-deps-'));
  try { await action(directory); } finally { await rm(directory, { recursive: true, force: true }); }
};
const prepared = prepareAst({ kind: 'TranslationUnitDecl' });
const proof = (files: readonly string[]): DependencyManifest => ({ schema: 2, reusable: true, guards: [],
  paths: files.map((file) => ({ path: file, real: file, sha256: 'unused' })) });

describe('verified build inputs', () => {
  test('timestamp fast paths require kernels with ext4 multigrain change tracking', () => {
    assert.equal(hasFineChangeTimestamps('linux', '6.18.54.1-microsoft-standard-WSL2'), true);
    assert.equal(hasFineChangeTimestamps('linux', '6.13.0'), true);
    assert.equal(hasFineChangeTimestamps('linux', '6.12.99'), false);
    assert.equal(hasFineChangeTimestamps('linux', '5.15.0'), false);
    assert.equal(hasFineChangeTimestamps('linux', 'unknown'), false);
    assert.equal(hasFineChangeTimestamps('win32', '10.0.1'), false);
  });

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
    assert.ok(extracted.dependencies.guards.some((guard) =>
      (guard._tag === 'StatFile' || guard._tag === 'HashFile') && guard.path === executable),
      'The native executable must be present in mapped-runtime guards');
    assert.ok(extracted.dependencies.paths.some((file) => file.path === transitive));
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), true);
    await writeFile(path.join(directory, 'unrelated.cpp'), '// irrelevant');
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), true);
    await writeFile(transitive, '#define VALUE 2\n');
    assert.equal(await Effect.runPromise(validateDependencies(extracted.dependencies)), false);
    await writeFile(transitive, '#define VALUE 1\n');
    const dependencies = (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [], paths: extracted.dependencies.paths })))!;
    await writeFile(path.join(directory, 'optional.h'), '// generated');
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    await rm(path.join(directory, 'optional.h'));
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), true);
    await mkdir(generated);
    await writeFile(path.join(generated, 'state.h'), 'struct State { long value; };');
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    await rm(generated, { recursive: true });
    await rm(transitive);
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
  }));

  test('hashes content despite restored timestamp and detects symlink retargeting', () => fixture(async (directory) => {
    const first = path.join(directory, 'first.h');
    const second = path.join(directory, 'second.h');
    const link = path.join(directory, 'link.h');
    await writeFile(first, 'one');
    await writeFile(second, 'one');
    await symlink(first, link);
    const dependency = { path: link, ...await fingerprintFile(link) };
    const dependencies = (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [], paths: [dependency] })))!;
    await rm(link);
    await symlink(second, link);
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    const secondDependency = { path: second, ...await fingerprintFile(second) };
    await writeFile(second, 'two');
    await utimes(second, 1, 1);
    assert.equal(await Effect.runPromise(validateDependencies({ ...dependencies, guards: [{ _tag: 'HashFile', ...secondDependency }] })), false);
  }));

  test('restored coarse mtime cannot hide a same-size write from verified guards', () => fixture(async (directory) => {
    const file = path.join(directory, 'restored.h');
    await writeFile(file, 'one');
    await utimes(file, 1, 1);
    const dependencies = (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [],
      paths: [{ path: file, ...await fingerprintFile(file) }] })))!;
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), true);
    await writeFile(file, 'two');
    await utimes(file, 1, 1);
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    const hashDependencies: DependencyManifest = { ...dependencies,
      guards: [{ _tag: 'HashFile', path: file, real: file, sha256: dependencies.paths[0].sha256 }] };
    assert.equal(await Effect.runPromise(validateDependencies(hashDependencies)), false);
  }));

  test('checks dependencies beyond multiple validation batches and treats unreadable inputs as misses', () => fixture(async (directory) => {
    const files = Array.from({ length: 70 }, (_, index) => path.join(directory, 'header-' + index + '.h'));
    await Promise.all(files.map((file) => writeFile(file, 'one')));
    const paths = await Promise.all(files.map(async (file) => ({ path: file, ...await fingerprintFile(file) })));
    const dependencies = (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [], paths })))!;
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), true);
    await writeFile(files[69], 'two');
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    const hashDependencies: DependencyManifest = { ...dependencies,
      guards: paths.map((file) => ({ _tag: 'HashFile' as const, ...file })) };
    assert.equal(await Effect.runPromise(validateDependencies(hashDependencies)), false);
    await writeFile(files[69], 'one');
    assert.equal(await Effect.runPromise(validateDependencies(hashDependencies)), true);
    await rm(files[0]);
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    assert.equal(await Effect.runPromise(validateDependencies(hashDependencies)), false);
    assert.equal(await Effect.runPromise(validateDependencies({ ...dependencies, guards: [] })), true);
  }));

  test('directory read fallback checks newly created include candidates after many file guards', () => fixture(async (directory) => {
    const file = path.join(directory, 'actual.h');
    const missing = path.join(directory, 'optional.h');
    await writeFile(file, 'one');
    const fingerprint = await fingerprintFile(file);
    const dependencies: DependencyManifest = { schema: 2, reusable: true,
      paths: [{ path: file, ...fingerprint }, { path: missing, real: '', sha256: '' }],
      guards: [...Array.from({ length: 65 }, () => ({ _tag: 'HashFile' as const, path: file, ...fingerprint })),
        { _tag: 'ReadDirectory', path: directory, missing: ['optional.h'] }] };
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), true);
    await writeFile(path.join(directory, 'unrelated.cpp'), 'irrelevant');
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), true);
    await writeFile(missing, 'created');
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
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
    const oldIpc = process.env.VSCODE_IPC_HOOK_EXTHOST;
    const oldCpath = process.env.CPATH;
    try {
      process.env.VSCODE_IPC_HOOK_EXTHOST = 'new-extension-host';
      assert.equal(await buildIdentity(source, command, extractor, {}), identity);
      process.env.CPATH = '/changed-include-path';
      assert.notEqual(await buildIdentity(source, command, extractor, {}), identity);
    } finally {
      if (oldIpc === undefined) delete process.env.VSCODE_IPC_HOOK_EXTHOST;
      else process.env.VSCODE_IPC_HOOK_EXTHOST = oldIpc;
      if (oldCpath === undefined) delete process.env.CPATH;
      else process.env.CPATH = oldCpath;
    }
    await writeFile(extractor, 'v2');
    assert.notEqual(await buildIdentity(source, command, extractor, {}), identity);
    assert.equal(reusableCommand({ ...command, args: ['@flags.rsp', source] }), false);
    assert.equal(reusableCommand({ ...command, args: ['-include-pch', 'state.pch', source] }), false);
  }));

  test('runtime loader environment participates in artifact identity', () => fixture(async (directory) => {
    const source = path.join(directory, 'main.cpp');
    const extractor = path.join(directory, 'extractor');
    await writeFile(source, 'int main() {}');
    await writeFile(extractor, 'runtime identity');
    const command: CompileCommand = { compiler: 'clang++', cwd: directory, args: [source] };
    await ['LD_LIBRARY_PATH', 'LD_PRELOAD', 'LD_AUDIT', 'LD_BIND_NOW'].reduce(async (previous, name) => {
      await previous;
      const before = process.env[name];
      const identity = await buildIdentity(source, command, extractor, {});
      try {
        process.env[name] = 'changed-loader-context';
        assert.notEqual(await buildIdentity(source, command, extractor, {}), identity);
      } finally {
        if (before === undefined) delete process.env[name];
        else process.env[name] = before;
      }
    }, Promise.resolve());
  }));

  test('tracks native runtime image replacement separately from the extractor command', () => fixture(async (directory) => {
    const source = path.join(directory, 'main.cpp');
    const runtime = path.join(directory, 'libclang-test.so');
    await writeFile(source, 'int main() {}');
    await writeFile(runtime, 'runtime-v1');
    const metadata = await stat(runtime, { bigint: true });
    const stamp = [metadata.dev, metadata.ino, metadata.size, metadata.mode, metadata.mtimeNs, metadata.ctimeNs].join(':');
    const native = { schema: 1 as const, reusable: true, paths: [{ path: source, ...await fingerprintFile(source) }], runtime: [{ path: runtime, stamp }] };
    const dependencies = (await Effect.runPromise(verifyDependencies(native)))!;
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), true);
    await writeFile(runtime, 'runtime-v2');
    assert.equal(await Effect.runPromise(validateDependencies(dependencies)), false);
    assert.equal(await Effect.runPromise(verifyDependencies(native)), undefined);
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

  test('a newly created header below an absent ancestor rejects an unknown in-flight proof', async () => {
    const cache = makeAstCache();
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const dependencies: DependencyManifest = { schema: 2, reusable: true, guards: [],
      paths: [{ path: '/generated', real: '', sha256: '' }] };
    const pending = Effect.runPromise(loadPreparedAst(cache, { source: '/a.cpp', documentVersion: 1 }, Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(released);
      return { prepared, astBytes: 1, dependencies };
    })));
    await Effect.runPromise(Deferred.await(started));
    await Effect.runPromise(invalidateAstCache(cache, '/generated/new-header.h'));
    await Effect.runPromise(Deferred.succeed(released, undefined));
    assert.equal((await pending)._tag, 'AnalysisFailure');
  });

  test('retains dependency relationships after invalidation for consecutive prewarm events', async () => {
    const cache = makeAstCache();
    const request = { source: '/a.cpp', documentVersion: 1 };
    const unrelated = { source: '/b.cpp', documentVersion: 1 };
    await Effect.runPromise(loadPreparedAst(cache, request, Effect.succeed({ prepared, astBytes: 1, dependencies: proof(['/shared.h']) })));
    await Effect.runPromise(loadPreparedAst(cache, unrelated, Effect.succeed({ prepared, astBytes: 1, dependencies: proof(['/other.h']) })));
    assert.deepEqual(await Effect.runPromise(affectedAstSources(cache, '/shared.h')), ['/shared.h', '/a.cpp']);
    await Effect.runPromise(invalidateAstCache(cache, '/shared.h'));
    assert.deepEqual(await Effect.runPromise(affectedAstSources(cache, '/shared.h')), ['/shared.h', '/a.cpp']);
    await Effect.runPromise(invalidateAstCache(cache, '/shared.h'));
    assert.deepEqual(await Effect.runPromise(affectedAstSources(cache, '/shared.h')), ['/shared.h', '/a.cpp']);
    assert.deepEqual(await Effect.runPromise(affectedAstSources(cache, '/unrelated.cpp')), ['/unrelated.cpp']);
    assert.equal((await Effect.runPromise(loadPreparedAst(cache, unrelated, Effect.fail(new Error('Unexpected invalidation')))))._tag, 'ExtractionReady');
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request, Effect.fail(new Error('Related input invalidated')))), /Related input invalidated/);
  });

  test('an unrelated sibling of an absent include ancestor preserves in-flight work', async () => {
    const cache = makeAstCache();
    const dependencies: DependencyManifest = { schema: 2, reusable: true, guards: [],
      paths: [{ path: '/generated', real: '', sha256: '' }] };
    const result = await Effect.runPromise(loadPreparedAst(cache, { source: '/a.cpp', documentVersion: 1 }, Effect.gen(function* () {
      yield* invalidateAstCache(cache, '/generated-other/new-header.h');
      return { prepared, astBytes: 1, dependencies };
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
