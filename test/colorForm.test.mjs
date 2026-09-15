import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/components/admin/colorForm.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { normalizeHex, makeColorDraft, validateColorDraft, colorDraftPayload } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('HEX accepts shorthand and canonicalizes complete values; rejects invalid CSS', () => {
  assert.equal(normalizeHex(' #aCf '), '#AACCFF');
  assert.equal(normalizeHex('22c55e'), '#22C55E');
  for (const value of ['', '#12345', 'red', 'url(example)', '#abcd']) assert.equal(normalizeHex(value), null);
});
test('validation covers duplicate names, missing fields, dual colors and sequence', () => {
  const colors = [{ id: '1', name: 'Grün' }];
  const draft = { ...makeColorDraft(), name: ' grün ', hex: '#xx', twoTone: true, secondaryHex: '#z', sortOrder: '-1' };
  assert.deepEqual(Object.keys(validateColorDraft(draft, colors)).sort(), ['hex', 'name', 'secondaryHex', 'sortOrder']);
  assert.equal(validateColorDraft({ ...makeColorDraft(), name: 'Grün' }, colors, '1').name, undefined);
});
test('single color explicitly removes the second color; dual draft saves both atomically', () => {
  const draft = { ...makeColorDraft(), name: ' Grün–Gelb ', hex: '#abc', secondaryHex: '#def', sortOrder: '3', active: false };
  assert.deepEqual(colorDraftPayload(draft), { name: 'Grün–Gelb', hex: '#AABBCC', secondary_hex: null, sort_order: 3, is_active: false });
  assert.equal(colorDraftPayload({ ...draft, twoTone: true }).secondary_hex, '#DDEEFF');
});
test('default colors preserve existing entries and admin catalog does not change public active-only filtering', async () => {
  const hooks = await readFile(new URL('../src/hooks/useColors.ts', import.meta.url), 'utf8');
  assert.match(hooks, /ignoreDuplicates: true/);
  assert.match(hooks, /order=sort_order\.asc&is_active=eq\.true/);
  assert.match(hooks, /order=sort_order\.asc,name\.asc/);
  assert.match(hooks, /delete\(\)\.eq\('id', id\)\.select\('id'\)/);
});
