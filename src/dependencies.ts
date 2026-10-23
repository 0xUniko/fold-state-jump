import { createHash } from 'node:crypto';
import { readFile, realpath, stat, statfs, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Effect, Schema } from 'effect';
import type { CompileCommand } from './services';

const dependencyPath = Schema.Struct({ path: Schema.String, real: Schema.String, sha256: Schema.String });
const nativeSchema = Schema.Struct({ schema: Schema.Literal(1), reusable: Schema.Boolean, paths: Schema.Array(dependencyPath),
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
// checks. A restored/coarse mtime is safe only with ext4 nanosecond ctime,
// which changes on content writes and cannot be restored with utimes().
const fineMetadata = async (file: string, metadata: Metadata): Promise<boolean> =>
  process.platform === 'linux' && metadata.ctimeNs % 1000000n !== 0n &&
  (await statfs(file)).type === 0xef53;

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
      const fingerprint = await fingerprintFile(file.path);
      const after = await metadataOf(file.path);
      if (stampOf(before) !== stampOf(after) || fingerprint.real !== file.real || fingerprint.sha256 !== file.sha256) throw new Error('Changed file');
      return await fineMetadata(file.path, after)
        ? { _tag: 'StatFile', path: file.path, stamp: stampOf(after) }
        : { _tag: 'HashFile', ...file };
    }, catch: (error) => new Error(String(error))
  }), { concurrency: 32 });
  const runtime = yield* Effect.forEach(native.runtime, (file) => Effect.tryPromise({
    try: async (): Promise<readonly Guard[]> => {
      const metadata = await metadataOf(file.path);
      if (stampOf(metadata) !== file.stamp) throw new Error('Native runtime image changed');
      return await fineMetadata(file.path, metadata) ? [{ _tag: 'StatFile', path: file.path, stamp: file.stamp }] : [];
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
      return await fineMetadata(directory, after)
        ? { _tag: 'StatDirectory', path: directory, stamp: stampOf(after), missing }
        : { _tag: 'ReadDirectory', path: directory, missing };
    }, catch: (error) => new Error(String(error))
  }), { concurrency: 32 });
  return { schema: 2 as const, reusable: native.reusable && runtime.flat().length === native.runtime.length, paths: native.paths, guards: [...files, ...runtime.flat(), ...directoryGuards] };
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

export const validateDependencies = (dependencies: DependencyManifest): Effect.Effect<boolean> =>
  Effect.forEach(dependencies.guards, (guard) => Effect.tryPromise({ try: () => validateGuard(guard), catch: () => false })
    .pipe(Effect.orElseSucceed(() => false)), { concurrency: 32 }).pipe(Effect.map((valid) => valid.every(Boolean)));

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
  return await fineMetadata(executable, metadata)
    ? { real: await realpath(executable), stamp: stampOf(metadata) }
    : fingerprintFile(executable);
};
export const buildIdentity = async (source: string, command: CompileCommand, executable: string, configuration: unknown): Promise<string> =>
  sha256(JSON.stringify({ schema: 2, source: path.resolve(source), sourceReal: await realpath(source), command,
    executable: await executableVersion(executable), configuration,
    environment: Object.entries(process.env).filter(([name]) => parseEnvironment.has(name) || name.startsWith('CCC_') || name.startsWith('LC_'))
      .reduce<[string, string | undefined][]>((environment, entry) => {
        environment.push(entry);
        return environment.sort(([a], [b]) => a.localeCompare(b));
      }, [])
  }));
