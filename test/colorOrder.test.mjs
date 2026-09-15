import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/colorOrder.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { moveColor, persistColorOrder } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const original = [{ id: 'a', sort_order: 0 }, { id: 'b', sort_order: 1 }, { id: 'c', sort_order: 1 }];
function fixture(failAt = 0, ambiguous = false, offline = false) {
  let rows = structuredClone(original);
  let writes = 0;
  let failed = false;
  return {
    get rows() { return rows; }, get writes() { return writes; },
    transport: {
      read: async () => { if (failed && offline) throw new Error('Offline'); return structuredClone(rows); },
      update: async (id, from, to) => {
        writes++;
        const row = rows.find(row => row.id === id);
        if (row?.sort_order !== from) throw new Error('Conflict');
        if (writes === failAt && !ambiguous) { failed = true; throw new Error('Failure'); }
        row.sort_order = to;
        if (writes === failAt && ambiguous) { failed = true; throw new Error('Lost acknowledgement'); }
      },
    },
  };
}
test('move is immutable and handles both directions and invalid/no-op positions', () => {
  const ids = ['a', 'b', 'c'];
  assert.deepEqual(moveColor(ids, 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveColor(ids, 2, 0), ['c', 'a', 'b']);
  assert.equal(moveColor(ids, 1, 1), ids);
  assert.equal(moveColor(ids, -1, 2), ids);
  assert.equal(moveColor(ids, 0, 3), ids);
  assert.deepEqual(ids, ['a', 'b', 'c']);
});
test('save normalizes duplicate positions and confirms every position by read-back', async () => {
  const f = fixture();
  const result = await persistColorOrder(original, ['c', 'a', 'b'], f.transport);
  assert.deepEqual(result, [{ id: 'c', sort_order: 1 }, { id: 'a', sort_order: 2 }, { id: 'b', sort_order: 3 }]);
  assert.equal(f.writes, 2);
});
test('changed catalog or duplicate IDs are rejected before any write', async () => {
  const f = fixture();
  await assert.rejects(persistColorOrder(original, ['a', 'a', 'b'], f.transport), error => error.reloadRequired);
  f.rows[0].sort_order = 99;
  await assert.rejects(persistColorOrder(original, ['c', 'a', 'b'], f.transport), error => error.reloadRequired);
  assert.equal(f.writes, 0);
});
for (const ambiguous of [false, true]) test(`failure restores original positions even when acknowledgement is lost: ${ambiguous}`, async () => {
  const f = fixture(2, ambiguous);
  await assert.rejects(persistColorOrder(original, ['b', 'c', 'a'], f.transport), error => !error.reloadRequired && error.message.includes('beibehalten'));
  assert.deepEqual(f.rows, original);
});
test('offline/uncertain recovery requires reload, never claims rollback or success', async () => {
  const f = fixture(2, true, true);
  await assert.rejects(persistColorOrder(original, ['b', 'c', 'a'], f.transport), error => error.reloadRequired && error.message.includes('Teil übernommen'));
});
test('rollback does not overwrite a different concurrent position', async () => {
  const f = fixture();
  let calls = 0;
  const update = f.transport.update;
  f.transport.update = async (...args) => {
    calls++;
    if (calls === 2) { f.rows.find(row => row.id === 'c').sort_order = 77; throw new Error('Concurrent write'); }
    return update(...args);
  };
  await assert.rejects(persistColorOrder(original, ['b', 'c', 'a'], f.transport), error => error.reloadRequired);
  assert.equal(f.rows.find(row => row.id === 'c').sort_order, 77);
});
