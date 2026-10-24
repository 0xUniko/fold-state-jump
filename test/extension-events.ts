// Opt-in Bun API harness. Runs actual activate callbacks and tiny native Clang
// processes; does not start VS Code, an Extension Host, a window or UI automation.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay, setImmediate as nextTurn } from 'node:timers/promises';
import { Effect, Ref } from 'effect';
import type * as VSCode from 'vscode';
import { resolveCacheProject } from '../src/cache-location';

// Keep this opt-in harness independent of production TypeScript's Node types.
const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void; restore(): void } };
const bun = (globalThis as unknown as { Bun: { version: string } }).Bun;
const directory = await mkdtemp(path.join(os.tmpdir(), 'fsj-extension-events-'));
const source = path.join(directory, 'pipeline.h');
const dependency = path.join(directory, 'ffn.h');
const unrelated = path.join(directory, 'unrelated.cpp');
const sourceText = '#include "ffn.h"\ninline void pipeline(State &s) { mutate(s); }\n';
const dependencyText = (value: number) => 'struct State { int value; };\ninline void mutate(State &s) { s.value = ' + value + '; }\n';
await writeFile(source, sourceText);
await writeFile(dependency, dependencyText(1));
await writeFile(unrelated, '// unrelated\n');
const documents = Ref.makeUnsafe(new Map([
  [source, { text: sourceText, version: 1, dirty: false }],
  [dependency, { text: dependencyText(1), version: 1, dirty: false }],
  [unrelated, { text: '// unrelated\n', version: 1, dirty: false }]
]));
const document = (file: string) => ({
  uri: { scheme: 'file', fsPath: file }, languageId: 'cpp', isClosed: false,
  get version() { return Effect.runSync(Ref.get(documents)).get(file)!.version; },
  get isDirty() { return Effect.runSync(Ref.get(documents)).get(file)!.dirty; },
  getText: () => Effect.runSync(Ref.get(documents)).get(file)!.text,
  offsetAt: () => 0
});
const sourceDocument = document(source);
const dependencyDocument = document(dependency);
const unrelatedDocument = document(unrelated);
const callbacks = Ref.makeUnsafe<ReadonlyMap<string, (event?: any) => unknown>>(new Map());
const commands = Ref.makeUnsafe<ReadonlyMap<string, () => Promise<unknown>>>(new Map());
const events = Ref.makeUnsafe<readonly Readonly<Record<string, unknown>>[]>([]);
const notices = new EventEmitter();
const disposable = () => ({ dispose() {} });
const record = (event: Readonly<Record<string, unknown>>) => {
  Effect.runSync(Ref.update(events, (events) => [...events, event]));
  notices.emit('event', event);
};
const register = (name: string) => (callback: (event?: any) => unknown) => {
  assert.equal(Effect.runSync(Ref.get(callbacks)).has(name), false, 'Unexpected duplicate callback ' + name);
  Effect.runSync(Ref.update(callbacks, (callbacks) => new Map([...callbacks, [name, callback]])));
  return disposable();
};
const fire = (name: string, event?: unknown) => {
  const callback = Effect.runSync(Ref.get(callbacks)).get(name);
  assert.ok(callback, 'Missing extension callback ' + name);
  return callback(event);
};
const invoke = (name: string) => {
  const command = Effect.runSync(Ref.get(commands)).get('foldStateJump.' + name);
  assert.ok(command, 'Missing extension command ' + name);
  return command();
};
const snapshot = () => Effect.runSync(Ref.get(events));
const count = (event: string) => snapshot().filter((entry) => entry.event === event).length;
const waitFor = (predicate: (event: Readonly<Record<string, unknown>>) => boolean, from: number) => {
  const existing = snapshot().slice(from).find(predicate);
  if (existing) return Promise.resolve(existing);
  return new Promise<Readonly<Record<string, unknown>>>((resolve, reject) => {
    const timer = setTimeout(() => {
      notices.off('event', listener);
      reject(new Error('Timed out awaiting extension event. Recent events: ' + JSON.stringify(snapshot().slice(-10))));
    }, 15000);
    const listener = (event: Readonly<Record<string, unknown>>) => {
      if (!predicate(event)) return;
      clearTimeout(timer);
      notices.off('event', listener);
      resolve(event);
    };
    notices.on('event', listener);
  });
};
const completed = async (from: number) => {
  const event = await waitFor((event) => event.event === 'complete', from);
  assert.equal(event.result, 'ExtractionReady');
  await nextTurn();
  return event;
};
const edit = (file: string, text: string, dirty: boolean) => Effect.runSync(Ref.update(documents, (documents) => {
  const previous = documents.get(file)!;
  return new Map([...documents, [file, { text, dirty, version: previous.version + 1 }]]);
}));
const output = { appendLine: (line: string) => {
  try { record(JSON.parse(line)); } catch { record({ event: 'output-text', text: line }); }
}, show() {}, dispose() {} };
const config = Ref.makeUnsafe<ReadonlyMap<string, unknown>>(new Map([['prewarm.delayMs', 20]]));
mock.module('vscode', () => ({
  window: { activeTextEditor: { document: sourceDocument }, createOutputChannel: () => output,
    onDidChangeActiveTextEditor: register('active-editor') },
  workspace: {
    workspaceFolders: [{ uri: { scheme: 'file', fsPath: directory } }],
    textDocuments: [sourceDocument, dependencyDocument, unrelatedDocument],
    getConfiguration: () => ({ get: (name: string, fallback: unknown) => Effect.runSync(Ref.get(config)).get(name) ?? fallback }),
    createFileSystemWatcher: (pattern: string) => {
      const name = pattern.includes('compile_commands') ? 'database' : 'source';
      return { onDidChange: register(name + ':change'), onDidCreate: register(name + ':create'),
        onDidDelete: register(name + ':delete'), dispose() {} };
    },
    onDidSaveTextDocument: register('save'), onDidChangeTextDocument: register('edit'),
    onDidChangeConfiguration: register('configuration'), onDidChangeWorkspaceFolders: register('workspace')
  },
  commands: { registerCommand: (name: string, command: () => Promise<unknown>) => {
    Effect.runSync(Ref.update(commands, (commands) => new Map([...commands, [name, command]])));
    return disposable();
  } }
}));
const extension = await import('../src/extension');
const subscriptions: VSCode.Disposable[] = [];
const startedAt = performance.now();
try {
  extension.activate({ extensionPath: path.resolve('.'), globalStorageUri: { fsPath: path.join(directory, 'global-storage') }, subscriptions } as unknown as VSCode.ExtensionContext);
  await completed(0);
  assert.equal(count('native-start'), 1);
  record({ event: 'assertion', scenario: 'initial-active-file-prewarm', nativeStarts: count('native-start') });

  const dirtyFrom = snapshot().length;
  edit(dependency, dependencyText(2), true);
  fire('edit', { document: dependencyDocument, contentChanges: [{ text: dependencyText(2) }] });
  edit(dependency, dependencyText(3), true);
  fire('edit', { document: dependencyDocument, contentChanges: [{ text: dependencyText(3) }] });
  await delay(80);
  assert.equal(count('native-start'), 1);
  assert.equal(snapshot().slice(dirtyFrom).some((event) => event.event === 'scheduled'), false);
  await invoke('cacheStats');
  assert.equal(snapshot().filter((event) => event.event === 'cache-stats').at(-1)!.memoryEntries, 0);
  record({ event: 'assertion', scenario: 'consecutive-unsaved-dependency-edits-do-not-parse', nativeStarts: count('native-start') });

  const saveFrom = snapshot().length;
  await writeFile(dependency, dependencyText(3));
  edit(dependency, dependencyText(3), false);
  fire('save', dependencyDocument);
  fire('source:change', dependencyDocument.uri);
  await completed(saveFrom);
  assert.equal(count('native-start'), 2);
  record({ event: 'assertion', scenario: 'dependency-save-and-watcher-debounce', nativeStarts: count('native-start') });

  const cancelFrom = snapshot().length;
  await writeFile(dependency, dependencyText(4));
  edit(dependency, dependencyText(4), false);
  fire('save', dependencyDocument);
  const running = await waitFor((event) => event.event === 'native-start', cancelFrom);
  edit(dependency, dependencyText(5), true);
  fire('edit', { document: dependencyDocument, contentChanges: [{ text: dependencyText(5) }] });
  await waitFor((event) => event.event === 'cancelled', cancelFrom);
  await nextTurn();
  assert.throws(() => process.kill(running.pid as number, 0), (error: NodeJS.ErrnoException) => error.code === 'ESRCH');
  await delay(80);
  assert.equal(count('native-start'), 3);
  record({ event: 'assertion', scenario: 'unsaved-dependency-cancels-native-and-reaps-child', pid: running.pid });

  const rebuildFrom = snapshot().length;
  await writeFile(dependency, dependencyText(5));
  edit(dependency, dependencyText(5), false);
  fire('save', dependencyDocument);
  await completed(rebuildFrom);
  assert.equal(count('native-start'), 4);

  const unrelatedFrom = snapshot().length;
  edit(unrelated, '// edited unrelated\n', true);
  fire('edit', { document: unrelatedDocument, contentChanges: [{ text: '// edited unrelated\n' }] });
  await writeFile(unrelated, '// edited unrelated\n');
  edit(unrelated, '// edited unrelated\n', false);
  fire('save', unrelatedDocument);
  fire('source:change', unrelatedDocument.uri);
  await delay(80);
  assert.equal(count('native-start'), 4);
  assert.equal(snapshot().slice(unrelatedFrom).some((event) => event.event === 'scheduled'), false);
  record({ event: 'assertion', scenario: 'unrelated-buffer-save-and-watcher-do-not-prewarm', nativeStarts: count('native-start') });

  const clearFrom = snapshot().length;
  const project = await resolveCacheProject(source, [directory]);
  const fallback = path.join(directory, 'global-storage', 'project-cache-v2', project.key, 'ast');
  const otherFallback = path.join(directory, 'global-storage', 'project-cache-v2', 'other-project', 'ast');
  await Promise.all([fallback, otherFallback].map((directory) => mkdir(directory, { recursive: true })));
  await Promise.all([fallback, otherFallback].map((directory) => writeFile(path.join(directory, 'a'.repeat(64) + '.ast'), 'owned-clear-probe')));
  Effect.runSync(Ref.update(config, (config) => new Map([...config, ['cache.disk.enabled', false]])));
  const clearing = invoke('clearCache');
  fire('source:change', dependencyDocument.uri);
  await clearing;
  await delay(80);
  assert.equal(count('native-start'), 4);
  assert.equal(snapshot().slice(clearFrom).some((event) => event.event === 'scheduled'), false);
  const astDirectory = path.join(directory, '.cache', 'fold-state-jump', 'ast');
  assert.deepEqual((await readdir(astDirectory)).filter((name) => name.endsWith('.ast') || name.endsWith('.tmp')), []);
  assert.deepEqual(await readdir(fallback), []);
  assert.equal(await readFile(path.join(otherFallback, 'a'.repeat(64) + '.ast'), 'utf8'), 'owned-clear-probe');
  record({ event: 'assertion', scenario: 'disabled-cache-clear-blocks-prewarm-clears-default-and-fallback-preserves-other-project' });

  const resumeFrom = snapshot().length;
  fire('save', dependencyDocument);
  await completed(resumeFrom);
  assert.equal(count('native-start'), 5);
  await extension.deactivate();
  await invoke('cacheStats');
  const stats = snapshot().filter((event) => event.event === 'cache-stats').at(-1)!;
  assert.deepEqual((stats.scheduler as { tasks: unknown[] }).tasks, []);
  record({ event: 'assertion', scenario: 'prewarm-resumes-after-clear-and-deactivate-drains-tasks', nativeStarts: count('native-start') });
  console.log(JSON.stringify({ environment: { date: new Date().toISOString(), bun: bun.version, platform: process.platform,
    kernel: os.release(), cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), argv: process.argv },
    scope: 'Bun mock.module(vscode), actual activate callbacks, real tiny pipeline.h/ffn.h fixture and native Clang. No Extension Host/UI. Finite debounce exclusion waits of 80 ms; no performance claim.',
    samples: 1, elapsedMs: performance.now() - startedAt, events: snapshot() }, null, 2));
} finally {
  await extension.deactivate();
  subscriptions.map((subscription) => subscription.dispose());
  notices.removeAllListeners();
  mock.restore();
  await rm(directory, { recursive: true, force: true });
}
