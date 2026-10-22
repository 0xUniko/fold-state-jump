import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyAstCache, invalidateAstCache, putAstCache, readAstCache } from '../src/ast-cache';

const maxAgeMs = 60_000;
const add = (cache: ReturnType<typeof emptyAstCache<number>>, source: string, prepared: number, version = 1, now = 100) =>
  putAstCache(cache, { source, prepared, documentVersion: version, createdAt: now }, 4);
const read = (cache: ReturnType<typeof emptyAstCache<number>>, source: string, version = 1, now = 200) =>
  readAstCache(cache, source, version, now, maxAgeMs);

describe('prepared AST LRU', () => {
  test('retains four entries and evicts the least recently used', () => {
    const initial = ['a', 'b', 'c', 'd'].reduce(
      (cache, source, index) => add(cache, source, index),
      emptyAstCache<number>()
    );
    assert.deepEqual(initial.entries.map((entry) => entry.source), ['d', 'c', 'b', 'a']);
    const hit = read(initial, 'a');
    assert.equal(hit.prepared, 0);
    assert.deepEqual(hit.cache.entries.map((entry) => entry.source), ['a', 'd', 'c', 'b']);
    const fifth = add(hit.cache, 'e', 4);
    assert.deepEqual(fifth.entries.map((entry) => entry.source), ['e', 'a', 'd', 'c']);
    assert.equal(read(fifth, 'b').prepared, undefined);
    assert.equal(read(fifth, 'a').prepared, 0);
    assert.equal(initial.entries.length, 4, 'cache updates never mutate an earlier state');
  });

  test('replaces entries in-place logically without duplicates', () => {
    const updated = add(add(emptyAstCache<number>(), 'a', 1), 'a', 2, 2);
    assert.equal(updated.entries.length, 1);
    assert.equal(read(updated, 'a', 1).prepared, undefined);
    assert.equal(read(updated, 'a', 2).prepared, 2);
  });

  test('honors document version and TTL boundaries', () => {
    const cache = add(emptyAstCache<number>(), 'a', 42, 3, 100);
    assert.equal(read(cache, 'a', 2, 200).prepared, undefined);
    assert.equal(read(cache, 'a', 3, 100 + maxAgeMs - 1).prepared, 42);
    assert.equal(read(cache, 'a', 3, 100 + maxAgeMs).prepared, undefined);
    assert.equal(read(cache, 'a', 3, 99).prepared, undefined);
  });

  test('invalidates all files with a new generation', () => {
    const cache = add(add(emptyAstCache<number>(), 'a', 1), 'b', 2);
    const invalidated = invalidateAstCache(cache);
    assert.equal(invalidated.entries.length, 0);
    assert.equal(invalidated.generation, cache.generation + 1);
    assert.equal(read(invalidated, 'a').prepared, undefined);
    assert.equal(read(invalidated, 'b').prepared, undefined);
  });

  test('allows an entry cap of one for large translation units', () => {
    const cache = putAstCache(
      add(emptyAstCache<number>(), 'a', 1),
      { source: 'b', prepared: 2, documentVersion: 1, createdAt: 100 },
      1
    );
    assert.deepEqual(cache.entries.map((entry) => entry.source), ['b']);
  });
});
