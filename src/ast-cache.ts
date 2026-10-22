import { Effect, Ref, Semaphore } from 'effect';
import type { PreparedAst } from './analysis';

export type AstRequest = {
  readonly source: string;
  readonly documentVersion: number;
};

type CachedAst = AstRequest & {
  readonly createdAt: number;
  readonly astBytes: number;
  readonly prepared: PreparedAst;
};

type AstCacheState = {
  readonly generation: number;
  // Most recently used first. The budget measures serialized AST bytes;
  // decoded nodes and indexes require additional memory.
  readonly entries: readonly CachedAst[];
};

export type AstCache = {
  readonly state: Ref.Ref<AstCacheState>;
  readonly extraction: Semaphore.Semaphore;
};

export type AstExtractionResult =
  | { readonly _tag: 'ExtractionReady'; readonly prepared: PreparedAst }
  | { readonly _tag: 'AnalysisFailure'; readonly reason: string };

const maxAgeMs = 60_000;
const maxEntries = 3;
const maxAstBytes = 16 * 1024 * 1024;

// Ref and Semaphore bridge the editor's independent callbacks. Cache state
// transitions replace immutable values; only the eviction fold builds arrays.
export const makeAstCache = (): AstCache => ({
  state: Ref.makeUnsafe<AstCacheState>({ generation: 0, entries: [] }),
  extraction: Semaphore.makeUnsafe(1)
});

export const invalidateAstCache = (cache: AstCache): Effect.Effect<void> =>
  Ref.update(cache.state, (state) => ({ generation: state.generation + 1, entries: [] }));

const retainedEntries = (entries: readonly CachedAst[], now: number): readonly CachedAst[] =>
  entries.reduce<{ readonly entries: CachedAst[]; readonly astBytes: number }>((state, entry) => {
    if (now - entry.createdAt >= maxAgeMs || state.entries.length >= maxEntries) return state;
    // Always retain the newest AST, even when it alone exceeds the budget.
    // Otherwise every command on a large translation unit would reparse it.
    if (state.entries.length > 0 && state.astBytes + entry.astBytes > maxAstBytes) return state;
    state.entries.push(entry);
    return { entries: state.entries, astBytes: state.astBytes + entry.astBytes };
  }, { entries: [], astBytes: 0 }).entries;

const changedDuringExtraction: AstExtractionResult = {
  _tag: 'AnalysisFailure', reason: 'A source file changed during analysis. Run the command again.'
};

const lookupPreparedAst = (cache: AstCache, request: AstRequest, generation: number): Effect.Effect<AstExtractionResult | undefined> =>
  Ref.modify(cache.state, (state): readonly [AstExtractionResult | undefined, AstCacheState] => {
    if (state.generation !== generation) return [changedDuringExtraction, state];
    const now = Date.now();
    const entry = state.entries.find((entry) => entry.source === request.source &&
      entry.documentVersion === request.documentVersion && now - entry.createdAt < maxAgeMs);
    return entry
      ? [{ _tag: 'ExtractionReady', prepared: entry.prepared }, {
          ...state, entries: retainedEntries([entry, ...state.entries.filter((other) => other !== entry)], now)
        }]
      : [undefined, state];
  });

export const loadPreparedAst = Effect.fnUntraced(function* (
  cache: AstCache,
  request: AstRequest,
  extract: Effect.Effect<{ readonly prepared: PreparedAst; readonly astBytes: number }, Error>
): Effect.fn.Return<AstExtractionResult, Error> {
  const generation = (yield* Ref.get(cache.state)).generation;
  const cached = yield* lookupPreparedAst(cache, request, generation);
  if (cached) return cached;
  // Recheck after acquiring the permit: concurrent commands for the same
  // document then reuse the first result instead of starting another Clang.
  return yield* cache.extraction.withPermit(Effect.gen(function* () {
    const cached = yield* lookupPreparedAst(cache, request, generation);
    if (cached) return cached;
    const extracted = yield* extract;
    return yield* Ref.modify(cache.state, (state): readonly [AstExtractionResult, AstCacheState] => {
      if (state.generation !== generation) return [changedDuringExtraction, state];
      const now = Date.now();
      const entry: CachedAst = { ...request, ...extracted, createdAt: now };
      return [{ _tag: 'ExtractionReady', prepared: extracted.prepared }, {
        ...state, entries: retainedEntries([entry, ...state.entries.filter((entry) => entry.source !== request.source)], now)
      }];
    });
  }));
});
