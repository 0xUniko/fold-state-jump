import { Effect } from 'effect';
import { spawn } from 'node:child_process';
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
  [...command.matchAll(/"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|(\S+)/g)].map((match) =>
    (match[1] ?? match[2] ?? match[3] ?? '').replace(/\\(["'\\])/g, '$1')
  );

const findCompileDatabase = (source: string, roots: readonly string[]): string | undefined => {
  const ascend = (directory: string): string | undefined => {
    const candidate = path.join(directory, 'compile_commands.json');
    const parent = path.dirname(directory);
    return directory === parent ? undefined : candidate;
  };
  const candidates = [
    ...roots.map((root) => path.join(root, 'compile_commands.json')),
    ...[path.dirname(source)].flatMap((directory) => {
      const first = ascend(directory);
      return first ? [first] : [];
    })
  ];
  return candidates.find((candidate) => candidate.length > 0);
};

export const makeCompileCommand = (
  source: string,
  roots: readonly string[],
  clangPath: string,
  databaseText?: string
): CompileCommand => {
  const entries = databaseText ? JSON.parse(databaseText) as readonly {
    readonly directory: string;
    readonly file: string;
    readonly arguments?: readonly string[];
    readonly command?: string;
  }[] : [];
  const entry = entries.find((candidate) =>
    path.resolve(candidate.directory, candidate.file) === path.resolve(source) ||
    path.resolve(candidate.file) === path.resolve(source)
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

export const resolveCompileCommand = (
  source: string,
  roots: readonly string[],
  clangPath: string
): Effect.Effect<CompileCommand, FileFailure> =>
  Effect.gen(function* () {
    const database = findCompileDatabase(source, roots);
    if (!database) return makeCompileCommand(source, roots, clangPath);
    const databaseText = yield* readUtf8(database).pipe(
      Effect.catchTag('FileFailure', () => Effect.succeed(''))
    );
    return makeCompileCommand(source, roots, clangPath, databaseText);
  });

export const runClangAst = (
  command: CompileCommand,
  maxBytes: number,
  signal: AbortSignal
): Effect.Effect<string, ProcessFailure> =>
  Effect.async<string, ProcessFailure>((resume) => {
    const child = spawn(command.compiler, [...command.args], {
      cwd: command.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let stderr = '';
    let settled = false;
    const finish = (effect: Effect.Effect<string, ProcessFailure>) => {
      if (settled) return;
      settled = true;
      resume(effect);
    };
    const cancel = () => {
      child.kill();
      finish(Effect.fail(processFailure('Clang AST process was interrupted.')));
    };
    signal.addEventListener('abort', cancel, { once: true });
    child.stdout.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        child.kill();
        finish(Effect.fail(processFailure('Clang AST exceeds configured byte limit.')));
      } else {
        chunks.push(chunk);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-12000);
    });
    child.on('error', (error) => finish(Effect.fail(processFailure('Could not start ' + command.compiler + ': ' + error.message))));
    child.on('close', (code) => {
      signal.removeEventListener('abort', cancel);
      if (settled) return;
      const output = Buffer.concat(chunks).toString('utf8');
      if (output.trim().startsWith('{')) {
        finish(Effect.succeed(output));
      } else {
        finish(Effect.fail(processFailure('Clang failed (exit ' + code + '): ' + stderr)));
      }
    });
    return Effect.sync(() => {
      signal.removeEventListener('abort', cancel);
      if (!settled) child.kill();
    });
  });
