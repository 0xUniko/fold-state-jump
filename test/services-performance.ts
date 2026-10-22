// bun test/services-performance.ts [services-module-path] [repetitions]
// A saved module path permits identical inputs against a baseline without cache support.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Effect } from 'effect';
import type { CompileDatabaseCache } from '../src/services';

const services: typeof import('../src/services') = await import(process.argv[2] ?? '../src/services');
const repetitions = Number(process.argv[3] ?? 11);
if (!Number.isSafeInteger(repetitions) || repetitions < 3) throw new Error('Repetitions must be an integer of at least three.');
const count = 20_000;
const emptyCache: CompileDatabaseCache = new Map();
const directory = await mkdtemp(path.join(os.tmpdir(), 'fold-services-performance-'));

try {
  const text = JSON.stringify(Array.from({ length: count }, (_, index) => ({
    directory, file: 'src/unit' + index + '.cpp',
    arguments: ['c++', '-std=c++23', '-Iinclude', '-c', 'src/unit' + index + '.cpp', '-o', 'unit' + index + '.o']
  })));
  await writeFile(path.join(directory, 'compile_commands.json'), text);
  const source = path.join(directory, 'src/unit' + (count - 1) + '.cpp');
  const header = path.join(directory, 'include/unit' + (count - 1) + '.h');
  const resolve = async (source: string, cache: CompileDatabaseCache) =>
    services.resolveCompileCommandCached
      ? Effect.runPromise(services.resolveCompileCommandCached(source, [directory], 'clang++', cache))
      : { command: await Effect.runPromise(services.resolveCompileCommand(source, [directory], 'clang++')), cache };
  const measure = async (name: string, source: string, cache: CompileDatabaseCache, retain: boolean) => {
    const measured = await Array.from({ length: repetitions }).reduce<Promise<{
      readonly cache: CompileDatabaseCache;
      readonly samples: readonly number[];
    }>>(async (pending) => {
      const measured = await pending;
      const start = performance.now();
      const resolved = await resolve(source, retain ? measured.cache : emptyCache);
      const elapsed = performance.now() - start;
      assert.equal(resolved.command.context, source === header ? 'inferred' : 'exact');
      assert.ok(resolved.command.args.includes('-Iinclude'));
      return { cache: resolved.cache, samples: [...measured.samples, elapsed] };
    }, Promise.resolve({ cache, samples: [] as number[] }));
    const samples = measured.samples.slice(2).sort((a, b) => a - b);
    console.log(JSON.stringify({
      name, entries: count, inputBytes: Buffer.byteLength(text), repetitions: samples.length,
      medianMs: Number(samples[Math.floor(samples.length / 2)].toFixed(3))
    }));
    return measured.cache;
  };

  const exactCache = await measure('exact, rebuild database', source, emptyCache, false);
  await measure('exact, reuse unchanged database', source, exactCache, true);
  const headerCache = await measure('header, rebuild database', header, emptyCache, false);
  await measure('header, reuse unchanged database', header, headerCache, true);
} finally {
  await rm(directory, { recursive: true, force: true });
}
