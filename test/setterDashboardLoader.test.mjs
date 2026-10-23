import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../src/lib/loadSetterDashboard.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm',
  tsconfig: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)),
});
const { loadSetterDashboard } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);

const sectors = [{ id: 's', name: 'Bug A', subarea_code: 'A', area: { id: 'a', name: 'Bug', slug: 'bug' } }];
const areas = [{ id: 'empty', name: 'Leerer Bereich', sort_order: 2 }, { id: 'a', name: 'Bug', sort_order: 1 }];
const boulder = id => ({ id, name: id, difficulty: 5, sector_id: 's', sector_id_2: null });

function source(boulders, overrides = {}) {
  const calls = [];
  const tables = { boulders, sectors, sector_areas: areas, boulder_ratings: [], boulder_grade_feedback: [], boulder_comments: [], ...overrides };
  async function request(path) {
    const url = new URL(path, 'http://fixture.invalid');
    calls.push(url);
    const name = url.pathname.split('/').at(-1);
    const table = tables[name];
    if (table instanceof Error) throw table;
    let rows = table;
    const scope = url.searchParams.get('boulder_id')?.match(/^in\.\((.*)\)$/)?.[1].split(',');
    if (scope) rows = rows.filter(row => scope.includes(row.boulder_id));
    const cursor = url.searchParams.get('id')?.slice(3);
    return [...rows].sort((a, b) => a.id.localeCompare(b.id)).filter(row => !cursor || row.id > cursor).slice(0, 37);
  }
  return { request, calls };
}

test('loader preserves independently stored empty areas and secondary-only assignments', async () => {
  const fixture = source([{ ...boulder('one'), sector_id: null, sector_id_2: 's' }, { ...boulder('unknown'), sector_id: 'missing' }]);
  const data = await loadSetterDashboard(fixture.request);
  assert.deepEqual(data.knownAreas, ['Bug', 'Leerer Bereich']);
  assert.deepEqual(data.boulders[0].areas, ['Bug']);
  assert.equal(data.boulders[0].sector, 'Bug A');
  assert.deepEqual(data.boulders[1].areas, ['Ohne Bereich']);
  assert.ok(fixture.calls.find(url => url.pathname.endsWith('/sector_areas')));
});

test('feedback readers scope every page to the current inventory in bounded chunks', async () => {
  const boulders = Array.from({ length: 205 }, (_, i) => boulder(`b${String(i).padStart(3, '0')}`));
  const fixture = source(boulders, {
    boulder_ratings: [...boulders.map((b, i) => ({ id: `r${String(i).padStart(3, '0')}`, boulder_id: b.id, rating: 4 })), { id: 'archived', boulder_id: 'old', rating: 1 }],
    boulder_comments: [{ id: 'c', boulder_id: 'b204', comment: 'Freigegeben' }],
  });
  const data = await loadSetterDashboard(fixture.request);
  assert.equal(data.boulders.length, 205);
  assert.equal(data.ratings.length, 205);
  assert.equal(data.comments.length, 1);
  for (const url of fixture.calls.filter(url => /boulder_(ratings|grade_feedback|comments)$/.test(url.pathname))) {
    const ids = url.searchParams.get('boulder_id').slice(4, -1).split(',');
    assert.ok(ids.length <= 100);
    assert.ok(ids.every(id => boulders.some(boulder => boulder.id === id)));
    if (url.pathname.endsWith('comments')) assert.equal(url.searchParams.get('moderation_status'), 'eq.approved');
  }
  assert.match(fixture.calls.find(url => url.pathname.endsWith('/boulders')).searchParams.get('or'), /status.eq.haengt,status.is.null/);
});

test('no inventory skips community tables, while a failed area source rejects the entire result', async () => {
  const empty = source([]);
  assert.deepEqual((await loadSetterDashboard(empty.request)).ratings, []);
  assert.ok(empty.calls.every(url => !/boulder_(ratings|grade_feedback|comments)$/.test(url.pathname)));
  await assert.rejects(loadSetterDashboard(source([boulder('one')], { sector_areas: new Error('catalog unavailable') }).request), /catalog unavailable/);
  await assert.rejects(loadSetterDashboard(source([boulder('one')], { boulder_grade_feedback: new Error('feedback unavailable') }).request), /feedback unavailable/);
});
