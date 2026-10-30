// Real extension adapter + native ASTs; VS Code language-service responses are
// deterministic so complementary providers and failed items can be asserted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import type * as vscode from 'vscode';
import { analyzeQuery, callerLinksAt, prepareAst, type ClangNode } from '../src/analysis';

const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void; restore(): void } };
const directory = await mkdtemp(path.join(os.tmpdir(), 'fsj-member-callers-'));
const sources = new Map(['state.h', 'state.cpp', 'caller.cpp'].map((file) =>
  [path.join(directory, file), readFileSync(path.join('test/fixtures/member-callers', file), 'utf8')]));
await Promise.all([...sources].map(([file, text]) => writeFile(file, text)));
const uri = (file: string) => ({ scheme: 'file', fsPath: file, toString: () => 'file://' + file });
const positionAt = (text: string, offset: number) => ({ line: text.slice(0, offset).split('\n').length - 1,
  character: offset - (text.lastIndexOf('\n', offset - 1) + 1) });
const documents = new Map([...sources].map(([file, text]) => [file, {
  uri: uri(file), languageId: 'cpp', isClosed: false, isDirty: false, version: 1, getText: () => text,
  positionAt: (offset: number) => positionAt(text, offset),
  offsetAt: (position: { line: number; character: number }) => text.split('\n').slice(0, position.line)
    .reduce((offset, line) => offset + line.length + 1, 0) + position.character
}]));
const document = documents.get(path.join(directory, 'state.cpp'))!;
const callerDocument = documents.get(path.join(directory, 'caller.cpp'))!;
const sourceText = document.getText();
const callerText = callerDocument.getText();
const markerOffset = (text: string, marker: string) => {
  const offset = text.indexOf('// @' + marker + '\n');
  assert.ok(offset >= 0, marker);
  return text.lastIndexOf('\n', offset) + 1;
};
const location = (marker: string) => {
  const line = markerOffset(callerText, 'call ' + marker);
  const start = callerText.indexOf(marker === 'outer' ? 'helper' : 'inspect', line);
  return { uri: callerDocument.uri, range: { start: callerDocument.positionAt(start), end: callerDocument.positionAt(start + (marker === 'outer' ? 6 : 7)) } };
};
type ProviderSettings = {
  readonly incoming: 'all' | 'merge' | 'partial' | 'prepare-failure' | 'none' | 'cancel' | 'abort';
  readonly references: 'all' | 'merge' | 'failure' | 'none' | 'cancel';
  readonly nested: boolean;
};
const settings = Ref.makeUnsafe<ProviderSettings>({ incoming: 'all', references: 'all', nested: false });
const events = Ref.makeUnsafe<any[]>([]);
const picks = Ref.makeUnsafe<any[][]>([]);
const jumps = Ref.makeUnsafe<{ file: string; offset: number }[]>([]);
const commands = Ref.makeUnsafe(new Map<string, () => Promise<unknown>>());
const abort = Ref.makeUnsafe<() => void>(() => {});
const record = (event: unknown) => Effect.runSync(Ref.update(events, (events) => [...events, event]));
const configure = (change: Partial<ProviderSettings>) => Effect.runSync(Ref.update(settings, (settings) => ({ ...settings, ...change })));
const cancelled = () => Object.assign(new Error('Canceled'), { name: 'Canceled' });
const disposable = () => ({ dispose() {} });
const locations = (name: string, markers: readonly string[]) =>
  (name === 'State::inspect' ? markers : name === 'Session::inspect' ? ['nested'] : name === 'helper' ? ['outer'] : []).map(location);
