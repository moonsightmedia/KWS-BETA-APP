import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/routeSwipe.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
const swipe = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('a deliberate horizontal gesture selects the neighboring route', () => {
  assert.equal(swipe.resolveHorizontalSwipeIntent(72, 5), 'next');
  assert.equal(swipe.resolveHorizontalSwipeIntent(-72, 5), 'previous');
});

test('short horizontal movement locks the axis without navigating yet', () => {
  assert.equal(swipe.resolveHorizontalSwipeIntent(24, 3), 'horizontal');
  assert.equal(swipe.resolveHorizontalSwipeIntent(-40, 2), 'horizontal');
});

test('vertical and ambiguous diagonal movement never changes routes', () => {
  assert.equal(swipe.resolveHorizontalSwipeIntent(4, 72), 'vertical');
  assert.equal(swipe.resolveHorizontalSwipeIntent(48, 44), 'vertical');
  assert.equal(swipe.resolveHorizontalSwipeIntent(5, 5), 'pending');
});
