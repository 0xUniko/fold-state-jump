import * as vscode from 'vscode';
import path from 'node:path';
import { Effect } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange, prepareAst, type ClangNode, type PreparedAst, type WrappedNode, type TraceCandidate } from './analysis';
import { makeExtractionCommand, resolveCompileCommand, runClangAst } from './services';

const isCpp = (languageId: string): boolean =>
  ['cpp', 'c', 'cuda-cpp', 'objective-cpp'].includes(languageId);

const activeDocument = (): vscode.TextDocument | undefined => vscode.window.activeTextEditor?.document;

type CachedAst = {
  readonly documentVersion: number;
  readonly generation: number;
  readonly createdAt: number;
  readonly prepared: PreparedAst;
};

// Keep a small LRU of parsed translation units. Moving between source files
// should not force a full Clang reparse each time. The age bound still covers
// external headers that workspace watchers cannot see.
const astCache = new Map<string, CachedAst>();
const cacheMaxAgeMs = 60_000;
const cacheMaxEntries = 4;
let cacheGeneration = 0;
const invalidateAstCache = (): void => {
  cacheGeneration += 1;
  astCache.clear();
};

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
  wrapped.node.range?.end?.tokLen !== undefined
    ? nodeRange(wrapped)
    : nodeRange(wrapped, readWorkspaceText(document));

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
  const documentVersion = document.version;
  const generation = cacheGeneration;
  const source = path.resolve(document.uri.fsPath);
  const cursorByteOffset = byteOffsetFromUtf16(
    sourceText,
    vscode.window.activeTextEditor?.document === document
      ? document.offsetAt(vscode.window.activeTextEditor.selection.active)
      : 0
  );
  const options = {
    file: document.uri.fsPath,
    sourceText,
    cursorByteOffset
  };
  const cached = astCache.get(source);
  if (cached?.documentVersion === documentVersion &&
      cached.generation === generation &&
      Date.now() - cached.createdAt < cacheMaxAgeMs) {
    // Insertion order is the eviction order.
    astCache.delete(source);
    astCache.set(source, cached);
    return { _tag: 'ExtractionReady' as const, prepared: cached.prepared, options };
  }
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
  if (document.version !== documentVersion || generation !== cacheGeneration) {
    return { _tag: 'AnalysisFailure' as const, reason: 'A source file changed during analysis. Run the command again.' };
  }
  const prepared = yield* Effect.try({
    try: () => prepareAst(JSON.parse(astText) as ClangNode),
    catch: (error) => new Error('Could not prepare Clang AST: ' + String(error))
  });
  astCache.delete(source);
  astCache.set(source, { documentVersion, generation, createdAt: Date.now(), prepared });
  if (astCache.size > cacheMaxEntries) {
    const oldest = astCache.keys().next().value;
    if (oldest !== undefined) astCache.delete(oldest);
  }
  return { _tag: 'ExtractionReady' as const, prepared, options };
}, Effect.mapError((error) => new Error(error.message)));

const runMutationAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  token: vscode.CancellationToken,
  extensionPath: string
) {
  const extraction = yield* extractAst(document, token, extensionPath);
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeAst(extraction.prepared.ast, extraction.options, extraction.prepared);
});

const runOriginAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  token: vscode.CancellationToken,
  extensionPath: string
) {
  const extraction = yield* extractAst(document, token, extensionPath);
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeOriginAst(extraction.prepared.ast, extraction.options, extraction.prepared);
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
  const sourceWatcher = vscode.workspace.createFileSystemWatcher('**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,ipp,inc,mm}');
  const databaseWatcher = vscode.workspace.createFileSystemWatcher('**/compile_commands.json');
  context.subscriptions.push(
    sourceWatcher,
    databaseWatcher,
    sourceWatcher.onDidChange(invalidateAstCache),
    sourceWatcher.onDidCreate(invalidateAstCache),
    sourceWatcher.onDidDelete(invalidateAstCache),
    databaseWatcher.onDidChange(invalidateAstCache),
    databaseWatcher.onDidCreate(invalidateAstCache),
    databaseWatcher.onDidDelete(invalidateAstCache),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length > 0 && (isCpp(event.document.languageId) ||
          /\.(?:h|hh|hpp|hxx|ipp|inc)$/i.test(event.document.uri.fsPath) ||
          path.basename(event.document.uri.fsPath) === 'compile_commands.json')) invalidateAstCache();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('foldStateJump')) invalidateAstCache();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(invalidateAstCache),

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
