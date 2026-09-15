import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/boulder-filters-20260914';
const baseline = process.env.KWS_FILTER_BASELINE === '1';
const loop = baseline ? 'before' : process.env.KWS_QA_LOOP || 'loop1';
test.use({ trace: 'off', video: 'off' });

async function open(page: Page, name: string) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: `export * from '/test/fixtures/${name === 'guest' && hook === 'useAuth' ? 'guest-loading-hooks' : 'setter-hooks'}.ts';` }));
  }
  if (!baseline) await page.route('**/src/hooks/useColors.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useColors } from '/test/fixtures/filter-colors.ts';" }));
  await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.goto(name === 'guest' ? '/test/fixtures/guest-loading.html' : `/test/fixtures/setter-workspace.html?page=${name}`);
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (name === 'edit' || name === 'status') await expect(page.getByText('Grüne Welle', { exact: true })).toBeVisible();
  await mkdir(output, { recursive: true });
}

test('edit: colors include second color, grades combine and selection is cleared', async ({ page }) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, 'edit');
  await page.getByRole('checkbox', { name: 'Grüne Welle auswählen', exact: true }).check();
  const trigger = page.getByRole('button', { name: /Filter öffnen/ });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Weitere 5 Farben', exact: true }).click();
  await expect(dialog.getByRole('button', { name: /^Farbe / })).toHaveCount(11);
  expect(await dialog.getByRole('button', { name: 'Farbe Schwarz-Gelb', exact: true }).locator('span').first().evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
  await dialog.getByRole('button', { name: 'Farbe Weiß', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '4 Boulder anzeigen', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Grad 1', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '1 Boulder anzeigen', exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/${loop}-selected-375.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByText('Grüne Welle', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Grad 1 entfernen', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(4);
  await trigger.click();
  await dialog.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(dialog.getByRole('button', { name: '12 Boulder anzeigen', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Filter zurücksetzen' })).toBeDisabled();
  await dialog.getByRole('button', { name: '12 Boulder anzeigen', exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('edit: public areas are grouped once; footer stays reachable when scrolling', async ({ page }) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, 'edit');
  await page.getByRole('button', { name: /Filter öffnen/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Sektor Bug A', exact: true })).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: /^Sektor / })).toHaveCount(18);
  await dialog.getByRole('button', { name: 'Bug: alle Teilbereiche', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Sektor Bug A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('button', { name: 'Sektor Bug D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('button', { name: '4 Boulder anzeigen', exact: true })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Sektor Grotte D', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/${loop}-areas-375.png`, animations: 'disabled' });
  await expect(dialog.getByRole('button', { name: 'Filter schließen' })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: '4 Boulder anzeigen', exact: true })).toBeInViewport();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.width).toBe(375);
  expect(Math.round(box.y + box.height)).toBe(900);
  await dialog.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(dialog.getByRole('button', { name: '12 Boulder anzeigen' })).toBeVisible();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('status: sector sheet keeps public labels and clears selection', async ({ page }) => {
  test.skip(baseline);
  await open(page, 'status');
  await page.getByRole('checkbox', { name: 'Grüne Welle auswählen', exact: true }).check();
  await page.getByRole('button', { name: /Filter öffnen/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sektor Bug A', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '4 Boulder anzeigen' }).click();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sektor Bug A entfernen' })).toBeVisible();
  await page.getByRole('button', { name: 'Sektor Bug A entfernen' }).click();
  await expect(page.getByText('Grüne Welle', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('guest: filters use live counts and retain selection on reopen', async ({ page }) => {
  test.skip(baseline);
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, 'guest');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Farbe Weiß', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '2 Boulder anzeigen' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Grad 3', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '2 Boulder anzeigen' })).toBeVisible();
  await dialog.getByRole('button', { name: '2 Boulder anzeigen' }).click();
  await expect(page.getByRole('button', { name: 'Farbe Weiß entfernen' })).toBeVisible();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Grad 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(dialog.getByRole('button', { name: '8 Boulder anzeigen' })).toBeVisible();
  await page.screenshot({ path: `${output}/${loop}-guest-reset-1280.png`, animations: 'disabled' });
});

for (const width of [375, 768, 1280, 1920]) {
  for (const name of ['create', 'edit', 'status', 'guest']) {
    test(`${name} layout ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await open(page, name);
      if (name === 'guest') await page.getByRole('button', { name: 'Filter', exact: true }).click();
      if (!baseline && name === 'create') {
        const fab = page.getByRole('button', { name: 'Boulder hinzufügen', exact: true });
        const box = (await fab.boundingBox())!;
        expect(box.height).toBe(56);
        expect(box.x + box.width).toBe(width - (width < 768 ? 16 : 32));
        expect(box.y + box.height).toBe(900 - (width < 768 ? 88 : 24));
        await fab.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      }
      await page.screenshot({ path: `${output}/${loop}-${name}-${width}.png`, animations: 'disabled' });
      if (!baseline && (name === 'edit' || name === 'status')) {
        await page.getByRole('button', { name: /Filter öffnen/ }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({ path: `${output}/${loop}-${name}-filters-${width}.png`, animations: 'disabled' });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      expect(errors).toEqual([]);
    });
  }
}
