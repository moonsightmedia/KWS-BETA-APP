import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'output/maps-feedback-20261020';
async function open(page: Page, query = '') {
  await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto(`/test/fixtures/maps-feedback.html?${query}`);
  await expect(page.locator('[data-sector-marker-group]').first()).toBeVisible();
  await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', /^(webgl|fallback)$/);
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}
for (const width of [375, 768, 1280, 1920]) {
  test(`numbered schedule, real map and matching dates at ${width}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 }); await open(page);
    const rows = page.locator('[data-reset-sequence-number]');
    await expect(rows).toHaveCount(5);
    await expect(page.locator('[data-sector-annotation]')).toHaveCount(5);
    await expect(page.locator('[data-sector-annotation="1"]')).toContainText('1');
    await expect(rows.nth(0)).toContainText('26. Oktober 2026');
    await expect(rows.nth(1)).toContainText('gleichzeitig mit Nr. 1');
    await expect(rows.nth(2)).toContainText('29. Oktober 2026');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `${output}/loop1-schedule-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.locator('[data-sector-annotation="3"]').focus(); await page.keyboard.press('Enter');
    await expect(rows.nth(2).getByRole('link')).toBeFocused();
    await expect(page.locator('[data-sector-annotation="3"]')).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `${output}/loop2-selected-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Kalender', exact: true }).click();
    await expect(page.locator('[data-schedule-calendar]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Termin hinzufügen/ })).toHaveCount(0);
    await page.locator('button[name="day"]').filter({ hasText: /^26/ }).click();
    await expect(page.getByText('Isolierte Beispieldaten.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aktuelle Boulder in Bug A', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
  test(`new-sector badges retain filter selection without overlap at ${width}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 }); await open(page, 'view=boulders');
    await expect(page.locator('[data-sector-annotation="NEU"]')).toHaveCount(2);
    await expect(page.locator('p').filter({ hasText: 'Neue Boulder vom 20. Oktober' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `${output}/loop1-new-${width}.png`, animations: 'disabled' });
    const first = page.locator('[data-sector-annotation="NEU"]').first();
    const key = await first.getAttribute('data-sector-marker-group');
    await first.focus(); await page.keyboard.press('Space');
    await expect(page.locator(`[data-sector-marker-group="${key}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-sector-annotation="NEU"]')).toHaveCount(2);
    // All collision boxes include their annotation strips; no distinct labels overlap.
    const overlaps = await page.locator('[data-sector-marker]').evaluateAll(nodes => {
      const boxes = nodes.map(node => node.getBoundingClientRect());
      return boxes.flatMap((left, index) => boxes.slice(index + 1).filter(right => Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0.5 && Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5));
    });
    expect(overlaps).toEqual([]);
    await page.screenshot({ path: `${output}/loop2-new-selected-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Sektorauswahl zurücksetzen', exact: true }).click();
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('[data-sector-annotation="NEU"]')).toHaveCount(2);
    expect(errors).toEqual([]);
  });
}
test('no stale setup badge and public read failures are not an empty success', async ({ page }) => {
  await open(page, 'view=boulders&stale');
  await expect(page.locator('[data-sector-annotation="NEU"]')).toHaveCount(0);
  await page.route('**/qa/rest/v1/sector_schedule?**', route => route.fulfill({ status: 500, json: { message: 'Synthetic read failure' } }));
  await page.goto('/test/fixtures/maps-feedback.html');
  await expect(page.getByRole('alert')).toContainText('Schraubplan konnte nicht geladen werden');
  await expect(page.locator('[data-reset-sequence]')).toHaveCount(0);
  await expect(page.getByText('Noch keine Umschraubung geplant', { exact: true })).toHaveCount(0);
});
