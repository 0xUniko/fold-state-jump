import * as vscode from 'vscode';
import { utf16OffsetFromByte, type FunctionInfo } from './analysis';

export type CallerLocation = { readonly uri: vscode.Uri; readonly range: vscode.Range };
export type CallerLocations = {
  readonly locations: readonly CallerLocation[];
  readonly diagnostics: readonly string[];
};

const locationKey = (location: CallerLocation): string =>
  [location.uri.toString(), location.range.start.line, location.range.start.character,
    location.range.end.line, location.range.end.character].join(':');

const throwIfCancelled = (error: unknown, signal: AbortSignal): void => {
  signal.throwIfAborted();
  if (error instanceof Error && ['Canceled', 'CancellationError', 'AbortError'].includes(error.name)) throw error;
};

// Incoming Calls and References are independent providers: either can be
// missing, unsupported, or incomplete while the other still yields verified
// candidates. Query both in parallel and union the results, keeping one entry
// per call site when both providers report it. Clang symbol validation in the
// analyzer decides which locations are real calls, so name-only matches from
// references can never create edges by themselves.
export const discoverCallerLocations = async (
  fn: FunctionInfo, document: vscode.TextDocument, signal: AbortSignal
): Promise<CallerLocations> => {
  signal.throwIfAborted();
  const position = document.positionAt(utf16OffsetFromByte(document.getText(), fn.wrapped.node.loc?.offset ?? 0));
  const incoming = async (): Promise<CallerLocations> => {
    try {
      const items = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
        'vscode.prepareCallHierarchy', document.uri, position);
      signal.throwIfAborted();
      const calls = await Promise.all((items ?? []).map(async (item): Promise<CallerLocations> => {
        try {
          signal.throwIfAborted();
          const calls = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>('vscode.provideIncomingCalls', item);
          signal.throwIfAborted();
          return { locations: (calls ?? []).flatMap((call) =>
            call.fromRanges.map((range) => ({ uri: call.from.uri, range }))), diagnostics: [] };
        } catch (error) {
          throwIfCancelled(error, signal);
          return { locations: [], diagnostics: ['Incoming call provider failed for ' + item.name + ': ' + String(error)] };
        }
      }));
      signal.throwIfAborted();
      return { locations: calls.flatMap((calls) => calls.locations), diagnostics: calls.flatMap((calls) => calls.diagnostics) };
    } catch (error) {
      throwIfCancelled(error, signal);
      return { locations: [], diagnostics: ['Incoming call provider failed: ' + String(error)] };
    }
  };
  const references = async (): Promise<CallerLocations> => {
    try {
      const found = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider', document.uri, position);
      signal.throwIfAborted();
      return { locations: (found ?? []).map(({ uri, range }) => ({ uri, range })), diagnostics: [] };
    } catch (error) {
      throwIfCancelled(error, signal);
      return { locations: [], diagnostics: ['Reference provider failed: ' + String(error)] };
    }
  };
  const [fromIncoming, fromReferences] = await Promise.all([incoming(), references()]);
  signal.throwIfAborted();
  const locations = [...fromIncoming.locations, ...fromReferences.locations].reduce((state, location) => {
    const key = locationKey(location);
    if (!state.seen.has(key)) {
      state.seen.add(key);
      state.locations.push(location);
    }
    return state;
  }, { seen: new Set<string>(), locations: [] as CallerLocation[] }).locations;
  const diagnostics = [...fromIncoming.diagnostics, ...fromReferences.diagnostics];
  return {
    locations,
    diagnostics: locations.length === 0 ? [...diagnostics, 'Incoming calls and references returned no caller locations.'] : diagnostics
  };
};
