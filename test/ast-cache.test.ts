import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { Deferred, Effect, Ref } from 'effect';
import { prepareAst } from '../src/analysis';
import { invalidateAstCache, loadPreparedAst, makeAstCache, type AstCache } from '../src/ast-cache';

const prepared = prepareAst({ kind: 'TranslationUnitDecl' });
const request = (source: string, documentVersion = 1) => ({ source, documentVersion });
const extracted = (astBytes = 1024) => Effect.succeed({ prepared, astBytes });
const unexpectedExtraction = Effect.fail(new Error('Unexpected native extraction'));
const load = (cache: AstCache, source: string, astBytes = 1024) =>
  loadPreparedAst(cache, request(source), extracted(astBytes));

describe('AST extraction cache', () => {
  test('reuses prepared indexes when navigating between translation units', async () => {
    const cache = makeAstCache();
    await Effect.runPromise(load(cache, '/one.cpp'));
    await Effect.runPromise(load(cache, '/two.cpp'));
    const result = await Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction));
    assert.equal(result._tag, 'ExtractionReady');
    if (result._tag === 'ExtractionReady') assert.equal(result.prepared, prepared);
  });

  test('evicts the least recently used translation unit', async () => {
    const cache = makeAstCache();
    await Effect.runPromise(load(cache, '/one.cpp'));
    await Effect.runPromise(load(cache, '/two.cpp'));
    await Effect.runPromise(load(cache, '/three.cpp'));
    await Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction));
    await Effect.runPromise(load(cache, '/four.cpp'));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request('/two.cpp'), unexpectedExtraction)), /Unexpected native extraction/);
    assert.equal((await Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction)))._tag, 'ExtractionReady');
  });

  test('bounds retained AST bytes and retains one oversized translation unit', async () => {
    const cache = makeAstCache();
    await Effect.runPromise(load(cache, '/one.cpp', 10 * 1024 * 1024));
    await Effect.runPromise(load(cache, '/two.cpp', 10 * 1024 * 1024));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction)), /Unexpected native extraction/);
    await Effect.runPromise(load(cache, '/large.cpp', 24 * 1024 * 1024));
    assert.equal((await Effect.runPromise(loadPreparedAst(cache, request('/large.cpp'), unexpectedExtraction)))._tag, 'ExtractionReady');
    assert.equal((await Effect.runPromise(Ref.get(cache.state))).entries.length, 1);
  });

  test('replaces earlier document versions and retains unchanged ASTs beyond 60 seconds', async () => {
    const cache = makeAstCache();
    await Effect.runPromise(load(cache, '/one.cpp'));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request('/one.cpp', 2), unexpectedExtraction)), /Unexpected native extraction/);
    await Effect.runPromise(loadPreparedAst(cache, request('/one.cpp', 2), extracted()));
    assert.equal((await Effect.runPromise(Ref.get(cache.state))).entries.length, 1);
    await Effect.runPromise(Ref.update(cache.state, (state) => ({
      ...state, entries: state.entries.map((entry) => ({ ...entry, createdAt: Date.now() - 60_001 }))
    })));
    assert.equal((await Effect.runPromise(loadPreparedAst(cache, request('/one.cpp', 2), unexpectedExtraction)))._tag, 'ExtractionReady');
  });

  test('invalidates every cached translation unit after source changes', async () => {
    const cache = makeAstCache();
    await Effect.runPromise(load(cache, '/one.cpp'));
    await Effect.runPromise(load(cache, '/two.cpp'));
    await Effect.runPromise(invalidateAstCache(cache));
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction)), /Unexpected native extraction/);
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request('/two.cpp'), unexpectedExtraction)), /Unexpected native extraction/);
  });

  test('shares one extraction between concurrent commands on the same document', async () => {
    const cache = makeAstCache();
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const extraction = Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(released);
      return { prepared, astBytes: 1024 };
    });
    const first = Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), extraction));
    await Effect.runPromise(Deferred.await(started));
    const second = Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction));
    await Effect.runPromise(Deferred.succeed(released, undefined));
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult._tag, secondResult._tag);
    if (firstResult._tag === 'ExtractionReady' && secondResult._tag === 'ExtractionReady') assert.equal(firstResult.prepared, secondResult.prepared);
  });

  test('serves warm commands while another translation unit is extracting', async () => {
    const cache = makeAstCache();
    await Effect.runPromise(load(cache, '/warm.cpp'));
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const extraction = Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(released);
      return { prepared, astBytes: 1024 };
    });
    const cold = Effect.runPromise(loadPreparedAst(cache, request('/cold.cpp'), extraction));
    await Effect.runPromise(Deferred.await(started));
    try {
      const result = await Effect.runPromise(loadPreparedAst(cache, request('/warm.cpp'), unexpectedExtraction), { signal: AbortSignal.timeout(1000) });
      assert.equal(result._tag, 'ExtractionReady');
    } finally {
      await Effect.runPromise(Deferred.succeed(released, undefined));
      await cold;
    }
  });

  test('discards results and queued commands invalidated during extraction', async () => {
    const cache = makeAstCache();
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const extraction = Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(released);
      return { prepared, astBytes: 1024 };
    });
    const first = Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), extraction));
    await Effect.runPromise(Deferred.await(started));
    const second = Effect.runPromise(loadPreparedAst(cache, request('/two.cpp'), unexpectedExtraction));
    await Effect.runPromise(invalidateAstCache(cache));
    await Effect.runPromise(Deferred.succeed(released, undefined));
    assert.equal((await first)._tag, 'AnalysisFailure');
    assert.equal((await second)._tag, 'AnalysisFailure');
    assert.equal((await Effect.runPromise(Ref.get(cache.state))).entries.length, 0);
  });

  test('cancels a queued command without disturbing the active extraction', async () => {
    const cache = makeAstCache();
    const started = Deferred.makeUnsafe<void>();
    const released = Deferred.makeUnsafe<void>();
    const extraction = Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      yield* Deferred.await(released);
      return { prepared, astBytes: 1024 };
    });
    const first = Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), extraction));
    await Effect.runPromise(Deferred.await(started));
    const controller = new AbortController();
    const second = Effect.runPromise(loadPreparedAst(cache, request('/two.cpp'), unexpectedExtraction), { signal: controller.signal });
    controller.abort();
    await assert.rejects(second);
    await Effect.runPromise(Deferred.succeed(released, undefined));
    assert.equal((await first)._tag, 'ExtractionReady');
    assert.equal((await Effect.runPromise(load(cache, '/two.cpp')))._tag, 'ExtractionReady');
  });

  test('releases the extraction permit after cancellation or failure', async () => {
    const cache = makeAstCache();
    const started = Deferred.makeUnsafe<void>();
    const controller = new AbortController();
    const first = Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined);
      return yield* Effect.never;
    })), { signal: controller.signal });
    await Effect.runPromise(Deferred.await(started));
    controller.abort();
    await assert.rejects(first);
    await assert.rejects(Effect.runPromise(loadPreparedAst(cache, request('/one.cpp'), unexpectedExtraction)), /Unexpected native extraction/);
    assert.equal((await Effect.runPromise(load(cache, '/one.cpp')))._tag, 'ExtractionReady');
  });
});
