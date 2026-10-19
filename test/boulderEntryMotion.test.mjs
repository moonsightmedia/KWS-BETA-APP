import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/boulderNavigation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { boulderNavigationState, readBoulderOrigin } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

test('entry changes opacity only, with no photo flight, resizing or translation', () => {
  const keyframes = styles.match(/@keyframes kws-detail-enter\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(keyframes);
  assert.match(keyframes, /from\s*\{\s*opacity:\s*0\.92;/);
  assert.match(keyframes, /to\s*\{\s*opacity:\s*1;/);
  assert.doesNotMatch(keyframes, /transform|translate|scale|width|height/);
  assert.match(styles, /\.kws-detail-enter\s*\{\s*animation:\s*kws-detail-enter 150ms ease-out;/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.kws-detail-enter\s*\{\s*animation:\s*none;/);
  assert.doesNotMatch(styles, /view-transition-name:\s*boulder-photo|::view-transition-/);
});

test('all card entry points navigate directly and keep the original return state', async () => {
  for (const page of ['Index', 'Boulders', 'Guest']) {
    const component = await readFile(new URL(`../src/pages/${page}.tsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(component, /boulderPhotoTransition|startViewTransition|flushSync/);
    assert.match(component, /state:\s*boulderNavigationState\(location\)/);
  }
});

test('all supported origins preserve URL, history key and scroll for immediate return', context => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  context.after(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });
  globalThis.window = { scrollY: 428 };
  globalThis.document = { scrollingElement: { scrollTop: 0 } };
  for (const pathname of ['/', '/app', '/boulders', '/guest', '/statistics']) {
    const location = { pathname, search: '?show=new', hash: '#boulder-results', key: 'source-key' };
    assert.deepEqual(readBoulderOrigin(boulderNavigationState(location)), { ...location, scrollTop: 428 });
  }
});

test('invalid or external origins never replace the safe return destination', () => {
  const origin = { pathname: '/boulders', search: '', hash: '', key: 'source-key', scrollTop: 0 };
  for (const invalid of [null, {}, { ...origin, pathname: 'https://example.com' },
    { ...origin, search: 'unsafe' }, { ...origin, hash: 'unsafe' },
    { ...origin, key: null }, { ...origin, scrollTop: -1 }, { ...origin, scrollTop: NaN }]) {
    assert.equal(readBoulderOrigin({ boulderOrigin: invalid }), null);
  }
});
