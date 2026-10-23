import { mkdir, open, readdir, rename, rm, stat, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { Effect, Schema, Semaphore } from 'effect';
import { prepareAst, type ClangNode } from './analysis';
import { decodeDependencies, sha256, validateDependencies, type DependencyManifest } from './dependencies';

export type DiskCache = {
  readonly directory: string;
  readonly maxBytes: number;
  readonly maxAstBytes: number;
  readonly writes: Semaphore.Semaphore;
};
export const makeDiskCache = (directory: string, maxBytes = 0, maxAstBytes = 67108864): DiskCache =>
  ({ directory, maxBytes, maxAstBytes, writes: Semaphore.makeUnsafe(1) });
const compress = promisify(gzip);
const decompress = promisify(gunzip);
const manifestLimit = 16 * 1024 * 1024;
const headerSchema = Schema.Struct({
  schema: Schema.Literal(2), encoding: Schema.Literal('gzip'), identity: Schema.String, astBytes: Schema.Number, payloadBytes: Schema.Number,
  checksum: Schema.String, proofChecksum: Schema.String, createdAt: Schema.Number, dependencies: Schema.Unknown
});
const decodeHeader = Schema.decodeUnknownSync(headerSchema);
const filename = (cache: DiskCache, identity: string) => path.join(cache.directory, sha256(identity) + '.ast');

// A single bounded read rejects short/oversized files rather than allocating
// an unbounded readFile buffer from an untrusted or damaged cache entry.
const readBounded = async (file: string, limit: number): Promise<Buffer> => {
  const handle = await open(file, 'r');
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > limit) throw new Error('Oversized disk entry');
    const buffer = Buffer.alloc(metadata.size + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead !== metadata.size) throw new Error('Incomplete disk entry');
    return buffer.subarray(0, bytesRead);
  } finally { await handle.close(); }
};

export const readDiskAst = Effect.fnUntraced(function* (cache: DiskCache, identity: string) {
  const loaded = yield* Effect.tryPromise({
    try: async () => {
      const buffer = await readBounded(filename(cache, identity), cache.maxAstBytes + manifestLimit);
      const boundary = buffer.indexOf(10);
      if (boundary < 0 || boundary > manifestLimit) throw new Error('Invalid disk manifest');
      const header = decodeHeader(JSON.parse(buffer.subarray(0, boundary).toString('utf8')));
      const payload = buffer.subarray(boundary + 1);
      if (header.identity !== identity || header.payloadBytes !== payload.length || header.astBytes < 0 ||
          header.astBytes > cache.maxAstBytes) throw new Error('Invalid disk payload');
      const astBuffer = await decompress(payload, { maxOutputLength: cache.maxAstBytes });
      if (header.astBytes !== astBuffer.length || header.checksum !== sha256(astBuffer)) throw new Error('Invalid disk checksum');
      if (header.proofChecksum !== sha256(JSON.stringify(header.dependencies))) throw new Error('Damaged dependency manifest');
      const dependencies = decodeDependencies(header.dependencies);
      if (!dependencies.reusable || dependencies.paths.length > 100000) throw new Error('Uncacheable manifest');
      return { dependencies, astText: astBuffer.toString('utf8'), astBytes: astBuffer.length };
    }, catch: () => undefined
  }).pipe(Effect.orElseSucceed(() => undefined));
  if (!loaded || !(yield* validateDependencies(loaded.dependencies))) return undefined;
  return yield* Effect.tryPromise({
    try: async () => {
      const ast = JSON.parse(loaded.astText) as ClangNode;
      if (ast.kind !== 'TranslationUnitDecl' || !Array.isArray(ast.inner)) throw new Error('Invalid AST root');
      const prepared = prepareAst(ast);
      await utimes(filename(cache, identity), new Date(), new Date()).catch(() => undefined);
      return { ...loaded, prepared, cacheable: true };
    }, catch: () => undefined
  }).pipe(Effect.orElseSucceed(() => undefined));
});

