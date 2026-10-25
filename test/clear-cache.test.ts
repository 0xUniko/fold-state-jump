import { describe, it as test } from 'node:test';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

describe('clearCache command with document-scoped Native configuration', () => {
  // Keep the vscode mock in a separate Bun process so the normal test suite
  // and direct Node tests cannot observe a mocked extension module.
  ['default', 'absolute', 'relative', 'missing', 'non-executable', 'lock-failure', 'ast-failure', 'pch-partial'].map((scenario) =>
    test(scenario, async () => {
      await run('bun', [path.resolve('test/clear-cache-command.ts'), scenario], { timeout: 30000 });
    }));
});
