import * as vscode from 'vscode';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange, type ClangNode, type WrappedNode, type TraceCandidate } from './analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from './services';

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

const sourceRange = (document: vscode.TextDocument, wrapped: WrappedNode): { readonly start: number; readonly end: number } | null =>
  nodeRange(wrapped, readWorkspaceText(document));

const showFailure = (reason: string): Effect.Effect<void> =>
  Effect.sync(() => {
    void vscode.window.showInformationMessage(reason);
  });

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
      const range = sourceRange(target, mutation);
      if (!range) throw new Error('Found a mutation but could not map its source range.');
      const position = target.positionAt(utf16OffsetFromByte(target.getText(), range.start));
      const targetEditor = await vscode.window.showTextDocument(target, { preview: true });
      targetEditor.selection = new vscode.Selection(position, position);
      targetEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    },
    catch: (error) => new Error(String(error))
  });

const extractAst = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  token: vscode.CancellationToken,
  extensionPath: string
) {
  const sourceText = document.getText();
  const cursorByteOffset = byteOffsetFromUtf16(
    sourceText,
    vscode.window.activeTextEditor?.document === document
      ? document.offsetAt(vscode.window.activeTextEditor.selection.active)
      : 0
  );
  const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  const config = vscode.workspace.getConfiguration('foldStateJump');
  const command = yield* resolveCompileCommand(
    document.uri.fsPath,
    roots,
    config.get('clangPath', 'clang++'),
    config.get('compileCommandsPath', '') || undefined
  );
  if (command.context === 'fallback') {
    yield* Effect.sync(() => {
      void vscode.window.showWarningMessage('Fold State Jump: no matching compile command found; Clang may lack project include paths. Set foldStateJump.compileCommandsPath if analysis fails.');
    });
  }
  const controller = new AbortController();
  const cancellation = token.onCancellationRequested(() => controller.abort());
  if (token.isCancellationRequested) controller.abort();
  const configuredExtractor = config.get('extractorPath', '');
  const executable = configuredExtractor
    ? (path.isAbsolute(configuredExtractor) ? configuredExtractor : path.resolve(extensionPath, configuredExtractor))
    : path.join(extensionPath, 'native', 'build', 'fold-state-jump-ast');
  const extractionCommand = makeExtractionCommand(command, executable);
  const astText = yield* runClangAst(
    extractionCommand,
    config.get('maxAstBytes', 67108864),
    controller.signal
  ).pipe(Effect.ensuring(Effect.sync(() => cancellation.dispose())));
  const ast = yield* Effect.try({
    try: () => JSON.parse(astText) as ClangNode,
    catch: (error) => new Error('Could not parse Clang AST: ' + String(error))
  });
  if (document.getText() !== sourceText) {
    return { _tag: 'AnalysisFailure' as const, reason: 'The document changed during analysis. Run the command again.' };
  }
  return {
    _tag: 'ExtractionReady' as const,
    ast,
    options: {
      file: document.uri.fsPath,
      sourceText,
      cursorByteOffset,
      sourceTextByFile: readWorkspaceText(document)
    }
  };
}, Effect.mapError((error) => new Error(error.message)));

const runMutationAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  token: vscode.CancellationToken,
  extensionPath: string
) {
  const extraction = yield* extractAst(document, token, extensionPath);
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeAst(extraction.ast, extraction.options);
});

const runOriginAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  token: vscode.CancellationToken,
  extensionPath: string
) {
  const extraction = yield* extractAst(document, token, extensionPath);
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeOriginAst(extraction.ast, extraction.options);
});

// User interaction happens after the progress promise has settled. VS Code
// message and QuickPick promises may remain pending until the user acts.
const presentAnalysis = (
  document: vscode.TextDocument,
  result: ReturnType<typeof analyzeAst>
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    switch (result._tag) {
      case 'AnalysisFailure':
        yield* showFailure(result.reason);
        return;
      case 'MutationFound':
        yield* navigateTo(document, result.mutation);
        if (result.wrapped) {
          yield* Effect.sync(() => {
            vscode.window.setStatusBarMessage('Fold State Jump: wrapped to the last mutation in this fold.', 5000);
          });
        }
        return;
      case 'OriginFound':
        yield* navigateTo(document, result.origin);
        yield* Effect.sync(() => {
          void vscode.window.showInformationMessage(result.kind === 'initialization'
            ? 'Fold State Jump: showing the initialization source.'
            : 'Fold State Jump: showing the parameter source.');
        });
        return;
      case 'CandidatesFound': {
        const candidate = yield* chooseCandidate(result.candidates);
        if (candidate) yield* navigateTo(document, candidate.mutation);
        return;
      }
    }
  });

export const activate = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(
    vscode.commands.registerCommand('foldStateJump.jumpToPreviousMutation', () =>
      Effect.gen(function* () {
        const document = activeDocument();
        if (!document || !isCpp(document.languageId)) return;
        const saved = yield* saveIfDirty(document);
        if (!saved) return;
        const result = yield* Effect.tryPromise({
          try: () => vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Tracing fold state mutations…',
              cancellable: true
            },
            async (_progress, token) => Effect.runPromise(runMutationAnalysis(document, token, context.extensionPath))
          ),
          catch: (error) => new Error(String(error))
        });
        yield* presentAnalysis(document, result);
      }).pipe(
        Effect.catch((error) =>
          Effect.promise(() => vscode.window.showErrorMessage('Fold State Jump: ' + error.message)).pipe(Effect.asVoid)
        ),
        Effect.runPromise
      )
    ),
    vscode.commands.registerCommand('foldStateJump.jumpToOrigin', () =>
      Effect.gen(function* () {
        const document = activeDocument();
        if (!document || !isCpp(document.languageId)) return;
        const saved = yield* saveIfDirty(document);
        if (!saved) return;
        const result = yield* Effect.tryPromise({
          try: () => vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Tracing fold state origin…',
              cancellable: true
            },
            async (_progress, token) => Effect.runPromise(runOriginAnalysis(document, token, context.extensionPath))
          ),
          catch: (error) => new Error(String(error))
        });
        yield* presentAnalysis(document, result);
      }).pipe(
        Effect.catch((error) =>
          Effect.promise(() => vscode.window.showErrorMessage('Fold State Jump: ' + error.message)).pipe(Effect.asVoid)
        ),
        Effect.runPromise
      )
    )
  );
};

export const deactivate = (): void => {};
