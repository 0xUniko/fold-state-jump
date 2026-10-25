import { makePrewarmScheduler, schedulePrewarm, requestForeground, cancelPrewarm, disposePrewarm, withSchedulerMaintenance, cancelSourceTasks, trackNativeProcess, backgroundAdmission, type PrewarmScheduler } from './prewarm';
import { prepareCacheLocation, resolveCacheProject } from './cache-location';
import { buildIdentity, validateDependencies } from './dependencies';
import { makeDiskCache, readDiskAst, writeDiskAst, clearDiskCache, diskCacheStats, type DiskCache } from './disk-cache';
import { clearPchStorage, pchStorageStats } from './pch-storage';
import { resolveExtractorPath } from './extractor-path';
import { clearPreamblePool, disposePreamblePool, extractWithPreamble, makePreamblePool, type PreamblePool } from './preamble';
import * as vscode from 'vscode';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { analyzeAst, analyzeOriginAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange, type WrappedNode, type TraceCandidate } from './analysis';
import { makeAstCache, invalidateAstCache, loadPreparedAst, affectedAstSources, dependencyIncludes, removeAstSources, type AstCache } from './ast-cache';
import { emptyCompileDatabaseCache, resolveCompileCommandCached, type CompileCommand, type CompileDatabaseCache } from './services';

const isCpp = (languageId: string): boolean =>
  ['cpp', 'c', 'cuda-cpp', 'objective-cpp'].includes(languageId);

const activeDocument = (): vscode.TextDocument | undefined => vscode.window.activeTextEditor?.document;

type ExtractionRuntime = {
  readonly preamblePool: PreamblePool;
  readonly astCache: AstCache;
  readonly scheduler: PrewarmScheduler;
  readonly diskCaches: Ref.Ref<ReadonlyMap<string, { readonly projectKey: string; readonly cache: DiskCache }>>;
  readonly globalStorage: string;
  readonly output: vscode.OutputChannel;
  readonly compileDatabaseCache: Ref.Ref<CompileDatabaseCache>;
};

