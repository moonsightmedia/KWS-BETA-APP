import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'test-results/oct15-home-layout';
test.use({ trace: 'off', video: 'off' });
for (const width of [320, 375, 430, 768, 1280, 1920]) {
  for (const scale of [1, 1.5]) test(`Home reset fits ${width}px at ${scale}x type`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-14T12:00:00Z'));
    await page.route('**/*', request => new URL(request.request().url()).hostname === '127.0.0.1' ? request.continue() : request.abort());
    let empty = false;
    await page.route('**/qa/rest/v1/**', request => {
      const url = new URL(request.request().url());
      return request.fulfill({ json: url.pathname.endsWith('/sector_schedule') ? (empty ? [] : [
        { id: '1', sector_id: 's1', scheduled_at: '2026-10-15T10:00:00Z', note: null },
        { id: '2', sector_id: 's2', scheduled_at: '2026-10-15T10:00:00Z', note: null },
      ]) : [{ id: 's1', name: 'Bug mit einer sehr langen Sektorbezeichnung', boulder_count: 1 },
        { id: 's2', name: 'KurzePlatteMitExtraLangerUngetrennterBezeichnung', boulder_count: 1 }] });
    });
    await page.goto('/test/fixtures/reset-plan.html?route=/');
    await page.evaluate(() => document.fonts.ready);
    if (scale !== 1) await page.addStyleTag({ content: `html{font-size:${16 * scale}px}` });
    const reset = page.getByTestId('home-next-reset');
    await expect(reset).toContainText('KurzePlatteMitExtraLangerUngetrennterBezeichnung');
    await expect(reset).toContainText('Morgen');
    await reset.scrollIntoViewIfNeeded();
    const overflow = await reset.evaluate(element => {
      const outer = element.getBoundingClientRect();
      return [...element.querySelectorAll('*')].filter(child => {
        const b = child.getBoundingClientRect();
        return b.left < outer.left - 1 || b.right > outer.right + 1 || b.right > innerWidth + 1 || child.scrollWidth > child.clientWidth + 1;
      }).map(child => child.tagName);
    });
    expect(overflow).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: `${output}/home-${width}-${scale}.png`, fullPage: true, animations: 'disabled' });
    await reset.getByRole('link').click();
    await expect(page.getByRole('heading', { name: 'Schraubplan', exact: true })).toBeVisible();
    empty = true;
    await page.getByRole('button', { name: 'Schraubplan aktualisieren' }).click();
    await expect(page.getByText('Noch keine Umschraubung geplant', { exact: true })).toBeVisible();
  });
}
