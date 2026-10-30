// Opt-in real language-service adapter for project-state-sources.ts. This is
// LSP over stdio, not an Extension Host or a substitute for UI verification.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Promise constructor callbacks are synchronous; assignments stay inside this
// adapter because ES2022 does not expose Promise.withResolvers.
const deferred = <A>() => {
  let resolve!: (value: A | PromiseLike<A>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<A>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
};

export const startClangd = async (executable: string, root: string,
  inputs: readonly { readonly file: string; readonly text: string }[]) => {
  const child = spawn(executable, ['--background-index=false', '--pch-storage=memory', '--log=error', '--compile-commands-dir=' + root],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  // Mutable framing/promise registries are confined to the stdio API adapter.
  const state = { bytes: Buffer.alloc(0), sequence: 0, pending: new Map<number,
    { readonly resolve: (value: any) => void; readonly reject: (error: Error) => void }>(),
    diagnostics: new Map(inputs.map(({ file }) => [pathToFileURL(file).toString(), deferred<void>()])) };
  const receive = (): void => {
    const end = state.bytes.indexOf('\r\n\r\n');
    if (end < 0) return;
    const length = Number(/Content-Length: (\d+)/i.exec(state.bytes.subarray(0, end).toString())?.[1]);
    assert.ok(Number.isSafeInteger(length));
    if (state.bytes.length < end + 4 + length) return;
    const message = JSON.parse(state.bytes.subarray(end + 4, end + 4 + length).toString());
    state.bytes = state.bytes.subarray(end + 4 + length);
    if (message.id !== undefined) {
      const pending = state.pending.get(message.id);
      state.pending.delete(message.id);
      if (message.error) pending?.reject(new Error(JSON.stringify(message.error)));
      else pending?.resolve(message.result);
    } else if (message.method === 'textDocument/publishDiagnostics') {
      console.log(JSON.stringify({ event: 'clangd-diagnostics', file: message.params.uri, errors: message.params.diagnostics.filter((diagnostic: any) => diagnostic.severity === 1) }));
      state.diagnostics.get(message.params.uri)?.resolve();
    }
    receive();
  };
  child.stdout.on('data', (bytes: Buffer) => { state.bytes = Buffer.concat([state.bytes, bytes]); receive(); });
  child.stderr.on('data', (bytes: Buffer) => process.stderr.write(bytes));
  child.on('error', (error) => {
    [...state.pending.values()].map(({ reject }) => reject(error));
    [...state.diagnostics.values()].map(({ reject }) => reject(error));
  });
  child.on('exit', (code) => {
    [...state.pending.values()].map(({ reject }) => reject(new Error('clangd exited: ' + code)));
    [...state.diagnostics.values()].map(({ reject }) => reject(new Error('clangd exited: ' + code)));
  });
  const send = (message: unknown) => {
    const text = JSON.stringify(message);
    child.stdin.write('Content-Length: ' + Buffer.byteLength(text) + '\r\n\r\n' + text);
  };
  const request = (method: string, params: unknown): Promise<any> => {
    const id = ++state.sequence;
    const result = deferred<any>();
    state.pending.set(id, result);
    send({ jsonrpc: '2.0', id, method, params });
    return result.promise;
  };
  const timeout = setTimeout(() => child.kill(), 120000);
  try {
    const initialized = await request('initialize', { processId: process.pid, rootUri: pathToFileURL(root).toString(),
      capabilities: { general: { positionEncodings: ['utf-16'] },
        textDocument: { callHierarchy: { dynamicRegistration: false } } } });
    console.log(JSON.stringify({ event: 'clangd-initialize', server: initialized.serverInfo, capabilities: {
      callHierarchy: initialized.capabilities.callHierarchyProvider, references: initialized.capabilities.referencesProvider,
      positionEncoding: initialized.capabilities.positionEncoding, offsetEncoding: initialized.offsetEncoding } }));
    send({ jsonrpc: '2.0', method: 'initialized', params: {} });
    inputs.map(({ file, text }) => send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
      textDocument: { uri: pathToFileURL(file).toString(), languageId: 'cpp', version: 1, text } } }));
    await Promise.all([...state.diagnostics.values()].map(({ promise }) => promise));
    await Promise.all(inputs.map(({ file }) => request('textDocument/documentSymbol', { textDocument: { uri: pathToFileURL(file).toString() } })));
    return {
      executeCommand: (command: string, target: any, position: any) => {
        if (command === 'vscode.prepareCallHierarchy') return request('textDocument/prepareCallHierarchy', {
          textDocument: { uri: pathToFileURL(target.fsPath).toString() }, position });
        if (command === 'vscode.provideIncomingCalls') return request('callHierarchy/incomingCalls', { item: target }).then((calls) =>
          (calls ?? []).map((call: any) => ({ ...call, from: { ...call.from, uri: { fsPath: new URL(call.from.uri).pathname,
            toString: () => call.from.uri } } })));
        assert.equal(command, 'vscode.executeReferenceProvider');
        return request('textDocument/references', { textDocument: { uri: pathToFileURL(target.fsPath).toString() }, position,
          context: { includeDeclaration: true } }).then((locations) => (locations ?? []).map((location: any) => ({
            ...location, uri: { fsPath: new URL(location.uri).pathname, toString: () => location.uri }
          })));
      },
      close: async () => { await request('shutdown', null); send({ jsonrpc: '2.0', method: 'exit', params: null }); clearTimeout(timeout); }
    };
  } catch (error) { clearTimeout(timeout); child.kill(); throw error; }
};
