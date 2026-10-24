import { createHash } from 'node:crypto';
import { readFile, realpath, stat, statfs, readdir } from 'node:fs/promises';
import path from 'node:path';
import { release } from 'node:os';
import { Effect, Schema } from 'effect';
import type { CompileCommand } from './services';

const dependencyPath = Schema.Struct({ path: Schema.String, real: Schema.String, sha256: Schema.String });
// Native observations carry the first-seen stamp to reject writes during
// parsing. Verified manifests instead own freshly established guards.
const nativePath = Schema.Struct({ path: Schema.String, real: Schema.String, sha256: Schema.String, stamp: Schema.optional(Schema.String) });
const nativeSchema = Schema.Struct({ schema: Schema.Literal(1), reusable: Schema.Boolean, paths: Schema.Array(nativePath),
  runtime: Schema.Array(Schema.Struct({ path: Schema.String, stamp: Schema.String })) });
export type NativeDependencies = typeof nativeSchema.Type;
export const decodeNativeDependencies = Schema.decodeUnknownSync(nativeSchema);
const guardSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('StatFile'), path: Schema.String, stamp: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('HashFile'), path: Schema.String, real: Schema.String, sha256: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('StatDirectory'), path: Schema.String, stamp: Schema.String, missing: Schema.Array(Schema.String) }),
  Schema.Struct({ _tag: Schema.Literal('ReadDirectory'), path: Schema.String, missing: Schema.Array(Schema.String) })
]);
const manifestSchema = Schema.Struct({ schema: Schema.Literal(2), reusable: Schema.Boolean,
  paths: Schema.Array(dependencyPath), guards: Schema.Array(guardSchema) });
export type DependencyManifest = typeof manifestSchema.Type;
type Guard = typeof guardSchema.Type;
export const decodeDependencies = Schema.decodeUnknownSync(manifestSchema);
export const sha256 = (text: string | Buffer): string => createHash('sha256').update(text).digest('hex');
type Metadata = Awaited<ReturnType<typeof metadataOf>>;
const metadataOf = (file: string) => stat(file, { bigint: true });
const stampOf = (metadata: Metadata): string =>
  [metadata.dev, metadata.ino, metadata.size, metadata.mode, metadata.mtimeNs, metadata.ctimeNs].join(':');
// Fast guards are deliberately limited to the filesystem tested here. Other
// filesystems/platforms and coarse change timestamps retain content/directory
// checks. Linux 6.13+ ext4 multigrain timestamps make observed changes
// visible even within one coarse clock tick. A restored/coarse mtime is safe
// only with that policy and ext4 nanosecond ctime,
// which changes on content writes and cannot be restored with utimes().
export const hasFineChangeTimestamps = (platform: string, kernel: string): boolean => {
  const version = /^(\d+)\.(\d+)\./.exec(kernel);
  return platform === 'linux' && !!version && (Number(version[1]) > 6 || Number(version[1]) === 6 && Number(version[2]) >= 13);
};

export const hasFineFileMetadata = async (file: string, metadata: Metadata): Promise<boolean> =>
  hasFineChangeTimestamps(process.platform, release()) && metadata.ctimeNs % 1000000n !== 0n &&
  (await statfs(file).catch(() => undefined))?.type === 0xef53;

