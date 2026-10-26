// Actual command callbacks, caller expansion and native ASTs with mocked VS Code.
// No Extension Host or C++ language server is started.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import type * as vscode from 'vscode';
import { analyzeQuery, callerLinksAt, prepareAst } from '../src/analysis';
import { spawnSync } from 'node:child_process';
const bunTest = 'bun:test';
const { mock } = await import(bunTest) as { mock: { module(name: string, factory: () => unknown): void; restore(): void } };
const directory = await mkdtemp(path.join(os.tmpdir(), 'fsj-return-presentation-'));
const sources = new Map([
  ['state.h', 'struct State { int value; }; void consume(int); State unknown();\n' +
    ['single', 'multiple', 'mixed', 'complete', 'complete_multiple', 'timing', 'failure'].map((name) => 'void ' + name + '(State);').join('\n')],
  ['leaf.cpp', '#include "state.h"\n' + ['single', 'multiple', 'mixed', 'complete', 'complete_multiple', 'timing', 'failure'].map((name) =>
    'void ' + name + '(State state) { consume(state.value); }').join('\n')],
  ['caller.cpp', `#include "state.h"
State partial(State state, bool flag) { if (flag) return state; return unknown(); }
State alternatives(State first, State second, int branch) { if (branch == 0) return first; if (branch == 1) return second; return unknown(); }
State identity(State state) { return state; }
State complete_sources(State first, State second, bool flag) { if (flag) return first; return second; }
State timing_source(State first, State second, bool flag) { if (flag) return first; if (first.value) second.value = 99; return second; }
State mixed_source(State state, bool flag) { if (flag) return state; return identity(unknown()); }
void entry(bool flag, int branch) {
  State first{0}; first.value = 11;
  State second{0}; second.value = 22;
  single(partial(first, flag));
  multiple(alternatives(first, second, branch));
  mixed(mixed_source(first, flag));
  complete(identity(first));
  complete_multiple(complete_sources(first, second, flag));
  timing(timing_source(first, second, flag));
  failure(unknown());
}
// This incomplete source is unrelated to complete(identity(first)).
void unrelated(bool flag) { State other{0}; consume(partial(other, flag).value); }
`]
].map(([file, text]) => [path.join(directory, file), text]));
await Promise.all([...sources].map(([file, text]) => writeFile(file, text)));
const positionAt = (text: string, offset: number) => ({ line: text.slice(0, offset).split('\n').length - 1,
  character: offset - (text.lastIndexOf('\n', offset - 1) + 1) });
