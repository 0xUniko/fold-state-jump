// Actual extension commands and native extraction, with deterministic VS Code
// providers. This harness does not start an Extension Host or a C++ server.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import type * as vscode from 'vscode';
const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void; restore(): void } };
const directory = await mkdtemp(path.join(os.tmpdir(), 'fsj-callers-'));
const aggregateArguments = process.argv.includes('--aggregates');
const header = 'struct Bank { int records = 0; }; struct Session { Bank bank; };\nvoid leaf(Bank &); void middle(Session' +
  (aggregateArguments ? '' : ' &') + '); void consume(int);\ntemplate<class T, class F> T fold_left(T state, F fn) { return fn(state); }\n';
const sources = new Map([
  ['state.h', header],
  ['leaf.cpp', '#include "state.h"\nvoid leaf(Bank &bank) { consume(bank.records); }\n'],
  ['middle.cpp', '#include "state.h"\nvoid middle(Session &state) { auto &bank = state.bank; leaf(bank); }\n'],
  ['a.cpp', '#include "state.h"\nSession a() { return fold_left(Session{}, [](Session state) { state.bank.records = 10; middle(state); return state; }); }\n'],
  ['b.cpp', '#include "state.h"\nSession b() { return fold_left(Session{}, [](Session state) { middle(state); state.bank.records = 20; return state; }); }\n'],
  ['broken.cpp', '#include "missing-state.h"\nvoid broken() { middle(unknown); }\n']
].map(([file, text]) => [path.join(directory, file), aggregateArguments
  ? text.replace('middle(Session &state)', 'middle(Session state)').replace('middle(state)', 'middle({state.bank})') : text]));
await Promise.all([...sources].map(([file, text]) => writeFile(file, text)));
const uri = (file: string) => ({ scheme: 'file', fsPath: file, toString: () => 'file://' + file });
const buffers = Ref.makeUnsafe(new Map([...sources].map(([file, text]) => [file, { text, version: 1, dirty: false }])));
const positionAt = (text: string, offset: number) => ({ line: text.slice(0, offset).split('\n').length - 1, character: offset - (text.lastIndexOf('\n', offset - 1) + 1) });
const documents = new Map([...sources].map(([file]) => [file, {
  uri: uri(file), languageId: 'cpp', isClosed: false,
  get version() { return Effect.runSync(Ref.get(buffers)).get(file)!.version; },
  get isDirty() { return Effect.runSync(Ref.get(buffers)).get(file)!.dirty; },
  getText: () => Effect.runSync(Ref.get(buffers)).get(file)!.text,
  positionAt: (offset: number) => positionAt(Effect.runSync(Ref.get(buffers)).get(file)!.text, offset),
  offsetAt: (position: { line: number; character: number }) => Effect.runSync(Ref.get(buffers)).get(file)!.text.split('\n').slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.character
}]));
const leaf = documents.get(path.join(directory, 'leaf.cpp'))!;
const commands = Ref.makeUnsafe(new Map<string, () => Promise<unknown>>());
const state = Ref.makeUnsafe({ events: [] as any[], picks: [] as any[][], jumps: [] as string[], messages: [] as string[],
  cancelPick: false, references: false, invalidIncoming: false, noIndex: false, cancelAnalysis: false, editDuringPick: false,
  editDuringProvider: false, dirtyDependencyDuringPick: false, providerFailure: false, cancelDuringProvider: false, failedCaller: false });
