import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readdir, rename, rmdir, unlink, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Schema } from 'effect';
import { decodeDependencies, decodeNativeDependencies, sha256, type DependencyManifest, type NativeDependencies } from './dependencies';

export type PchEntry = {
  readonly identity: string;
  readonly prefixHash: string;
  readonly bounds: number;
  readonly endsAtStartOfLine: boolean;
  readonly invocationHash: string;
  readonly dependencies: DependencyManifest;
  readonly nativeDependencies: NativeDependencies;
  readonly pchPath: string;
  readonly pchBytes: number;
  readonly pchHash: string;
};
const digestPattern = /^[a-f0-9]{64}$/;
const manifestLimit = 16 * 1024 * 1024;
const pchLimit = 256 * 1024 * 1024;
const manifestSchema = Schema.Struct({ schema: Schema.Literal(1), identity: Schema.String,
  prefixHash: Schema.String, bounds: Schema.Number, endsAtStartOfLine: Schema.Boolean,
  invocationHash: Schema.String, dependencies: Schema.Unknown, nativeDependencies: Schema.Unknown,
  pchBytes: Schema.Number, pchHash: Schema.String, proofHash: Schema.String });
const decodeManifest = Schema.decodeUnknownSync(manifestSchema);
const directoryPath = (directory: FileHandle): string => '/proc/self/fd/' + directory.fd;

// Each component is opened relative to the previous held directory. O_NOFOLLOW
// alone on the final filename would still follow a substituted parent symlink.
const openDirectory = async (directory: string, create: boolean): Promise<FileHandle> => {
  if (process.platform !== 'linux' || !path.isAbsolute(directory)) throw new Error('Unsupported PCH storage location');
  return path.resolve(directory).split(path.sep).filter(Boolean).reduce<Promise<FileHandle>>(async (parent, component) => {
    const handle = await parent;
    try {
      const filename = path.join(directoryPath(handle), component);
      if (create) await mkdir(filename, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
      });
      return await open(filename, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    } finally { await handle.close(); }
  }, open('/', constants.O_RDONLY | constants.O_DIRECTORY));
};
const withDirectory = async <A>(directory: string, create: boolean, action: (directory: FileHandle) => Promise<A>): Promise<A> => {
  const handle = await openDirectory(directory, create);
  try { return await action(handle); } finally { await handle.close(); }
};
export const preparePchStorage = async (directory: string): Promise<string | undefined> => {
  try { return await withDirectory(directory, true, async () => path.resolve(directory)); }
  catch { return undefined; }
};
const stageName = /^stage-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const createPchStage = async (directory: string): Promise<string | undefined> => {
  try {
    return await withDirectory(directory, false, async (handle) => {
      const name = 'stage-' + randomUUID();
      await mkdir(path.join(directoryPath(handle), name), { mode: 0o700 });
      return path.join(directory, name);
    });
  } catch { return undefined; }
};
const removeStage = async (parent: FileHandle, name: string): Promise<void> => {
  try {
    const directory = await open(path.join(directoryPath(parent), name),
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try {
      const names = await readdir(directoryPath(directory));
      await Promise.all(names.filter((name) => /^preamble-[a-f0-9]+\.pch$/.test(name))
        .map((name) => unlink(path.join(directoryPath(directory), name)).catch(() => undefined)));
    } finally { await directory.close(); }
    // Unknown files/directories deliberately prevent removal. Never recurse.
    await rmdir(path.join(directoryPath(parent), name)).catch(() => undefined);
  } catch { /* A replaced/symlinked directory is left untouched. */ }
};
export const removePchStage = async (stage: string): Promise<void> => {
  if (!stageName.test(path.basename(stage))) return;
  await withDirectory(path.dirname(stage), false, (parent) => removeStage(parent, path.basename(stage)))
    .catch(() => undefined);
};
const openFile = async (filename: string): Promise<FileHandle> => {
  const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.nlink !== 1) throw new Error('Unsafe PCH cache file');
    return handle;
  } catch (error) { await handle.close(); throw error; }
};
const fileMetadata = (file: FileHandle) => file.stat({ bigint: true });
const stamp = (metadata: Awaited<ReturnType<typeof fileMetadata>>): string =>
  [metadata.dev, metadata.ino, metadata.size, metadata.mode, metadata.mtimeNs, metadata.ctimeNs].join(':');
