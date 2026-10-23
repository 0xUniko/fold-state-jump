import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect } from 'effect';
import { clearDiskCache, diskCacheStats, makeDiskCache, readDiskAst, writeDiskAst, type DiskCache } from '../src/disk-cache';
import { fingerprintFile, sha256, verifyDependencies } from '../src/dependencies';

const fixture = async (action: (cache: DiskCache, source: string) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-disk-'));
  const source = path.join(directory, 'main.cpp');
  await writeFile(source, 'int main() {}');
  try { await action(makeDiskCache(path.join(directory, 'cache')), source); }
  finally { await rm(directory, { recursive: true, force: true }); }
};
const extracted = async (source: string) => ({
  astText: JSON.stringify({ kind: 'TranslationUnitDecl', inner: [] }), cacheable: true,
  dependencies: (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [], paths: [{ path: source, ...await fingerprintFile(source) }] })))!
});
const write = async (cache: DiskCache, source: string, identity = 'config-1') =>
  Effect.runPromise(writeDiskAst(cache, identity, await extracted(source), new AbortController().signal));
const file = (cache: DiskCache, identity = 'config-1') => path.join(cache.directory, sha256(identity) + '.ast');

describe('persistent compact AST', () => {
  test('reloads with a fresh service and no native process; preserves the whole AST', () => fixture(async (cache, source) => {
    const extraction = await extracted(source);
    assert.equal(await Effect.runPromise(writeDiskAst(cache, 'config-1', extraction, new AbortController().signal)), true);
    const reloaded = makeDiskCache(cache.directory);
    const loaded = await Effect.runPromise(readDiskAst(reloaded, 'config-1'));
    assert.equal(loaded?.astText, extraction.astText);
    assert.deepEqual(loaded?.prepared.ast, JSON.parse(extraction.astText));
    assert.equal(await Effect.runPromise(readDiskAst(reloaded, 'config-2')), undefined);
    assert.equal((await Effect.runPromise(diskCacheStats(cache))).entries, 1);
  }));

  test('source and external/generated dependency changes or deletion reject the payload', () => fixture(async (cache, source) => {
    const external = path.join(path.dirname(source), 'external.h');
    const missing = path.join(path.dirname(source), 'generated.h');
    await writeFile(external, '#define VALUE 1');
    const extraction = await extracted(source);
    const dependencies = (await Effect.runPromise(verifyDependencies({ schema: 1, reusable: true, runtime: [], paths: [...extraction.dependencies.paths,
      { path: external, ...await fingerprintFile(external) }, { path: missing, ...await fingerprintFile(missing) }] })))!;
    await Effect.runPromise(writeDiskAst(cache, 'config-1', { ...extraction, dependencies }, new AbortController().signal));
    await writeFile(external, '#define VALUE 2');
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'config-1')), undefined);
    await writeFile(external, '#define VALUE 1');
    await writeFile(missing, '// created');
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'config-1')), undefined);
    await rm(missing);
    await rm(external);
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'config-1')), undefined);
    await write(cache, source);
    await writeFile(source, 'int changed() {}');
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'config-1')), undefined);
  }));

  test('damaged, partial, old-schema, mismatched and oversized entries are misses', () => fixture(async (cache, source) => {
    await write(cache, source);
    const original = await readFile(file(cache));
    const boundary = original.indexOf(10);
    const header = original.subarray(0, boundary).toString('utf8');
    const payload = original.subarray(boundary);
    const changedHeader = (text: string) => Buffer.concat([Buffer.from(text), payload]);
    await [original.subarray(0, original.length - 5), Buffer.from('garbage'), changedHeader(header.replace('"schema":2', '"schema":0')),
      changedHeader(header.replace('"reusable":true', '"reusable":false')),
      changedHeader(header.replace('"identity":"config-1"', '"identity":"config-2"')),
      Buffer.concat([original, Buffer.from('garbage')])].reduce(async (previous, text) => {
      await previous;
      await writeFile(file(cache), text);
      assert.equal(await Effect.runPromise(readDiskAst(cache, 'config-1')), undefined);
    }, Promise.resolve());
    await writeFile(file(cache), original);
    assert.equal(await Effect.runPromise(readDiskAst({ ...cache, maxAstBytes: 1 }, 'config-1')), undefined);
    assert.ok(await Effect.runPromise(readDiskAst(cache, 'config-1')));
    await writeFile(path.join(cache.directory, 'interrupted.tmp'), original);
    assert.equal((await Effect.runPromise(diskCacheStats(cache))).entries, 1);
  }));

  test('bounded LRU evicts an older entry and clear removes only owned artifacts', () => fixture(async (cache, source) => {
    await write(cache, source, 'first');
    const bytes = (await Effect.runPromise(diskCacheStats(cache))).bytes;
    await utimes(file(cache, 'first'), 1, 1);
    const limited = { ...cache, maxBytes: bytes + 32 };
    await write(limited, source, 'second');
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'first')), undefined);
    assert.ok(await Effect.runPromise(readDiskAst(cache, 'second')));
    assert.equal(await write({ ...cache, maxBytes: 1 }, source), false);
    await writeFile(path.join(cache.directory, 'unrelated.txt'), 'keep');
    await Effect.runPromise(clearDiskCache(cache));
    assert.deepEqual(await Effect.runPromise(diskCacheStats(cache)), { entries: 0, bytes: 0 });
    assert.equal(await readFile(path.join(cache.directory, 'unrelated.txt'), 'utf8'), 'keep');
  }));

  test('cancellation, disabled retention and concurrent atomic writes leave no partial entries', () => fixture(async (cache, source) => {
    const extraction = await extracted(source);
    const controller = new AbortController();
    controller.abort();
    assert.equal(await Effect.runPromise(writeDiskAst(cache, 'config-1', extraction, controller.signal)), false);
    assert.equal(await Effect.runPromise(writeDiskAst(cache, 'config-1', { ...extraction, cacheable: false }, new AbortController().signal)), false);
    const results = await Promise.all(Array.from({ length: 5 }, () => write(makeDiskCache(cache.directory), source)));
    assert.ok(results.every(Boolean));
    assert.ok(await Effect.runPromise(readDiskAst(cache, 'config-1')));
    assert.equal((await readdir(cache.directory)).filter((name) => name.endsWith('.tmp')).length, 0);
  }));

  test('rejects a decompression bomb, invalid AST root and stale crash temporary files', () => fixture(async (cache, source) => {
    const invalid = { ...await extracted(source), astText: '{"kind":"WrongRoot","inner":[]}' };
    await Effect.runPromise(writeDiskAst(cache, 'invalid', invalid, new AbortController().signal));
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'invalid')), undefined);
    const large = { ...await extracted(source), astText: JSON.stringify({ kind: 'TranslationUnitDecl', inner: [], padding: 'x'.repeat(100000) }) };
    await Effect.runPromise(writeDiskAst(cache, 'large', large, new AbortController().signal));
    const original = await readFile(file(cache, 'large'));
    const boundary = original.indexOf(10);
    const header = JSON.parse(original.subarray(0, boundary).toString('utf8'));
    await writeFile(file(cache, 'large'), Buffer.concat([Buffer.from(JSON.stringify({ ...header, astBytes: 1 }) + '\n'), original.subarray(boundary + 1)]));
    assert.equal(await Effect.runPromise(readDiskAst({ ...cache, maxAstBytes: 1000 }, 'large')), undefined);
    const temporary = path.join(cache.directory, 'dead-beef.tmp');
    await writeFile(temporary, 'orphan');
    await utimes(temporary, 1, 1);
    await write(cache, source);
    await assert.rejects(readFile(temporary), { code: 'ENOENT' });
  }));

  test('permission/I/O failures fall back without failing navigation', () => fixture(async (cache, source) => {
    await writeFile(cache.directory, 'not a directory');
    assert.equal(await write(cache, source), false);
    assert.equal(await Effect.runPromise(readDiskAst(cache, 'config-1')), undefined);
  }));
});
