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
};

export type AstCache = {
  readonly state: Ref.Ref<AstCacheState>;
  readonly extraction: Semaphore.Semaphore;
};

export type AstExtractionResult =
  | { readonly _tag: 'ExtractionReady'; readonly prepared: PreparedAst; readonly hit: 'memory' | 'load'; readonly dependencies?: DependencyManifest }
  | { readonly _tag: 'AnalysisFailure'; readonly reason: string };

const maxEntries = 3;
const maxAstBytes = 16 * 1024 * 1024;

// Ref and Semaphore bridge the editor's independent callbacks. Cache state
// transitions replace immutable values; only the eviction fold builds arrays.
export const makeAstCache = (): AstCache => ({
  state: Ref.makeUnsafe<AstCacheState>({ generation: 0, revisions: new Map(), entries: [] }),
  extraction: Semaphore.makeUnsafe(1)
});

const dependsOn = (entry: CachedAst, source: string): boolean =>
  entry.source === source || !!entry.dependencies?.paths.some((file) => path.resolve(file.path) === source || file.real === source);

export const invalidateAstCache = (cache: AstCache, source?: string): Effect.Effect<void> =>
  Ref.update(cache.state, (state) => source && state.revisions.size < 4096
    ? { ...state, revisions: new Map([...state.revisions, [source, (state.revisions.get(source) ?? 0) + 1]]),
        entries: state.entries.filter((entry) => !dependsOn(entry, source)) }
    : { generation: state.generation + 1, revisions: new Map(), entries: [] });

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
  [source, ...(dependencies?.paths.flatMap((file) => [path.resolve(file.path), file.real]) ?? [])].some((file) =>
    (before.revisions.get(file) ?? 0) !== (after.revisions.get(file) ?? 0));

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
  validate: (dependencies: DependencyManifest) => Effect.Effect<boolean> = () => Effect.succeed(true)
): Effect.fn.Return<AstExtractionResult, Error> {
  const before = yield* Ref.get(cache.state);
  const cached = yield* lookupPreparedAst(cache, request, before, validate);
  if (cached) return cached;
  return yield* cache.extraction.withPermit(Effect.gen(function* () {
    const cached = yield* lookupPreparedAst(cache, request, before, validate);
    if (cached) return cached;
    const extracted = yield* extract;
    return yield* Ref.modify(cache.state, (state): readonly [AstExtractionResult, AstCacheState] => {
      if (changed(before, state, request.source, extracted.dependencies)) return [changedDuringExtraction, state];
      const result: AstExtractionResult = { _tag: 'ExtractionReady', prepared: extracted.prepared, hit: 'load', dependencies: extracted.dependencies };
      if (extracted.cacheable === false) return [result, state];
      const entry: CachedAst = { ...request, prepared: extracted.prepared, astBytes: extracted.astBytes,
        dependencies: extracted.dependencies, createdAt: Date.now() };
      return [result, {
        ...state, entries: retainedEntries([entry, ...state.entries.filter((entry) =>
          entry.source !== request.source || entry.buildIdentity !== request.buildIdentity)])
      }];
    });
  }));
});
