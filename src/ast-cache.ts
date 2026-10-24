import { Effect, Ref, Semaphore } from 'effect';
import type { PreparedAst } from './analysis';
import path from 'node:path';
import type { DependencyManifest } from './dependencies';

export type AstRequest = {
  readonly source: string;
  readonly documentVersion: number;
  readonly buildIdentity?: string;
};

type CachedAst = AstRequest & {
  readonly createdAt: number;
  readonly astBytes: number;
  readonly prepared: PreparedAst;
  readonly dependencies?: DependencyManifest;
};

type AstCacheState = {
  readonly generation: number;
  readonly revisions: ReadonlyMap<string, number>;
  // Most recently used first. The budget measures serialized AST bytes;
  // decoded nodes and indexes require additional memory.
  readonly entries: readonly CachedAst[];
  // Keep only path relationships after eviction/invalidation so subsequent
  // dependency saves can still rewarm the active TU. No AST/guards are retained.
  readonly observed: readonly { readonly source: string; readonly paths: DependencyManifest['paths'] }[];
};

type LoadOwner = { readonly users: number; readonly permit: Semaphore.Semaphore };

export type AstCache = {
  readonly state: Ref.Ref<AstCacheState>;
  readonly extraction: Semaphore.Semaphore;
  readonly loads: Ref.Ref<ReadonlyMap<string, LoadOwner>>;
};

export type AstExtractionResult =
  | { readonly _tag: 'ExtractionReady'; readonly prepared: PreparedAst; readonly hit: 'memory' | 'load'; readonly dependencies?: DependencyManifest }
  | { readonly _tag: 'AnalysisFailure'; readonly reason: string };

const maxEntries = 3;
const maxAstBytes = 16 * 1024 * 1024;

// Ref and Semaphore bridge the editor's independent callbacks. Cache state
// transitions replace immutable values; only the eviction fold builds arrays.
export const makeAstCache = (): AstCache => ({
  state: Ref.makeUnsafe<AstCacheState>({ generation: 0, revisions: new Map(), entries: [], observed: [] }),
  extraction: Semaphore.makeUnsafe(1),
  loads: Ref.makeUnsafe<ReadonlyMap<string, LoadOwner>>(new Map())
});

export const dependencyIncludes = (paths: DependencyManifest['paths'], source: string): boolean =>
  paths.some((file) => path.resolve(file.path) === source || file.real === source ||
    (file.sha256 === '' && source.startsWith(path.resolve(file.path) + path.sep)));

export const affectedAstSources = (cache: AstCache, source: string): Effect.Effect<readonly string[]> =>
  Ref.get(cache.state).pipe(Effect.map((state) => [...new Set([source, ...state.observed
    .filter((entry) => dependencyIncludes(entry.paths, source)).map((entry) => entry.source)])]));

export const invalidateAstCache = (cache: AstCache, source?: string): Effect.Effect<void> =>
  Ref.update(cache.state, (state) => {
    if (!source || state.revisions.size >= 4096) return {
      generation: state.generation + 1, revisions: new Map(), entries: [], observed: source ? state.observed : []
    };
    const affected = new Set([source, ...state.observed.filter((entry) => dependencyIncludes(entry.paths, source)).map((entry) => entry.source)]);
    return { ...state, revisions: [...affected].reduce((revisions, source) => {
      revisions.set(source, (state.revisions.get(source) ?? 0) + 1);
      return revisions;
    }, new Map(state.revisions)), entries: state.entries.filter((entry) => !affected.has(entry.source)) };
  });

// Maintenance has already closed admission and drained jobs. Clearing stored
// data is distinct from a source edit: it must not invalidate dependent TUs in
// other projects whose source inputs have not changed.
export const removeAstSources = (cache: AstCache, sources: readonly string[]): Effect.Effect<void> =>
  Ref.update(cache.state, (state) => ({ ...state, entries: state.entries.filter((entry) => !sources.includes(entry.source)) }));

const retainedEntries = (entries: readonly CachedAst[]): readonly CachedAst[] =>
  entries.reduce<{ readonly entries: CachedAst[]; readonly astBytes: number }>((state, entry) => {
    if (state.entries.length >= maxEntries) return state;
    // Always retain the newest AST, even when it alone exceeds the budget.
    // Otherwise every command on a large translation unit would reparse it.
    if (state.entries.length > 0 && state.astBytes + entry.astBytes > maxAstBytes) return state;
    state.entries.push(entry);
    return { entries: state.entries, astBytes: state.astBytes + entry.astBytes };
  }, { entries: [], astBytes: 0 }).entries;

const changedDuringExtraction: AstExtractionResult = {
  _tag: 'AnalysisFailure', reason: 'A source file changed during analysis. Run the command again.'
};

