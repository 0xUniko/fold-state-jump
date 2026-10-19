import { Effect, Schema } from 'effect';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CompileCommand = {
  readonly compiler: string;
  readonly args: readonly string[];
  readonly cwd: string;
};

export type ProcessFailure = {
  readonly _tag: 'ProcessFailure';
  readonly message: string;
};

export type FileFailure = {
  readonly _tag: 'FileFailure';
  readonly message: string;
};

const processFailure = (message: string): ProcessFailure => ({ _tag: 'ProcessFailure', message });
const fileFailure = (message: string): FileFailure => ({ _tag: 'FileFailure', message });

export const readUtf8 = (file: string): Effect.Effect<string, FileFailure> =>
  Effect.tryPromise({
    try: () => readFile(file, 'utf8'),
    catch: (error) => fileFailure('Could not read ' + file + ': ' + String(error))
  });

const tokenizeCommand = (command: string): readonly string[] =>
  [...command.matchAll(/(?:[^\s"'\\]|\\.|"(?:\\.|[^"\\])*"|'[^']*')+/g)].map(([argument]) =>
    argument.replace(/"((?:\\.|[^"\\])*)"|'([^']*)'|\\(.)/g, (_match, doubleQuoted, singleQuoted, escaped) =>
      doubleQuoted !== undefined
        ? doubleQuoted.replace(/\\(["\\$`])/g, '$1')
        : singleQuoted ?? escaped
    )
  );

const compileDatabase = Schema.Array(Schema.Struct({
  directory: Schema.String,
  file: Schema.String,
  arguments: Schema.optional(Schema.Array(Schema.String)),
  command: Schema.optional(Schema.String)
}));

const compileDatabases = (source: string, roots: readonly string[]): readonly string[] => {
  const ascend = (directory: string): readonly string[] => {
    const parent = path.dirname(directory);
    return [path.join(directory, 'compile_commands.json'), ...(directory === parent ? [] : ascend(parent))];
  };
  return [...new Set([
    ...ascend(path.dirname(path.resolve(source))),
    ...roots.map((root) => path.join(root, 'compile_commands.json'))
  ])];
};

export const makeCompileCommand = (
  source: string,
  roots: readonly string[],
  clangPath: string,
  databaseText?: string
): CompileCommand => {
  const entries = databaseText
    ? Schema.decodeUnknownSync(Schema.fromJsonString(compileDatabase))(databaseText)
    : [];
  const entry = entries.find((candidate) =>
    path.resolve(candidate.directory, candidate.file) === path.resolve(source)
  );
  if (!entry) {
    return {
      compiler: clangPath,
      args: ['-std=c++20', '-Xclang', '-ast-dump=json', '-fsyntax-only', source],
      cwd: path.dirname(source)
    };
  }
  const raw = entry.arguments ? [...entry.arguments] : tokenizeCommand(entry.command ?? '');
  const args = raw.slice(1).reduce((state: readonly string[], argument, index, all) => {
    if (['-c', '-MD', '-MMD', '-MP', '-M', '-MM'].includes(argument)) return state;
    if (['-o', '-MF', '-MT', '-MQ'].includes(argument)) return state;
    if (index > 0 && ['-o', '-MF', '-MT', '-MQ'].includes(all[index - 1])) return state;
    if (argument === entry.file || path.resolve(entry.directory, argument) === path.resolve(source)) return state;
    return [...state, argument];
  }, []);
  return {
    compiler: clangPath,
    args: [...args, '-Xclang', '-ast-dump=json', '-fsyntax-only', source],
    cwd: entry.directory || path.dirname(source)
  };
};

export const resolveCompileCommand = Effect.fnUntraced(function* (
  source: string,
  roots: readonly string[],
  clangPath: string
): Effect.fn.Return<CompileCommand, FileFailure> {
  const readDatabase = (databases: readonly string[]): Effect.Effect<string | undefined> => {
    const database = databases[0];
    return database === undefined
      ? Effect.succeed(undefined)
      : readUtf8(database).pipe(Effect.catchTag('FileFailure', () => readDatabase(databases.slice(1))));
  };
  const databaseText = yield* readDatabase(compileDatabases(source, roots));
  return yield* Effect.try({
    try: () => makeCompileCommand(source, roots, clangPath, databaseText),
    catch: (error) => fileFailure('Invalid compile_commands.json: ' + String(error))
  });
});

export const runClangAst = (
  command: CompileCommand,
  maxBytes: number,
  signal: AbortSignal
): Effect.Effect<string, ProcessFailure> =>
  Effect.callback<string, ProcessFailure>((resume) => {
    if (signal.aborted) {
      resume(Effect.fail(processFailure('Clang AST process was interrupted.')));
      return;
    }
    const child = execFile(command.compiler, [...command.args], {
      cwd: command.cwd,
      windowsHide: true,
      encoding: 'utf8',
      maxBuffer: maxBytes,
      signal
    }, (error, output, stderr) => {
      if (error) {
        resume(Effect.fail(processFailure(
          signal.aborted
            ? 'Clang AST process was interrupted.'
            : 'Clang failed: ' + error.message + '\n' + stderr.slice(-12000)
        )));
      } else if (output.trim().startsWith('{')) {
        resume(Effect.succeed(output));
      } else {
        resume(Effect.fail(processFailure('Clang did not produce a JSON AST. ' + stderr.slice(-12000))));
      }
    });
    return Effect.sync(() => { child.kill(); });
  });