const cancellation = Ref.makeUnsafe<() => void>(() => {});
const update = (change: Partial<typeof state extends Ref.Ref<infer A> ? A : never>) => Effect.runSync(Ref.update(state, (state) => ({ ...state, ...change })));
const append = (field: 'events' | 'picks' | 'jumps' | 'messages', value: any) => Effect.runSync(Ref.update(state, (state) => ({ ...state, [field]: [...state[field], value] })));
const disposable = () => ({ dispose() {} });
const locations = (name: string) => [...sources].flatMap(([file, text]) => {
  const start = name === 'leaf' && file.endsWith('middle.cpp') ? text.indexOf('leaf(bank)')
    : name === 'middle' && (/[ab]\.cpp$/.test(file) || file.endsWith('broken.cpp') && Effect.runSync(Ref.get(state)).failedCaller)
      ? text.indexOf('middle(') : -1;
  return start < 0 ? [] : [{ uri: uri(file), range: { start: positionAt(text, start), end: positionAt(text, start + name.length) } }];
});
mock.module('vscode', () => ({
  Uri: { file: uri }, Selection: class {}, Range: class {}, TextEditorRevealType: { InCenterIfOutsideViewport: 0 }, ProgressLocation: { Notification: 0 },
  window: {
    activeTextEditor: { document: leaf, get selection() { return { active: leaf.positionAt(leaf.getText().lastIndexOf('records')) }; } },
    createOutputChannel: () => ({ appendLine: (line: string) => append('events', JSON.parse(line)), dispose() {}, show() {} }),
    onDidChangeActiveTextEditor: () => disposable(),
    withProgress: async (_: unknown, action: any) => action({}, { get isCancellationRequested() { return Effect.runSync(Ref.get(state)).cancelAnalysis; }, onCancellationRequested: (callback: () => void) => { Effect.runSync(Ref.set(cancellation, callback)); return disposable(); } }),
    showQuickPick: async (items: any[]) => {
      append('picks', items);
      const settings = Effect.runSync(Ref.get(state));
      if (settings.editDuringPick) Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [leaf.uri.fsPath, { ...buffers.get(leaf.uri.fsPath)!, version: leaf.version + 1 }]])));
      if (settings.dirtyDependencyDuringPick) Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [path.join(directory, 'state.h'), { ...buffers.get(path.join(directory, 'state.h'))!, dirty: true }]])));
      return settings.cancelPick ? undefined : items[1];
    },
    showTextDocument: async (document: any) => { append('jumps', document.uri.fsPath); return { revealRange() {} }; },
    showInformationMessage: async (message: string) => { append('messages', message); },
    showErrorMessage: async (message: string) => { append('messages', message); }, setStatusBarMessage: (message: string) => append('messages', message)
  },
  workspace: {
    workspaceFolders: [{ uri: uri(directory) }], textDocuments: [...documents.values()],
    openTextDocument: async (uri: { fsPath: string }) => { const document = documents.get(uri.fsPath); assert.ok(document, uri.fsPath); return document; },
    asRelativePath: (uri: { fsPath: string }) => path.basename(uri.fsPath),
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => key === 'prewarm.enabled' || key === 'cache.disk.enabled' ? false : fallback }),
    createFileSystemWatcher: () => ({ onDidChange: () => disposable(), onDidCreate: () => disposable(), onDidDelete: () => disposable(), dispose() {} }),
    onDidSaveTextDocument: () => disposable(), onDidChangeTextDocument: () => disposable(), onDidChangeConfiguration: () => disposable(), onDidChangeWorkspaceFolders: () => disposable()
  },
  commands: {
    registerCommand: (name: string, command: () => Promise<unknown>) => { Effect.runSync(Ref.update(commands, (commands) => new Map([...commands, [name, command]]))); return disposable(); },
    executeCommand: async (command: string, target: any, position?: any) => {
      append('events', { event: 'provider', command });
      const settings = Effect.runSync(Ref.get(state));
      if (settings.cancelDuringProvider) Effect.runSync(Ref.get(cancellation))();
      if (settings.noIndex) return [];
      if (settings.providerFailure && command !== 'vscode.executeReferenceProvider') throw new Error('provider unavailable');
      if (settings.editDuringProvider) Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [leaf.uri.fsPath, { ...buffers.get(leaf.uri.fsPath)!, version: leaf.version + 1 }]])));
      if (command === 'vscode.prepareCallHierarchy') {
        if (settings.references) return [];
        const document = documents.get(target.fsPath)!;
        return [{ name: document.getText().slice(document.offsetAt(position)).split('(')[0] }];
      }
      if (command === 'vscode.provideIncomingCalls') return (settings.invalidIncoming ? locations('middle') : locations(target.name)).map((location) => ({ from: { uri: location.uri }, fromRanges: [location.range, location.range] }));
      assert.equal(command, 'vscode.executeReferenceProvider');
      const document = documents.get(target.fsPath)!;
      return locations(document.getText().slice(document.offsetAt(position)).split('(')[0]);
    }
  }
}));
const extension = await import('../src/extension');
const invoke = async (name: string) => {
  update({ picks: [], jumps: [], messages: [], events: [] });
  await Effect.runSync(Ref.get(commands)).get('foldStateJump.' + name)!();
  return Effect.runSync(Ref.get(state));
};
try {
  extension.activate({ extensionPath: path.resolve('.'), globalStorageUri: uri(path.join(directory, 'global')), subscriptions: [] } as unknown as vscode.ExtensionContext);
  const origin = await invoke('jumpToOrigin');
  assert.equal(origin.picks.length, 1, JSON.stringify(origin.messages));
  assert.equal(origin.picks[0].length, 2);
  assert.deepEqual(origin.jumps, [path.join(directory, 'b.cpp')]);
  assert.ok(origin.picks[0].every((item: any) => item.candidate.frames.length === 2 && /middle.*middle\.cpp:2/.test(item.label) && /\.cpp:2/.test(item.description)));
  assert.deepEqual(origin.events.filter((event) => event.event === 'native-extraction').map((event) => path.basename(event.source)).sort(), ['a.cpp', 'b.cpp', 'leaf.cpp', 'middle.cpp']);
  const mutation = await invoke('jumpToPreviousMutation');
  assert.equal(mutation.picks[0].length, 2);
  assert.deepEqual(mutation.jumps, [path.join(directory, 'b.cpp')]);
  assert.equal(mutation.picks[0][1].candidate.wrapped, true);
  assert.ok(mutation.messages.some((message) => /wrapped/.test(message)));
  assert.ok(mutation.messages.some((message) => /runtime reachability is not verified/.test(message)));
  if (aggregateArguments) {
    [origin, mutation].map((result) => result.picks[0].map((item: any) => {
      assert.deepEqual(item.candidate.frames.map((frame: any) => [frame.parameterIndex, frame.argument.members]),
        [[0, ['bank', 'records']], [0, ['bank', 'records']]]);
    }));
  }
  update({ cancelPick: true });
  assert.deepEqual((await invoke('jumpToOrigin')).jumps, []);
  update({ cancelPick: false, references: true });
  const references = await invoke('jumpToOrigin');
  assert.equal(references.picks[0].length, 2);
  assert.ok(references.events.some((event) => event.command === 'vscode.executeReferenceProvider'));
  update({ references: false, invalidIncoming: true });
  const invalid = await invoke('jumpToOrigin');
  assert.equal(invalid.picks[0].length, 2);
  assert.ok(invalid.events.some((event) => event.command === 'vscode.executeReferenceProvider'));
  update({ invalidIncoming: false, providerFailure: true });
  const unavailable = await invoke('jumpToOrigin');
  assert.equal(unavailable.picks[0].length, 2);
  assert.ok(unavailable.events.some((event) => event.event === 'caller-boundary' && /failed/.test(event.reason)));
  update({ providerFailure: false, failedCaller: true });
  const incomplete = await invoke('jumpToOrigin');
  assert.equal(incomplete.picks[0].length, 2, 'a failed caller must preserve the other verified paths');
  assert.ok(incomplete.events.some((event) => event.event === 'analysis-boundary' && /Caller set is incomplete/.test(event.reason)));
  update({ failedCaller: false });
  update({ providerFailure: false, noIndex: true });
  const missing = await invoke('jumpToOrigin');
  assert.equal(missing.picks.length, 0);
  assert.deepEqual(missing.jumps, [leaf.uri.fsPath]);
  assert.ok(missing.messages.some((message) => /No verified caller/.test(message)));
  assert.ok(missing.events.some((event) => event.event === 'analysis-boundary' && /no caller locations/.test(event.reason)));
  const cached = await invoke('jumpToOrigin');
  assert.equal(cached.events.filter((event) => event.event === 'native-extraction').length, 0);
  assert.equal((await invoke('jumpToPreviousMutation')).jumps.length, 0);
  update({ noIndex: false, cancelAnalysis: true });
  assert.deepEqual((await invoke('jumpToOrigin')).jumps, []);
  update({ cancelAnalysis: false, cancelDuringProvider: true });
  assert.deepEqual((await invoke('jumpToOrigin')).jumps, []);
  update({ cancelDuringProvider: false, editDuringPick: true });
  const changed = await invoke('jumpToOrigin');
  assert.deepEqual(changed.jumps, []);
  assert.ok(changed.messages.some((message) => /changed/.test(message)));
  update({ editDuringPick: false, dirtyDependencyDuringPick: true });
  assert.deepEqual((await invoke('jumpToOrigin')).jumps, []);
  update({ dirtyDependencyDuringPick: false });
  Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [path.join(directory, 'state.h'), { ...buffers.get(path.join(directory, 'state.h'))!, dirty: false }]])));
  const middle = documents.get(path.join(directory, 'middle.cpp'))!;
  Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [middle.uri.fsPath, { ...buffers.get(middle.uri.fsPath)!, dirty: true }]])));
  const dirty = await invoke('jumpToOrigin');
  assert.deepEqual(dirty.jumps, []);
  assert.ok(dirty.messages.some((message) => /changed/.test(message)));
  Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [middle.uri.fsPath, { ...buffers.get(middle.uri.fsPath)!, dirty: false }]])));
  update({ editDuringProvider: true });
  assert.deepEqual((await invoke('jumpToOrigin')).jumps, []);
  update({ editDuringProvider: false });
  const changedText = leaf.getText().replace('consume(bank.records)', 'bank.records = 3; consume(bank.records)');
  await writeFile(leaf.uri.fsPath, changedText);
  Effect.runSync(Ref.update(buffers, (buffers) => new Map([...buffers, [leaf.uri.fsPath, { text: changedText, version: leaf.version + 1, dirty: false }]])));
  const direct = await invoke('jumpToPreviousMutation');
  assert.deepEqual(direct.jumps, [leaf.uri.fsPath]);
  assert.equal(direct.events.filter((event) => event.event === 'provider').length, 0);
  console.log('Caller commands: origin/mutation QuickPick, complete frames, separate folds, duplicate ranges, reference fallback, provider failure, missing index, cancellation, dirty caller/dependency, and stale documents passed.');
} finally {
  await extension.deactivate();
  mock.restore();
  await rm(directory, { recursive: true, force: true });
}
