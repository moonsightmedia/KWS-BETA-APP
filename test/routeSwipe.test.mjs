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
const motionSource = await readFile(new URL('../src/lib/routeSwipeMotion.ts', import.meta.url), 'utf8');
const motionOutput = ts.transpileModule(motionSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const motion = await import(`data:text/javascript;base64,${Buffer.from(motionOutput).toString('base64')}`);

test('a deliberate horizontal gesture selects the neighboring route', () => {
  assert.equal(swipe.resolveHorizontalSwipeIntent(-72, 5), 'next');
  assert.equal(swipe.resolveHorizontalSwipeIntent(72, 5), 'previous');
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

test('slow drags follow the finger past the former 48px limit', () => {
  assert.equal(motion.routeSwipeOffset(-180, 375), -180);
  assert.equal(motion.routeSwipeOffset(240, 375), 240);
  assert.equal(motion.routeSwipeOffset(-500, 375), -375);
  assert.ok(Math.abs(motion.routeSwipeOffset(-180, 375, true)) <= 24);
});

test('distance commits at a quarter page while short slow drags return', () => {
  assert.equal(motion.shouldCommitRouteSwipe(-70, 0, 375), false);
  assert.equal(motion.shouldCommitRouteSwipe(-100, 0, 375), true);
  assert.equal(motion.shouldCommitRouteSwipe(100, 0, 1180), false);
  assert.equal(motion.shouldCommitRouteSwipe(300, 0, 1180), true);
});

test('a deliberate flick commits, but jitter and reversing velocity do not', () => {
  assert.equal(motion.shouldCommitRouteSwipe(-30, -0.8, 375), true);
  assert.equal(motion.shouldCommitRouteSwipe(30, 0.8, 375), true);
  assert.equal(motion.shouldCommitRouteSwipe(-10, -2, 375), false);
  assert.equal(motion.shouldCommitRouteSwipe(-30, 0.8, 375), false);
});
