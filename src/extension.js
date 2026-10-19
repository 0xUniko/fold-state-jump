'use strict';

const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { analyzeAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange } = require('./analysis');

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('foldStateJump.jumpToPreviousMutation', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const document = editor.document;
    if (!['cpp', 'c', 'cuda-cpp', 'objective-cpp'].includes(document.languageId)) return;
    if (document.isDirty) {
      const choice = await vscode.window.showWarningMessage('Save the file before Clang analyzes it?', 'Save and continue', 'Cancel');
      if (choice !== 'Save and continue' || !(await document.save())) return;
    }
    const roots = (vscode.workspace.workspaceFolders || []).map(folder => folder.uri.fsPath);
    const config = vscode.workspace.getConfiguration('foldStateJump');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Tracing fold state mutations…', cancellable: true }, async (_, token) => {
      try {
        const command = await compileCommand(document.uri.fsPath, roots, config.get('clangPath', 'clang++'));
        if (!command) throw new Error('Could not find or construct a Clang compile command.');
        const astText = await dumpAst(command, config.get('maxAstBytes', 134217728), token);
        if (!astText) return;
        const ast = JSON.parse(astText);
        const offset = byteOffsetFromUtf16(document.getText(), document.offsetAt(editor.selection.active));
        const result = analyzeAst(ast, { file: document.uri.fsPath, sourceText: document.getText(), cursorByteOffset: offset, workspaceRoots: roots });
        if (!result.ok) { vscode.window.showInformationMessage(result.reason); return; }
        let resolved = result;
        if (result.callPaths) {
          let candidate = result.callPaths[0];
          if (result.needsChoice) {
            const items = result.callPaths.map((item, index) => ({
              label: (index + 1) + '. ' + item.frames.map(frame => frame.caller.name || 'fold lambda').join(' → '),
              description: item.frames.map(frame => path.basename(frame.callsite.file) + ':' + lineAt(frame.callsite.file, frame.callsite.node.range?.begin?.offset || 0, document)).join(' → '),
              candidate: item
            }));
            const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Choose a call path to trace' });
            if (!picked) return;
            candidate = picked.candidate;
          }
          resolved = result.resolvePath(candidate);
        }
        if (!resolved.ok) { vscode.window.showInformationMessage(resolved.reason); return; }
        const mutation = resolved.mutation;
        const target = await vscode.workspace.openTextDocument(vscode.Uri.file(mutation.file));
        const range = nodeRange(mutation, file => path.resolve(file) === path.resolve(document.uri.fsPath) ? document.getText() : safeRead(file));
        if (!range) throw new Error('Found a mutation but could not map its source range.');
        const position = target.positionAt(utf16OffsetFromByte(target.getText(), range.start));
        const action = await vscode.window.showInformationMessage('Found mutation: ' + path.basename(mutation.file) + ':' + (position.line + 1) + ' — ' + target.lineAt(position.line).text.trim(), 'Go to location');
        if (action === 'Go to location') {
          const targetEditor = await vscode.window.showTextDocument(target, { preview: true });
          targetEditor.selection = new vscode.Selection(position, position);
          targetEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
      } catch (error) {
        if (!token.isCancellationRequested) vscode.window.showErrorMessage('Fold State Jump: ' + (error.message || error));
      }
    });
  }));
}
function safeRead(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function lineAt(file, offset, activeDocument) {
  const text = path.resolve(file) === path.resolve(activeDocument.uri.fsPath) ? activeDocument.getText() : safeRead(file);
  return Buffer.from(text, 'utf8').subarray(0, offset).toString('utf8').split('\n').length;
}
function findDb(source, roots) {
  let dir = path.dirname(source);
  while (true) {
    const file = path.join(dir, 'compile_commands.json');
    if (fs.existsSync(file)) return file;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots.map(root => path.join(root, 'compile_commands.json')).find(fs.existsSync) || null;
}
function splitCommand(command) {
  return [...command.matchAll(/"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|(\S+)/g)].map(m => (m[1] ?? m[2] ?? m[3]).replace(/\\(["'\\])/g, '$1'));
}
async function compileCommand(source, roots, clang) {
  const db = findDb(source, roots);
  if (!db) return { compiler: clang, args: ['-std=c++20', '-Xclang', '-ast-dump=json', '-fsyntax-only', source], cwd: path.dirname(source) };
  const entries = JSON.parse(fs.readFileSync(db, 'utf8'));
  const entry = entries.find(item => path.resolve(item.directory, item.file) === path.resolve(source) || path.resolve(item.file) === path.resolve(source));
  if (!entry) return { compiler: clang, args: ['-std=c++20', '-Xclang', '-ast-dump=json', '-fsyntax-only', source], cwd: path.dirname(source) };
  const raw = entry.arguments ? [...entry.arguments] : splitCommand(entry.command || '');
  raw.shift();
  const args = [];
  for (let i = 0; i < raw.length; i++) {
    if (['-c', '-MD', '-MMD', '-MP', '-M', '-MM'].includes(raw[i])) continue;
    if (['-o', '-MF', '-MT', '-MQ'].includes(raw[i])) { i++; continue; }
    if (raw[i] === entry.file || path.resolve(entry.directory, raw[i]) === path.resolve(source)) continue;
    args.push(raw[i]);
  }
  args.push('-Xclang', '-ast-dump=json', '-fsyntax-only', source);
  return { compiler: clang, args, cwd: entry.directory || path.dirname(source) };
}
function dumpAst(command, maxBytes, token) {
  return new Promise((resolve, reject) => {
    const child = spawn(command.compiler, command.args, { cwd: command.cwd, windowsHide: true });
    const chunks = [];
    let total = 0, stderr = '', settled = false;
    const finish = (fn, value) => { if (!settled) { settled = true; fn(value); } };
    const cancellation = token.onCancellationRequested(() => child.kill());
    child.stdout.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        child.kill();
        finish(reject, new Error('Clang AST exceeds ' + Math.round(maxBytes / 1048576) + ' MiB; increase foldStateJump.maxAstBytes.'));
      } else chunks.push(chunk);
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-12000); });
    child.on('error', error => finish(reject, new Error('Could not start ' + command.compiler + ': ' + error.message)));
    child.on('close', code => {
      cancellation.dispose();
      if (settled) return;
      const output = Buffer.concat(chunks).toString('utf8');
      if (!output.trim() || (code !== 0 && !output.trim().startsWith('{'))) finish(reject, new Error('Clang failed (exit ' + code + '): ' + stderr));
      else finish(resolve, output);
    });
  });
}
function deactivate() {}
module.exports = { activate, deactivate, compileCommand, findDb, splitCommand };
