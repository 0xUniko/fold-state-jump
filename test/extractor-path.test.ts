import { describe, it as test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveExtractorPath } from '../src/extractor-path';

describe('Native extractor path', () => {
  const extensionPath = path.resolve('/extension installation');

  test('unset and empty configuration use the extension default', () => {
    const executable = path.join(extensionPath, 'native', 'build', 'fold-state-jump-ast');
    assert.equal(resolveExtractorPath(extensionPath), executable);
    assert.equal(resolveExtractorPath(extensionPath, ''), executable);
  });

  test('absolute configuration is used verbatim', () => {
    const executable = '/custom tools/../tools/extractor';
    assert.equal(resolveExtractorPath(extensionPath, executable), executable);
  });

  test('relative configuration is resolved against the extension installation', () => {
    assert.equal(resolveExtractorPath(extensionPath, '../custom tools/extractor'),
      path.resolve(extensionPath, '../custom tools/extractor'));
  });
});
