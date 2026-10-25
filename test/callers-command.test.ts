import { it as test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('cross-file caller command adapter with real native ASTs and mocked VS Code', { skip: !existsSync('native/build/fold-state-jump-ast') }, () => {
  const result = spawnSync(process.execPath, ['test/callers-command.ts'], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('aggregate argument mappings survive provider discovery, caching and stale-document guards', { skip: !existsSync('native/build/fold-state-jump-ast') }, () => {
  const result = spawnSync(process.execPath, ['test/callers-command.ts', '--aggregates'], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('cross-file member command adapter and independent caller providers with real native ASTs', { skip: !existsSync('native/build/fold-state-jump-ast') }, () => {
  const result = spawnSync(process.execPath, ['test/members-command.ts'], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
