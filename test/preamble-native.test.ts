import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { sha256 } from '../src/dependencies';
import { Ref, Effect } from 'effect';

const executable = path.resolve('native/build/fold-state-jump-ast');
type Response = { readonly ok: boolean; readonly pchPath: string; readonly pchBytes: number; readonly pchHash: string;
  readonly bounds: number; readonly endsAtStartOfLine: boolean; readonly prefixHash: string;
  readonly invocationHash: string; readonly dependencies: unknown; readonly ast: unknown };
const native = (source: string, flags: readonly string[] = []) => {
  const child = spawn(executable, ['--preamble-worker', '--source', source, '--', '-std=c++17', ...flags], { stdio: 'pipe' });
  const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
  child.stderr.on('data', () => {});
  child.stdin.on('error', () => {});
  const request = (request: Readonly<Record<string, unknown>>): Promise<Response> => new Promise((resolve, reject) => {
    const chunks = Ref.makeUnsafe<readonly Buffer[]>([]);
    const cleanup = () => { child.stdout.removeListener('data', data); child.removeListener('close', close); clearTimeout(deadline); };
    const close = () => { cleanup(); reject(new Error('Native worker closed before response')); };
    const data = (chunk: Buffer) => {
      const separator = chunk.indexOf(0x1e);
      const response = Effect.runSync(Ref.updateAndGet(chunks,
        (chunks) => [...chunks, separator < 0 ? chunk : chunk.subarray(0, separator)]));
      if (separator < 0) return;
      cleanup();
      try { resolve(JSON.parse(Buffer.concat(response).toString()) as Response); } catch (error) { reject(error); }
    };
    const deadline = setTimeout(() => { cleanup(); reject(new Error('Native protocol timeout')); child.kill('SIGKILL'); }, 10000);
    child.stdout.on('data', data);
    child.once('close', close);
    child.stdin.write(JSON.stringify(request) + '\n');
  });
  const stop = async () => { child.stdin.end(); await closed; };
  return { child, closed, request, stop };
};
const fixture = async (run: (input: { readonly directory: string; readonly source: string; readonly header: string }) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-native-pch-'));
  const source = path.join(directory, 'main source.cpp');
  const header = path.join(directory, 'state.h');
  await writeFile(header, '#if __INCLUDE_LEVEL__ != 1\n#error changed include semantics\n#endif\n#define VALUE 3\nstruct State { int value; };\n');
  await writeFile(source, '#define ORDER 1\n#include "state.h"\n#if ORDER\nvoid f(State &s) { s.value = VALUE; s.value++; }\n#endif\n');
  try { await run({ directory, source, header }); } finally { await rm(directory, { recursive: true, force: true }); }
};
const artifact = async (source: string, directory: string) => {
  const worker = native(source);
  try {
    const built = await worker.request({ operation: 'build', storagePath: directory });
    assert.equal(built.ok, true);
    const pchPath = path.join(directory, 'saved.pch');
    await copyFile(built.pchPath, pchPath);
    return { operation: 'load', pchPath, pchHash: sha256(await readFile(pchPath)), bounds: built.bounds,
      endsAtStartOfLine: built.endsAtStartOfLine, prefixHash: built.prefixHash,
      invocationHash: built.invocationHash, dependencies: built.dependencies };
  } finally { await worker.stop(); }
};
const normalized = (ast: unknown): unknown => {
  const identities = Ref.makeUnsafe<ReadonlyMap<string, string>>(new Map());
  const visit = (value: unknown): unknown => Array.isArray(value) ? value.map(visit)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, value]) => {
      if (['id', 'referencedMemberDecl'].includes(key) && typeof value === 'string') {
        const mapped = Effect.runSync(Ref.modify(identities, (identities) => {
          const identity = identities.get(value) ?? String(identities.size);
          return [identity, new Map([...identities, [value, identity]])];
        }));
        return [key, mapped];
      }
      return [key, visit(value)];
    })) : value;
  return visit(ast);
};

