import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import snapshot from '../test/fixtures/hall-hierarchy-snapshot.json' with { type: 'json' };

const output = 'test-results/sector-map-parity-20260914/hierarchy';
async function openFixture(page: Page, surface: 'sectors' | 'hallmap', suffix = '') {
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/*.supabase.co/**', route => route.abort());
  const hooks = `/test/fixtures/admin-${surface}-hooks.ts`;
  for (const module of surface === 'hallmap' ? ['useHallMaps.tsx', 'useSectors.tsx', 'useAuth.tsx'] : ['useSectors.tsx', 'useSectorSchedule.ts', 'useSectorAreas.ts']) {
    await page.route(`**/src/hooks/${module}*`, route => route.fulfill({ contentType: 'application/javascript', body: `export * from '${hooks}';` }));
  }
  if (surface === 'sectors') {
    await page.route('**/src/integrations/supabase/storage.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-storage.ts';" }));
    await page.route('**/src/utils/qrCodeUtils.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-qr.ts';" }));
  }
  await page.goto(`/test/fixtures/admin-${surface}.html?state=${suffix === 'structured' ? 'structured' : 'hierarchy'}${suffix === 'public' ? '&view=public' : ''}`);
}

for (const width of [375, 768, 1280, 1920]) {
  test(`real hierarchy and saved map at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await mkdir(output, { recursive: true });
    await openFixture(page, 'sectors');
    for (const name of ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte']) await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(19);
    await expect(page.getByRole('button', { name: 'Bug A bearbeiten', exact: true })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `${output}/sectors-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.getByLabel('Sektoren suchen').fill('Bug A');
    await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(1);
    await page.getByLabel('Sektoren suchen').fill('Felsenmeer');
    await page.getByRole('button', { name: 'Kurze Platte bearbeiten', exact: true }).click();
    await expect(page.getByLabel('Name *')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('dialog')).toContainText('Kurze Platte');
    await page.screenshot({ path: `${output}/sector-editor-${width}.png`, animations: 'disabled' });
    expect(await page.evaluate(() => window.sectorQA.writes)).toEqual([]);

    await openFixture(page, 'hallmap');
    const image = page.locator('img').last();
    await expect(image).toHaveAttribute('src', /boulderkarte-original.*\.png/);
    await expect(page.getByTestId('hall-map-editor')).toHaveAttribute('viewBox', '0 0 735 466');
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `${output}/hallmap-${width}.png`, animations: 'disabled' });
    if (width < 1024) await page.getByRole('button', { name: 'Sektoren', exact: true }).click();
    for (const name of ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte']) await expect(page.getByRole('heading', { name, exact: true })).toBeAttached();
    await page.getByRole('button', { name: 'Kurze Platte · Felsenmeer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sektorfläche speichern', exact: true })).toBeVisible();
    await expect(page.getByText('Vorschlagsmodus', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

test('structured hierarchy updates existing physical ID, not a replacement row', async ({ page }) => {
  await openFixture(page, 'sectors', 'structured');
  await page.getByRole('button', { name: 'Kurze Platte bearbeiten', exact: true }).click();
  await page.getByRole('combobox', { name: 'Hauptbereich', exact: true }).click();
  await page.getByRole('option', { name: 'Grotte', exact: true }).click();
  await page.getByRole('combobox', { name: 'Teilbereich', exact: true }).click();
  await page.getByRole('option', { name: 'Grotte B', exact: true }).click();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const writes = await page.evaluate(() => window.sectorQA.writes);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ operation: 'update', id: snapshot.sectors.find(s => s.name === 'Felsenmeer')!.id, payload: { name: 'Felsenmeer', area_id: 'fixture-grotte', subarea_code: 'B' } });
});

test('app layouts preserve vector geometry without requiring the obsolete background image', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await openFixture(page, 'hallmap', 'public');
  await expect(page.locator('svg[data-map-appearance="white-walls"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Boulder filtern/ })).toHaveCount(19);
  await page.screenshot({ path: `${output}/app-map-768.png`, animations: 'disabled' });
  await page.goto('/test/fixtures/admin-hallmap.html?state=hierarchy&view=framed');
  await expect(page.locator('img')).toHaveCount(0);
  await page.route('**/src/assets/boulderkarte-original.png*', route => route.request().resourceType() === 'image' ? route.abort() : route.continue());
  await page.reload();
  await expect(page.getByText('Bild konnte nicht geladen werden', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-sector-region-group]')).toHaveCount(19);
  await expect(page.locator('img[src*="hall-map-base"]')).toHaveCount(0);
});

test('new main area appears in both map legends and extended code fits its marker', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await openFixture(page, 'hallmap', 'public');
  await page.goto('/test/fixtures/admin-hallmap.html?state=hierarchy&view=public&extended=1');
  await expect(page.locator('[data-map-area-label="training"]')).toContainText('Training');
  const label = page.locator('svg text').filter({ hasText: /^A12$/ });
  await expect(label).toBeVisible();
  const fits = await label.evaluate((element: SVGGraphicsElement) => {
    const rect = element.parentElement!.querySelector('rect')!;
    return element.getBBox().width < Number(rect.getAttribute('width'));
  });
  expect(fits).toBe(true);
  await page.goto('/test/fixtures/admin-hallmap.html?state=hierarchy&extended=1');
  await expect(page.getByLabel('Farblegende der Hallenbereiche')).toContainText('Training');
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});
