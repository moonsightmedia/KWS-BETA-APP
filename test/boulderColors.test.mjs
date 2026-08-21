import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/colorUtils.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
const colors = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const catalog = [
  { name: 'Rot', hex: '#ef4444' },
  { name: 'Blau', hex: '#3b82f6' },
];

test('dual-color boulders render a deterministic split background and label', () => {
  assert.deepEqual(
    colors.getBoulderColorBackgroundStyle('Rot', 'Blau', catalog),
    { background: 'linear-gradient(135deg, #ef4444 0%, #ef4444 50%, #3b82f6 50%, #3b82f6 100%)' },
  );
  assert.equal(colors.getBoulderColorLabel('Rot', 'Blau'), 'Rot / Blau');
});

test('a color filter matches either side of a dual-color boulder', () => {
  assert.equal(colors.matchesBoulderColorFilter('Rot', 'Blau', 'Rot'), true);
  assert.equal(colors.matchesBoulderColorFilter('Rot', 'Blau', 'Blau'), true);
  assert.equal(colors.matchesBoulderColorFilter('Rot', 'Blau', 'Grün'), false);
});

test('missing or duplicate secondary colors fall back to the primary color', () => {
  assert.deepEqual(
    colors.getBoulderColorBackgroundStyle('Rot', null, catalog),
    { backgroundColor: '#ef4444' },
  );
  assert.equal(colors.getBoulderColorLabel('Rot', 'Rot'), 'Rot');
});
