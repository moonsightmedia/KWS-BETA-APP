import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = (await readFile(new URL('../src/lib/hallMapSource.ts', import.meta.url), 'utf8'))
  .replace("import bundledMap from '@/assets/boulderkarte-original.png';", "const bundledMap = '/bundled.png';");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resolveHallMapSource } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const legacyUrl = 'https://pkzzxtsyxwxoraytyjau.supabase.co/storage/v1/object/public/hall-maps/09edc012-45ac-4938-a267-d13fc3acf220/hall-map-base.svg';

test('saved image and dimensions win; static tracing proposals cannot cross map sources', () => {
  assert.deepEqual(resolveHallMapSource({ image_url: '/saved.svg', width: 735, height: 466 }), { src: '/saved.svg', width: 735, height: 466, supportsProposals: false });
  assert.deepEqual(resolveHallMapSource(null), { src: '/bundled.png', width: 1471, height: 930, supportsProposals: true });
  const invalid = resolveHallMapSource({ image_url: '/saved.svg', width: -1, height: 0 });
  assert.equal(invalid.src, '/saved.svg');
  assert.ok(invalid.width > 0 && invalid.height > 0);
});

test('known KWS legacy drawing uses its original PNG without changing the saved coordinate space', () => {
  const map = Object.freeze({ image_url: legacyUrl, width: 735, height: 466 });
  assert.deepEqual(resolveHallMapSource(map), { src: '/bundled.png', width: 735, height: 466, supportsProposals: true });
  assert.equal(map.image_url, legacyUrl);
  assert.deepEqual(resolveHallMapSource({ ...map, width: 1470, height: 932 }), { src: '/bundled.png', width: 1470, height: 932, supportsProposals: true });
});

test('legacy source matching tolerates whitespace and cache query but not other hosts or map paths', () => {
  assert.equal(resolveHallMapSource({ image_url: ` ${legacyUrl}?v=2#preview ` }).src, '/bundled.png');
  for (const image_url of [
    legacyUrl.replace('pkzzxtsyxwxoraytyjau.supabase.co', 'example.com'),
    legacyUrl.replace('09edc012-45ac-4938-a267-d13fc3acf220', 'another-map'),
    legacyUrl.replace('hall-map-base.svg', 'replacement.png'),
    '/src/assets/hall-map-base.svg',
  ]) {
    assert.deepEqual(resolveHallMapSource({ image_url, width: 800, height: 600 }), { src: image_url, width: 800, height: 600, supportsProposals: false });
  }
});

test('legacy drawing with missing dimensions retains its original editing frame', () => {
  assert.deepEqual(resolveHallMapSource({ image_url: legacyUrl, width: 0, height: NaN }), { src: '/bundled.png', width: 735, height: 466, supportsProposals: true });
});
