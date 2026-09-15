import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import snapshot from '../test/fixtures/hall-hierarchy-snapshot.json' with { type: 'json' };

const output = 'test-results/hall-map-template-20260914';
const baseline = process.env.KWS_MAP_BASELINE === '1';
const loop = baseline ? 'before' : process.env.KWS_QA_LOOP || 'loop1';

async function openMap(page: Page) {
  await page.route('**/*.supabase.co/**', route => route.abort());
  // Serve the legacy drawing locally only for the before capture. No production writes.
  await page.route(snapshot.map.image_url, route => route.fulfill({ contentType: 'image/svg+xml', path: 'src/assets/hall-map-base.svg' }));
  for (const [name, exports] of [['useHallMaps', '*'], ['useSectors', '{ useSectors }'], ['useAuth', '{ useAuth }']]) {
    await page.route(`**/src/hooks/${name}.tsx*`, route => route.fulfill({ contentType: 'application/javascript', body: `export ${exports} from '/test/fixtures/admin-hallmap-hooks.ts';` }));
  }
  await page.goto('/test/fixtures/admin-hallmap.html?state=hierarchy');
  await expect(page.getByTestId('hall-map-editor')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const width of [375, 768, 1280, 1920]) {
  test(`original template, dialog and unchanged sector geometry at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openMap(page);
    const editor = page.getByTestId('hall-map-editor');
    await expect(editor).toHaveAttribute('viewBox', '0 0 735 466');
    const polygonsBefore = await editor.locator('polygon').evaluateAll(nodes => nodes.map(node => node.getAttribute('points')));
    const expectedPolygons = snapshot.regions.map(region => region.points_json.map(point => `${point.x / 100 * 735},${point.y / 100 * 466}`).join(' '));
    expect(new Set(polygonsBefore)).toEqual(new Set(expectedPolygons));

    await mkdir(output, { recursive: true });
    await page.getByRole('button', { name: 'Karte verwalten', exact: true }).click();
    const preview = page.getByAltText('Vorschau der gespeicherten Zeichenvorlage');
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `${output}/${loop}-dialog-${width}.png`, animations: 'disabled' });
    if (!baseline) await expect(preview).toHaveAttribute('src', /boulderkarte-original.*\.png/);
    const previewSrc = await preview.getAttribute('src');
    await page.getByRole('button', { name: 'Kartenverwaltung schließen', exact: true }).click();
    await page.getByRole('button', { name: 'Zeichenvorlage anzeigen', exact: true }).click();
    const image = page.getByAltText('Gespeicherte Zeichenvorlage');
    await expect(image).toHaveAttribute('src', previewSrc!);
    await page.screenshot({ path: `${output}/${loop}-template-${width}.png`, animations: 'disabled' });

    if (width < 1024) await page.getByRole('button', { name: 'Sektoren', exact: true }).click();
    await page.getByRole('button', { name: 'Bug A · Felsenmeer', exact: true }).click();
    await expect(editor).toHaveAttribute('viewBox', '0 0 735 466');
    await editor.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${loop}-overlay-${width}.png`, animations: 'disabled' });
    expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
    if (!baseline) {
      // Merely resolving/showing the corrected image must not create a geometry draft.
      await expect(page.getByRole('button', { name: 'Sektorfläche speichern', exact: true })).toBeDisabled();
      const polygonsAfter = await editor.locator('polygon').evaluateAll(nodes => nodes.map(node => node.getAttribute('points')));
      expect(new Set(polygonsAfter)).toEqual(new Set(polygonsBefore));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

test('selected replacement file gets its own preview without saving automatically', async ({ page }) => {
  await openMap(page);
  await page.getByRole('button', { name: 'Karte verwalten', exact: true }).click();
  await page.locator('#hall-map-file').setInputFiles({ name: 'eigene-karte.png', mimeType: 'image/png', buffer: await readFile('src/assets/boulderkarte-original.png') });
  await expect(page.getByAltText('Vorschau der gespeicherten Zeichenvorlage')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByRole('status')).toContainText('Neues Bild als Entwurf');
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});
