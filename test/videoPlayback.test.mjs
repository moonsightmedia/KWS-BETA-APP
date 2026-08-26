import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/videoPlayback.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
const playback = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('quality fallback always chooses the next available lower source', () => {
  const allQualities = { hd: 'hd.mp4', sd: 'sd.mp4', low: 'low.mp4' };
  assert.equal(playback.getNextLowerVideoQuality('hd', allQualities), 'sd');
  assert.equal(playback.getNextLowerVideoQuality('sd', allQualities), 'low');
  assert.equal(playback.getNextLowerVideoQuality('low', allQualities), null);
  assert.equal(playback.getNextLowerVideoQuality('hd', { hd: 'hd.mp4', low: 'low.mp4' }), 'low');
});

test('a persistent native waiting state can trigger fallback without pausing the video', () => {
  assert.equal(playback.shouldFallbackAfterStall({
    hasStartedPlaying: true,
    ended: false,
    paused: false,
    readyState: 2,
    duration: 120,
    currentTime: 31,
  }), true);
});

test('paused, recovered and near-end videos never auto-fallback', () => {
  const base = {
    hasStartedPlaying: true,
    ended: false,
    paused: false,
    readyState: 2,
    duration: 120,
    currentTime: 31,
  };

  assert.equal(playback.shouldFallbackAfterStall({ ...base, paused: true }), false);
  assert.equal(playback.shouldFallbackAfterStall({ ...base, readyState: 3 }), false);
  assert.equal(playback.shouldFallbackAfterStall({ ...base, currentTime: 117 }), false);
});

test('near-end detection handles short and invalid media safely', () => {
  assert.equal(playback.isNearVideoEnd(120, 109), true);
  assert.equal(playback.isNearVideoEnd(120, 100), false);
  assert.equal(playback.isNearVideoEnd(Number.NaN, 0), false);
});
