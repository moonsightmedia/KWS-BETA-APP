import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/boulderListPreferences.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { readBoulderListPreferences: read, writeBoulderListPreferences: write, defaultBoulderListPreferences: defaults, boulderPreferencesForRoute: route } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const values = new Map();
globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };

test('session preferences retain the whole selection and keep accounts and guest separate', () => {
  const selected = { ...defaults(), sectorFilters: ['Bug A', 'Bug B'], difficultyFilters: ['3', '4'], colorFilters: ['Grün'], searchQuery: 'Kleine', sortBy: 'name', sortOrder: 'asc', showNew: true, showSaved: true, showOnlyHanging: false };
  write('account-a', selected);
  assert.deepEqual(read('account-a'), selected);
  assert.deepEqual(read('account-b'), defaults());
  assert.deepEqual(read('guest'), defaults());
  write('account-a', defaults());
  assert.deepEqual(read('account-a'), defaults());
});
test('invalid and outdated browser data cannot break the overview', () => {
  values.set('kws:boulder-list:v1:malformed', '{');
  assert.deepEqual(read('malformed'), defaults());
  values.set('kws:boulder-list:v1:invalid', JSON.stringify({ sectorFilters: [null, 5, 'Bug A', 'Bug A'], searchQuery: false, sortBy: 'unknown', sortOrder: 'wrong', showNew: 'true' }));
  assert.deepEqual(read('invalid'), { ...defaults(), sectorFilters: ['Bug A'] });
});
test('blocked storage keeps navigation usable with an in-memory fallback', () => {
  const storage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  try {
    assert.deepEqual(read('blocked'), defaults());
    write('blocked', { ...defaults(), colorFilters: ['Blau'] });
    assert.deepEqual(read('blocked').colorFilters, ['Blau']);
  } finally { globalThis.sessionStorage = storage; }
});
test('explicit sector and quick-filter links take precedence; bare links restore the selection', () => {
  const previous = { ...defaults(), searchQuery: 'alt', colorFilters: ['Rot'] };
  assert.deepEqual(route(previous, ''), previous);
  assert.deepEqual(route(previous, '?view=grid'), previous);
  assert.deepEqual(route(previous, '?sector=Grotte%20A&show=new&status=all'), { ...defaults(), sectorFilters: ['Grotte A'], showNew: true, showOnlyHanging: false });
  assert.equal(route(previous, '?show=saved').showSaved, true);
});
