import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { analyzeAst, type ClangNode } from '../src/analysis';

const source = path.resolve('test/fixtures/native-fold.cpp');
const sourceText = readFileSync(source, 'utf8');
const ast = JSON.parse(readFileSync('/tmp/fold-state-jump-ast.json', 'utf8')) as ClangNode;

const analyzeReturn = (functionName: string) => {
  const start = sourceText.indexOf('State ' + functionName + '()');
  assert.ok(start >= 0, 'Missing fixture function: ' + functionName);
  const end = sourceText.indexOf('return state;', start);
  assert.ok(end > start, 'Missing return state in ' + functionName);
  return analyzeAst(ast, {
    file: source,
    sourceText,
    cursorByteOffset: Buffer.byteLength(sourceText.slice(0, end + 'return '.length), 'utf8')
  });
};

const direct = analyzeReturn('example');
assert.equal(direct._tag, 'MutationFound', JSON.stringify(direct));
if (direct._tag === 'MutationFound') assert.equal(direct.via, 'direct');

const indirect = analyzeReturn('example_helper');
assert.equal(indirect._tag, 'MutationFound', JSON.stringify(indirect));
if (indirect._tag === 'MutationFound') assert.equal(indirect.via, 'call');
console.log('Native AST integration: direct and cross-function state mutations passed');
