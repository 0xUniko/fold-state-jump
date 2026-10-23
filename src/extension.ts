import { buildIdentity, validateDependencies } from './dependencies';
import { extractVerifiedAst } from './extraction';
import * as vscode from 'vscode';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange, type WrappedNode, type TraceCandidate } from './analysis';
import { makeAstCache, invalidateAstCache, loadPreparedAst, type AstCache } from './ast-cache';
import { emptyCompileDatabaseCache, resolveCompileCommandCached, type CompileCommand, type CompileDatabaseCache } from './services';

const isCpp = (languageId: string): boolean =>
  ['cpp', 'c', 'cuda-cpp', 'objective-cpp'].includes(languageId);

const activeDocument = (): vscode.TextDocument | undefined => vscode.window.activeTextEditor?.document;

type ExtractionRuntime = {
  readonly astCache: AstCache;
  readonly compileDatabaseCache: Ref.Ref<CompileDatabaseCache>;
};

const runWithCancellation = async <A>(
  token: vscode.CancellationToken,
  action: (signal: AbortSignal) => Effect.Effect<A, Error>
): Promise<A> => {
  const controller = new AbortController();
  const cancellation = token.onCancellationRequested(() => controller.abort());
  if (token.isCancellationRequested) controller.abort();
  try {
    // Interrupting a queued command removes its semaphore waiter; interrupting
    // extraction runs runClangAst's finalizer and releases the permit.
    return await Effect.runPromise(action(controller.signal), { signal: controller.signal });
  } finally {
    cancellation.dispose();
  }
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
  signal: AbortSignal,
  extensionPath: string,
  runtime: ExtractionRuntime
) {
  const sourceText = document.getText();
  const documentVersion = document.version;
  const generation = (yield* Ref.get(runtime.astCache.state)).generation;
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
  const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  const config = vscode.workspace.getConfiguration('foldStateJump');
  const resolveInput = Effect.gen(function* () {
    const resolved = yield* resolveCompileCommandCached(
      document.uri.fsPath,
      roots,
      config.get('clangPath', 'clang++'),
      yield* Ref.get(runtime.compileDatabaseCache),
      config.get('compileCommandsPath', '') || undefined
    );
    yield* Ref.set(runtime.compileDatabaseCache, resolved.cache);
    return resolved.command;
  });
  const command = yield* resolveInput;
  const configuredExtractor = config.get('extractorPath', '');
  const executable = configuredExtractor
    ? (path.isAbsolute(configuredExtractor) ? configuredExtractor : path.resolve(extensionPath, configuredExtractor))
    : path.join(extensionPath, 'native', 'build', 'fold-state-jump-ast');
  const configuration = { roots, config: config.get('compileCommandsPath', ''), maxAstBytes: config.get('maxAstBytes', 67108864) };
  const identify = (command: CompileCommand) => Effect.tryPromise({
    try: () => buildIdentity(source, command, executable, configuration), catch: (error) => new Error(String(error))
  });
  const identity = yield* identify(command);
  const extraction = yield* loadPreparedAst(runtime.astCache, { source, documentVersion, buildIdentity: identity }, Effect.gen(function* () {
    if (command.context === 'fallback') {
      yield* Effect.sync(() => {
        void vscode.window.showWarningMessage('Fold State Jump: no matching compile command found; Clang may lack project include paths. Set foldStateJump.compileCommandsPath if analysis fails.');
      });
    }
    const extracted = yield* extractVerifiedAst(source, command, executable, configuration.maxAstBytes, signal);
    const afterCommand = yield* resolveInput;
    if (document.version !== documentVersion || generation !== (yield* Ref.get(runtime.astCache.state)).generation ||
        identity !== (yield* identify(afterCommand))) {
      return yield* Effect.fail(new Error('An input changed during analysis. Run the command again.'));
    }
    return extracted;
  }).pipe(Effect.mapError((error) => new Error(error.message))), validateDependencies);
  if (document.version !== documentVersion || document.isDirty) {
    return { _tag: 'AnalysisFailure' as const, reason: 'The document changed during analysis. Run the command again.', options };
  }
  return { ...extraction, options };
}, Effect.mapError((error) => new Error(error.message)));

const runMutationAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  signal: AbortSignal,
  extensionPath: string,
  runtime: ExtractionRuntime
) {
  const extraction = yield* extractAst(document, signal, extensionPath, runtime);
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeAst(extraction.prepared.ast, extraction.options, extraction.prepared);
});

const runOriginAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  signal: AbortSignal,
  extensionPath: string,
  runtime: ExtractionRuntime
) {
  const extraction = yield* extractAst(document, signal, extensionPath, runtime);
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
  const runtime: ExtractionRuntime = {
    astCache: makeAstCache(),
    compileDatabaseCache: Ref.makeUnsafe(emptyCompileDatabaseCache)
  };
  const invalidate = (): void => Effect.runSync(invalidateAstCache(runtime.astCache));
  const invalidateSource = (uri: vscode.Uri): void => Effect.runSync(invalidateAstCache(runtime.astCache, path.resolve(uri.fsPath)));
  const sourceWatcher = vscode.workspace.createFileSystemWatcher('**/*.{c,cc,cpp,cxx,cu,cuh,h,hh,hpp,hxx,ipp,inc,mm,m,inl,tpp,C,H}');
  const databaseWatcher = vscode.workspace.createFileSystemWatcher('**/compile_commands.json');
  context.subscriptions.push(
    sourceWatcher,
    databaseWatcher,
    sourceWatcher.onDidChange(invalidateSource),
    sourceWatcher.onDidCreate(invalidateSource),
    sourceWatcher.onDidDelete(invalidateSource),
    databaseWatcher.onDidChange(invalidate),
    databaseWatcher.onDidCreate(invalidate),
    databaseWatcher.onDidDelete(invalidate),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length > 0 && (isCpp(event.document.languageId) ||
          /\.(?:c|cc|cpp|cxx|cu|cuh|h|hh|hpp|hxx|ipp|inc|mm|m|inl|tpp)$/i.test(event.document.uri.fsPath) ||
          path.basename(event.document.uri.fsPath) === 'compile_commands.json')) {
        if (path.basename(event.document.uri.fsPath) === 'compile_commands.json') invalidate();
        else invalidateSource(event.document.uri);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('foldStateJump')) invalidate();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(invalidate),

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
            (_progress, token) => runWithCancellation(token, (signal) => runMutationAnalysis(document, signal, context.extensionPath, runtime))
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
            (_progress, token) => runWithCancellation(token, (signal) => runOriginAnalysis(document, signal, context.extensionPath, runtime))
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