const uri = (file: string) => ({ scheme: 'file', fsPath: file });
const documents = new Map([...sources].map(([file, text]) => [file, {
  uri: uri(file), languageId: 'cpp', isClosed: false, isDirty: false, version: 1, getText: () => text,
  positionAt: (offset: number) => positionAt(text, offset),
  offsetAt: (position: { line: number; character: number }) => text.split('\n').slice(0, position.line)
    .reduce((offset, line) => offset + line.length + 1, 0) + position.character
}]));
const leaf = documents.get(path.join(directory, 'leaf.cpp'))!;
const caller = documents.get(path.join(directory, 'caller.cpp'))!;
type Event = { readonly kind: string; readonly message?: string; readonly value?: unknown };
const state = Ref.makeUnsafe({ name: 'single', choice: 0, events: [] as readonly Event[] });
const commands = Ref.makeUnsafe<ReadonlyMap<string, () => Promise<unknown>>>(new Map());
const record = (event: Event) => Effect.runSync(Ref.update(state, (state) => ({ ...state, events: [...state.events, event] })));
const disposable = () => ({ dispose() {} });
const location = (name: string) => {
  const start = caller.getText().indexOf('  ' + name + '(') + 2;
  assert.ok(start > 1, name);
  return { uri: caller.uri, range: { start: caller.positionAt(start), end: caller.positionAt(start + name.length) } };
};
mock.module('vscode', () => ({
  Uri: { file: uri }, Selection: class {}, Range: class {}, TextEditorRevealType: { InCenterIfOutsideViewport: 0 }, ProgressLocation: { Notification: 0 },
  window: {
    activeTextEditor: { document: leaf, get selection() {
      const start = leaf.getText().indexOf('void ' + Effect.runSync(Ref.get(state)).name + '(');
      return { active: leaf.positionAt(leaf.getText().indexOf('value', start)) };
    } },
    createOutputChannel: () => ({ appendLine: (line: string) => record({ kind: 'output', value: JSON.parse(line) }), dispose() {}, show() {} }),
    onDidChangeActiveTextEditor: disposable,
    withProgress: async (_: unknown, action: any) => action({}, { isCancellationRequested: false, onCancellationRequested: disposable }),
    showQuickPick: async (items: any[]) => { record({ kind: 'pick', value: items }); return items[Effect.runSync(Ref.get(state)).choice]; },
    showTextDocument: async (document: any) => { record({ kind: 'jump', value: document.uri.fsPath }); return { revealRange() {} }; },
    showWarningMessage: (message: string) => { record({ kind: 'warning', message }); return new Promise(() => {}); },
    showInformationMessage: async (message: string) => { record({ kind: 'information', message }); },
    showErrorMessage: async (message: string) => { record({ kind: 'error', message }); },
    setStatusBarMessage: (message: string) => record({ kind: 'status', message })
  },
  workspace: {
    workspaceFolders: [{ uri: uri(directory) }], textDocuments: [...documents.values()],
    openTextDocument: async (uri: { fsPath: string }) => { const document = documents.get(uri.fsPath); assert.ok(document, uri.fsPath); return document; },
    asRelativePath: (uri: { fsPath: string }) => path.basename(uri.fsPath),
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => key === 'prewarm.enabled' || key === 'cache.disk.enabled' ? false : fallback }),
    createFileSystemWatcher: () => ({ onDidChange: disposable, onDidCreate: disposable, onDidDelete: disposable, dispose() {} }),
    onDidSaveTextDocument: disposable, onDidChangeTextDocument: disposable, onDidChangeConfiguration: disposable, onDidChangeWorkspaceFolders: disposable
  },
  commands: {
    registerCommand: (name: string, command: () => Promise<unknown>) => {
      Effect.runSync(Ref.update(commands, (commands) => new Map([...commands, [name, command]]))); return disposable();
    },
    executeCommand: async (command: string, target: any, position?: any) => {
      if (command === 'vscode.prepareCallHierarchy') {
        const document = documents.get(target.fsPath)!;
        return [{ name: document.getText().slice(document.offsetAt(position)).split('(')[0] }];
      }
      if (command === 'vscode.provideIncomingCalls') return [{ from: { uri: caller.uri }, fromRanges: [location(target.name).range] }];
      assert.equal(command, 'vscode.executeReferenceProvider');
      const document = documents.get(target.fsPath)!;
      const name = document.getText().slice(document.offsetAt(position)).split('(')[0];
      return [location(name)];
    }
  }
}));
const extension = await import('../src/extension');
const extract = (file: string) => {
  const result = spawnSync(path.resolve('native/build/fold-state-jump-ast'), ['--source', file, '--', '-std=c++20'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return prepareAst(JSON.parse(result.stdout));
};
const leafPrepared = extract(leaf.uri.fsPath);
const callerPrepared = extract(caller.uri.fsPath);
try {
  extension.activate({ extensionPath: path.resolve('.'), globalStorageUri: uri(path.join(directory, 'global')), subscriptions: [] } as unknown as vscode.ExtensionContext);
  await ['single', 'multiple', 'mixed', 'complete', 'complete_multiple', 'timing', 'failure'].reduce<Promise<void>>(async (work, name) => {
    await work;
    await (['mutation', 'origin'] as const).reduce<Promise<void>>(async (work, mode) => {
      await work;
      const start = leaf.getText().indexOf('void ' + name + '(');
      const options = { file: leaf.uri.fsPath, sourceText: leaf.getText(), cursorByteOffset: leaf.getText().indexOf('value', start) };
      const initial = analyzeQuery(mode, leafPrepared.ast, options, leafPrepared);
      assert.equal(initial.returnMapping, undefined, 'return evidence exists only after expand');
      const fn = initial.boundaries[0];
      assert.ok(fn);
      const range = location(name).range;
      const links = callerLinksAt(callerPrepared, caller.uri.fsPath, caller.offsetAt(range.start), caller.offsetAt(range.end), fn);
      const final = analyzeQuery(mode, leafPrepared.ast, { ...options, externalCallers: new Map([[fn.wrapped.node, links]]) }, leafPrepared);
      const complete = name.startsWith('complete') || name === 'timing' && mode === 'origin';
      assert.equal(final.returnMapping?.kind, complete ? 'complete' : 'incomplete');
      const candidates = final.result._tag === 'CandidatesFound' || final.result._tag === 'OriginCandidatesFound' ? final.result.candidates : [];
      if (name === 'mixed' && mode === 'origin') {
        assert.equal(candidates.length, 2);
        assert.deepEqual(candidates.map((candidate) => candidate.returnMapping?.kind), ['complete', 'incomplete']);
      }
      if (name === 'multiple' || name === 'complete_multiple') {
        assert.equal(candidates.length, 2);
        assert.ok(candidates.every((candidate) => candidate.returnMapping?.kind === 'complete'), 'unavailable sibling must not taint either proven path');
      }
      await Array.from({ length: candidates.length || 1 }).reduce<Promise<void>>(async (work, _, choice) => {
        await work;
        Effect.runSync(Ref.set(state, { name, choice, events: [] }));
        await Effect.runSync(Ref.get(commands)).get('foldStateJump.' + (mode === 'mutation' ? 'jumpToPreviousMutation' : 'jumpToOrigin'))!();
        const events = Effect.runSync(Ref.get(state)).events;
        assert.equal(events.some((event) => event.kind === 'error'), false, JSON.stringify(events));
        const warnings = events.filter((event) => event.kind === 'warning');
        if (name === 'failure' && mode === 'mutation') {
          assert.equal(events.some((event) => event.kind === 'jump'), false);
          assert.ok(events.some((event) => event.kind === 'information' && /unknown.*definition unavailable/.test(event.message ?? '')));
          assert.equal(warnings.length, 0);
        } else {
          assert.equal(events.filter((event) => event.kind === 'jump').length, 1, JSON.stringify(events));
          assert.equal(warnings.length, complete ? 0 : 1);
          if (warnings.length) {
            assert.match(warnings[0].message!, name === 'timing' ? /Mutation execution on this return branch is not verified/ : /unknown.*definition unavailable/);
            assert.match(warnings[0].message!, name === 'failure' || name === 'mixed' && mode === 'origin' && choice === 1 ? /this candidate is incomplete/ : /Other related return sources remain unverified/);
            if (name !== 'failure') assert.match(warnings[0].message!, /caller.cpp:\d+ return:/);
          }
          assert.equal(events.filter((event) => event.kind === 'pick').length, candidates.length > 1 ? 1 : 0);
        }
      }, Promise.resolve());
    }, Promise.resolve());
  }, Promise.resolve());
  console.log('20 command paths: Mutation/Origin, complete/partial/failure, every candidate choice, final expand metadata and visible nonblocking warnings verified.');
} finally {
  await extension.deactivate();
  mock.restore();
  await rm(directory, { recursive: true, force: true });
}
