import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

it('final return evidence survives caller expansion, candidate choice and actual command presentation', { timeout: 60000 }, () => {
  const result = spawnSync(process.execPath, ['test/return-presentation.ts'], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
