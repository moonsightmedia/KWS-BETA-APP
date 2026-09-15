import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/sector-map-parity-20260914';
async function openFixture(page: Page, state = 'structured', realAreaHook = false) {
  await page.route('**/*.supabase.co/**', route => route.abort());
  for (const name of ['useSectors.tsx', 'useSectorSchedule.ts', ...(realAreaHook ? [] : ['useSectorAreas.ts'])]) {
    await page.route(`**/src/hooks/${name}*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-hooks.ts';" }));
  }
  if (realAreaHook) {
    await page.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export const useAuth = () => ({ session: { access_token: 'fixture-only-not-a-real-token', user: { id: 'fixture-admin' } } });" }));
    await page.route('**/rest/v1/sector_areas*', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const payload = request.postDataJSON();
        const lost = await page.evaluate(payload => {
          window.sectorQA.writes.push({ operation: 'rest-create-area', payload });
          if (!window.sectorQA.areas.some(area => area.id === payload.id)) window.sectorQA.areas = [...window.sectorQA.areas, payload];
          return window.sectorQA.lostAcknowledgements.includes('create-area');
        }, payload);
        if (lost) return route.abort('connectionfailed');
        return route.fulfill({ status: 201, json: [payload] });
      }
      const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
      const rows = await page.evaluate(id => window.sectorQA.areas.filter(area => !id || area.id === id), id);
      await route.fulfill({ json: rows });
    });
  }
  await page.route('**/src/integrations/supabase/storage.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-storage.ts';" }));
  await page.route('**/src/utils/qrCodeUtils.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-qr.ts';" }));
  await page.goto(`/test/fixtures/admin-sectors.html?state=${state}`);
  await expect(page.getByRole('heading', { name: 'Sektoren', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(18);
}

for (const width of [375, 768, 1280, 1920]) {
  test(`capture hierarchy ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'live');
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('img').evaluateAll(images => images.every((image: HTMLImageElement) => image.complete))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: `${output}/${process.env.SECTOR_CAPTURE ?? 'after'}-${width}.png`, animations: 'disabled' });
    if (process.env.SECTOR_CAPTURE !== 'before') {
      await page.getByRole('button', { name: 'Bug A Details öffnen', exact: true }).click();
      await expect(page.getByRole('dialog')).toContainText('Atta-Höhle');
      await expect(page.getByRole('dialog')).toContainText('Felsenmeer');
      await expect.poll(() => page.getByRole('dialog').locator('img').evaluateAll(images => images.every((image: HTMLImageElement) => image.complete))).toBe(true);
      await page.screenshot({ path: `${output}/details-${width}.png`, animations: 'disabled' });
      await page.getByRole('button', { name: 'Schließen', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Bug A Details öffnen', exact: true })).toBeFocused();
      await openFixture(page);
      await page.getByRole('button', { name: 'Teilbereich in Bug anlegen', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Hauptbereich', exact: true })).toContainText('Bug');
      await page.getByLabel('Kürzel des Teilbereichs').fill('E');
      await page.getByLabel('Name *').fill('Bug Erweiterung');
      await page.screenshot({ path: `${output}/editor-${width}.png`, animations: 'disabled' });
      if (width === 375) {
        const box = await page.getByRole('dialog').boundingBox();
        expect(box!.x).toBeCloseTo(0, 0); expect(box!.width).toBe(375); expect(box!.y + box!.height).toBeCloseTo(900, 0);
        expect(await page.getByRole('dialog').evaluate(element => getComputedStyle(element).borderBottomLeftRadius)).toBe('0px');
      }
      expect(await page.evaluate(() => window.sectorQA.writes)).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test('group collapse, keyboard, search reveal and context-prefilled create preserve records', async ({ page }) => {
  await openFixture(page);
  await expect(page.getByRole('button', { name: 'Bug A Details öffnen', exact: true })).toHaveCount(1);
  const bug = page.getByRole('region', { name: 'Bug', exact: true });
  const toggle = bug.getByRole('button', { name: 'Bug 4', exact: true });
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(bug.getByRole('button', { name: 'Bug A Details öffnen', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Alle einklappen' }).click();
  await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(0);
  await page.getByLabel('Sektoren suchen').fill('Felsenmeer');
  await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(1);
  await page.getByLabel('Sektoren suchen').fill('');
  await page.getByRole('button', { name: 'Alle ausklappen' }).click();
  await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(18);
  await page.getByRole('button', { name: 'Bug A Details öffnen', exact: true }).click();
  await page.getByRole('button', { name: 'Fläche ergänzen', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Teilbereich', exact: true })).toContainText('Bug A');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Teilbereich in Bug anlegen', exact: true }).click();
  await page.getByLabel('Kürzel des Teilbereichs').fill('E');
  await page.getByLabel('Name *').fill('Erweiterung rechts');
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bug E Details öffnen', exact: true })).toBeVisible();
  const qa = await page.evaluate(() => window.sectorQA);
  expect(qa.sectors).toHaveLength(20);
  expect(qa.writes).toEqual([{ operation: 'create', payload: { area_id: 'fixture-bug', subarea_code: 'E', name: 'Erweiterung rechts', description: null, image_url: null } }]);
});

test('create main area inside sector editor retains draft and makes empty area selectable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openFixture(page, 'structured', true);
  await page.getByRole('button', { name: 'Neuer Sektor', exact: true }).click();
  await page.getByLabel('Name *').fill('Trainingswand rechts');
  await page.getByRole('button', { name: 'Neu anlegen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByLabel('Name des Hauptbereichs').fill('Training');
  await page.getByRole('button', { name: 'Bereich anlegen', exact: true }).click();
  await expect(page.getByLabel('Name *')).toHaveValue('Trainingswand rechts');
  await expect(page.getByRole('combobox', { name: 'Hauptbereich', exact: true })).toContainText('Training');
  await page.getByLabel('Kürzel des Teilbereichs').fill('B2');
  await expect(page.getByRole('button', { name: 'Anlegen', exact: true })).toBeInViewport();
  await page.screenshot({ path: `${output}/editor-short-mobile.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Training B2 Details öffnen', exact: true })).toBeVisible();
  const qa = await page.evaluate(() => window.sectorQA);
  expect(qa.areas).toHaveLength(6); expect(qa.sectors).toHaveLength(20);
  expect(qa.writes.map(write => write.operation)).toEqual(['rest-create-area', 'create']);
  expect(qa.sectors.at(-1)!.area_id).toBe(qa.areas.at(-1)!.id);
});

test('lost main-area POST response retries same ID without duplicate, then shows empty area', async ({ page }) => {
  await openFixture(page, 'structured', true);
  await page.getByRole('button', { name: 'Hauptbereich', exact: true }).click();
  await page.getByLabel('Name des Hauptbereichs').fill('Galerie');
  await page.evaluate(() => { window.sectorQA.lostAcknowledgements = ['create-area']; });
  await page.getByRole('button', { name: 'Bereich anlegen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Die Antwort ist unklar');
  await expect(page.getByLabel('Name des Hauptbereichs')).toBeDisabled();
  await page.evaluate(() => { window.sectorQA.lostAcknowledgements = []; });
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Galerie', exact: true })).toContainText('Noch keine Teilbereiche');
  const qa = await page.evaluate(() => window.sectorQA);
  expect(qa.areas).toHaveLength(6);
  const writes = qa.writes as { payload: { id: string } }[];
  expect(writes).toHaveLength(2); expect(writes[0].payload.id).toBe(writes[1].payload.id);
});

test('invalid code and duplicate main area prevent writes; dirty area cancel keeps sector draft', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Teilbereich in Bug anlegen', exact: true }).click();
  await page.getByLabel('Name *').fill('Entwurf');
  await page.getByLabel('Kürzel des Teilbereichs').fill('1A');
  await expect(page.getByRole('button', { name: 'Anlegen', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Neu anlegen', exact: true }).click();
  await page.getByLabel('Name des Hauptbereichs').fill('BUG');
  await page.getByRole('button', { name: 'Bereich anlegen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('gibt es bereits');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(page.getByLabel('Name *')).toHaveValue('Entwurf');
  expect(await page.evaluate(() => window.sectorQA.writes)).toEqual([]);
});

test('main area backend conflict and catalog failure show recoverable errors, no false success', async ({ page }) => {
  await openFixture(page, 'structured', true);
  await page.route('**/rest/v1/sector_areas?on_conflict=id', route => route.fulfill({ status: 409, json: { message: 'fixture conflict' } }));
  await page.getByRole('button', { name: 'Hauptbereich', exact: true }).click();
  await page.getByLabel('Name des Hauptbereichs').fill('Galerie');
  await page.getByRole('button', { name: 'Bereich anlegen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('existiert bereits');
  await expect(page.getByLabel('Name des Hauptbereichs')).toBeEnabled();
  expect(await page.evaluate(() => window.sectorQA.areas)).toHaveLength(5);
  await page.route('**/rest/v1/sector_areas*', route => route.fulfill({ status: 503, json: { message: 'fixture outage' } }));
  await page.reload();
  await expect(page.getByText('Bereichsverwaltung nicht verfügbar.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hauptbereich', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: /bearbeiten$/ })).toHaveCount(18);
});

test('comparison loads all screenshot pairs without missing assets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/${output}/comparison.html`);
  for (const width of [375, 768, 1280, 1920]) {
    await page.getByRole('button', { name: `${width} px`, exact: true }).click();
    for (const id of ['before', 'after']) await expect.poll(() => page.locator(`#${id}`).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(width);
  }
  await page.getByRole('button', { name: '375 px', exact: true }).click();
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: `${output}/comparison-preview.png`, fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('live-name snapshot groups search, details and QR into one Bug A without writes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openFixture(page, 'live');
  await expect(page.getByRole('button', { name: 'Bug A Details öffnen', exact: true })).toContainText('12 Boulder');
  await expect(page.getByRole('heading', { name: 'Felsenmeer', exact: true })).toHaveCount(0);
  await page.getByLabel('Sektoren suchen').fill('Felsenmeer');
  await expect(page.getByRole('button', { name: /Details öffnen$/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Bug A bearbeiten', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('12 aktive Boulder');
  await expect(page.getByRole('heading', { name: 'Atta-Höhle', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Felsenmeer', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Schließen', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'QR-Code', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('/guest?sector=Bug%20A');
  await page.getByRole('button', { name: 'QR-Code herunterladen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.sectorQA.writes)).toEqual([expect.objectContaining({ operation: 'qr-download', sectorName: 'Bug A' })]);
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bug A bearbeiten', exact: true })).toBeFocused();
});

test('physical edit and delete cancellation return focus to the surviving logical card', async ({ page }) => {
  await openFixture(page);
  const trigger = page.getByRole('button', { name: 'Bug A bearbeiten', exact: true });
  await trigger.click();
  await page.getByRole('button', { name: 'Bug A · Felsenmeer bearbeiten', exact: true }).click();
  await expect(page.getByLabel('Name *')).toHaveValue('Felsenmeer');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'Bug A · Felsenmeer löschen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Felsenmeer');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.sectorQA.writes)).toEqual([]);
  expect(await page.evaluate(() => window.sectorQA.sectors)).toHaveLength(19);
});
