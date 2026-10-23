import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { cacheGitignore, prepareCacheLocation, resolveCacheProject, type CacheLocation } from '../src/cache-location';

const execute = promisify(execFile);
const git = async (directory: string, args: readonly string[]) =>
  (await execute('git', ['-C', directory, ...args], { encoding: 'utf8' })).stdout.trim();
const fixture = async (action: (directory: string) => Promise<void>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-location-'));
  try { await action(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
};
const repository = async (directory: string) => {
  await mkdir(directory, { recursive: true });
  await git(directory, ['init', '--quiet']);
  const source = path.join(directory, 'main.cpp');
  await writeFile(source, 'int main() {}\n');
  await git(directory, ['add', 'main.cpp']);
  return source;
};
const available = (location: CacheLocation) => {
  assert.notEqual(location._tag, 'UnavailableCache');
  if (location._tag === 'UnavailableCache') throw new Error(location.reason);
  return location;
};

describe('project cache location', () => {
  test('uses the Git root outside workspace boundaries and ignores its entire local cache', () => fixture(async (directory) => {
    const root = path.join(directory, 'project');
    const source = await repository(root);
    const exclude = await readFile(path.join(root, '.git', 'info', 'exclude'), 'utf8');
    const globalStorage = path.join(directory, 'global');
    const location = available(await prepareCacheLocation({ source, workspaceRoots: [directory], globalStorage }));
    assert.equal(location._tag, 'ProjectLocalCache');
    assert.equal(location.project._tag, 'GitProject');
    assert.equal(location.project.root, root);
    assert.equal(location.astDirectory, path.join(root, '.cache', 'fold-state-jump', 'ast'));
    await writeFile(path.join(location.astDirectory, 'snapshot.ast'), 'snapshot');
    assert.equal(await readFile(path.join(location.root, '.gitignore'), 'utf8'), cacheGitignore);
    assert.equal(await git(root, ['status', '--porcelain', '--untracked-files=all']), 'A  main.cpp');
    assert.equal(await git(root, ['check-ignore', '.cache/fold-state-jump/.gitignore']), '.cache/fold-state-jump/.gitignore');
    await assert.rejects(readFile(path.join(root, '.gitignore')), { code: 'ENOENT' });
    assert.equal(await readFile(path.join(root, '.git', 'info', 'exclude'), 'utf8'), exclude);
  }));

  test('separates nested repositories, multiple workspace roots and linked worktrees', () => fixture(async (directory) => {
    const root = path.join(directory, 'outer');
    const source = await repository(root);
    const nested = path.join(root, 'nested');
    const nestedSource = await repository(nested);
    const roots = [root, nested, path.join(directory, 'unrelated')];
    const project = await resolveCacheProject(source, roots);
    const nestedProject = await resolveCacheProject(nestedSource, roots);
    assert.equal(project.root, root);
    assert.equal(nestedProject.root, nested);
    assert.notEqual(project.key, nestedProject.key);
    await git(root, ['-c', 'user.email=cache-test@example.invalid', '-c', 'user.name=Cache Test', 'commit', '--quiet', '-m', 'fixture']);
    const worktree = path.join(directory, 'worktree');
    await git(root, ['worktree', 'add', '--quiet', '--detach', worktree]);
    const worktreeProject = await resolveCacheProject(path.join(worktree, 'main.cpp'), roots);
    assert.equal(worktreeProject._tag, 'GitProject');
    assert.equal(worktreeProject.root, worktree);
    assert.notEqual(worktreeProject.key, project.key);
  }));

  test('uses the closest containing workspace, then the source directory, never the process cwd', () => fixture(async (directory) => {
    const root = path.join(directory, 'project');
    const nested = path.join(root, 'component');
    await mkdir(nested, { recursive: true });
    const source = path.join(nested, 'main.cpp');
    await writeFile(source, 'int main() {}');
    const project = await resolveCacheProject(source, [root, nested, path.join(directory, 'other')]);
    assert.equal(project._tag, 'WorkspaceProject');
    assert.equal(project.root, nested);
    const standalone = await resolveCacheProject(source, [path.join(directory, 'other')]);
    assert.equal(standalone._tag, 'SourceDirectoryProject');
    assert.equal(standalone.root, nested);
    await assert.rejects(resolveCacheProject('relative.cpp', []), /absolute path/);
  }));

  test('canonicalizes symlinked workspace/source directories to a stable project key', () => fixture(async (directory) => {
    const root = path.join(directory, 'project');
    const source = await repository(root);
    const alias = path.join(directory, 'alias');
    await symlink(root, alias, 'dir');
    assert.deepEqual(await resolveCacheProject(source, []), await resolveCacheProject(path.join(alias, 'main.cpp'), [alias]));
  }));

  test('ignores invalid Git markers and never selects a sibling workspace', () => fixture(async (directory) => {
    const root = path.join(directory, 'project');
    const sibling = path.join(directory, 'project-other');
    await mkdir(root);
    await mkdir(sibling);
    const source = path.join(root, 'main.cpp');
    await writeFile(source, 'int main() {}');
    await mkdir(path.join(root, '.git'));
    const project = await resolveCacheProject(source, [sibling]);
    assert.equal(project._tag, 'SourceDirectoryProject');
    assert.equal(project.root, root);
    await rm(path.join(root, '.git'), { recursive: true });
    await writeFile(path.join(root, '.git'), 'gitdir: nonexistent\n');
    assert.deepEqual(await resolveCacheProject(source, [sibling]), project);
    await writeFile(path.join(root, '.git'), 'invalid marker');
    assert.deepEqual(await resolveCacheProject(source, [sibling]), project);
    await chmod(path.join(root, '.git'), 0o000);
    try {
      const unreadable = await resolveCacheProject(source, [sibling]);
      assert.equal(unreadable.root, root);
      assert.equal(unreadable._tag, process.getuid?.() === 0 ? 'SourceDirectoryProject' : 'UnreadableGitProject');
    }
    finally { await chmod(path.join(root, '.git'), 0o600); }
  }));

  test('preserves an unreadable nested Git boundary instead of using its outer repository', { skip: process.getuid?.() === 0 }, () => fixture(async (directory) => {
    const root = path.join(directory, 'outer');
    await repository(root);
    const nested = path.join(root, 'nested');
    const source = await repository(nested);
    await chmod(path.join(nested, '.git'), 0o000);
    try {
      const project = await resolveCacheProject(source, [root]);
      assert.equal(project._tag, 'UnreadableGitProject');
      assert.equal(project.root, nested);
    } finally { await chmod(path.join(nested, '.git'), 0o700); }
  }));

  test('refuses an ignore-file symlink and preserves the project root ignore content', () => fixture(async (directory) => {
    const root = path.join(directory, 'project');
    const source = await repository(root);
    const cacheRoot = path.join(root, '.cache', 'fold-state-jump');
    await mkdir(cacheRoot, { recursive: true });
    const ignore = path.join(root, '.gitignore');
    await writeFile(ignore, 'user-owned\n');
    await symlink(ignore, path.join(cacheRoot, '.gitignore'));
    const location = await prepareCacheLocation({ source, workspaceRoots: [], globalStorage: path.join(directory, 'global') });
    assert.equal(location._tag, 'GlobalFallbackCache');
    assert.equal(await readFile(ignore, 'utf8'), 'user-owned\n');
  }));

  test('namespaces a shared custom cache base and resolves relative configuration from the project', () => fixture(async (directory) => {
    const source = await repository(path.join(directory, 'first'));
    const otherSource = await repository(path.join(directory, 'second'));
    const shared = path.join(directory, 'shared');
    const globalStorage = path.join(directory, 'global');
    const location = available(await prepareCacheLocation({ source, workspaceRoots: [], globalStorage, configuredPath: shared }));
    const otherLocation = available(await prepareCacheLocation({ source: otherSource, workspaceRoots: [], globalStorage, configuredPath: shared }));
    assert.equal(location._tag, 'ConfiguredCache');
    assert.notEqual(location.astDirectory, otherLocation.astDirectory);
    assert.equal(location.root, path.join(shared, location.project.key));
    const relative = available(await prepareCacheLocation({ source, workspaceRoots: [], globalStorage, configuredPath: 'custom-cache' }));
    assert.equal(relative.root, path.join(path.dirname(source), 'custom-cache', location.project.key));
    await writeFile(path.join(otherLocation.astDirectory, 'keep.ast'), 'keep');
    await rm(location.astDirectory, { recursive: true });
    assert.equal(await readFile(path.join(otherLocation.astDirectory, 'keep.ast'), 'utf8'), 'keep');
  }));

  test('falls back independently per project on local I/O failures and disables disk if both fail', () => fixture(async (directory) => {
    const source = await repository(path.join(directory, 'first'));
    const otherSource = await repository(path.join(directory, 'second'));
    await Promise.all([source, otherSource].map((source) => writeFile(path.join(path.dirname(source), '.cache'), 'blocked')));
    const globalStorage = path.join(directory, 'global');
    const location = available(await prepareCacheLocation({ source, workspaceRoots: [], globalStorage }));
    const otherLocation = available(await prepareCacheLocation({ source: otherSource, workspaceRoots: [], globalStorage }));
    assert.equal(location._tag, 'GlobalFallbackCache');
    assert.notEqual(location.astDirectory, otherLocation.astDirectory);
    assert.equal(location.root, path.join(globalStorage, 'project-cache-v2', location.project.key));
    const blockedGlobal = path.join(directory, 'blocked-global');
    await writeFile(blockedGlobal, 'blocked');
    assert.equal((await prepareCacheLocation({ source, workspaceRoots: [], globalStorage: blockedGlobal }))._tag, 'UnavailableCache');
  }));

  test('handles real read-only project permissions without touching root ignore files', { skip: process.getuid?.() === 0 }, () => fixture(async (directory) => {
    const root = path.join(directory, 'project');
    const source = await repository(root);
    await chmod(root, 0o500);
    try {
      const location = await prepareCacheLocation({ source, workspaceRoots: [], globalStorage: path.join(directory, 'global') });
      assert.equal(location._tag, 'GlobalFallbackCache');
      await assert.rejects(readFile(path.join(root, '.gitignore')), { code: 'ENOENT' });
    } finally { await chmod(root, 0o700); }
  }));
});
