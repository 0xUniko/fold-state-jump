import * as vscode from 'vscode';
import { utf16OffsetFromByte, type FunctionInfo } from './analysis';

export type CallerLocation = { readonly uri: vscode.Uri; readonly range: vscode.Range };
export type CallerLocations = {
  readonly locations: readonly CallerLocation[];
  readonly diagnostics: readonly string[];
};

// Provider failures are observable boundaries, not proof that no callers exist.
// Cancellation is checked on both sides because command APIs have no token arg.
export const discoverCallerLocations = async (
  fn: FunctionInfo, document: vscode.TextDocument, signal: AbortSignal, referencesOnly = false
): Promise<CallerLocations> => {
  signal.throwIfAborted();
  const position = document.positionAt(utf16OffsetFromByte(document.getText(), fn.wrapped.node.loc?.offset ?? 0));
  const incoming = async (): Promise<CallerLocations> => {
    try {
      const items = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
        'vscode.prepareCallHierarchy', document.uri, position);
      signal.throwIfAborted();
      const calls = await Promise.all((items ?? []).map((item) =>
        vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>('vscode.provideIncomingCalls', item)));
      signal.throwIfAborted();
      return { locations: calls.flatMap((calls) => (calls ?? []).flatMap((call) =>
        call.fromRanges.map((range) => ({ uri: call.from.uri, range })))), diagnostics: [] };
    } catch (error) {
      signal.throwIfAborted();
      return { locations: [], diagnostics: ['Incoming call provider failed: ' + String(error)] };
    }
  };
  const found = referencesOnly ? { locations: [], diagnostics: [] } : await incoming();
  if (found.locations.length > 0) return found;
  try {
    const references = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider', document.uri, position);
    signal.throwIfAborted();
    return { locations: (references ?? []).map(({ uri, range }) => ({ uri, range })),
      diagnostics: [...found.diagnostics, ...(references?.length ? [] : ['Language service returned no caller locations.'])] };
  } catch (error) {
    signal.throwIfAborted();
    return { locations: [], diagnostics: [...found.diagnostics, 'Reference provider failed: ' + String(error)] };
  }
};