export const fingerprintFile = async (file: string): Promise<{ readonly real: string; readonly sha256: string }> => {
  try {
    const real = await realpath(file);
    return { real, sha256: sha256(await readFile(file)) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return { real: '', sha256: '' };
    throw error;
  }
};

const missingIn = async (directory: string, missing: readonly string[]): Promise<boolean> => {
  try {
    const names = new Set(await readdir(directory));
    return missing.every((name) => !names.has(name));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ENOENT' || code === 'ENOTDIR';
  }
};

// Convert native buffer hashes into verified guards only after comparing disk
// content and metadata on both sides of that comparison. Never trust native
// post-parse filesystem metadata as a substitute for the buffers Clang read.
export const verifyDependencies = Effect.fnUntraced(function* (native: NativeDependencies) {
  const files = yield* Effect.forEach(native.paths.filter((file) => file.sha256 !== ''), (file) => Effect.tryPromise({
    try: async (): Promise<Guard> => {
      const before = await metadataOf(file.path);
      if (file.stamp !== undefined && stampOf(before) !== file.stamp) throw new Error('File changed since native observation');
      const fingerprint = await fingerprintFile(file.path);
      const after = await metadataOf(file.path);
      if (stampOf(before) !== stampOf(after) || fingerprint.real !== file.real || fingerprint.sha256 !== file.sha256) throw new Error('Changed file');
      return await hasFineFileMetadata(file.path, after)
        ? { _tag: 'StatFile', path: file.path, stamp: stampOf(after) }
        : { _tag: 'HashFile', path: file.path, real: file.real, sha256: file.sha256 };
    }, catch: (error) => new Error(String(error))
  }), { concurrency: 32 });
  const runtime = yield* Effect.forEach(native.runtime, (file) => Effect.tryPromise({
    try: async (): Promise<readonly Guard[]> => {
      const metadata = await metadataOf(file.path);
      if (stampOf(metadata) !== file.stamp) throw new Error('Native runtime image changed');
      if (await hasFineFileMetadata(file.path, metadata)) return [{ _tag: 'StatFile', path: file.path, stamp: file.stamp }];
      const fingerprint = await fingerprintFile(file.path);
      if (stampOf(await metadataOf(file.path)) !== file.stamp) throw new Error('Native runtime image changed while hashing');
      return [{ _tag: 'HashFile', path: file.path, ...fingerprint }];
    }, catch: (error) => new Error(String(error))
  }), { concurrency: 32 });
  const directories = native.paths.filter((file) => file.sha256 === '').reduce((directories, file) => {
    const directory = path.dirname(file.path);
    directories.set(directory, [...(directories.get(directory) ?? []), path.basename(file.path)]);
    return directories;
  }, new Map<string, readonly string[]>());
  const directoryGuards = yield* Effect.forEach([...directories], ([directory, missing]) => Effect.tryPromise({
    try: async (): Promise<Guard> => {
      const before = await metadataOf(directory);
      if (!(await missingIn(directory, missing))) throw new Error('Created include candidate');
      const after = await metadataOf(directory);
      if (stampOf(before) !== stampOf(after)) throw new Error('Changed include directory');
      return await hasFineFileMetadata(directory, after)
        ? { _tag: 'StatDirectory', path: directory, stamp: stampOf(after), missing }
        : { _tag: 'ReadDirectory', path: directory, missing };
    }, catch: (error) => new Error(String(error))
  }), { concurrency: 32 });
  return { schema: 2 as const, reusable: native.reusable && runtime.flat().length === native.runtime.length,
    paths: native.paths.map(({ path, real, sha256 }) => ({ path, real, sha256 })), guards: [...files, ...runtime.flat(), ...directoryGuards] };
}, Effect.orElseSucceed(() => undefined));

const validateGuard = async (guard: Guard): Promise<boolean> => {
  switch (guard._tag) {
    case 'StatFile': return stampOf(await metadataOf(guard.path)) === guard.stamp;
    case 'HashFile': {
      const fingerprint = await fingerprintFile(guard.path);
      return fingerprint.real === guard.real && fingerprint.sha256 === guard.sha256;
    }
    case 'StatDirectory': {
      const metadata = await metadataOf(guard.path).catch(() => undefined);
      return metadata && stampOf(metadata) === guard.stamp || await missingIn(guard.path, guard.missing);
    }
    case 'ReadDirectory': return missingIn(guard.path, guard.missing);
  }
};

// Each batch owns at most 32 filesystem requests. A single Effect boundary per
// batch avoids creating a fiber for each stat, while retaining interruption
// between batches and checking every guard on every successful lookup. No
// validation result is retained across requests or inferred from watcher events.
export const validateDependencies = (dependencies: DependencyManifest): Effect.Effect<boolean> => {
  const batches = Array.from({ length: Math.ceil(dependencies.guards.length / 32) }, (_, index) =>
    dependencies.guards.slice(index * 32, (index + 1) * 32));
  return Effect.reduce(batches, () => true, (valid, guards) => valid
    ? Effect.tryPromise({
        try: async () => (await Promise.all(guards.map(validateGuard))).every(Boolean),
        catch: () => false
      }).pipe(Effect.orElseSucceed(() => false))
    : Effect.succeed(false));
};

export const reusableCommand = (command: CompileCommand): boolean =>
  !command.args.some((arg) => /^(@|-fmodules|-fcxx-modules|-fmodule-|-include|-imacros|-fprebuilt-module-path|-ivfsoverlay|-vfsoverlay|-ivfsstatcache|-ivfsfrom|-working-directory|--config|-fplugin|-load)/.test(arg));

const parseEnvironment = new Set([
  'PATH', 'HOME', 'USERPROFILE', 'XDG_CONFIG_HOME', 'CPATH', 'CPLUS_INCLUDE_PATH',
  'C_INCLUDE_PATH', 'OBJC_INCLUDE_PATH', 'SDKROOT', 'DEVELOPER_DIR',
  'MACOSX_DEPLOYMENT_TARGET', 'IPHONEOS_DEPLOYMENT_TARGET', 'INCLUDE',
  'COMPILER_PATH', 'GCC_EXEC_PREFIX', 'LIBRARY_PATH', 'CLANG_CONFIG_FILE_SYSTEM_DIR',
  'CLANG_CONFIG_FILE_USER_DIR', 'CLANG_NO_DEFAULT_CONFIG', 'SOURCE_DATE_EPOCH',
  'LANG', 'LC_ALL', 'TZ', 'TMPDIR', 'TEMP', 'TMP'
]);
const executableVersion = async (executable: string) => {
  const metadata = await metadataOf(executable);
  return await hasFineFileMetadata(executable, metadata)
    ? { real: await realpath(executable), stamp: stampOf(metadata) }
    : fingerprintFile(executable);
};
export const buildIdentity = async (source: string, command: CompileCommand, executable: string, configuration: unknown): Promise<string> =>
  sha256(JSON.stringify({ schema: 3, validationPlatform: { platform: process.platform, kernel: release() }, source: path.resolve(source), sourceReal: await realpath(source), command,
    executable: await executableVersion(executable), configuration,
    environment: Object.entries(process.env).filter(([name]) => parseEnvironment.has(name) || name.startsWith('CCC_') || name.startsWith('LC_'))
      .reduce<[string, string | undefined][]>((environment, entry) => {
        environment.push(entry);
        return environment.sort(([a], [b]) => a.localeCompare(b));
      }, [])
  }));
