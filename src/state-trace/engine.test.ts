import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from './engine';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prototype/fixtures/inventory');
const engineFor = (name: string): Engine => Engine.fromFiles([path.join(fixtures, name + '.ndjson')]);
const q = (name: string, line: number, column: number, mode: 'origin' | 'mutation' | 'history' | 'provenance') =>
  engineFor(name).query({ file: path.join(fixtures, '../' + name + '.cpp'), line, column, mode });

describe('generic state provenance', () => {
  it('separates fold seed from previous-iteration backedge', () => {
    const out = q('fold_recurrence', 37, 13, 'history');
    assert.ok(out.targets.some((t) => t.line === 33 && t.relation === 'fold-seed'));
    assert.ok(out.targets.some((t) => t.line === 40 && t.relation === 'fold-backedge'));
  });

  it('does not return a same-fold backedge under a first-iteration guard', () => {
    const out = q('fold_first_guard', 14, 15, 'history');
    assert.ok(out.targets.some((t) => t.line === 11 && t.relation === 'fold-seed'));
    assert.ok(!out.targets.some((t) => t.relation === 'fold-backedge'));
  });

  it('is invariant under unrelated names and member order', () => {
    const out = q('renamed_state', 39, 15, 'history');
    assert.ok(out.targets.some((t) => t.line === 34 && t.relation === 'fold-seed'));
    assert.ok(out.targets.some((t) => t.line === 40 && t.relation === 'fold-backedge'));
  });

  it('keeps the nearest overwrite and excludes dead stores for the reaching value', () => {
    const out = q('negative_control', 16, 10, 'mutation');
    const lines = out.targets.map((t) => t.line);
    assert.ok(lines.includes(15));
    assert.ok(!lines.includes(13));
    assert.ok(!lines.includes(14));
  });

  it('keeps both may definitions at an if/else merge', () => {
    const out = q('negative_control', 25, 10, 'origin');
    const lines = out.targets.map((t) => t.line);
    assert.ok(lines.includes(22));
    assert.ok(lines.includes(24));
  });

  it('does not treat a future write as the source of an earlier copy', () => {
    const out = q('negative_control', 32, 9, 'origin');
    const lines = out.targets.map((t) => t.line);
    assert.ok(lines.includes(29));
    assert.ok(!lines.includes(31));
  });

  it('does not confuse same-named fields on different objects', () => {
    const out = q('negative_control', 9, 11, 'origin');
    assert.ok(!out.targets.some((t) => t.line === 8));
  });

  it('binds a C++ reference without treating the binding as a write', () => {
    const out = q('fold_recurrence', 35, 15, 'origin');
    assert.ok(out.targets.some((t) => t.line === 35 && t.relation === 'alias-binding'));
  });

  it('preserves optional install/reset provenance across calls', () => {
    const out = q('optional_variant', 29, 10, 'origin');
    const lines = out.targets.map((t) => t.line);
    assert.ok(lines.includes(41) || lines.includes(22));
    assert.ok(out.targets.length > 1);
  });

  it('marks a dynamic element index as a boundary but not a constant index', () => {
    const dynamic = q('dynamic_index', 10, 3, 'mutation');
    assert.ok(dynamic.boundaries.some((b) => b.reason.includes('dynamic container index')));
    const constant = q('dynamic_index', 19, 21, 'mutation');
    assert.ok(!constant.boundaries.some((b) => b.reason.includes('dynamic container index')));
  });

  it('does not turn an unknown pointer/callback effect into a proof', () => {
    for (const [line, column] of [[12, 10], [26, 10], [30, 10]] as const) {
      const out = q('pointer_callback', line, column, 'origin');
      assert.ok(out.boundaries.length > 0);
    }
  });
});
