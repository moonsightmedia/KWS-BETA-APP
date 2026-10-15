import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const src = await readFile(new URL('../src/lib/accountEligibility.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { accountBirthDateError } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const today = new Date('2026-10-12T10:00:00Z');
test('16th birthday is accepted; one day younger is rejected', () => {
  assert.equal(accountBirthDateError('2010-10-12', today), null);
  assert.match(accountBirthDateError('2010-10-13', today), /ab 16/);
  assert.equal(accountBirthDateError('1980-02-29', today), null);
});
test('missing, partial, impossible, future and implausible dates are rejected', () => {
  for (const value of [undefined, '', '2010-1-1', '2010-02-29', '2000-04-31', '0000-01-01', '1899-12-31', '2027-01-01']) {
    assert.equal(typeof accountBirthDateError(value, today), 'string', value);
  }
});
test('age uses the German calendar day at UTC midnight boundaries', () => {
  assert.equal(accountBirthDateError('2010-10-13', new Date('2026-10-12T22:01:00Z')), null);
  assert.match(accountBirthDateError('2010-10-13', new Date('2026-10-12T21:59:00Z')), /ab 16/);
});