const entries = async (cache: DiskCache) => {
  const names = await readdir(cache.directory).catch(() => [] as string[]);
  const files = await Promise.all(names.filter((name) => /^[a-f0-9]{64}\.ast$/.test(name)).map(async (name) => {
    const file = path.join(cache.directory, name);
    const metadata = await stat(file).catch(() => undefined);
    return metadata ? [{ file, size: metadata.size, usedAt: metadata.mtimeMs }] : [];
  }));
  return files.flat();
};

const trimDiskCache = async (cache: DiskCache): Promise<void> => {
  const names = await readdir(cache.directory);
  await Promise.all(names.filter((name) => /^[a-f0-9-]+\.tmp$/.test(name)).map(async (name) => {
    const file = path.join(cache.directory, name);
    const metadata = await stat(file).catch(() => undefined);
    if (metadata && Date.now() - metadata.mtimeMs > 3600000) await rm(file, { force: true });
  }));
  if (cache.maxBytes === 0) return;
  const files = (await entries(cache)).reduce<Awaited<ReturnType<typeof entries>>>((files, file) => {
    files.push(file);
    return files.sort((a, b) => b.usedAt - a.usedAt || a.file.localeCompare(b.file));
  }, []);
  await files.reduce<Promise<number>>(async (retained, file) => {
    const bytes = await retained;
    if (bytes + file.size <= cache.maxBytes) return bytes + file.size;
    await rm(file.file, { force: true });
    return bytes;
  }, Promise.resolve(0));
};

export const writeDiskAst = (cache: DiskCache, identity: string,
  extracted: { readonly astText: string; readonly dependencies: DependencyManifest; readonly cacheable: boolean },
  signal: AbortSignal
): Effect.Effect<boolean> => cache.writes.withPermit(Effect.tryPromise({
  try: async () => {
    if (!extracted.cacheable || signal.aborted) return false;
    const astBytes = Buffer.byteLength(extracted.astText);
    if (astBytes > cache.maxAstBytes) return false;
    const payload = await compress(extracted.astText);
    const header = JSON.stringify({ schema: 2, encoding: 'gzip', identity, astBytes, payloadBytes: payload.length, checksum: sha256(extracted.astText),
      createdAt: Date.now(), proofChecksum: sha256(JSON.stringify(extracted.dependencies)), dependencies: extracted.dependencies });
    const bytes = payload.length + Buffer.byteLength(header) + 1;
    if (astBytes > cache.maxAstBytes || Buffer.byteLength(header) > manifestLimit ||
        (cache.maxBytes > 0 && bytes > cache.maxBytes)) return false;
    await mkdir(cache.directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(cache.directory, randomUUID() + '.tmp');
    try {
      await writeFile(temporary, Buffer.concat([Buffer.from(header + '\n'), payload]), { mode: 0o600, signal });
      if (signal.aborted) return false;
      await rename(temporary, filename(cache, identity));
      await trimDiskCache(cache);
      return true;
    } finally { await rm(temporary, { force: true }); }
  }, catch: () => false
}).pipe(Effect.orElseSucceed(() => false), Effect.uninterruptible));

export const clearDiskCache = (cache: DiskCache): Effect.Effect<void> =>
  cache.writes.withPermit(Effect.promise(async () => {
    const names = await readdir(cache.directory).catch(() => [] as string[]);
    await Promise.all(names.filter((name) => /^(?:[a-f0-9]{64}\.ast|[a-f0-9-]+\.tmp)$/.test(name))
      .map((name) => rm(path.join(cache.directory, name), { force: true })));
  }));

export const diskCacheStats = (cache: DiskCache): Effect.Effect<{ readonly entries: number; readonly bytes: number }> =>
  Effect.promise(async () => {
    const files = await entries(cache);
    return { entries: files.length, bytes: files.reduce((bytes, file) => bytes + file.size, 0) };
  });
