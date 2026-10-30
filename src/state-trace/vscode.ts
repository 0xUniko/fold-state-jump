import * as vscode from 'vscode';
import path from 'node:path';
import { Engine, type Mode, type QueryResult, type Target } from './engine';
import { loadInventory } from './native';
import type { CompileCommand } from '../services';

const targetKey = (t: Target): string => `${t.file}:${t.line}:${t.column}:${t.relation}:${t.frameUsr}`;

const sortTargets = (targets: readonly Target[]): Target[] =>
  [...targets].filter((t) => t.kind !== 'selected').sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.relation.localeCompare(b.relation));

export const queryDocument = async (
  document: vscode.TextDocument,
  offset: number,
  mode: Mode,
  command: CompileCommand,
  root: string,
  executable: string,
  signal?: AbortSignal,
): Promise<QueryResult> => {
  const pos = document.positionAt(offset);
  const source = path.resolve(document.uri.fsPath);
  const program = await loadInventory(source, command, root, executable, signal);
  return Engine.fromPrograms([program]).query({
    file: source, line: pos.line + 1, column: pos.character + 1, mode,
  });
};

const navigate = async (target: Target): Promise<void> => {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target.file));
  const line = Math.max(0, Math.min(document.lineCount - 1, target.line - 1));
  const column = Math.max(0, Math.min(document.lineAt(line).text.length, target.column - 1));
  const position = new vscode.Position(line, column);
  const editor = await vscode.window.showTextDocument(document, { preview: true });
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
};

export const presentQuery = async (result: QueryResult): Promise<void> => {
  const targets = sortTargets(result.targets);
  if (!targets.length) {
    const reason = result.boundaries[0]?.reason ?? 'No verified target; the state source is outside the modeled boundary.';
    await vscode.window.showInformationMessage('State Trace: ' + reason);
    return;
  }
  let target = targets[0];
  if (targets.length > 1) {
    const picked = await vscode.window.showQuickPick(targets.map((t, i) => ({
      label: `${i + 1}. ${t.relation} · ${t.anchor || '(state)'}`,
      description: `${path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? path.dirname(t.file), t.file)}:${t.line}`,
      detail: `${t.frame}${t.conditions.length ? ' · ' + t.conditions.join(' · ') : ''}`,
      target: t,
    })), { placeHolder: `State Trace: ${result.kind}; choose a verified candidate` });
    if (!picked?.target) return;
    target = picked.target;
  }
  await navigate(target);
  const suffix = result.kind === 'Conditional' ? ' (conditional candidate)' : '';
  void vscode.window.setStatusBarMessage(`State Trace: ${result.kind}${suffix} · ${target.relation}`, 6000);
  if (result.kind === 'Conditional' || result.kind === 'Multiple') {
    const note = 'State Trace: showing a may candidate; conditions and boundaries are recorded in the output channel.';
    void vscode.window.showInformationMessage(note);
  }
};

export const showBoundaries = (result: QueryResult, output: vscode.OutputChannel): void => {
  for (const b of result.boundaries)
    output.appendLine(JSON.stringify({ event: 'state-trace-boundary', ...b }));
};