const documentDiskCache = Effect.fnUntraced(function* (document: vscode.TextDocument, runtime: ExtractionRuntime, inspectDisabled = false) {
  if (document.uri.scheme !== 'file') return undefined;
  const config = vscode.workspace.getConfiguration('foldStateJump', document.uri);
  if (!inspectDisabled && !config.get('cache.disk.enabled', true)) return undefined;
  const location = yield* Effect.promise(() => prepareCacheLocation({
    source: path.resolve(document.uri.fsPath),
    workspaceRoots: (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath),
    globalStorage: runtime.globalStorage, configuredPath: config.get('cache.disk.path', '')
  }));
  if (location._tag === 'UnavailableCache') {
    runtime.output.appendLine(JSON.stringify({ event: 'disk-unavailable', reason: location.reason }));
    return undefined;
  }
  if (location._tag === 'GlobalFallbackCache') runtime.output.appendLine(JSON.stringify({ event: 'disk-fallback', reason: location.reason, root: location.root }));
  return yield* Ref.modify(runtime.diskCaches, (diskCaches) => {
    const cache = { ...(diskCaches.get(location.astDirectory)?.cache ?? makeDiskCache(location.astDirectory)),
      maxBytes: config.get('cache.disk.maxBytes', 0), maxAstBytes: config.get('maxAstBytes', 67108864) };
    return [cache, new Map([...diskCaches, [location.astDirectory, { projectKey: location.project.key, cache }]])] as const;
  });
});

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
  const startedAt = performance.now();
  const documentVersion = document.version;
  const generation = (yield* Ref.get(runtime.astCache.state)).generation;
  const source = path.resolve(document.uri.fsPath);
  const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  const config = vscode.workspace.getConfiguration('foldStateJump', document.uri);
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
  const executable = resolveExtractorPath(extensionPath, config.get('extractorPath', ''));
  const configuration = { roots, config: config.get('compileCommandsPath', ''), maxAstBytes: config.get('maxAstBytes', 67108864) };
  const identify = (command: CompileCommand) => Effect.tryPromise({
    try: () => buildIdentity(source, command, executable, configuration), catch: (error) => new Error(String(error))
  });
  const identity = yield* identify(command);
  const diskCache = yield* Effect.cached(documentDiskCache(document, runtime));
  const extraction = yield* loadPreparedAst(runtime.astCache, { source, documentVersion, buildIdentity: identity }, Effect.gen(function* () {
    const task = (yield* Ref.get(runtime.scheduler.state)).tasks.find((task) => task.controller.signal === signal);
    if (task?._tag === 'Background' && backgroundAdmission() !== 'ready') {
      return yield* Effect.fail(new Error('Background parsing deferred because system resources are busy.'));
    }
    if (command.context === 'fallback') runtime.output.appendLine(JSON.stringify({ event: 'fallback-command', source }));
    const disk = yield* diskCache;
    const extracted = yield* extractWithPreamble(runtime.preamblePool, source, command, executable, configuration.maxAstBytes, signal, (event) => {
      if (event.event === 'native-start' || event.event === 'native-active') trackNativeProcess(runtime.scheduler, signal, event.pid as number | undefined);
      if (event.event === 'native-exit' || event.event === 'native-idle') trackNativeProcess(runtime.scheduler, signal, undefined);
      runtime.output.appendLine(JSON.stringify({ ...event, source }));
    }, disk ? path.join(path.dirname(disk.directory), 'pch') : undefined, task?._tag === 'Background' ? 'prewarm' : 'foreground');
    const afterCommand = yield* resolveInput;
    if (document.version !== documentVersion || generation !== (yield* Ref.get(runtime.astCache.state)).generation ||
        identity !== (yield* identify(afterCommand))) {
      return yield* Effect.fail(new Error('An input changed during analysis. Run the command again.'));
    }
    if (disk) {
      const written = yield* writeDiskAst(disk, identity, extracted, signal);
      yield* Effect.sync(() => runtime.output.appendLine(JSON.stringify({ event: 'disk-write', source, written })));
    }
    yield* Effect.sync(() => runtime.output.appendLine(JSON.stringify({ event: 'native-extraction', source, astBytes: extracted.astBytes, cacheable: extracted.cacheable })));
    return extracted;
  }).pipe(Effect.mapError((error) => new Error(error.message))), validateDependencies, Effect.gen(function* () {
    const disk = yield* diskCache;
    const restored = disk ? yield* readDiskAst(disk, identity) : undefined;
    if (restored) runtime.output.appendLine(JSON.stringify({ event: 'disk-hit', source, astBytes: restored.astBytes }));
    return restored;
  }));
  const afterCommand = yield* resolveInput;
  if (identity !== (yield* identify(afterCommand)) || generation !== (yield* Ref.get(runtime.astCache.state)).generation ||
      document.version !== documentVersion || document.isDirty) {
    return { _tag: 'AnalysisFailure' as const, reason: 'The document changed during analysis. Run the command again.' };
  }
  if (extraction._tag === 'ExtractionReady' && vscode.workspace.textDocuments.some((document) =>
      document.isDirty && extraction.dependencies && dependencyIncludes(extraction.dependencies.paths, path.resolve(document.uri.fsPath)))) {
    return { _tag: 'AnalysisFailure' as const, reason: 'Save the modified included files before analysis.' };
  }
  yield* Effect.sync(() => runtime.output.appendLine(JSON.stringify({ event: extraction._tag === 'ExtractionReady' ? extraction.hit : 'stale', source, ms: performance.now() - startedAt, memory: process.memoryUsage() })));
  return extraction;
}, Effect.mapError((error) => new Error(error.message)));

const analysisOptions = (document: vscode.TextDocument) => ({
  file: document.uri.fsPath, sourceText: document.getText(),
  cursorByteOffset: byteOffsetFromUtf16(document.getText(),
    vscode.window.activeTextEditor?.document === document
      ? document.offsetAt(vscode.window.activeTextEditor.selection.active) : 0)
});

const extractionTask = (document: vscode.TextDocument, extensionPath: string, runtime: ExtractionRuntime, reason: string) => {
  const documentVersion = document.version;
  const source = path.resolve(document.uri.fsPath);
  const state = Effect.runSync(Ref.get(runtime.astCache.state));
  return {
    input: { source, reason, key: JSON.stringify([source, documentVersion, state.generation, state.revisions.get(source)]) },
    work: (signal: AbortSignal) => Effect.runPromise(Effect.gen(function* () {
      if (document.version !== documentVersion || document.isDirty || document.isClosed || document.uri.scheme !== 'file') {
        return { _tag: 'AnalysisFailure' as const, reason: 'The document changed before analysis.' };
      }
      return yield* extractAst(document, signal, extensionPath, runtime);
    }), { signal })
  };
};

const requestAst = (document: vscode.TextDocument, signal: AbortSignal, extensionPath: string, runtime: ExtractionRuntime) => {
  const task = extractionTask(document, extensionPath, runtime, 'command');
  return Effect.tryPromise({
    try: () => requestForeground(runtime.scheduler, task.input, signal, task.work),
    catch: (error) => new Error(String(error))
  });
};

const runMutationAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  signal: AbortSignal,
  extensionPath: string,
  runtime: ExtractionRuntime
) {
  const options = analysisOptions(document);
  const documentVersion = document.version;
  const extraction = yield* requestAst(document, signal, extensionPath, runtime);
  if (document.version !== documentVersion) return { _tag: 'AnalysisFailure' as const, reason: 'The document changed during analysis.' };
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeAst(extraction.prepared.ast, options, extraction.prepared);
});

const runOriginAnalysis = Effect.fnUntraced(function* (
  document: vscode.TextDocument,
  signal: AbortSignal,
  extensionPath: string,
  runtime: ExtractionRuntime
) {
  const options = analysisOptions(document);
  const documentVersion = document.version;
  const extraction = yield* requestAst(document, signal, extensionPath, runtime);
  if (document.version !== documentVersion) return { _tag: 'AnalysisFailure' as const, reason: 'The document changed during analysis.' };
  return extraction._tag === 'AnalysisFailure'
    ? extraction
    : analyzeOriginAst(extraction.prepared.ast, options, extraction.prepared);
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

const activeRuntime = Ref.makeUnsafe<ExtractionRuntime | undefined>(undefined);

export const activate = (context: vscode.ExtensionContext): void => {
  const output = vscode.window.createOutputChannel('Fold State Jump');
  const runtime: ExtractionRuntime = {
    preamblePool: makePreamblePool(),
    astCache: makeAstCache(),
    scheduler: makePrewarmScheduler((event) => output.appendLine(JSON.stringify(event))),
    diskCaches: Ref.makeUnsafe<ReadonlyMap<string, { readonly projectKey: string; readonly cache: DiskCache }>>(new Map()),
    globalStorage: context.globalStorageUri.fsPath,
    output,
    compileDatabaseCache: Ref.makeUnsafe(emptyCompileDatabaseCache)
  };
  Effect.runSync(Ref.set(activeRuntime, runtime));
  const prewarm = (reason: string): void => {
    const document = activeDocument();
    const config = vscode.workspace.getConfiguration('foldStateJump', document?.uri);
    if (!config.get('prewarm.enabled', true) || !document || document.uri.scheme !== 'file' ||
        !isCpp(document.languageId) || document.isDirty || document.isClosed) {
      cancelPrewarm(runtime.scheduler, 'ineligible-document');
      return;
    }
    const known = Effect.runSync(Ref.get(runtime.astCache.state)).observed.find((entry) => entry.source === path.resolve(document.uri.fsPath));
    if (known && vscode.workspace.textDocuments.some((document) => document.isDirty &&
        dependencyIncludes(known.paths, path.resolve(document.uri.fsPath)))) {
      cancelPrewarm(runtime.scheduler, 'dirty-dependency');
      return;
    }
    const admission = backgroundAdmission();
    if (admission !== 'ready') {
      cancelPrewarm(runtime.scheduler, admission);
      output.appendLine(JSON.stringify({ event: 'prewarm-skipped', reason: admission }));
      return;
    }
    const task = extractionTask(document, context.extensionPath, runtime, reason);
    schedulePrewarm(runtime.scheduler, task.input, config.get('prewarm.delayMs', 1500), task.work);
  };
  const invalidate = (): void => {
    Effect.runSync(invalidateAstCache(runtime.astCache));
    cancelPrewarm(runtime.scheduler, 'configuration-changed');
    prewarm('configuration');
  };
  const invalidateSource = (uri: vscode.Uri): void => {
    const source = path.resolve(uri.fsPath);
    const affected = Effect.runSync(affectedAstSources(runtime.astCache, source));
    Effect.runSync(invalidateAstCache(runtime.astCache, source));
    cancelSourceTasks(runtime.scheduler, affected);
    const document = activeDocument();
    if (document && affected.includes(path.resolve(document.uri.fsPath))) prewarm('dependency-change');
  };
  const sourceWatcher = vscode.workspace.createFileSystemWatcher('**/*.{c,cc,cpp,cxx,cu,cuh,h,hh,hpp,hxx,ipp,inc,mm,m,inl,tpp,C,H}');
  const databaseWatcher = vscode.workspace.createFileSystemWatcher('**/compile_commands.json');
  context.subscriptions.push(
    runtime.output,
    { dispose: () => { void disposePrewarm(runtime.scheduler).then(() => Effect.runPromise(disposePreamblePool(runtime.preamblePool))); } },
    vscode.window.onDidChangeActiveTextEditor(() => prewarm('active-editor')),
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (vscode.workspace.getConfiguration('foldStateJump', activeDocument()?.uri).get('prewarm.onSave', true)) invalidateSource(document.uri);
    }),
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
      if (['clangPath', 'extractorPath', 'compileCommandsPath', 'maxAstBytes'].some((key) =>
          event.affectsConfiguration('foldStateJump.' + key))) invalidate();
      else if (event.affectsConfiguration('foldStateJump')) prewarm('settings');
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(invalidate),

    vscode.commands.registerCommand('foldStateJump.clearCache', () => withSchedulerMaintenance(runtime.scheduler, async () => {
      const document = activeDocument();
      if (!document || document.uri.scheme !== 'file') { output.appendLine('Open a project file to clear its caches.'); return; }
      const config = vscode.workspace.getConfiguration('foldStateJump', document.uri);
      const executable = resolveExtractorPath(context.extensionPath, config.get('extractorPath', ''));
      await Effect.runPromise(clearPreamblePool(runtime.preamblePool));
      const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
      const project = await resolveCacheProject(path.resolve(document.uri.fsPath), roots);
      await Effect.runPromise(documentDiskCache(document, runtime, true));
      const diskCaches = Effect.runSync(Ref.get(runtime.diskCaches));
      const directories = [...new Set([
        path.join(runtime.globalStorage, 'project-cache-v2', project.key, 'ast'),
        ...[...diskCaches.values()].filter((entry) => entry.projectKey === project.key).map((entry) => entry.cache.directory)
      ])];
      const memory = Effect.runSync(Ref.get(runtime.astCache.state));
      const sources = [...new Set([...memory.entries.map((entry) => entry.source), ...memory.observed.map((entry) => entry.source)])];
      const projects = await Promise.all(sources.map(async (source) => ({ source, project: await resolveCacheProject(source, roots) })));
      await Effect.runPromise(removeAstSources(runtime.astCache, projects.filter((entry) => entry.project.key === project.key).map((entry) => entry.source)));
      const astCleared = await Effect.runPromise(Effect.forEach(directories, (directory) =>
        clearDiskCache(diskCaches.get(directory)?.cache ?? makeDiskCache(directory)).pipe(
          Effect.map((cleared) => ({ directory, cleared })))));
      const pchCleared = await Promise.all(directories.map(async (directory) => {
        const pchDirectory = path.join(path.dirname(directory), 'pch');
        return { directory: pchDirectory, cleared: await clearPchStorage(pchDirectory, executable) };
      }));
      const failures = [
        ...astCleared.filter((result) => !result.cleared).map((result) => 'AST disk cache cleanup failed: ' + result.directory + '.'),
        ...pchCleared.filter((result) => !result.cleared).map((result) =>
          'PCH cache cleanup failed: ' + result.directory + '. Check cache access and Native extractor ' + executable + ' (--pch-lock).')
      ];
      runtime.output.appendLine(JSON.stringify({ event: failures.length === 0 ? 'cache-cleared' : 'cache-clear-incomplete', project: project.root,
        ast: { memoryCleared: true, directories: astCleared }, pch: { executable, directories: pchCleared },
        message: failures.length === 0 ? 'AST and PCH caches cleared.' : 'Cache clearing incomplete. ' + failures.join(' ') }));
    })),
    vscode.commands.registerCommand('foldStateJump.cacheStats', () => Effect.runPromise(Effect.gen(function* () {
      const document = activeDocument();
      const cache = document ? yield* documentDiskCache(document, runtime, true) : undefined;
      const disk = cache ? yield* diskCacheStats(cache) : undefined;
      const pch = cache ? yield* Effect.promise(() => pchStorageStats(path.join(path.dirname(cache.directory), 'pch'))) : undefined;
      const memory = yield* Ref.get(runtime.astCache.state);
      runtime.output.appendLine(JSON.stringify({ event: 'cache-stats', disk, pch, diskDirectory: cache?.directory,
        diskCapacityBytes: cache?.maxBytes, memoryEntries: memory.entries.length,
        serializedAstBytes: memory.entries.reduce((bytes, entry) => bytes + entry.astBytes, 0),
        scheduler: { tasks: (yield* Ref.get(runtime.scheduler.state)).tasks.map((task) => ({ id: task.id, source: task.source, priority: task._tag })),
          cancellations: (yield* Ref.get(runtime.scheduler.state)).cancellations }, host: process.memoryUsage() }));
      runtime.output.show(true);
    }))),
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
  prewarm('activation');
};

export const deactivate = async (): Promise<void> => {
  const runtime = Effect.runSync(Ref.get(activeRuntime));
  Effect.runSync(Ref.set(activeRuntime, undefined));
  if (runtime) {
    await disposePrewarm(runtime.scheduler);
    await Effect.runPromise(disposePreamblePool(runtime.preamblePool));
  }
};
