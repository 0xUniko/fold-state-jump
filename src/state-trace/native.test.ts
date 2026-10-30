import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadInventory } from './native';
import { Engine } from './engine';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prototype/fixtures');
const source = path.join(root, 'fold_recurrence.cpp');
const native = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../native/build/state-inventory');

describe('native state inventory', () => {
  it('extracts a fixture and answers a query', async () => {
    const program = await loadInventory(source, {
      compiler: 'clang++', args: ['-std=c++20', source], cwd: root,
    }, root, native);
    assert.ok(program.functions.size > 0);
    const out = Engine.fromPrograms([program]).query({ file: source, line: 37, column: 13, mode: 'history' });
    assert.ok(out.targets.some((t) => t.line === 33 && t.relation === 'fold-seed'));
    assert.ok(out.targets.some((t) => t.line === 40 && t.relation === 'fold-backedge'));
  });
});
