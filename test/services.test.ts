import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect } from 'effect';
import { makeCompileCommand, makeExtractionCommand, resolveCompileCommand, runClangAst } from '../src/services';

describe('compile commands', () => {
  test('preserves quoted include paths and removes build outputs', () => {
    const command = makeCompileCommand('/project/main.cpp', [], 'clang++', JSON.stringify([{
      directory: '/project', file: 'main.cpp',
      command: 'c++ -I"include directory" -DNAME="hello world" -c main.cpp -o main.o -MF main.d'
    }]));
    assert.deepEqual(command.args, [
      '-Iinclude directory', '-DNAME=hello world', '-Xclang', '-ast-dump=json', '-fsyntax-only', '/project/main.cpp'
    ]);
  });

  test('searches source ancestors even when the first workspace has no database', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'fold-state-jump-'));
    try {
      await mkdir(path.join(directory, 'src', 'nested'), { recursive: true });
      const source = path.join(directory, 'src', 'nested', 'main.cpp');
      await writeFile(path.join(directory, 'compile_commands.json'), JSON.stringify([{
        directory, file: source, arguments: ['c++', '-std=c++23', '-c', source]
      }]));
      const command = await Effect.runPromise(resolveCompileCommand(source, ['/nonexistent-workspace'], 'clang++'));
      assert.equal(command.cwd, directory);
      assert.equal(command.args[0], '-std=c++23');
      await writeFile(path.join(directory, 'compile_commands.json'), '{broken');
      await assert.rejects(Effect.runPromise(resolveCompileCommand(source, [], 'clang++')), { _tag: 'FileFailure', message: /Invalid compile_commands/ });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  test('inherits flags from a same-name C++ file when analyzing a header', () => {
    const command = makeCompileCommand('/project/src/ffn.h', [], 'clang++', JSON.stringify([
      { directory: '/project', file: 'src/unrelated.cpp', arguments: ['c++', '-Iwrong', '-c', 'src/unrelated.cpp'] },
      { directory: '/project', file: 'src/ffn.cpp', arguments: [
        'c++', '-std=c++23', '-I/project/ggml/include', '-DTEST=1', '-c', 'src/ffn.cpp', '-o', 'ffn.o'
      ] }
    ]));
    assert.equal(command.context, 'inferred');
    assert.deepEqual(command.args, [
      '-std=c++23', '-I/project/ggml/include', '-DTEST=1',
      '-x', 'c++-header', '-Xclang', '-ast-dump=json', '-fsyntax-only', '/project/src/ffn.h'
    ]);
  });

  test('sets the language explicitly for headers without a database', () => {
    const command = makeCompileCommand('/project/include/ffn.h', [], 'clang++');
    assert.equal(command.context, 'fallback');
    assert.deepEqual(command.args.slice(0, 3), ['-std=c++17', '-x', 'c++-header']);
  });

  test('prefers an exact entry in a CMake build directory to unrelated database entries', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'fold-state-jump-db-'));
    try {
      const source = path.join(directory, 'src', 'main.cpp');
      await mkdir(path.dirname(source), { recursive: true });
      await mkdir(path.join(directory, 'build-debug'), { recursive: true });
      await writeFile(path.join(directory, 'compile_commands.json'), JSON.stringify([{
        directory, file: 'other.cpp', arguments: ['c++', '-Iwrong', '-c', 'other.cpp']
      }]));
      await writeFile(path.join(directory, 'build-debug', 'compile_commands.json'), JSON.stringify([{
        directory, file: source, arguments: ['c++', '-Icorrect', '-c', source]
      }]));
      const command = await Effect.runPromise(resolveCompileCommand(source, [directory], 'clang++'));
      assert.equal(command.context, 'exact');
      assert.ok(command.args.includes('-Icorrect'));
      assert.ok(!command.args.includes('-Iwrong'));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('accepts an explicitly configured compilation database path', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'fold-state-jump-db-'));
    try {
      const source = path.join(directory, 'foo.h');
      const database = path.join('custom', 'compile_commands.json');
      await mkdir(path.join(directory, 'custom'), { recursive: true });
      await writeFile(path.join(directory, database), JSON.stringify([{
        directory, file: 'foo.cpp', arguments: ['c++', '-Icustom', '-c', 'foo.cpp']
      }]));
      const command = await Effect.runPromise(resolveCompileCommand(source, [directory], 'clang++', database));
      assert.equal(command.context, 'inferred');
      assert.ok(command.args.includes('-Icustom'));
      await assert.rejects(
        Effect.runPromise(resolveCompileCommand(source, [directory], 'clang++', 'absent/compile_commands.json')),
        { _tag: 'FileFailure', message: /Configured compile_commands.json not found/ }
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('passes original language and include flags to native extractor, without the full-AST switches', () => {
    const command = makeCompileCommand('/project/include/ffn.h', [], 'clang++', JSON.stringify([{
      directory: '/project', file: 'src/ffn.cpp',
      arguments: ['clang++', '-std=c++17', '-I/project/include', '-c', 'src/ffn.cpp']
    }]));
    const extraction = makeExtractionCommand(command, '/opt/fold-state-jump-ast');
    assert.equal(extraction.compiler, '/opt/fold-state-jump-ast');
    assert.equal(extraction.cwd, '/project');
    assert.deepEqual(extraction.args, [
      '--source', '/project/include/ffn.h', '--',
      '-std=c++17', '-I/project/include', '-x', 'c++-header'
    ]);
    assert.ok(!extraction.args.includes('-ast-dump=json'));
  });

});

const runProcess = (script: string, maxBytes = 4096, signal = new AbortController().signal) =>
  Effect.runPromise(runClangAst({ compiler: process.execPath, args: ['-e', script], cwd: os.tmpdir() }, maxBytes, signal));

describe('compiler process', () => {
  test('collects successful JSON output', async () => {
    assert.equal(await runProcess('console.log(JSON.stringify({ kind: "TranslationUnitDecl" }))'), '{"kind":"TranslationUnitDecl"}\n');
  });

  test('rejects nonzero exit codes even if Clang outputs a partial AST', async () => {
    await assert.rejects(runProcess('console.log("{}"); process.exitCode = 1'), { _tag: 'ProcessFailure', message: /Clang failed/ });
  });

  test('enforces the output byte limit', async () => {
    await assert.rejects(runProcess('console.log("{".repeat(10000))', 64), { _tag: 'ProcessFailure', message: /exceeds the configured/ });
  });

  test('streams outputs larger than the usual execFile buffer', async () => {
    const result = await runProcess('console.log(JSON.stringify({ kind: "TranslationUnitDecl", data: "x".repeat(262144) }))', 300000);
    assert.ok(result.length > 262144);
    assert.equal(JSON.parse(result).kind, 'TranslationUnitDecl');
  });

  test('preserves Clang diagnostics on failure', async () => {
    await assert.rejects(
      runProcess('console.error("fatal error: gguf.h file not found"); process.exitCode = 1'),
      { _tag: 'ProcessFailure', message: /gguf.h file not found/ }
    );
  });

  test('honors cancellation before starting', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(runProcess('console.log("{}")', 4096, controller.signal), { _tag: 'ProcessFailure', message: /interrupted/ });
  });

  test('honors cancellation while running', async () => {
    const controller = new AbortController();
    const result = runProcess('setTimeout(() => console.log("{}"), 10000)', 4096, controller.signal);
    controller.abort();
    await assert.rejects(result, { _tag: 'ProcessFailure', message: /interrupted/ });
  });
});
