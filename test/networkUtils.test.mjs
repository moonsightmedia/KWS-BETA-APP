import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/networkUtils.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const network = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const quality = (connection, onLine = true) => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine, connection } });
  return network.getOptimalVideoQualityWithDataSaver();
};
test('unreported and normal broadband connections start HD', () => {
  for (const connection of [undefined, {}, { effectiveType: '4g' }, { effectiveType: '4g', downlink: 5 }, { downlink: 8 }]) assert.equal(quality(connection), 'hd');
});
test('known constrained links and data saver choose a sustainable starting source', () => {
  assert.equal(quality({ effectiveType: '3g', downlink: 2 }), 'sd');
  assert.equal(quality({ effectiveType: '2g' }), 'low');
  assert.equal(quality({ downlink: .5 }), 'low');
  assert.equal(quality({ effectiveType: '4g', downlink: 2 }), 'sd');
  assert.equal(quality({ effectiveType: '4g', downlink: 8, saveData: true }), 'sd');
  assert.equal(quality({ effectiveType: '3g', saveData: true }), 'low');
  assert.equal(quality(undefined, false), 'low');
});
