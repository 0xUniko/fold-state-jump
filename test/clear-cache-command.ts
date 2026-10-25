// Actual activate/clearCache callbacks, with only the VS Code API mocked.
// Each invocation has its own module graph, temporary files and Native helpers.
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import type * as vscode from 'vscode';
import { resolveCacheProject } from '../src/cache-location';

const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void; restore(): void } };
const scenario = process.argv[2];
assert.ok(['default', 'absolute', 'relative', 'missing', 'non-executable', 'lock-failure', 'ast-failure', 'pch-partial'].includes(scenario));
const root = await mkdtemp(path.join(tmpdir(), 'fsj-clear-cache-'));
const extensionPath = path.join(root, 'extension installation');
const projectRoot = path.join(root, 'project');
const source = path.join(projectRoot, 'main.cpp');
const document = { uri: { scheme: 'file', fsPath: source }, languageId: 'cpp', isDirty: false, isClosed: false };
const globalStorage = path.join(root, 'global');
const defaultExecutable = path.join(extensionPath, 'native', 'build', 'fold-state-jump-ast');
const customExecutable = path.join(extensionPath, 'custom tools', 'extractor');
const executable = scenario === 'default' ? defaultExecutable : customExecutable;
const defaultLog = path.join(root, 'default.log');
const customLog = path.join(root, 'custom.log');
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
const wrapper = async (executable: string, log: string, fail = false) => {
  await mkdir(path.dirname(executable), { recursive: true });
  await writeFile(executable, '#!/bin/sh\nprintf \'%s\\n\' "$*" >> ' + quote(log) + '\n' +
    (fail ? 'exit 1\n' : 'exec ' + quote(path.resolve('native/build/fold-state-jump-ast')) + ' "$@"\n'), { mode: 0o700 });
};
const commands = Ref.makeUnsafe<ReadonlyMap<string, () => Promise<unknown>>>(new Map());
const output = Ref.makeUnsafe<readonly Record<string, any>[]>([]);
const subscriptions: vscode.Disposable[] = [];
const disposable = () => ({ dispose() {} });
const invoke = () => {
  const command = Effect.runSync(Ref.get(commands)).get('foldStateJump.clearCache');
  assert.ok(command);
  return command();
};
const configuredExtractor = scenario === 'default' ? undefined
  : scenario === 'relative' ? 'custom tools/extractor' : customExecutable;
