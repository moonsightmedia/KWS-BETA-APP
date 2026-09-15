import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/pushDeliveryReport.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { summarizePushResponse } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
test('HTTP success alone never proves push acceptance', () => {
  for (const value of [null, {}, { success: true }, { results: null }, { results: [null, {}] }]) assert.deepEqual(summarizePushResponse(value, 2), { accepted: 0, rejected: 0, unconfirmed: 2 });
});
test('reports accepted, rejected, partial and unconfirmed results separately', () => {
  assert.deepEqual(summarizePushResponse({ results: [{ success: true }, { success: true }] }, 2), { accepted: 2, rejected: 0, unconfirmed: 0 });
  assert.deepEqual(summarizePushResponse({ results: [{ success: false }, { success: false }] }, 2), { accepted: 0, rejected: 2, unconfirmed: 0 });
  assert.deepEqual(summarizePushResponse({ results: [{ success: true }, { success: false }] }, 3), { accepted: 1, rejected: 1, unconfirmed: 1 });
});
test('a contradictory result count is unconfirmed, not success', () => {
  assert.deepEqual(summarizePushResponse({ results: [{ success: true }, { success: true }] }, 1), { accepted: 0, rejected: 0, unconfirmed: 1 });
});
