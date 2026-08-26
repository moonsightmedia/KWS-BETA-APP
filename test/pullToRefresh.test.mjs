import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/pullToRefresh.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
const pull = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('a deliberate downward gesture starts pull to refresh', () => {
  assert.equal(pull.resolvePullIntent(2, 12), 'pull');
  assert.equal(pull.resolvePullIntent(8, 20), 'pull');
});

test('horizontal navigation and upward scrolling never start a refresh', () => {
  assert.equal(pull.resolvePullIntent(16, 6), 'cancel');
  assert.equal(pull.resolvePullIntent(0, -10), 'cancel');
});

test('small or ambiguous movement waits for a clear direction', () => {
  assert.equal(pull.resolvePullIntent(3, 5), 'pending');
  assert.equal(pull.resolvePullIntent(10, 10), 'pending');
});

test('pull resistance remains predictable and capped', () => {
  assert.equal(pull.getResistedPullDistance(0), 0);
  assert.equal(pull.getResistedPullDistance(50), 39);
  assert.equal(pull.getResistedPullDistance(1000), pull.MAX_PULL_DISTANCE);
});

