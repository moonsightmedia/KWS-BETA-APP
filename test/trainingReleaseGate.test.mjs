import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = await readFile(new URL('../src/features/training/flags.ts', import.meta.url), 'utf8');
for (const dev of [false, true]) {
  for (const preview of [undefined, 'false', 'true']) {
    test(`training release gate: DEV=${dev}, preview=${preview}`, async () => {
      const moduleSource = source.replaceAll('import.meta.env.DEV', JSON.stringify(dev))
        .replaceAll('import.meta.env.VITE_TRAINING_UI_PREVIEW', JSON.stringify(preview) ?? 'undefined');
      const flags = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
      assert.equal(flags.TRAINING_UI_ENABLED, dev && preview === 'true');
      assert.equal(flags.getAppUserRoutes().includes('/training'), dev && preview === 'true');
      assert.equal(flags.getAppUserRoutes(false).includes('/training'), false);
    });
  }
}

test('all training entry points are gated and release operators disable preview', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  for (const route of ['training/*', 'profile/training']) {
    assert.ok(app.includes(`path: '${route}', element: TRAINING_UI_ENABLED ?`), `${route} must use release gate`);
  }
  const web = await readFile(new URL('../ops/hostinger/update-production-web.py', import.meta.url), 'utf8');
  const native = await readFile(new URL('../scripts/build-hostinger-android.mjs', import.meta.url), 'utf8');
  assert.ok(web.includes("'VITE_TRAINING_UI_PREVIEW':'false'"));
  assert.ok(native.includes("VITE_TRAINING_UI_PREVIEW:'false'"));
});
