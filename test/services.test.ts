import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Effect } from 'effect';
import { makeCompileCommand, resolveCompileCommand, runClangAst } from '../src/services';

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
    await assert.rejects(runProcess('console.log("{".repeat(10000))', 64), { _tag: 'ProcessFailure', message: /maxBuffer/ });
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
