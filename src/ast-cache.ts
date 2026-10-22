// An immutable, bounded LRU. The extension owns its state transitions;
// retaining an AST is intentionally distinct from the Clang extraction step.
export type AstCacheEntry<T> = {
  readonly source: string;
  readonly documentVersion: number;
  readonly generation: number;
  readonly createdAt: number;
  readonly prepared: T;
};

export type AstCache<T> = {
  readonly generation: number;
  readonly entries: readonly AstCacheEntry<T>[];
};

export const emptyAstCache = <T>(): AstCache<T> => ({ generation: 0, entries: [] });

export const invalidateAstCache = <T>(cache: AstCache<T>): AstCache<T> => ({
  generation: cache.generation + 1,
  entries: []
});

export const readAstCache = <T>(
  cache: AstCache<T>,
  source: string,
  documentVersion: number,
  now: number,
  maxAgeMs: number
): { readonly cache: AstCache<T>; readonly prepared: T | undefined } => {
  const selected = cache.entries.find((entry) =>
    entry.source === source &&
    entry.documentVersion === documentVersion &&
    entry.generation === cache.generation &&
    now >= entry.createdAt &&
    now - entry.createdAt < maxAgeMs
  );
  return selected
    ? {
        cache: {
          ...cache,
          entries: [selected, ...cache.entries.filter((entry) => entry !== selected)]
        },
        prepared: selected.prepared
      }
    : { cache, prepared: undefined };
};

export const putAstCache = <T>(
  cache: AstCache<T>,
  entry: Omit<AstCacheEntry<T>, 'generation'>,
  maxEntries: number
): AstCache<T> => ({
  ...cache,
  entries: [
    { ...entry, generation: cache.generation },
    ...cache.entries.filter((previous) => previous.source !== entry.source)
  ].slice(0, Math.max(1, maxEntries))
});
