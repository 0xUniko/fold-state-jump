import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { Effect, Schema } from 'effect';
import type { CompileCommand } from './services';

const manifestSchema = Schema.Struct({
  schema: Schema.Literal(1),
  reusable: Schema.Boolean,
  paths: Schema.Array(Schema.Struct({ path: Schema.String, real: Schema.String, sha256: Schema.String }))
});
export type DependencyManifest = typeof manifestSchema.Type;
export const decodeDependencies = Schema.decodeUnknownSync(manifestSchema);
export const sha256 = (text: string | Buffer): string => createHash('sha256').update(text).digest('hex');

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

// Hash contents even on filesystems with coarse timestamps, and preserve both
// requested paths and resolved symlinks. Validation failures are cache misses.
export const validateDependencies = (dependencies: DependencyManifest): Effect.Effect<boolean> =>
  Effect.forEach(dependencies.paths, (file) => Effect.tryPromise({
    try: async () => {
      const fingerprint = await fingerprintFile(file.path);
      return fingerprint.real === file.real && fingerprint.sha256 === file.sha256;
    },
    catch: () => false
  }).pipe(Effect.orElseSucceed(() => false)), { concurrency: 32 }).pipe(
    Effect.map((valid) => valid.every(Boolean))
  );

export const reusableCommand = (command: CompileCommand): boolean =>
  !command.args.some((arg) => /^(@|-fmodules|-fcxx-modules|-fmodule-|-include-pch|-ivfsoverlay|-vfsoverlay|-ivfsstatcache|-ivfsfrom|-working-directory|--config|-fplugin|-load)/.test(arg));

export const buildIdentity = async (
  source: string,
  command: CompileCommand,
  executable: string,
  configuration: unknown
): Promise<string> => sha256(JSON.stringify({
  schema: 1, source: path.resolve(source), sourceReal: await realpath(source), command,
  executable: await fingerprintFile(executable), configuration,
  environment: Object.entries(process.env).reduce<[string, string | undefined][]>((environment, entry) => {
    environment.push(entry);
    return environment.sort(([a], [b]) => a.localeCompare(b));
  }, [])
}));
