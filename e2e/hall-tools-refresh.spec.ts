import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/hall-map-function-20260914';
const phase = process.env.KWS_VISUAL_PHASE === 'before' ? 'before' : 'after';
async function fixture(page: Page, kind: 'map' | 'colors') {
  await page.route('**/*.supabase.co/**', route => route.abort());
  if (kind === 'colors') {
    await page.route('**/src/hooks/useColors.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/color-management-hooks.ts';" }));
  } else {
    for (const [module, exported] of [['useHallMaps', '*'], ['useSectors', '{ useSectors }'], ['useAuth', '{ useAuth }']]) {
      await page.route(`**/src/hooks/${module}.tsx*`, route => route.fulfill({ contentType: 'application/javascript', body: `export ${exported} from '/test/fixtures/admin-hallmap-hooks.ts';` }));
    }
  }
  await page.goto(kind === 'map' ? '/test/fixtures/admin-hallmap.html?state=hierarchy' : '/test/fixtures/color-management.html');
  await expect(kind === 'map' ? page.getByTestId('hall-map-editor') : page.getByRole('list', { name: 'Grifffarben' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

if (phase === 'after') {
  for (const width of [375, 768, 1280, 1920]) {
    test(`settings and color editor stay contained at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await fixture(page, 'map');
      await page.getByRole('button', { name: 'Karte verwalten', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Karte verwalten');
      await expect(page.getByRole('button', { name: 'Karte speichern', exact: true })).toBeDisabled();
      await expect(page.getByLabel('Interne Bezeichnung')).toHaveValue('Boulderhalle Main');
      await page.screenshot({ path: `${output}/settings-${width}.png`, animations: 'disabled' });
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
      if (width < 768) { expect(bounds.x).toBe(0); expect(bounds.width).toBe(width); expect(Math.round(bounds.y + bounds.height)).toBe(800); }
      await page.getByLabel('Interne Bezeichnung').fill('Entwurf');
      await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
      await expect(page.getByRole('alertdialog')).toContainText('Kartenänderungen verwerfen?');
      await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
      await expect(page.getByLabel('Interne Bezeichnung')).toHaveValue('Entwurf');
      await page.getByRole('button', { name: 'Kartenverwaltung schließen' }).click();
      await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Karte verwalten', exact: true })).toBeFocused();
      expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
      await fixture(page, 'colors');
      await page.getByRole('button', { name: 'Pink bearbeiten', exact: true }).click();
      await page.getByRole('button', { name: 'Zweifarbig', exact: true }).click();
      await page.screenshot({ path: `${output}/color-editor-${width}.png`, animations: 'disabled' });
      const saveBox = (await page.getByRole('button', { name: 'Speichern', exact: true }).boundingBox())!;
      expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(800);
      expect(await page.locator('body').evaluate(body => body.scrollWidth)).toBe(width);
    });
  }

  test('map settings keep draft on failure and save once after retry', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await fixture(page, 'map');
    await page.getByRole('button', { name: 'Karte verwalten', exact: true }).click();
    await page.getByLabel('Interne Bezeichnung').fill('Neue Kartenbezeichnung');
    await page.evaluate(() => { window.hallMapQA.fail = true; window.hallMapQA.delay = 450; });
    const save = page.getByRole('button', { name: 'Karte speichern', exact: true });
    await save.click();
    await expect(save).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(page.getByLabel('Interne Bezeichnung')).toHaveValue('Neue Kartenbezeichnung');
    await page.evaluate(() => { window.hallMapQA.fail = false; });
    await save.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Karte verwalten', exact: true }).click();
    await expect(page.getByLabel('Interne Bezeichnung')).toHaveValue('Neue Kartenbezeichnung');
    expect(await page.evaluate(() => window.hallMapQA.writes.map(write => write.kind))).toEqual(['update-map', 'update-map']);
  });

  test('letterboxed map drag uses actual SVG coordinates and keeps physical IDs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await fixture(page, 'map');
    await page.getByRole('button', { name: 'Sektoren', exact: true }).click();
    await page.getByRole('button', { name: 'Bug A · Felsenmeer', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const svg = page.getByTestId('hall-map-editor');
    await svg.scrollIntoViewIfNeeded();
    const target = await svg.evaluate((node: SVGSVGElement) => {
      const handle = node.querySelector('circle')!;
      const x = Number(handle.getAttribute('cx')), y = Number(handle.getAttribute('cy'));
      const w = node.viewBox.baseVal.width, h = node.viewBox.baseVal.height;
      const destination = new DOMPoint(x + w * (x < w / 2 ? 0.01 : -0.01), y + h * (y < h / 2 ? 0.01 : -0.01));
      const screen = destination.matrixTransform(node.getScreenCTM()!);
      return { x: screen.x, y: screen.y, expected: { x: Number((destination.x / node.viewBox.baseVal.width * 100).toFixed(2)), y: Number((destination.y / node.viewBox.baseVal.height * 100).toFixed(2)) } };
    });
    const handle = (await svg.locator('circle').first().boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByText('Ungespeichert', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sektorfläche speichern', exact: true }).click();
    await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
    const writes = await page.evaluate(() => window.hallMapQA.writes);
    expect(writes).toHaveLength(1);
    expect(writes[0].kind).toBe('update-region');
    expect((writes[0].payload as { points_json: unknown[] }).points_json[0]).toEqual(target.expected);
  });
}

for (const width of [375, 768, 1280, 1920]) {
  for (const kind of ['map', 'colors'] as const) {
    test(`${kind} visual workspace ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await fixture(page, kind);
      await mkdir(output, { recursive: true });
      await page.screenshot({ path: `${output}/${phase}-${kind}-${width}.png`, fullPage: true, animations: 'disabled' });
      expect(await page.locator('body').evaluate(body => body.scrollWidth)).toBe(width);
      expect(errors).toEqual([]);
    });
  }
}