mock.module('vscode', () => ({
  Uri: { file: uri }, Selection: class {
    constructor(readonly start: { line: number; character: number }) {}
  }, Range: class {}, TextEditorRevealType: { InCenterIfOutsideViewport: 0 }, ProgressLocation: { Notification: 0 },
  window: {
    activeTextEditor: { document, get selection() {
      const marker = Effect.runSync(Ref.get(settings)).nested ? 'nested' : 'object';
      return { active: document.positionAt(sourceText.indexOf('records', markerOffset(sourceText, 'case ' + marker))) };
    } },
    createOutputChannel: () => ({ appendLine: (line: string) => record(JSON.parse(line)), dispose() {}, show() {} }),
    onDidChangeActiveTextEditor: disposable,
    withProgress: async (_: unknown, action: any) => action({}, { isCancellationRequested: false, onCancellationRequested: disposable }),
    showQuickPick: async (items: any[]) => { Effect.runSync(Ref.update(picks, (picks) => [...picks, items])); return items[0]; },
    showTextDocument: async (document: any) => ({ set selection(selection: any) {
      Effect.runSync(Ref.update(jumps, (jumps) => [...jumps, { file: document.uri.fsPath, offset: document.offsetAt(selection.start) }]));
    }, revealRange() {} }),
    showInformationMessage: async (message: string) => record({ message }),
    showErrorMessage: async (message: string) => record({ message }), setStatusBarMessage: (message: string) => record({ message })
  },
  workspace: {
    workspaceFolders: [{ uri: uri(directory) }], textDocuments: [...documents.values()],
    openTextDocument: async (uri: { fsPath: string }) => { const document = documents.get(uri.fsPath); assert.ok(document); return document; },
    asRelativePath: (uri: { fsPath: string }) => path.basename(uri.fsPath),
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => key === 'analysisEngine' ? 'legacy' : key === 'prewarm.enabled' || key === 'cache.disk.enabled' ? false : fallback }),
    createFileSystemWatcher: () => ({ onDidChange: disposable, onDidCreate: disposable, onDidDelete: disposable, dispose() {} }),
    onDidSaveTextDocument: disposable, onDidChangeTextDocument: disposable, onDidChangeConfiguration: disposable, onDidChangeWorkspaceFolders: disposable
  },
  commands: {
    registerCommand: (name: string, command: () => Promise<unknown>) => {
      Effect.runSync(Ref.update(commands, (commands) => new Map([...commands, [name, command]]))); return disposable();
    },
    executeCommand: async (command: string, target: any, position?: any) => {
      const { incoming, references } = Effect.runSync(Ref.get(settings));
      record({ command });
      if (command === 'vscode.prepareCallHierarchy') {
        if (incoming === 'prepare-failure') throw new Error('prepare unavailable');
        if (incoming === 'none') return [];
        const document = documents.get(target.fsPath)!;
        const name = document.getText().slice(document.offsetAt(position)).split('(')[0];
        return ['A', 'B'].map((item) => ({ name: item, fn: name === 'inspect' ? document.getText().slice(0, document.offsetAt(position)).endsWith('State::') ? 'State::inspect' : 'Session::inspect' : name }));
      }
      if (command === 'vscode.provideIncomingCalls') {
        if (incoming === 'cancel') throw cancelled();
        if (incoming === 'abort') { Effect.runSync(Ref.get(abort))(); throw new Error('provider interrupted'); }
        if (incoming === 'partial' && target.name === 'B') throw new Error('B unavailable');
        const markers = incoming === 'merge' ? target.name === 'A' ? ['A', 'C'] : []
          : target.name === 'A' ? ['A', 'C', 'helper'] : ['B'];
        return locations(target.fn, markers).map((location) => ({ from: { uri: location.uri }, fromRanges: [location.range] }));
      }
      assert.equal(command, 'vscode.executeReferenceProvider');
      if (references === 'failure') throw new Error('references unavailable');
      if (references === 'cancel') throw cancelled();
      if (references === 'none') return [];
      const document = documents.get(target.fsPath)!;
      const name = document.getText().slice(document.offsetAt(position)).split('(')[0];
      const fn = name === 'inspect' ? document.getText().slice(0, document.offsetAt(position)).endsWith('State::') ? 'State::inspect' : 'Session::inspect' : name;
      return locations(fn, references === 'merge' ? ['B', 'C', 'overload', 'reference', 'argument'] : ['A', 'B', 'C', 'helper', 'overload', 'reference', 'argument']);
    }
  }
}));
const { discoverCallerLocations } = await import('../src/caller-discovery');
const extension = await import('../src/extension');
const extract = (file: string) => {
  const result = spawnSync(path.resolve('native/build/fold-state-jump-ast'), ['--source', file, '--', '-std=c++17'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return prepareAst(JSON.parse(result.stdout) as ClangNode);
};
try {
  const prepared = extract(document.uri.fsPath);
  const callerPrepared = extract(callerDocument.uri.fsPath);
  const query = analyzeQuery('origin', prepared.ast, { file: document.uri.fsPath, sourceText,
    cursorByteOffset: sourceText.indexOf('records', markerOffset(sourceText, 'case object')) }, prepared);
  const fn = query.boundaries[0];
  assert.ok(fn);
  const discover = (signal = new AbortController().signal) => discoverCallerLocations(fn, document as unknown as vscode.TextDocument, signal);
  const verified = (found: Awaited<ReturnType<typeof discover>>) => found.locations.flatMap((location) => callerLinksAt(
    callerPrepared, location.uri.fsPath, callerDocument.offsetAt(location.range.start), callerDocument.offsetAt(location.range.end), fn));
  const callOffsets = (markers: readonly string[]) => markers.map((marker) => markerOffset(callerText, 'call ' + marker) + 2).sort((a, b) => a - b);
  const verify = (found: Awaited<ReturnType<typeof discover>>, markers: readonly string[]) => {
    assert.deepEqual(verified(found).map((link) => link.callsite.node.range?.begin?.offset).sort((a, b) => a! - b!), callOffsets(markers));
  };
  configure({ references: 'none' });
  const allIncoming = await discover();
  verify(allIncoming, ['A', 'B', 'C', 'helper']);
  assert.deepEqual(allIncoming.diagnostics, []);
  configure({ incoming: 'partial' });
  const partial = await discover();
  verify(partial, ['A', 'C', 'helper']);
  assert.equal(partial.diagnostics.length, 1);
  assert.match(partial.diagnostics[0], /B.*B unavailable/);
  configure({ incoming: 'merge', references: 'merge' });
  const merged = await discover();
  verify(merged, ['A', 'B', 'C']);
  assert.equal(merged.locations.length, 6); // A/B/C once, plus three rejected references.
  assert.deepEqual(merged.diagnostics, []);
  configure({ incoming: 'prepare-failure', references: 'all' });
  const references = await discover();
  verify(references, ['A', 'B', 'C', 'helper']);
  assert.match(references.diagnostics[0], /prepare unavailable/);
  configure({ incoming: 'all', references: 'failure' });
  const incoming = await discover();
  verify(incoming, ['A', 'B', 'C', 'helper']);
  assert.match(incoming.diagnostics[0], /references unavailable/);
  configure({ incoming: 'cancel', references: 'all' });
  await assert.rejects(discover(), { name: 'Canceled' });
  configure({ incoming: 'all', references: 'cancel' });
  await assert.rejects(discover(), { name: 'Canceled' });
  const controller = new AbortController();
  Effect.runSync(Ref.set(abort, () => controller.abort()));
  configure({ incoming: 'abort', references: 'all' });
  await assert.rejects(discover(controller.signal), { name: 'AbortError' });
  const alreadyAborted = new AbortController();
  alreadyAborted.abort();
  const eventCount = Effect.runSync(Ref.get(events)).length;
  await assert.rejects(discover(alreadyAborted.signal), { name: 'AbortError' });
  assert.equal(Effect.runSync(Ref.get(events)).length, eventCount);

  configure({ incoming: 'all', references: 'all' });
  extension.activate({ extensionPath: path.resolve('.'), globalStorageUri: uri(path.join(directory, 'global')), subscriptions: [] } as unknown as vscode.ExtensionContext);
  await ['jumpToOrigin', 'jumpToPreviousMutation'].reduce(async (work, command) => {
    await work;
    Effect.runSync(Ref.set(picks, []));
    Effect.runSync(Ref.set(jumps, []));
    await Effect.runSync(Ref.get(commands)).get('foldStateJump.' + command)!();
    const found = Effect.runSync(Ref.get(picks));
    assert.equal(found.length, 1, JSON.stringify(Effect.runSync(Ref.get(events))));
    assert.equal(found[0].length, 4);
    const origin = command === 'jumpToOrigin';
    const prefix = origin ? 'origin ' : 'write ';
    assert.deepEqual(found[0].map((item: any) => (origin ? item.candidate.origin : item.candidate.mutation).node.range.begin.offset).sort((a: number, b: number) => a - b),
      ['A', 'B', 'C', 'helper'].map((marker) => markerOffset(callerText, prefix + marker) + 2).sort((a, b) => a - b));
    assert.ok(found[0].every((item: any) => (origin ? item.candidate.origin : item.candidate.mutation).file === callerDocument.uri.fsPath));
    assert.deepEqual(found[0].map((item: any) => item.candidate.frames.length).sort(), [1, 1, 1, 2]);
    assert.deepEqual(found[0].map((item: any) => item.candidate.frames[0].receiver.rootName).sort(), ['other', 'pointer', 'state', 'state']);
    assert.equal(Effect.runSync(Ref.get(jumps))[0].file, callerDocument.uri.fsPath);
  }, Promise.resolve());
  configure({ incoming: 'merge', references: 'merge' });
  Effect.runSync(Ref.set(picks, []));
  await Effect.runSync(Ref.get(commands)).get('foldStateJump.jumpToOrigin')!();
  const mergedPicks = Effect.runSync(Ref.get(picks));
  assert.equal(mergedPicks[0].length, 3);
  assert.deepEqual(mergedPicks[0].map((item: any) => item.candidate.frames[0].receiver.rootName).sort(), ['other', 'pointer', 'state']);
  configure({ incoming: 'partial', references: 'none' });
  Effect.runSync(Ref.set(picks, []));
  Effect.runSync(Ref.set(events, []));
  await Effect.runSync(Ref.get(commands)).get('foldStateJump.jumpToOrigin')!();
  assert.equal(Effect.runSync(Ref.get(picks))[0].length, 3);
  assert.ok(Effect.runSync(Ref.get(events)).some((event) => event.event === 'caller-boundary' && /B unavailable/.test(event.reason)));
  configure({ incoming: 'all', references: 'all' });
  configure({ nested: true });
  await ['jumpToOrigin', 'jumpToPreviousMutation'].reduce(async (work, command) => {
    await work;
    Effect.runSync(Ref.set(jumps, []));
    await Effect.runSync(Ref.get(commands)).get('foldStateJump.' + command)!();
    assert.deepEqual(Effect.runSync(Ref.get(jumps)), [{ file: callerDocument.uri.fsPath,
      offset: markerOffset(callerText, (command === 'jumpToOrigin' ? 'origin ' : 'write ') + 'nested') + 2 }]);
  }, Promise.resolve());
  console.log('Member caller adapter: multiple items, partial failure, complementary union, deduplication, Clang rejection, cancellation, object/pointer/nested receivers, distinct objects and helper frames passed.');
} finally {
  await extension.deactivate();
  mock.restore();
  await rm(directory, { recursive: true, force: true });
}
