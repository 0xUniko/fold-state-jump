import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pchHistoryMs, prunePchHistory, recordPchInvalidation, resetPchHistory, suppressPchBuild } from '../src/pch-policy';

describe('bounded PCH construction evidence', () => {
  it('requires distinct invalidations and expires without a timer or permanent ban', () => {
    const once = recordPchInvalidation([], '/cache', 'a', 0);
    const repeated = recordPchInvalidation(once, '/cache', 'a', 1);
    assert.equal(suppressPchBuild(repeated, '/cache', 2), false);
    const twice = recordPchInvalidation(repeated, '/cache', 'b', 2);
    assert.equal(suppressPchBuild(twice, '/cache', 3), true);
    assert.equal(suppressPchBuild(twice, '/other-cache', 3), false);
    assert.equal(suppressPchBuild(twice, '/cache', pchHistoryMs), false);
    assert.deepEqual(prunePchHistory(twice, pchHistoryMs), []);
    assert.deepEqual(resetPchHistory(twice, '/cache'), []);
  });
  it('retains at most 32 namespaces and two artifact identities each', () => {
    const history = Array.from({ length: 100 }, (_, index) => index).reduce((history, index) =>
      ['a', 'b', 'c'].reduce((history, identity) => recordPchInvalidation(history, '/cache/' + index, identity, 0), history), [] as Parameters<typeof recordPchInvalidation>[0]);
    assert.equal(history.length, 32);
    assert.ok(history.every((sample) => sample.identities.length === 2));
    assert.equal(suppressPchBuild(history, '/cache/0', 1), false);
  });
});
