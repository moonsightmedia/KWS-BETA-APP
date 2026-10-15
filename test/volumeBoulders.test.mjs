import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles } = await build({ entryPoints: ['src/lib/dataTransformers.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { transformBoulder } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const base = { id: 'test', name: 'Test', sector_id: 'sector', color: 'Rot', color_2: 'Blau', difficulty: 4, created_at: '2026-10-13T10:00:00Z' };
test('the volume-only flag survives transformation without changing either color', () => {
  const boulder = transformBoulder({ ...base, volume_only: true }, []);
  assert.equal(boulder.volumeOnly, true); assert.equal(boulder.color, 'Rot'); assert.equal(boulder.color2, 'Blau');
});
test('legacy, missing, false and null flags never imply a volume-only boulder', () => {
  for (const flag of [undefined, null, false, 'true']) assert.equal(transformBoulder({ ...base, volume_only: flag }, []).volumeOnly, false);
});