const hashPch = async (filename: string): Promise<{ readonly pchHash: string; readonly pchBytes: number }> => {
  const handle = await openFile(filename);
  try {
    const before = await fileMetadata(handle);
    if (before.size <= 0n || before.size > BigInt(pchLimit)) throw new Error('Invalid PCH artifact size');
    const hash = createHash('sha256');
    await pipeline(createReadStream('', { fd: handle.fd, autoClose: false, end: Number(before.size) - 1 }), hash);
    const after = await fileMetadata(handle);
    if (stamp(before) !== stamp(after)) throw new Error('PCH artifact changed while hashing');
    return { pchHash: hash.digest('hex'), pchBytes: Number(before.size) };
  } finally { await handle.close(); }
};
const proofHash = (entry: Pick<PchEntry, 'dependencies' | 'nativeDependencies'>): string =>
  sha256(JSON.stringify([entry.dependencies, entry.nativeDependencies]));

// Callers hold the native advisory lock from lookup through parsing/publication.
// The artifact checksum is verified independently of Clang's format checks.
export const readPchEntry = async (directory: string, identity: string): Promise<PchEntry | undefined> => {
  if (!digestPattern.test(identity)) return undefined;
  try {
    return await withDirectory(directory, false, async (handle) => {
      const file = await openFile(path.join(directoryPath(handle), identity + '.json'));
      const manifest = await (async () => {
        try {
          const before = await fileMetadata(file);
          if (before.size <= 0n || before.size > BigInt(manifestLimit)) throw new Error('Invalid PCH manifest size');
          const buffer = Buffer.alloc(Number(before.size) + 1);
          const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
          if (bytesRead !== Number(before.size) || stamp(before) !== stamp(await fileMetadata(file))) throw new Error('Incomplete PCH manifest');
          return decodeManifest(JSON.parse(buffer.subarray(0, bytesRead).toString('utf8')));
        } finally { await file.close(); }
      })();
      if (manifest.identity !== identity || !digestPattern.test(manifest.prefixHash) ||
          !digestPattern.test(manifest.pchHash) || !digestPattern.test(manifest.invocationHash) ||
          !Number.isSafeInteger(manifest.bounds) || manifest.bounds <= 0) throw new Error('Invalid PCH identity');
      const dependencies = decodeDependencies(manifest.dependencies);
      const nativeDependencies = decodeNativeDependencies(manifest.nativeDependencies);
      if (!dependencies.reusable || !nativeDependencies.reusable || dependencies.paths.length > 100000 ||
          manifest.proofHash !== proofHash({ dependencies, nativeDependencies })) throw new Error('Invalid PCH proof');
      const pch = await hashPch(path.join(directoryPath(handle), identity + '.pch'));
      if (pch.pchBytes !== manifest.pchBytes || pch.pchHash !== manifest.pchHash) throw new Error('Damaged PCH artifact');
      return { identity, prefixHash: manifest.prefixHash, bounds: manifest.bounds,
        endsAtStartOfLine: manifest.endsAtStartOfLine, invocationHash: manifest.invocationHash,
        dependencies, nativeDependencies, pchPath: path.join(directory, identity + '.pch'), ...pch };
    });
  } catch { return undefined; }
};

