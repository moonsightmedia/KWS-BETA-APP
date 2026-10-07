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

test('admin preserves all 19 IDs, groups the same taxonomy and searches old/new names', () => {
  const input = makeLegacySectors();
  const before = JSON.stringify(input);
  const groups = sectorAreas.groupAdminSectors(input);
  assert.equal(groups.length, 6);
  assert.deepEqual(groups[0].sectors.map(s => s.name), ['Atta-Höhle', 'Steuerbord', 'Bug', 'Buckbord']);
  assert.equal(new Set(groups.flatMap(g => g.sectors.map(s => s.id))).size, 19);
  assert.equal(sectorAreas.groupAdminSectors(input, 'Bug A')[0].sectors.length, 1);
  assert.equal(sectorAreas.groupAdminSectors(input, 'Felsenmeer')[0].sectors.length, 1);
  assert.equal(JSON.stringify(input), before);
  const unknown = sectorAreas.groupAdminSectors([{ id: 'custom', name: 'Unbekannte Wand' }]);
  assert.equal(unknown[0].name, 'Ohne Bereich');
  assert.equal(unknown[0].sectors[0].id, 'custom');
});

test('Kurze Platte is independent: six areas and 19 physical/logical units', () => {
  assert.deepEqual(
    sectorAreas.SECTOR_AREAS.map((area) => area.name),
    ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte', 'Kurze Platte'],
  );
  assert.equal(sectorAreas.LEGACY_SECTOR_AREA_MAPPING.length, 19);

  const groups = sectorAreas.groupSectorsByArea(makeLegacySectors());
  assert.equal(groups.length, 6);
  assert.equal(groups.flatMap((group) => group.subareas).length, 19);
});

test('every customer area has one distinct wayfinding color shared by its subareas', () => {
  const palettes = sectorAreas.SECTOR_AREAS.map((area) =>
    sectorAreas.getSectorAreaPalette(area.slug),
  );

  assert.equal(palettes.length, 6);
  assert.equal(new Set(palettes.slice(0, 5).map((palette) => palette.tagFillHighlighted)).size, 5);
  assert.equal(
    sectorAreas.getSectorAreaPalette('not-assigned'),
    sectorAreas.DEFAULT_SECTOR_AREA_PALETTE,
  );
});

test('Bug A excludes Felsenmeer; only the obsolete structured Bug A assignment is corrected', () => {
  const groups = sectorAreas.groupSectorsByArea(makeLegacySectors());
  const bugA = groups.find((group) => group.area.slug === 'bug').subareas
    .find((subarea) => subarea.code === 'A');

  assert.deepEqual(
    bugA.sectors.map((sector) => sector.name),
    ['Atta-Höhle'],
  );
  const old = { name: 'Bug A', legacyName: 'Felsenmeer', area: { id: 'old-bug', name: 'Bug', slug: 'bug' }, subarea_code: 'A' };
  const corrected = sectorAreas.resolveSectorArea(old);
  assert.equal(corrected.publicName, 'Kurze Platte');
  assert.equal(corrected.area.slug, 'kurze-platte');
  assert.equal(corrected.area.id, undefined); // never borrow the Bug database ID
  assert.equal(sectorAreas.resolveSectorArea({ name: 'Felsenmeer', area: { name: 'Bug', slug: 'bug' }, subarea_code: 'E' }).publicName, 'Bug E');

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

test('new main areas and extended subarea codes are included without losing physical IDs', () => {
  const custom = { id: 'new-sector', name: 'Trainingswand rechts', boulderCount: 0, area: { id: 'training', name: 'Training', slug: 'training', sortOrder: 6 }, subareaCode: 'B2' };
  const groups = sectorAreas.groupSectorsByArea([...makeLegacySectors(), custom]);
  assert.equal(groups.length, 7);
  const training = groups.find(group => group.area.slug === 'training');
  assert.deepEqual(training.sectorIds, ['new-sector']);
  assert.equal(training.subareas[0].name, 'Training B2');
  assert.equal(groups.flatMap(group => group.sectorIds).length, 20);
  assert.equal(sectorAreas.resolveSectorArea({ name: 'Felsenmeer', area: custom.area, subarea_code: 'E' }).publicName, 'Training E');
});

test('subarea code validation normalizes input and rejects unsupported names', () => {
  for (const code of ['A', 'E', 'Z', 'AA', 'B2', 'A12']) assert.equal(sectorAreas.normalizeSubareaCode(code), code);
  assert.equal(sectorAreas.normalizeSubareaCode(' b2 '), 'B2');
  for (const code of ['', '2A', 'AAAA', 'Ä', 'A B', '-A', 'A/']) assert.equal(sectorAreas.normalizeSubareaCode(code), undefined);
});

test('admin overview matches map units and searching Felsenmeer finds only Kurze Platte', () => {
  const input = makeLegacySectors();
  const original = JSON.stringify(input);
  const groups = sectorAreas.groupAdminSubareas(input);
  const mapNames = sectorAreas.groupSectorsByArea(input).flatMap(area => area.subareas.map(group => group.name));
  assert.deepEqual(groups.map(group => group.name), mapNames);
  assert.equal(groups.length, 19);
  assert.equal(groups.filter(group => group.name === 'Bug A').length, 1);
  const result = sectorAreas.groupAdminSubareas(input, 'Felsenmeer');
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sectors.map(sector => sector.name), ['Felsenmeer']);
  assert.equal(result[0].name, 'Kurze Platte');
  assert.equal(new Set(groups.flatMap(group => group.sectors.map(sector => sector.id))).size, 19);
  assert.equal(JSON.stringify(input), original);
});

test('logical count deduplicates shared boulders and never sums ambiguous cached totals', () => {
  const input = [
    { id: 'atta', name: 'Atta-Höhle', boulder_count: 2, active_boulder_ids: ['shared', 'atta-only'] },
    { id: 'felsen', name: 'Extra Bug-Fläche', area: { name: 'Bug', slug: 'bug' }, subarea_code: 'A', boulder_count: 2, active_boulder_ids: ['shared', 'felsen-only'] },
  ];
  assert.equal(sectorAreas.groupAdminSubareas(input)[0].boulderCount, 3);
  assert.equal(sectorAreas.groupAdminSubareas(input, 'Extra Bug-Fläche')[0].boulderCount, 3);
  delete input[1].active_boulder_ids;
  assert.equal(sectorAreas.groupAdminSubareas(input)[0].boulderCount, null);
  assert.equal(sectorAreas.groupAdminSubareas([{ id: 'x', name: 'Custom', boulder_count: 0 }])[0].boulderCount, 0);
});
