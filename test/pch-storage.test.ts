import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { clearPchStorage, createPchStage, pchStorageStats, preparePchStorage, publishPchEntry, readPchEntry, removePchStage, type PchEntry } from '../src/pch-storage';

const entry: Omit<PchEntry, 'pchPath' | 'pchBytes' | 'pchHash'> = {
  identity: 'a'.repeat(64), prefixHash: 'b'.repeat(64), invocationHash: 'c'.repeat(64), bounds: 2,
  endsAtStartOfLine: true, dependencies: { schema: 2, reusable: true, paths: [], guards: [] },
  nativeDependencies: { schema: 1, reusable: true, paths: [], runtime: [] }
};
const fixture = async (action: (root: string, directory: string, source: string) => Promise<void>): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), 'fsj-pch-storage-'));
  const directory = path.join(root, 'cache', 'pch');
  try {
    assert.equal(await preparePchStorage(directory), directory);
    const source = path.join(directory, 'preamble-123abc.pch');
    await writeFile(source, 'serialized-pch');
    await action(root, directory, source);
  } finally { await rm(root, { recursive: true, force: true }); }
};

describe('persistent PCH storage', () => {
  test('publishes a complete copied pair and retains the native-owned source', () => fixture(async (_root, directory, source) => {
    const published = await publishPchEntry(directory, entry, source);
    assert.ok(published);
    assert.equal(await readFile(source, 'utf8'), 'serialized-pch');
    assert.deepEqual(await readPchEntry(directory, entry.identity), published);
    assert.deepEqual(await pchStorageStats(directory), { entries: 1, bytes: 14 });
    assert.equal((await readdir(directory)).some((name) => name.startsWith('stage-')), false);
  }));
  test('rejects a staging artifact changed after the native build without replacing an existing valid pair', () => fixture(async (_root, directory, source) => {
    const published = await publishPchEntry(directory, entry, source);
    assert.ok(published);
    await writeFile(source, 'damaged-source');
    assert.equal(await publishPchEntry(directory, entry, source, published.pchHash), undefined);
    assert.deepEqual(await readPchEntry(directory, entry.identity), published);
    assert.equal((await readdir(directory)).some((name) => name.startsWith('stage-')), false);
    await writeFile(source, 'serialized-pch');
    assert.ok(await publishPchEntry(directory, entry, source, published.pchHash));
  }));
  test('rejects missing, corrupt, truncated and incompatible publication records', () => fixture(async (_root, directory, source) => {
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
    assert.ok(await publishPchEntry(directory, entry, source));
    const metadataPath = path.join(directory, entry.identity + '.json');
    const metadata = await readFile(metadataPath, 'utf8');
    await writeFile(path.join(directory, entry.identity + '.pch'), 'broken');
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
    await writeFile(path.join(directory, entry.identity + '.pch'), 'serialized-pch');
    await writeFile(metadataPath, metadata.slice(0, 20));
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
    await writeFile(metadataPath, JSON.stringify({ ...JSON.parse(metadata), schema: 99 }));
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
    await writeFile(metadataPath, JSON.stringify({ ...JSON.parse(metadata), dependencies: { schema: 2, reusable: true, paths: [], guards: [{ _tag: 'bogus' }] } }));
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
  }));
  test('rejects directory symlinks and preserves everything behind them during clear', () => fixture(async (root, directory, source) => {
    assert.ok(await publishPchEntry(directory, entry, source));
    const alias = path.join(root, 'alias');
    await symlink(path.dirname(directory), alias, 'dir');
    assert.equal(await preparePchStorage(path.join(alias, 'pch')), undefined);
    assert.equal(await readPchEntry(path.join(alias, 'pch'), entry.identity), undefined);
    await clearPchStorage(path.join(alias, 'pch'));
    assert.ok(await readPchEntry(directory, entry.identity));
  }));
  test('rejects symlink and hardlink artifacts and never changes their targets', () => fixture(async (root, directory, source) => {
    assert.ok(await publishPchEntry(directory, entry, source));
    const target = path.join(root, 'user-data');
    await writeFile(target, 'serialized-pch');
    const artifact = path.join(directory, entry.identity + '.pch');
    await unlink(artifact);
    await symlink(target, artifact);
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
    await clearPchStorage(directory);
    assert.equal(await readFile(target, 'utf8'), 'serialized-pch');
    assert.ok(await publishPchEntry(directory, entry, source));
    await unlink(artifact);
    await link(target, artifact);
    assert.equal(await readPchEntry(directory, entry.identity), undefined);
    await clearPchStorage(directory);
    assert.equal(await readFile(target, 'utf8'), 'serialized-pch');
  }));
  test('rejects unsafe publication sources and clears only owned artifact names', () => fixture(async (root, directory, source) => {
    assert.equal(await publishPchEntry(directory, entry, path.join(root, 'preamble-123.pch')), undefined);
    await unlink(source);
    await symlink(path.join(root, 'user-data'), source);
    assert.equal(await publishPchEntry(directory, entry, source), undefined);
    await writeFile(path.join(directory, 'notes.txt'), 'keep');
    await writeFile(path.join(directory, entry.identity + '.lock'), '');
    await mkdir(path.join(directory, 'user-directory'));
    await clearPchStorage(directory);
    assert.equal(await readFile(path.join(directory, 'notes.txt'), 'utf8'), 'keep');
    assert.ok((await readdir(directory)).includes(entry.identity + '.lock'));
    assert.ok((await readdir(directory)).includes('user-directory'));
  }));
  test('publishes from an owned staging directory then safely removes only its native artifacts', () => fixture(async (_root, directory) => {
    const stage = await createPchStage(directory);
    assert.ok(stage);
    const source = path.join(stage, 'preamble-abc123.pch');
    await writeFile(source, 'serialized-pch');
    assert.ok(await publishPchEntry(directory, entry, source));
    await removePchStage(stage);
    assert.ok(!(await readdir(directory)).includes(path.basename(stage)));
    assert.ok(await readPchEntry(directory, entry.identity));
    const protectedStage = await createPchStage(directory);
    assert.ok(protectedStage);
    await writeFile(path.join(protectedStage, 'user-data'), 'keep');
    await removePchStage(protectedStage);
    assert.equal(await readFile(path.join(protectedStage, 'user-data'), 'utf8'), 'keep');
  }));
  test('staging cleanup rejects a directory symlink and preserves its target', () => fixture(async (root, directory) => {
    const stage = path.join(directory, 'stage-00000000-0000-0000-0000-000000000000');
    await writeFile(path.join(root, 'preamble-123.pch'), 'user-data');
    await symlink(root, stage, 'dir');
    await removePchStage(stage);
    assert.equal(await readFile(path.join(root, 'preamble-123.pch'), 'utf8'), 'user-data');
  }));
  test('explicit clear removes abandoned owned staging files without recursion', () => fixture(async (_root, directory) => {
    const stage = await createPchStage(directory);
    const protectedStage = await createPchStage(directory);
    assert.ok(stage && protectedStage);
    await writeFile(path.join(stage, 'preamble-abc123.pch'), 'abandoned');
    await writeFile(path.join(protectedStage, 'user-data'), 'keep');
    await clearPchStorage(directory);
    assert.equal((await readdir(directory)).includes(path.basename(stage)), false);
    assert.equal(await readFile(path.join(protectedStage, 'user-data'), 'utf8'), 'keep');
  }));
});
