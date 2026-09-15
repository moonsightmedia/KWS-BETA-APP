import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function openFixture(page: Page) {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route('**/src/hooks/useHallMaps.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.route('**/src/hooks/useSectors.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useSectors } from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useAuth } from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.goto('/test/fixtures/admin-hallmap.html');
}

test('map save failure preserves geometry and deletion is confirmed only after success', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFixture(page);
  await page.getByRole('button', { name: /Bug A/ }).click();
  const save = page.getByRole('button', { name: 'Sektorfläche speichern', exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Beschriftung zentrieren' }).click();
  await expect(page.getByText('Ungespeichert', { exact: true })).toBeVisible();
  await page.evaluate(() => { window.hallMapQA.fail = true; window.hallMapQA.delay = 400; });
  await save.click();
  await expect(save).toBeDisabled();
  await expect(save).toBeEnabled();
  await expect(page.getByText('Ungespeichert', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.hallMapQA.writes)).toHaveLength(1);
  await page.evaluate(() => { window.hallMapQA.fail = false; });
  await save.click();
  await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Fläche löschen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Bug A');
  expect(await page.evaluate(() => window.hallMapQA.writes)).toHaveLength(2);
  await page.evaluate(() => { window.hallMapQA.fail = true; });
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wird gelöscht …' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toBeEnabled();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.evaluate(() => { window.hallMapQA.fail = false; });
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('Noch kein Sektor ausgewählt.', { exact: true })).toBeVisible();
});
for (const width of [375, 768, 1280, 1920]) {
  test(`map workspace remains primary and actions remain reachable at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 760 });
    await openFixture(page);
    await expect(page.getByRole('heading', { name: 'Sektorflächen', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Karte verwalten', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await mkdir('test-results/hall-map-function-20260914', { recursive: true });
    await page.screenshot({ path: `test-results/hall-map-function-20260914/map-small-fixture-${width}.png`, animations: 'disabled' });
    if (width < 1024) await page.getByRole('button', { name: 'Sektoren', exact: true }).click();
    await page.getByRole('button', { name: /Bug A/ }).click();
    await expect(page.getByRole('button', { name: 'Sektorfläche speichern', exact: true })).toBeVisible();
    const save = (await page.getByRole('button', { name: 'Sektorfläche speichern', exact: true }).boundingBox())!;
    expect(save.x).toBeGreaterThanOrEqual(0);
    expect(save.x + save.width).toBeLessThanOrEqual(width);
    expect(await page.locator('body').evaluate(body => body.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

test('draft is protected before sector switch and map settings stay separate', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 680 });
  await openFixture(page);
  await page.getByRole('button', { name: 'Sektoren', exact: true }).click();
  await page.getByRole('button', { name: /Bug A/ }).click();
  await page.getByRole('button', { name: 'Punkt hinzufügen', exact: true }).click();
  const map = page.getByTestId('hall-map-editor');
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.52);
  await expect(page.getByText('Ungespeichert', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sektoren', exact: true }).click();
  await page.getByRole('button', { name: /Grotte B/ }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Ungespeicherte Änderungen verwerfen');
  await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('Ungespeichert', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Karte verwalten', exact: true }).click();
  await expect(page.getByLabel('Interne Bezeichnung')).toHaveValue('Haupthalle');
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});
