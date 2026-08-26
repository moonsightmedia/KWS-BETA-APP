import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = new URL('../src/lib/sectorAreas.ts', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const sectorAreas = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const makeLegacySectors = () => sectorAreas.LEGACY_SECTOR_AREA_MAPPING.map((mapping, index) => ({
  id: `sector-${index + 1}`,
  name: mapping.legacyName,
  boulderCount: 0,
}));

test('the customer taxonomy stays at five areas and 18 logical subareas', () => {
  assert.deepEqual(
    sectorAreas.SECTOR_AREAS.map((area) => area.name),
    ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte'],
  );
  assert.equal(sectorAreas.LEGACY_SECTOR_AREA_MAPPING.length, 19);

  const groups = sectorAreas.groupSectorsByArea(makeLegacySectors());
  assert.equal(groups.length, 5);
  assert.equal(groups.flatMap((group) => group.subareas).length, 18);
});

test('every customer area has one distinct wayfinding color shared by its subareas', () => {
  const palettes = sectorAreas.SECTOR_AREAS.map((area) =>
    sectorAreas.getSectorAreaPalette(area.slug),
  );

  assert.equal(palettes.length, 5);
  assert.equal(new Set(palettes.map((palette) => palette.tagFillHighlighted)).size, 5);
  assert.equal(
    sectorAreas.getSectorAreaPalette('not-assigned'),
    sectorAreas.DEFAULT_SECTOR_AREA_PALETTE,
  );
});

test('Bug A merges both physical wall rows and structured database fields take precedence', () => {
  const groups = sectorAreas.groupSectorsByArea(makeLegacySectors());
  const bugA = groups.find((group) => group.area.slug === 'bug').subareas
    .find((subarea) => subarea.code === 'A');

  assert.deepEqual(
    bugA.sectors.map((sector) => sector.name),
    ['Atta-Höhle', 'Felsenmeer'],
  );

  const structured = sectorAreas.resolveSectorArea({
    name: 'Atta-Höhle',
    area: { name: 'Grotte', slug: 'grotte', sort_order: 5 },
    subarea_code: 'D',
  });
  assert.equal(structured.publicName, 'Grotte D');
  assert.equal(structured.usedLegacyMapping, false);
});

test('active boulders are counted once across primary and secondary sector references', () => {
  const count = sectorAreas.countActiveBouldersForSectorIds(
    [
      { id: 'one', sector_id: 'atta', sector_id_2: 'felsenmeer', status: 'haengt' },
      { id: 'two', sector_id: 'other', sector_id_2: 'atta', status: 'haengt' },
      { id: 'three', sector_id: 'atta', status: 'abgeschraubt' },
    ],
    ['atta', 'felsenmeer'],
  );

  assert.equal(count, 2);
});
