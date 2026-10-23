// Opt-in: bun test/cache-baseline.ts <saved baseline ast-cache.ts> <ast.json> <source> [N=15]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Effect, Ref } from 'effect';
import { prepareAst } from '../src/analysis';
import type * as BaselineCache from '../src/ast-cache';
const baseline = await import(pathToFileURL(path.resolve(process.argv[2])).href) as typeof BaselineCache;
const prepared = prepareAst(JSON.parse(await readFile(process.argv[3], 'utf8')));
const request = { source: path.resolve(process.argv[4]), documentVersion: 1 };
const cache = baseline.makeAstCache();
// The baseline API predates build identities/dependency manifests.
const load = baseline.loadPreparedAst as unknown as (cache: unknown, request: unknown, extraction: Effect.Effect<unknown, Error>) => Effect.Effect<{ readonly _tag: string }, Error>;
await Effect.runPromise(load(cache, request, Effect.succeed({ prepared, astBytes: 5685272 })));
const samples = await Array.from({ length: Number(process.argv[5] ?? 15) }).reduce<Promise<number[]>>(async (samples) => {
  const previous = await samples;
  const start = performance.now();
  assert.equal((await Effect.runPromise(load(cache, request, Effect.fail(new Error('unexpected extraction')))))._tag, 'ExtractionReady');
  return [...previous, performance.now() - start];
}, Promise.resolve([]));
await Effect.runPromise(Ref.update(cache.state, (state) => ({ ...state, entries: state.entries.map((entry) => ({ ...entry, createdAt: Date.now() - 61000 })) })));
await assert.rejects(Effect.runPromise(load(cache, request, Effect.fail(new Error('expired extraction')))), /expired extraction/);
console.log(JSON.stringify({ samplesMs: samples, expiredRequiresExtraction: true, host: process.memoryUsage() }, null, 2));