const configuration = Ref.makeUnsafe<string | undefined>('stale-extractor');
mock.module('vscode', () => ({
  window: {
    activeTextEditor: { document },
    createOutputChannel: () => ({ appendLine: (line: string) => {
      Effect.runSync(Ref.update(output, (output) => [...output, JSON.parse(line)]));
    }, dispose() {} }),
    onDidChangeActiveTextEditor: disposable
  },
  workspace: {
    workspaceFolders: [{ uri: { scheme: 'file', fsPath: projectRoot } }], textDocuments: [document],
    getConfiguration: (section: string, uri: unknown) => {
      assert.equal(section, 'foldStateJump');
      assert.equal(uri, document.uri, 'configuration must use the current document URI');
      return { get: (name: string, fallback: unknown) => name === 'extractorPath'
        ? Effect.runSync(Ref.get(configuration)) ?? fallback : name === 'prewarm.enabled' ? false : fallback };
    },
    createFileSystemWatcher: () => ({ onDidChange: disposable, onDidCreate: disposable, onDidDelete: disposable, dispose() {} }),
    onDidSaveTextDocument: disposable, onDidChangeTextDocument: disposable,
    onDidChangeConfiguration: disposable, onDidChangeWorkspaceFolders: disposable
  },
  commands: { registerCommand: (name: string, command: () => Promise<unknown>) => {
    Effect.runSync(Ref.update(commands, (commands) => new Map([...commands, [name, command]])));
    return disposable();
  } }
}));
const extension = await import('../src/extension');
try {
  await mkdir(projectRoot, { recursive: true });
  await writeFile(source, '// keep source\n');
  await writeFile(path.join(projectRoot, '.gitignore'), '# keep project ignore\n');
  await wrapper(defaultExecutable, defaultLog);
  if (scenario !== 'missing') await wrapper(customExecutable, customLog, scenario === 'lock-failure');
  if (scenario === 'non-executable') await chmod(customExecutable, 0o600);
  extension.activate({ extensionPath, globalStorageUri: { fsPath: globalStorage }, subscriptions } as unknown as vscode.ExtensionContext);
  // A change after activation must be read by the command when it runs.
  Effect.runSync(Ref.set(configuration, configuredExtractor));
  const project = await resolveCacheProject(source, [projectRoot]);
  const local = path.join(projectRoot, '.cache', 'fold-state-jump');
  const fallback = path.join(globalStorage, 'project-cache-v2', project.key);
  const identity = 'a'.repeat(64);
  const userFile = path.join(root, 'user-file');
  await writeFile(userFile, 'keep user data');
  await Promise.all([local, fallback].map(async (directory) => {
    await mkdir(path.join(directory, 'ast'), { recursive: true });
    await mkdir(path.join(directory, 'pch'), { recursive: true });
    await writeFile(path.join(directory, 'ast', identity + '.ast'), 'cached AST');
    await writeFile(path.join(directory, 'pch', identity + '.pch'), 'cached PCH');
    await writeFile(path.join(directory, 'pch', identity + '.json'), 'cached manifest');
    await writeFile(path.join(directory, 'pch', identity + '.lock'), '');
    await writeFile(path.join(directory, 'pch', 'notes.txt'), 'keep notes');
    await symlink(userFile, path.join(directory, 'pch', 'user-link'));
  }));
  const lockStamps = await Promise.all([local, fallback].map((directory) => stat(path.join(directory, 'pch', identity + '.lock'))));
  if (scenario === 'ast-failure') {
    await rm(path.join(fallback, 'ast'), { recursive: true });
    await writeFile(path.join(fallback, 'ast'), 'keep blocking user file');
  }
  if (scenario === 'pch-partial') {
    await rm(path.join(fallback, 'pch', identity + '.lock'));
    await symlink(userFile, path.join(fallback, 'pch', identity + '.lock'));
  }
  await invoke();
  const report = Effect.runSync(Ref.get(output)).filter((event) => ['cache-cleared', 'cache-clear-incomplete'].includes(event.event));
  assert.equal(report.length, 1);
  const failedExtractor = ['missing', 'non-executable', 'lock-failure'].includes(scenario);
  const incomplete = failedExtractor || scenario === 'ast-failure' || scenario === 'pch-partial';
  assert.equal(report[0].event, incomplete ? 'cache-clear-incomplete' : 'cache-cleared');
  assert.equal(report[0].pch.executable, executable);
  assert.equal(report[0].ast.memoryCleared, true);
  assert.deepEqual(report[0].ast.directories, [fallback, local].map((directory) => ({
    directory: path.join(directory, 'ast'), cleared: !(scenario === 'ast-failure' && directory === fallback)
  })));
  assert.deepEqual(report[0].pch.directories, [fallback, local].map((directory) => ({
    directory: path.join(directory, 'pch'), cleared: !failedExtractor && !(scenario === 'pch-partial' && directory === fallback)
  })));
  if (incomplete) assert.match(report[0].message, /Cache clearing incomplete/);
  if (failedExtractor || scenario === 'pch-partial') {
    assert.match(report[0].message, /PCH cache cleanup failed/);
    assert.ok(report[0].message.includes(executable));
    assert.match(report[0].message, /--pch-lock/);
  }
  if (scenario === 'ast-failure') {
    assert.match(report[0].message, /AST disk cache cleanup failed/);
    assert.equal(await readFile(path.join(fallback, 'ast'), 'utf8'), 'keep blocking user file');
  }
  await Promise.all([local, fallback].map(async (directory, index) => {
    const pch = path.join(directory, 'pch');
    const retained = failedExtractor || (scenario === 'pch-partial' && directory === fallback);
    assert.equal((await readdir(pch)).includes(identity + '.pch'), retained);
    assert.equal((await readdir(pch)).includes(identity + '.json'), retained);
    assert.equal(await readFile(path.join(pch, 'notes.txt'), 'utf8'), 'keep notes');
    assert.equal(await readFile(path.join(pch, 'user-link'), 'utf8'), 'keep user data');
    if (!(scenario === 'pch-partial' && directory === fallback)) {
      const lockStamp = await stat(path.join(pch, identity + '.lock'));
      assert.equal(lockStamp.ino, lockStamps[index].ino, 'clear must retain the original lock inode');
    }
    if (!(scenario === 'ast-failure' && directory === fallback)) assert.deepEqual(await readdir(path.join(directory, 'ast')), []);
  }));
  const log = await readFile(scenario === 'default' ? defaultLog : customLog, 'utf8').catch(() => '');
  assert.deepEqual(log.trim().split('\n').filter(Boolean),
    Array.from({ length: ['missing', 'non-executable'].includes(scenario) ? 0 : scenario === 'pch-partial' ? 1 : 2 }, () => '--pch-lock'));
  if (scenario !== 'default') await assert.rejects(readFile(defaultLog), { code: 'ENOENT' });
  assert.equal(await readFile(source, 'utf8'), '// keep source\n');
  assert.equal(await readFile(path.join(projectRoot, '.gitignore'), 'utf8'), '# keep project ignore\n');
  assert.equal(await readFile(userFile, 'utf8'), 'keep user data');
} finally {
  await extension.deactivate();
  subscriptions.map((subscription) => subscription.dispose());
  mock.restore();
  await rm(root, { recursive: true, force: true });
}
