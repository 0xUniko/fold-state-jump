// Run write and read in different processes, optionally changing VS Code IPC env.
// bun test/restart-integration.ts write|read <source> <cache-directory>
import assert from 'node:assert/strict';
import path from 'node:path';
import { Effect } from 'effect';
import { makeDiskCache, readDiskAst, writeDiskAst } from '../src/disk-cache';
import { buildIdentity, sha256 } from '../src/dependencies';
import { extractVerifiedAst } from '../src/extraction';
import { resolveCompileCommand } from '../src/services';
const mode = process.argv[2];
assert.ok(mode === 'write' || mode === 'read');
const source = path.resolve(process.argv[3]);
const cache = makeDiskCache(path.resolve(process.argv[4]));
const executable = path.resolve('native/build/fold-state-jump-ast');
const start = performance.now();
const cpuStart = process.cpuUsage();
const command = await Effect.runPromise(resolveCompileCommand(source, [path.dirname(source)], 'clang++'));
const identity = await buildIdentity(source, command, executable, {});
const extracted = mode === 'write'
  ? await Effect.runPromise(extractVerifiedAst(source, command, executable, 67108864, AbortSignal.timeout(180000)))
  : await Effect.runPromise(readDiskAst(cache, identity));
assert.ok(extracted, 'Expected cache hit after process restart');
if (mode === 'write') assert.equal(await Effect.runPromise(writeDiskAst(cache, identity, extracted, new AbortController().signal)), true);
console.log(JSON.stringify({ mode, source, identity, nativeStarts: mode === 'write' ? 1 : 0,
  ms: performance.now() - start, cpuMicros: process.cpuUsage(cpuStart), checksum: sha256(extracted.astText), host: process.memoryUsage() }));
