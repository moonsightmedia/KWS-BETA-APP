import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = await readFile(new URL('../src/lib/utils.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const moduleText = outputText.replace(/from "(clsx|tailwind-merge)"/g, (_, name) => `from "${pathToFileURL(require.resolve(name)).href}"`);
const { cn } = await import(`data:text/javascript;base64,${Buffer.from(moduleText).toString('base64')}`);

test('KWS radius overrides remove competing primitive radii', () => {
  assert.equal(cn('rounded-full', 'rounded-kws-control'), 'rounded-kws-control');
  assert.equal(cn('rounded-xl', 'rounded-kws-card'), 'rounded-kws-card');
  assert.equal(cn('rounded-sm', 'rounded-kws-badge'), 'rounded-kws-badge');
  assert.equal(cn('rounded-kws-card', 'rounded-kws-control'), 'rounded-kws-control');
});

test('radius merging preserves unrelated styles and directional overrides', () => {
  assert.equal(cn('bg-white rounded-full px-2', 'rounded-kws-control px-3'), 'bg-white rounded-kws-control px-3');
  assert.equal(cn('rounded-kws-card', 'rounded-t-none'), 'rounded-kws-card rounded-t-none');
});
