import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const playerSource = await readFile(
  new URL('../src/components/boulder/BoulderVideoPlayer.tsx', import.meta.url),
  'utf8',
);
const dropdownSource = await readFile(
  new URL('../src/components/ui/dropdown-menu.tsx', import.meta.url),
  'utf8',
);

test('fullscreen video uses a solid light letterbox surface and safe-area spacing', () => {
  assert.match(playerSource, /bg-\[#F7F9F7\]/);
  assert.match(playerSource, /paddingTop: 'max\(var\(--app-safe-area-top\), 20px\)'/);
  assert.match(playerSource, /top: 'max\(calc\(var\(--app-safe-area-top\) \+ 12px\), 28px\)'/);
  assert.doesNotMatch(playerSource, /isFullscreen[^\n]+gradient/);
});

test('fullscreen quality menu stays inside the fullscreen element', () => {
  assert.match(dropdownSource, /portalContainer\?: HTMLElement \| null/);
  assert.match(dropdownSource, /Portal container=\{portalContainer \?\? undefined\}/);
  assert.match(playerSource, /portalContainer=\{isFullscreen \? containerRef\.current : undefined\}/);
  assert.match(playerSource, /collisionPadding=\{isFullscreen/);
});

test('loading status clears the native playback controls in fullscreen', () => {
  assert.match(playerSource, /bottom: 'max\(calc\(var\(--app-safe-area-bottom\) \+ 64px\), 76px\)'/);
  assert.match(playerSource, /controlsList="nodownload"/);
});
