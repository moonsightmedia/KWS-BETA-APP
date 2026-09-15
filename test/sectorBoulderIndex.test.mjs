import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/sectorBoulderIndex.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { fetchActiveSectorBoulderIndex } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('continues short server-capped pages until empty and indexes both relations once', async () => {
  const calls = [];
  const pages = [[{ id: 'a', sector_id: 'one', sector_id_2: 'two' }], [{ id: 'b', sector_id: 'one', sector_id_2: 'one' }], []];
  const index = await fetchActiveSectorBoulderIndex('https://fixture.test', async url => { calls.push(new URL(url)); return Response.json(pages.shift()); });
  assert.deepEqual([...index.get('one')], ['a', 'b']);
  assert.deepEqual([...index.get('two')], ['a']);
  assert.equal(calls[1].searchParams.get('id'), 'gt.a');
  assert.equal(calls[2].searchParams.get('id'), 'gt.b');
  assert.equal(calls[0].searchParams.get('or'), '(status.eq.haengt,status.is.null)');
});

test('failed later page does not return misleading partial totals', async () => {
  let calls = 0;
  await assert.rejects(fetchActiveSectorBoulderIndex('https://fixture.test', async () => ++calls === 1 ? Response.json([{ id: 'a', sector_id: 'one' }]) : new Response('', { status: 503 })), /503/);
});

test('non-advancing pages abort rather than looping', async () => {
  await assert.rejects(fetchActiveSectorBoulderIndex('https://fixture.test', async () => Response.json([{ id: 'a', sector_id: 'one' }])), /Folgeseite/);
});