export const publishPchEntry = async (directory: string,
  entry: Omit<PchEntry, 'pchPath' | 'pchBytes' | 'pchHash'>, stagedPchPath: string, expectedPchHash?: string
): Promise<PchEntry | undefined> => {
  const sourceDirectory = path.dirname(stagedPchPath);
  const sameDirectory = path.resolve(sourceDirectory) === path.resolve(directory);
  const stagedDirectory = path.resolve(path.dirname(sourceDirectory)) === path.resolve(directory) && stageName.test(path.basename(sourceDirectory));
  if (!digestPattern.test(entry.identity) || !(sameDirectory || stagedDirectory) ||
      !/^(?:stage-[a-f0-9-]+|preamble-[a-f0-9]+)\.pch$/.test(path.basename(stagedPchPath))) return undefined;
  try {
    return await withDirectory(directory, false, async (handle) => {
      const staged = path.join(directoryPath(handle), 'stage-' + randomUUID() + '.pch');
      const temporary = path.join(directoryPath(handle), 'stage-' + randomUUID() + '.json');
      try {
        const source = sameDirectory
          ? await openFile(path.join(directoryPath(handle), path.basename(stagedPchPath)))
          : await withDirectory(sourceDirectory, false, (sourceHandle) =>
              openFile(path.join(directoryPath(sourceHandle), path.basename(stagedPchPath))));
        try {
          const before = await fileMetadata(source);
          if (before.size <= 0n || before.size > BigInt(pchLimit)) throw new Error('Invalid PCH artifact size');
          const stagedFile = await open(staged, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
          try {
            await pipeline(createReadStream('', { fd: source.fd, autoClose: false, end: Number(before.size) - 1 }),
              createWriteStream('', { fd: stagedFile.fd, autoClose: false }));
            await stagedFile.sync();
          } finally { await stagedFile.close(); }
          if (stamp(before) !== stamp(await fileMetadata(source))) throw new Error('PCH changed while publishing');
        } finally { await source.close(); }
        const pch = await hashPch(staged);
        // The expected digest comes from the bytes pinned by the native build,
        // before remainder parsing. Rehashing a damaged staging file must not
        // turn its new contents into an apparently valid persistent artifact.
        if (expectedPchHash !== undefined && pch.pchHash !== expectedPchHash) throw new Error('PCH changed since construction');
        const manifest = JSON.stringify({ schema: 1, ...entry, ...pch, proofHash: proofHash(entry) });
        if (Buffer.byteLength(manifest) > manifestLimit) throw new Error('Oversized PCH manifest');
        const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        try {
          await file.writeFile(manifest);
          await file.sync();
        } finally { await file.close(); }
        await rename(staged, path.join(directoryPath(handle), entry.identity + '.pch'));
        // The metadata rename is the commit record. Readers never accept a
        // mismatching pair, including a crash between these two renames.
        await rename(temporary, path.join(directoryPath(handle), entry.identity + '.json'));
        await handle.sync();
        return { ...entry, ...pch, pchPath: path.join(directory, entry.identity + '.pch') };
      } finally {
        await Promise.all([staged, temporary].map((file) => unlink(file).catch(() => undefined)));
      }
    });
  } catch { return undefined; }
};

const ownedName = (name: string): boolean => /^(?:[a-f0-9]{64}\.(?:pch|json)|stage-[a-f0-9-]+\.(?:pch|json))$/.test(name);
export const clearPchStorage = async (directory: string): Promise<void> => {
  await withDirectory(directory, false, async (handle) => {
    const names = await readdir(directoryPath(handle));
    // unlink never follows a filename symlink and never recursively removes a
    // user directory. Persistent .lock inodes must survive cache clearing.
    await Promise.all(names.filter(ownedName).map((name) => unlink(path.join(directoryPath(handle), name))
      .catch(() => undefined)));
    // Explicit Clear also removes abandoned native build directories. Another
    // runtime may lose its in-progress temporary PCH and safely parse cold;
    // final publication remains protected by its checksum and commit record.
    await Promise.all(names.filter((name) => stageName.test(name)).map((name) => removeStage(handle, name)));
  }).catch(() => undefined);
};
export const pchStorageStats = async (directory: string): Promise<{ readonly entries: number; readonly bytes: number }> => {
  return withDirectory(directory, false, async (handle) => {
    const names = await readdir(directoryPath(handle));
    const files = await Promise.all(names.filter((name) => /^[a-f0-9]{64}\.pch$/.test(name)).map(async (name) => {
      const file = await openFile(path.join(directoryPath(handle), name)).catch(() => undefined);
      if (!file) return undefined;
      try { return await file.stat(); } finally { await file.close(); }
    }));
    return files.reduce((stats, file) => file ? { entries: stats.entries + 1, bytes: stats.bytes + file.size } : stats,
      { entries: 0, bytes: 0 });
  }).catch(() => ({ entries: 0, bytes: 0 }));
};
