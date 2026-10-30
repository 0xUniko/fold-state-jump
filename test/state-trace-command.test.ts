// End-to-end command wiring for the new engine: real activate(), native state
// inventory extraction, TypeScript solver, and mocked VS Code navigation.
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import type * as vscode from 'vscode';
const { mock } = await import('bun:test' as string) as { mock: { module(name: string, factory: () => unknown): void } };

const directory = await mkdtemp(path.join(os.tmpdir(), 'fsj-state-trace-'));
const source = path.join(directory, 'state.cpp');
const text = [
  'struct State { int value = 0; };',
  'State update(State state) { state.value += 1; return state; }',
  'int main() { State state{}; state.value = 7; return state.value; }',
].join('\n') + '\n';
await writeFile(source, text);
const uri = (file: string) => ({ scheme: 'file', fsPath: file, toString: () => 'file://' + file });
const positionAt = (offset: number) => {
  const before = text.slice(0, offset);
  const line = before.split('\n').length - 1;
  return { line, character: offset - (before.lastIndexOf('\n') + 1) };
};
const document = {
  uri: uri(source), languageId: 'cpp', isClosed: false, isDirty: false, version: 1,
  getText: () => text,
  positionAt,
  offsetAt: (position: { line: number; character: number }) =>
    text.split('\n').slice(0, position.line).reduce((n, line) => n + line.length + 1, 0) + position.character,
  lineCount: 3,
  lineAt: (line: number) => ({ text: text.split('\n')[line] }),
};
const cursor = text.lastIndexOf('state.value');
const commands = Ref.makeUnsafe(new Map<string, () => Promise<unknown>>());
const jumps = Ref.makeUnsafe<Array<{ file: string; line: number; character: number }>>([]);
const messages = Ref.makeUnsafe<string[]>([]);
const disposable = () => ({ dispose() {} });
const Selection = class { constructor(readonly start: any, readonly end = start) {} };
const Range = class { constructor(readonly start: any, readonly end = start) {} };
const Position = class { constructor(readonly line: number, readonly character: number) {} };
mock.module('vscode', () => ({
  Uri: { file: uri }, Selection, Range, Position, TextEditorRevealType: { InCenterIfOutsideViewport: 0 },
  ProgressLocation: { Notification: 0 },
  window: {
    activeTextEditor: { document, get selection() { return { active: positionAt(cursor) }; } },
    createOutputChannel: () => ({ appendLine: (line: string) => Effect.runSync(Ref.update(messages, (m) => [...m, line])), dispose() {}, show() {} }),
    onDidChangeActiveTextEditor: disposable,
    withProgress: async (_: unknown, action: any) => action({}, { isCancellationRequested: false, onCancellationRequested: disposable }),
    showQuickPick: async (items: any[]) => items[0],
    showTextDocument: async (target: any) => ({
      set selection(value: any) { Effect.runSync(Ref.update(jumps, (j) => [...j, { file: target.uri.fsPath, line: value.start.line, character: value.start.character }])); },
      revealRange() {},
    }),
    showInformationMessage: async (message: string) => { Effect.runSync(Ref.update(messages, (m) => [...m, message])); },
    showWarningMessage: async () => undefined,
    showErrorMessage: async (message: string) => assert.fail(message),
    setStatusBarMessage: (message: string) => { Effect.runSync(Ref.update(messages, (m) => [...m, message])); },
  },
  workspace: {
    workspaceFolders: [{ uri: uri(directory) }], textDocuments: [document],
    openTextDocument: async () => document,
    asRelativePath: () => path.basename(source),
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => {
      if (key === 'analysisEngine') return 'state-trace';
      if (key === 'clangPath') return '/usr/lib/llvm-23/bin/clang++';
      if (key === 'stateTraceExtractorPath') return path.resolve('native/build/state-inventory');
      if (key === 'prewarm.enabled' || key === 'cache.disk.enabled') return false;
      return fallback;
    } }),
    createFileSystemWatcher: () => ({ onDidChange: disposable, onDidCreate: disposable, onDidDelete: disposable, dispose() {} }),
    onDidSaveTextDocument: disposable, onDidChangeTextDocument: disposable,
    onDidChangeConfiguration: disposable, onDidChangeWorkspaceFolders: disposable,
  },
  commands: {
    registerCommand: (name: string, command: () => Promise<unknown>) => {
      Effect.runSync(Ref.update(commands, (m) => new Map([...m, [name, command]]))); return disposable();
    },
  },
}));

it('routes the existing origin command through the state-trace engine', async () => {
  const extension = await import('../src/extension');
  try {
    extension.activate({ extensionPath: path.resolve('.'), globalStorageUri: uri(path.join(directory, 'global')), subscriptions: [] } as unknown as vscode.ExtensionContext);
    const command = Effect.runSync(Ref.get(commands)).get('foldStateJump.jumpToOrigin')!;
    await command();
    const result = Effect.runSync(Ref.get(jumps));
    assert.equal(result.length, 1);
    assert.equal(result[0].file, source);
    assert.equal(result[0].line, 2);
  } finally {
    extension.deactivate();
    await rm(directory, { recursive: true, force: true });
  }
});