const changed = (before: AstCacheState, after: AstCacheState, source: string, dependencies?: DependencyManifest): boolean =>
  before.generation !== after.generation ||
  [...after.revisions].some(([file, revision]) => revision !== (before.revisions.get(file) ?? 0) &&
    (file === source || !!dependencies && dependencyIncludes(dependencies.paths, file)));

const lookupPreparedAst = Effect.fnUntraced(function* (
  cache: AstCache, request: AstRequest, before: AstCacheState,
  validate: (dependencies: DependencyManifest) => Effect.Effect<boolean>
) {
  const state = yield* Ref.get(cache.state);
  if (changed(before, state, request.source)) return changedDuringExtraction;
  const entry = state.entries.find((entry) => entry.source === request.source &&
    entry.documentVersion === request.documentVersion && entry.buildIdentity === request.buildIdentity);
  if (!entry) return undefined;
  if (entry.dependencies && !(yield* validate(entry.dependencies))) {
    yield* Ref.update(cache.state, (state) => ({ ...state, entries: state.entries.filter((other) => other !== entry) }));
    return undefined;
  }
  return yield* Ref.modify(cache.state, (state): readonly [AstExtractionResult, AstCacheState] =>
    changed(before, state, request.source, entry.dependencies)
      ? [changedDuringExtraction, state]
      : [{ _tag: 'ExtractionReady', prepared: entry.prepared, hit: 'memory', dependencies: entry.dependencies }, {
          ...state, entries: retainedEntries([entry, ...state.entries.filter((other) => other !== entry)])
        }]);
});

export type ExtractedAst = {
  readonly prepared: PreparedAst;
  readonly astBytes: number;
  readonly dependencies?: DependencyManifest;
  readonly cacheable?: boolean;
};

export const loadPreparedAst = Effect.fnUntraced(function* (
  cache: AstCache,
  request: AstRequest,
  extract: Effect.Effect<ExtractedAst, Error>,
  validate: (dependencies: DependencyManifest) => Effect.Effect<boolean> = () => Effect.succeed(true),
  restore: Effect.Effect<ExtractedAst | undefined, Error> = Effect.succeed(undefined)
): Effect.fn.Return<AstExtractionResult, Error> {
  const before = yield* Ref.get(cache.state);
  const cached = yield* lookupPreparedAst(cache, request, before, validate);
  if (cached) return cached;
  const key = JSON.stringify([request.source, request.documentVersion, request.buildIdentity, before.generation, before.revisions.get(request.source)]);
  return yield* Effect.acquireUseRelease(
    Ref.modify(cache.loads, (loads): readonly [LoadOwner, ReadonlyMap<string, LoadOwner>] => {
      const owner = loads.get(key) ?? { users: 0, permit: Semaphore.makeUnsafe(1) };
      return [owner, new Map([...loads, [key, { ...owner, users: owner.users + 1 }]])];
    }),
    (owner) => owner.permit.withPermit(Effect.gen(function* () {
      const cached = yield* lookupPreparedAst(cache, request, before, validate);
      if (cached) return cached;
      // Restoration owns only this request key, never the native permit. A valid
      // B snapshot can finish while A's Clang process is still running.
      const restored = yield* restore;
      const extracted = restored ?? (yield* cache.extraction.withPermit(Effect.gen(function* () {
        if (changed(before, yield* Ref.get(cache.state), request.source)) return undefined;
        return yield* extract;
      })));
      if (!extracted) return changedDuringExtraction;
      return yield* Ref.modify(cache.state, (state): readonly [AstExtractionResult, AstCacheState] => {
        if (changed(before, state, request.source, extracted.dependencies)) return [changedDuringExtraction, state];
        const result: AstExtractionResult = { _tag: 'ExtractionReady', prepared: extracted.prepared, hit: 'load', dependencies: extracted.dependencies };
        if (extracted.cacheable === false) return [result, state];
        const entry: CachedAst = { ...request, prepared: extracted.prepared, astBytes: extracted.astBytes,
          dependencies: extracted.dependencies, createdAt: Date.now() };
        return [result, {
          ...state,
          observed: extracted.dependencies ? [{ source: request.source, paths: extracted.dependencies.paths },
            ...state.observed.filter((entry) => entry.source !== request.source)].slice(0, 8) : state.observed,
          entries: retainedEntries([entry, ...state.entries.filter((entry) =>
            entry.source !== request.source || entry.buildIdentity !== request.buildIdentity)])
        }];
      });
    })),
    () => Ref.update(cache.loads, (loads) => {
      const owner = loads.get(key);
      if (!owner) return loads;
      return owner.users === 1 ? new Map([...loads].filter(([other]) => other !== key))
        : new Map([...loads, [key, { ...owner, users: owner.users - 1 }]]);
    })
  );
});
