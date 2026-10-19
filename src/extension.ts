import * as vscode from 'vscode';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange, type ClangNode, type WrappedNode, type TraceCandidate } from './analysis';
import { resolveCompileCommand, runClangAst } from './services';

const isCpp = (languageId: string): boolean =>
  ['cpp', 'c', 'cuda-cpp', 'objective-cpp'].includes(languageId);

const activeDocument = (): vscode.TextDocument | undefined => vscode.window.activeTextEditor?.document;

const saveIfDirty = (document: vscode.TextDocument): Effect.Effect<boolean> =>
  document.isDirty
    ? Effect.tryPromise({
        try: async () => {
          const choice = await vscode.window.showWarningMessage(
            'Save the file before Clang analyzes it?',
            'Save and continue',
            'Cancel'
          );
          return choice === 'Save and continue' && await document.save();
        },
        catch: (error) => new Error('Could not save the active document: ' + String(error))
      }).pipe(Effect.orElseSucceed(() => false))
    : Effect.succeed(true);

const readWorkspaceText = (document: vscode.TextDocument): ReadonlyMap<string, string> =>
  new Map([[path.resolve(document.uri.fsPath), document.getText()]]);

const sourceFor = (document: vscode.TextDocument, wrapped: WrappedNode): string =>
  path.resolve(wrapped.file) === path.resolve(document.uri.fsPath) ? document.getText() : '';

const sourceRange = (document: vscode.TextDocument, wrapped: WrappedNode): { readonly start: number; readonly end: number } | null =>
  nodeRange(wrapped, readWorkspaceText(document));

const showFailure = (reason: string): Effect.Effect<void> =>
  Effect.promise(() => vscode.window.showInformationMessage(reason)).pipe(Effect.asVoid);

const chooseCandidate = (
  candidates: readonly TraceCandidate[]
): Effect.Effect<TraceCandidate | undefined> =>
  Effect.promise(() => vscode.window.showQuickPick(
    candidates.map((candidate, index) => ({
      label: (index + 1) + '. ' + candidate.frames.map((frame) => frame.caller.name || 'fold lambda').join(' → '),
      description: path.basename(candidate.mutation.file) + ':' + ((candidate.mutation.node.range?.begin?.offset ?? 0) + 1),
      candidate
    })),
    { placeHolder: 'Choose a call path to trace' }
  )).pipe(Effect.map((picked) => picked?.candidate));

const navigateTo = (document: vscode.TextDocument, mutation: WrappedNode): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      const target = path.resolve(mutation.file) === path.resolve(document.uri.fsPath)
        ? document
        : await vscode.workspace.openTextDocument(vscode.Uri.file(mutation.file));
      const range = sourceRange(document, mutation);
      if (!range) throw new Error('Found a mutation but could not map its source range.');
      const position = target.positionAt(utf16OffsetFromByte(target.getText(), range.start));
      const targetEditor = await vscode.window.showTextDocument(target, { preview: true });
      targetEditor.selection = new vscode.Selection(position, position);
      targetEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    },
    catch: (error) => new Error(String(error))
  });

const runAnalysis = (document: vscode.TextDocument, token: vscode.CancellationToken): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
    const config = vscode.workspace.getConfiguration('foldStateJump');
    const command = yield* resolveCompileCommand(
      document.uri.fsPath,
      roots,
      config.get('clangPath', 'clang++')
    );
    const controller = new AbortController();
    const cancellation = token.onCancellationRequested(() => controller.abort());
    const astText = yield* runClangAst(
      command,
      config.get('maxAstBytes', 134217728),
      controller.signal
    ).pipe(Effect.ensuring(Effect.sync(() => cancellation.dispose())));
    const ast = JSON.parse(astText) as ClangNode;
    const result = analyzeAst(ast, {
      file: document.uri.fsPath,
      sourceText: document.getText(),
      cursorByteOffset: byteOffsetFromUtf16(
        document.getText(),
        vscode.window.activeTextEditor?.document === document
          ? document.offsetAt(vscode.window.activeTextEditor.selection.active)
          : 0
      ),
      sourceTextByFile: readWorkspaceText(document)
    });
    if (result._tag === 'AnalysisFailure') {
      yield* showFailure(result.reason);
      return;
    }
    if (result._tag === 'MutationFound') {
      yield* navigateTo(document, result.mutation);
      return;
    }
    const candidate = yield* chooseCandidate(result.candidates);
    if (candidate) yield* navigateTo(document, candidate.mutation);
  });

export const activate = (context: vscode.ExtensionContext): void => {
  context.subscriptions.add(
    vscode.commands.registerCommand('foldStateJump.jumpToPreviousMutation', () =>
      Effect.gen(function* () {
        const document = activeDocument();
        if (!document || !isCpp(document.languageId)) return;
        const saved = yield* saveIfDirty(document);
        if (!saved) return;
        yield* Effect.tryPromise({
          try: () => vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Tracing fold state mutations…',
              cancellable: true
            },
            async (_progress, token) => Effect.runPromise(runAnalysis(document, token))
          ),
          catch: (error) => new Error(String(error))
        });
      }).pipe(
        Effect.catchAll((error) =>
          Effect.promise(() => vscode.window.showErrorMessage('Fold State Jump: ' + error.message)).pipe(Effect.asVoid)
        ),
        Effect.runPromise
      )
    )
  );
};

export const deactivate = (): void => {};
