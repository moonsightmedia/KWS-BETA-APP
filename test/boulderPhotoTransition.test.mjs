import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = (await readFile(new URL('../src/lib/boulderPhotoTransition.ts', import.meta.url), 'utf8'))
  .replace('import { flushSync } from "react-dom";', 'const flushSync = update => update();');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { withBoulderPhotoTransition, cancelBoulderPhotoTransition } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function setup(context) {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalAnimationFrame = globalThis.requestAnimationFrame;
  const attributes = new Map();
  const image = {
    complete: true,
    naturalWidth: 100,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
  };
  const detail = { setAttribute: (name, value) => attributes.set(name, value) };
  const ready = deferred();
  const finished = deferred();
  let callback;
  let skipped = 0;
  const transition = {
    ready: ready.promise,
    finished: finished.promise,
    skipTransition: () => { skipped++; },
  };
  const document = {
    documentElement: { dataset: {} },
    querySelectorAll: () => [image],
    querySelector: () => detail,
    startViewTransition: update => { callback = update; return transition; },
  };
  globalThis.document = document;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.requestAnimationFrame = () => { throw new Error('Transition must not await animation frames'); };
  context.after(() => {
    cancelBoulderPhotoTransition();
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.requestAnimationFrame = originalAnimationFrame;
  });
  return {
    document, image, attributes, ready, finished,
    source: { querySelector: () => image },
    update: () => callback(),
    skipped: () => skipped,
  };
}

test('photo navigation commits synchronously without waiting for frozen rendering frames', async context => {
  const fixture = setup(context);
  let updates = 0;
  withBoulderPhotoTransition(() => { updates++; }, fixture.source);
  assert.equal(updates, 0);
  assert.equal(fixture.update(), undefined);
  assert.equal(updates, 1);
  assert.equal(fixture.attributes.get('data-photo-animated'), '');
  assert.equal(fixture.document.documentElement.dataset.boulderPhotoTransition, '');
  fixture.ready.resolve();
  fixture.finished.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.document.documentElement.dataset.boulderPhotoTransition, undefined);
});

test('an animation-only timeout is handled locally while committed navigation stays intact', async context => {
  const fixture = setup(context);
  let updates = 0;
  withBoulderPhotoTransition(() => { updates++; }, fixture.source);
  fixture.update();
  fixture.ready.reject(new DOMException('Transition was aborted because of timeout in DOM update. DOM update timed out', 'TimeoutError'));
  fixture.finished.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updates, 1);
  assert.equal(fixture.document.documentElement.dataset.boulderPhotoTransition, undefined);
});

test('return navigation cancels the enhancement and handles its ready rejection', async context => {
  const fixture = setup(context);
  withBoulderPhotoTransition(() => {}, fixture.source);
  fixture.update();
  cancelBoulderPhotoTransition();
  fixture.ready.reject(new DOMException('Transition skipped', 'AbortError'));
  fixture.finished.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.skipped(), 1);
  assert.equal(fixture.document.documentElement.dataset.boulderPhotoTransition, undefined);
});

for (const fallback of ['unsupported', 'reduced-motion', 'missing-image', 'unloaded-image', 'broken-image']) {
  test(`${fallback} keeps direct navigation without transition markers`, context => {
    const fixture = setup(context);
    if (fallback === 'unsupported') delete fixture.document.startViewTransition;
    if (fallback === 'reduced-motion') globalThis.window.matchMedia = () => ({ matches: true });
    if (fallback === 'missing-image') fixture.source.querySelector = () => null;
    if (fallback === 'unloaded-image') fixture.image.complete = false;
    if (fallback === 'broken-image') fixture.image.naturalWidth = 0;
    let updates = 0;
    withBoulderPhotoTransition(() => { updates++; }, fixture.source);
    assert.equal(updates, 1);
    assert.equal(fixture.attributes.has('data-boulder-photo-source'), false);
    assert.equal(fixture.document.documentElement.dataset.boulderPhotoTransition, undefined);
  });
}

test('a synchronous API failure falls back exactly once and clears the marker', context => {
  const fixture = setup(context);
  fixture.document.startViewTransition = () => { throw new Error('Unavailable'); };
  let updates = 0;
  withBoulderPhotoTransition(() => { updates++; }, fixture.source);
  assert.equal(updates, 1);
  assert.equal(fixture.document.documentElement.dataset.boulderPhotoTransition, undefined);
});
