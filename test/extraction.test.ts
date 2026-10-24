import { it as test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

test('cancellation during temporary-directory acquisition still removes the directory', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fsj-acquisition-test-'));
  const completion = path.join(directory, 'completion');
  // Isolate the delayed filesystem mock from every other test module.
  const script = `
    import { mock } from 'bun:test';
    import assert from 'node:assert/strict';
    import * as filesystem from 'node:fs/promises';
    import { Effect } from 'effect';
    const mkdtemp = filesystem.mkdtemp;
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    mock.module('node:fs/promises', () => ({ ...filesystem, mkdtemp: async (prefix) => {
      const directory = await mkdtemp(prefix);
      started.resolve(directory);
      await release.promise;
      return directory;
    } }));
    const { extractVerifiedAst } = await import('./src/extraction.ts');
    const source = ${JSON.stringify(path.resolve('test/fixtures/native-paths.cpp'))};
    const controller = new AbortController();
    const result = Effect.runPromise(extractVerifiedAst(source,
      { compiler: 'clang++', args: [source], cwd: process.cwd(), context: 'fallback' },
      '/unused-extractor', 67108864, controller.signal), { signal: controller.signal });
    const rejected = assert.rejects(result);
    const directory = await started.promise;
    try {
      controller.abort();
      release.resolve();
      await rejected;
      await assert.rejects(filesystem.stat(directory), { code: 'ENOENT' });
      await filesystem.writeFile(${JSON.stringify(completion)}, 'acquisition-cancellation-cleaned');
    } finally {
      release.resolve();
      await filesystem.rm(directory, { recursive: true, force: true });
    }
  `;
  try {
    const result = await promisify(execFile)(process.execPath, ['-e', script], {
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), timeout: 10000
    });
    assert.equal(await readFile(completion, 'utf8'), 'acquisition-cancellation-cleaned');
    assert.equal(result.stderr, '');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