describe('native persistent preamble protocol', { skip: process.platform !== 'linux' || !existsSync(executable) }, () => {
  it('restores across processes with exact include level, macro ordering and conditional stack after a body edit', () => fixture(async ({ source, directory }) => {
    const load = await artifact(source, directory);
    await writeFile(source, (await readFile(source, 'utf8')).replace('s.value++;', 's.value += 4; s.value++;'));
    const worker = native(source);
    try {
      const loaded = await worker.request(load);
      assert.equal(loaded.ok, true);
      const parsed = await worker.request({ operation: 'parse' });
      assert.equal(parsed.ok, true);
      const cold = await promisify(execFile)(executable, ['--source', source, '--', '-std=c++17']);
      assert.deepEqual(normalized(parsed.ast), normalized(JSON.parse(cold.stdout)));
      const proof = parsed.dependencies as { reusable: boolean; paths: readonly { path: string }[] };
      assert.equal(proof.reusable, true);
      assert.ok(proof.paths.some((file) => file.path === source));
      assert.ok(proof.paths.some((file) => file.path === path.join(directory, 'state.h')));
    } finally { await worker.stop(); }
  }));
  it('parses fixed build bytes after its mutable temporary artifact is corrupted', () => fixture(async ({ source, directory }) => {
    const worker = native(source);
    try {
      const built = await worker.request({ operation: 'build', storagePath: directory });
      assert.equal(built.ok, true);
      assert.equal(built.pchHash, sha256(await readFile(built.pchPath)));
      await writeFile(built.pchPath, 'damaged temporary artifact');
      const parsed = await worker.request({ operation: 'parse' });
      assert.equal(parsed.ok, true);
      assert.equal(parsed.pchHash, built.pchHash);
      assert.equal(parsed.pchBytes, built.pchBytes);
      const cold = await promisify(execFile)(executable, ['--source', source, '--', '-std=c++17']);
      assert.deepEqual(normalized(parsed.ast), normalized(JSON.parse(cold.stdout)));
    } finally { await worker.stop(); }
  }));
  it('restores the complete runtime proof when a large header was mapped only during preamble construction', () => fixture(async ({ source, directory, header }) => {
    await writeFile(header, '//' + 'padding'.repeat(5000) + '\n' + await readFile(header, 'utf8'));
    const load = await artifact(source, directory);
    const original = load.dependencies as { runtime: readonly { path: string; stamp: string }[] };
    assert.ok(original.runtime.some((file) => file.path === header), 'Fixture must exercise an actual mapped header');
    const worker = native(source);
    try {
      const loaded = await worker.request(load);
      assert.equal(loaded.ok, true);
      const restored = loaded.dependencies as { runtime: readonly { path: string; stamp: string }[] };
      assert.deepEqual(restored.runtime, original.runtime, 'Restore must preserve the complete original runtime proof');
      assert.equal((await worker.request({ operation: 'parse' })).ok, true);
      const changedRuntime = { ...load, dependencies: { ...load.dependencies as object,
        runtime: original.runtime.map((file) => file.path === header ? { ...file, stamp: 'changed-stamp' } : file) } };
      assert.equal((await worker.request(changedRuntime)).ok, false);
    } finally { await worker.stop(); }
  }));
  it('rejects mismatched bounds, line boundary, prefix, invocation, artifact checksum and dependency bytes', () => fixture(async ({ source, directory, header }) => {
    const load = await artifact(source, directory);
    const worker = native(source);
    try {
      await [
        { bounds: load.bounds + 1 }, { endsAtStartOfLine: !load.endsAtStartOfLine },
        { prefixHash: '0'.repeat(64) }, { invocationHash: '0'.repeat(64) }, { pchHash: '0'.repeat(64) }
      ].reduce(async (previous, changed) => {
        await previous;
        assert.equal((await worker.request({ ...load, ...changed })).ok, false);
      }, Promise.resolve());
      assert.equal((await worker.request(load)).ok, true);
      await writeFile(header, (await readFile(header, 'utf8')).replace('VALUE 3', 'VALUE 4'));
      assert.equal((await worker.request(load)).ok, false);
    } finally { await worker.stop(); }
  }));
  it('rejects changed compiler invocation and corrupt PCH without an AST', () => fixture(async ({ source, directory }) => {
    const load = await artifact(source, directory);
    const changed = native(source, ['-DNEW_CONTEXT=1']);
    try { assert.equal((await changed.request(load)).ok, false); } finally { await changed.stop(); }
    await writeFile(load.pchPath, 'invalid PCH bytes');
    const worker = native(source);
    try {
      assert.equal((await worker.request({ ...load, pchHash: sha256(await readFile(load.pchPath)) })).ok, true);
      // Clang may reject before emitting an AST, resulting in a deliberately
      // rejected response envelope. The host must then perform a cold parse.
      const result = await worker.request({ operation: 'parse' }).catch(() => undefined);
      assert.ok(!result?.ok);
    } finally { await worker.stop(); }
  }));
  it('rejects symlinked cache parents and artifact leaves', () => fixture(async ({ source, directory }) => {
    const load = await artifact(source, directory);
    const alias = path.join(directory, 'alias');
    const pchAlias = path.join(directory, 'alias.pch');
    await symlink(directory, alias, 'dir');
    await symlink(load.pchPath, pchAlias);
    const worker = native(source);
    try {
      assert.equal((await worker.request({ ...load, pchPath: pchAlias })).ok, false);
      assert.equal((await worker.request({ ...load, pchPath: path.join(alias, 'saved.pch') })).ok, false);
      assert.equal((await worker.request({ operation: 'lock', lockPath: path.join(alias, 'key.lock') })).ok, false);
      assert.equal((await worker.request({ operation: 'build', storagePath: alias })).ok, false);
    } finally { await worker.stop(); }
  }));
  it('serializes the same artifact lock and releases it on unlock and SIGKILL', () => fixture(async ({ source, directory }) => {
    const first = native(source);
    const second = native(source);
    const lock = { operation: 'lock', lockPath: path.join(directory, 'key.lock') };
    try {
      assert.equal((await first.request(lock)).ok, true);
      const waiting = second.request(lock);
      assert.equal(await Promise.race([waiting.then(() => 'acquired'), new Promise((resolve) => setTimeout(() => resolve('waiting'), 40))]), 'waiting');
      assert.equal((await first.request({ operation: 'unlock' })).ok, true);
      assert.equal((await waiting).ok, true);
      const next = first.request(lock);
      second.child.kill('SIGKILL');
      await second.closed;
      assert.equal((await next).ok, true);
    } finally { await first.stop(); await second.stop(); }
  }));
});
