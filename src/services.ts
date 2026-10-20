import { Effect, Schema } from 'effect';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type CompileCommand = {
  readonly compiler: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly context?: 'exact' | 'inferred' | 'fallback';
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


type CompileEntry = typeof compileDatabase.Type[number];

const isHeader = (source: string): boolean => /\.(h|hh|hpp|hxx)$/i.test(source);
const isCppSource = (source: string): boolean => /\.(cc|cpp|cxx|c\+\+|mm)$/i.test(source);

const compileDatabases = (source: string, roots: readonly string[], configuredPath?: string): readonly string[] => {
  const ascend = (directory: string): readonly string[] => {
    const parent = path.dirname(directory);
    return [path.join(directory, 'compile_commands.json'), ...(directory === parent ? [] : ascend(parent))];
  };
  const buildDirectories = ['build', 'build-debug', 'build-release', 'build/Debug', 'build/Release', 'out/build'];
  return [...new Set([
    ...(configuredPath ? [path.resolve(roots[0] ?? path.dirname(source), configuredPath)] : []),
    ...ascend(path.dirname(path.resolve(source))),
    ...roots.flatMap((root) => [
      path.join(root, 'compile_commands.json'),
      ...buildDirectories.map((directory) => path.join(root, directory, 'compile_commands.json'))
    ])
  ])];
};

const entryPath = (entry: CompileEntry): string => path.resolve(entry.directory, entry.file);

// A header has no compile_commands entry. Use a nearby C++ translation unit,
// preferring the same source basename, without pretending the match is exact.
const headerEntry = (source: string, entries: readonly CompileEntry[]): CompileEntry | undefined => {
  const directory = path.dirname(path.resolve(source));
  const name = path.parse(source).name;
  const proximity = (entry: CompileEntry): number => {
    const relative = path.relative(directory, path.dirname(entryPath(entry)));
    const distance = relative === '' ? 0 : relative.split(path.sep).length;
    return (path.parse(entry.file).name === name ? 0 : 10000) + distance;
  };
  return entries.filter((entry) => isCppSource(entry.file)).reduce<CompileEntry | undefined>(
    (best, entry) => !best || proximity(entry) < proximity(best) ? entry : best,
    undefined
  );
};

const sanitizeArguments = (args: readonly string[], entry: CompileEntry): readonly string[] => {
  const noValue = ['-c', '-MD', '-MMD', '-MP', '-M', '-MM'];
  const withValue = ['-o', '-MF', '-MT', '-MQ', '-MJ', '--output'];
  return args.slice(1).reduce(
    (state: { readonly skip: boolean; readonly result: readonly string[] }, argument) => {
      if (state.skip) return { skip: false, result: state.result };
      if (noValue.includes(argument)) return state;
      if (withValue.includes(argument)) return { skip: true, result: state.result };
      if (/^-(o|MF|MT|MQ|MJ).+/.test(argument)) return state;
      if (entryPath(entry) === path.resolve(entry.directory, argument)) return state;
      return { skip: false, result: [...state.result, argument] };
    },
    { skip: false, result: [] }
  ).result;
};

export const makeCompileCommand = (
  source: string,
  _roots: readonly string[],
  clangPath: string,
  databaseText?: string
): CompileCommand => {
  const entries = databaseText
    ? Schema.decodeUnknownSync(Schema.fromJsonString(compileDatabase))(databaseText)
    : [];
  const exact = entries.find((entry) => entryPath(entry) === path.resolve(source));
  const entry = exact ?? (isHeader(source) ? headerEntry(source, entries) : undefined);
  const language = isHeader(source) ? ['-x', 'c++-header'] : [];
  if (!entry) {
    return {
      compiler: clangPath,
      args: ['-std=c++17', ...language, '-Xclang', '-ast-dump=json', '-fsyntax-only', source],
      cwd: path.dirname(source),
      context: 'fallback'
    };
  }
  const raw = entry.arguments ? [...entry.arguments] : tokenizeCommand(entry.command ?? '');
  if (raw.length === 0) throw new Error('Empty compile command for ' + entry.file);
  return {
    compiler: clangPath,
    args: [...sanitizeArguments(raw, entry), ...language, '-Xclang', '-ast-dump=json', '-fsyntax-only', source],
    cwd: entry.directory,
    context: exact ? 'exact' : 'inferred'
  };
};

export const resolveCompileCommand = Effect.fnUntraced(function* (
  source: string,
  roots: readonly string[],
  clangPath: string,
  configuredPath?: string
): Effect.fn.Return<CompileCommand, FileFailure> {
  const paths = compileDatabases(source, roots, configuredPath);
  const texts = yield* Effect.forEach(paths, (database) =>
    readUtf8(database).pipe(
      Effect.map((text) => [{ database, text }]),
      Effect.catchTag('FileFailure', () => Effect.succeed([] as readonly { database: string; text: string }[]))
    )
  );
  const databases = texts.flat();
  if (configuredPath && !databases.some(({ database }) => database === paths[0])) {
    return yield* Effect.fail(fileFailure('Configured compile_commands.json not found: ' + paths[0]));
  }
  return yield* Effect.try({
    try: () => {
      const commands = databases.map(({ text }) => makeCompileCommand(source, roots, clangPath, text));
      return commands.find((command) => command.context === 'exact') ??
        commands.find((command) => command.context === 'inferred') ??
        commands[0] ??
        makeCompileCommand(source, roots, clangPath);
    },
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
    const child = spawn(command.compiler, [...command.args], {
      cwd: command.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout: Buffer[] = [];
    let bytes = 0;
    let stderr = '';
    let oversized = false;
    let settled = false;
    const aborted = () => child.kill();
    const finish = (result: Effect.Effect<string, ProcessFailure>): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', aborted);
      resume(result);
    };
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) child.kill();

    // Stream stdout and stderr separately, with an explicit limit on AST bytes.
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        oversized = true;
        child.kill();
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-12000);
    });
    child.on('error', (error: Error) => finish(Effect.fail(processFailure(
      'Could not start Clang: ' + error.message
    ))));
    child.on('close', (code) => {
      const diagnostics = stderr.trim() ? '\n' + stderr.trim() : '';
      if (signal.aborted) {
        finish(Effect.fail(processFailure('Clang AST process was interrupted.')));
      } else if (oversized) {
        finish(Effect.fail(processFailure(
          'Clang JSON AST exceeds the configured ' + (maxBytes / 1048576).toFixed(0) +
          ' MiB limit. Consider increasing foldStateJump.maxAstBytes; whole-AST analysis ' +
          'may be too expensive for this translation unit.' + diagnostics
        )));
      } else if (code !== 0) {
        finish(Effect.fail(processFailure('Clang failed (exit ' + code + ').' + diagnostics)));
      } else {
        const output = Buffer.concat(stdout).toString('utf8');
        finish(output.trimStart().startsWith('{')
          ? Effect.succeed(output)
          : Effect.fail(processFailure('Clang did not produce a JSON AST.' + diagnostics)));
      }
    });
    return Effect.sync(() => {
      signal.removeEventListener('abort', aborted);
      child.kill();
    });
  });
