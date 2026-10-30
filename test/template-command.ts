// Real activate(), native extraction, recursive discovery and navigation with
// deterministic providers. No Extension Host is launched by this harness.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import type * as vscode from 'vscode';
const { mock } = await import('bun:test' as string) as { mock: { module(name: string, factory: () => unknown): void } };
const directory = await mkdtemp(path.join(os.tmpdir(), 'fsj-template-command-'));
const sources = new Map(['template-state.h', 'template-state.cpp'].map((name) =>
  [path.join(directory, name), readFileSync(path.join('test/fixtures', name), 'utf8')]));
await Promise.all([...sources].map(([file, text]) => writeFile(file, text)));
const uri = (file: string) => ({ scheme: 'file', fsPath: file, toString: () => 'file://' + file });
const positionAt = (text: string, offset: number) => ({ line: text.slice(0, offset).split('\n').length - 1,
  character: offset - text.lastIndexOf('\n', offset - 1) - 1 });
const documents = new Map([...sources].map(([file, text]) => [file, {
  uri: uri(file), languageId: 'cpp', isClosed: false, isDirty: false, version: 1, getText: () => text,
  positionAt: (offset: number) => positionAt(text, offset),
  offsetAt: (position: { line: number; character: number }) => text.split('\n').slice(0, position.line)
    .reduce((offset, line) => offset + line.length + 1, 0) + position.character
}]));
const document = documents.get(path.join(directory, 'template-state.h'))!;
const state = Ref.makeUnsafe({ marker: 'member-declaration', pick: 0, candidates: [] as any[], jumps: [] as number[] });
const commands = Ref.makeUnsafe(new Map<string, () => Promise<unknown>>());
const disposable = () => ({ dispose() {} });
const selectedOffset = () => document.getText().lastIndexOf('state', document.getText().indexOf('// @' + Effect.runSync(Ref.get(state)).marker));
const locations = (name: string) => [...sources].flatMap(([file, text]) => [...text.matchAll(new RegExp('\\b' + name + '\\s*\\(', 'g'))]
  .map((match) => ({ uri: uri(file), range: { start: positionAt(text, match.index), end: positionAt(text, match.index + name.length) } })));
mock.module('vscode', () => ({
  Uri: { file: uri }, Selection: class { constructor(readonly start: { line: number; character: number }) {} }, Range: class {},
  TextEditorRevealType: { InCenterIfOutsideViewport: 0 }, ProgressLocation: { Notification: 0 },
  window: {
    activeTextEditor: { document, get selection() { return { active: document.positionAt(selectedOffset()) }; } },
    createOutputChannel: () => ({ appendLine() {}, dispose() {}, show() {} }), onDidChangeActiveTextEditor: disposable,
    withProgress: async (_: unknown, action: any) => action({}, { isCancellationRequested: false, onCancellationRequested: disposable }),
    showQuickPick: async (items: any[]) => { Effect.runSync(Ref.update(state, (state) => ({ ...state, candidates: items })));
      return items[Effect.runSync(Ref.get(state)).pick]; },
    showTextDocument: async (document: any) => ({ set selection(selection: any) {
      assert.equal(document.uri.fsPath, path.join(directory, 'template-state.cpp'));
      Effect.runSync(Ref.update(state, (state) => ({ ...state, jumps: [...state.jumps, document.offsetAt(selection.start)] })));
    }, revealRange() {} }),
    showInformationMessage: async () => {}, showWarningMessage: async () => {},
    showErrorMessage: async (message: string) => assert.fail(message), setStatusBarMessage() {}
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
    executeCommand: async (command: string, target: any, position: any) => {
      if (command === 'vscode.prepareCallHierarchy') {
        const document = documents.get(target.fsPath)!;
        return [{ name: document.getText().slice(document.offsetAt(position)).split('(')[0] }];
      }
      if (command === 'vscode.provideIncomingCalls') return locations(target.name).map((location) => ({ from: { uri: location.uri }, fromRanges: [location.range] }));
      assert.equal(command, 'vscode.executeReferenceProvider');
      return [];
    }
  }
}));
const extension = await import('../src/extension');
try {
  extension.activate({ extensionPath: path.resolve('.'), globalStorageUri: uri(path.join(directory, 'global')), subscriptions: [] } as unknown as vscode.ExtensionContext);
  await ['member-declaration', 'member-use', 'free-declaration', 'free-use'].reduce(async (work, marker) => {
    await work;
    await ['jumpToOrigin', 'jumpToPreviousMutation'].reduce(async (work, command) => {
      await work;
      await [0, 1].reduce(async (work, pick) => {
        await work;
        Effect.runSync(Ref.set(state, { marker, pick, candidates: [], jumps: [] }));
        await Effect.runSync(Ref.get(commands)).get('foldStateJump.' + command)!();
        const result = Effect.runSync(Ref.get(state));
        assert.equal(result.candidates.length, 2, marker + ': ' + command);
        assert.equal(result.jumps.length, 1);
        const candidate = result.candidates[pick].candidate;
        const target = candidate.origin ?? candidate.mutation;
        assert.equal(result.jumps[0], target.node.range.begin.offset);
        assert.deepEqual(result.candidates.map((item) => item.candidate.frames.at(-1).caller.name).sort(),
          marker.startsWith('free') ? ['free_embeddings', 'free_tokens'] : ['embeddings', 'tokens']);
      }, Promise.resolve());
    }, Promise.resolve());
  }, Promise.resolve());
  console.log('16 template command/navigation cases passed with actual native ASTs and mocked VS Code providers.');
} finally { extension.deactivate(); await rm(directory, { recursive: true, force: true }); }
