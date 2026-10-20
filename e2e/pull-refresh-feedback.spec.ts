import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.use({ hasTouch: true, isMobile: true, trace: 'off', video: 'off' });
const output = 'output/refresh-feedback-20261020';
async function swipe(page: Page, dx = 0, dy = 120) {
  const input = await page.context().newCDPSession(page);
  const x = Math.min(220, (await page.viewportSize())!.width / 2), y = 250;
  try {
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx / 3, y: y + dy / 3 }] });
    await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await input.detach(); }
}
async function open(page: Page, suffix = '') {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/test/fixtures/pull-refresh.html' + suffix);
  await expect(page.getByTestId('read-count')).toHaveText('Datenstand 1');
}
for (const width of [375, 768, 1280, 1920]) test(`refresh confirms briefly without hiding updated data (${width})`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await open(page);
  await mkdir(output, { recursive: true });
  await swipe(page);
  await expect(page.getByTestId('read-count')).toHaveText('Datenstand 2');
  const success = page.getByText('Alle Inhalte sind aktuell.', { exact: true });
  await expect(success).toBeVisible();
  await expect.poll(() => success.evaluate(element => element.closest('[data-sonner-toast]')!.getBoundingClientRect().top)).toBeGreaterThanOrEqual(10);
  await page.screenshot({ path: `${output}/loop1-success-${width}.png` });
  await expect(success).not.toBeVisible({ timeout: 1500 });
  await expect(page.getByRole('status', { name: 'Daten werden aktualisiert' })).toHaveCount(0);
  await page.screenshot({ path: `${output}/loop2-cleared-${width}.png` });
  await swipe(page);
  await expect(page.getByTestId('read-count')).toHaveText('Datenstand 3');
});
test('refresh errors stay readable and never claim all contents are current', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page, '?failure=1');
  await swipe(page);
  const warning = page.getByText('Teilweise aktualisiert', { exact: true });
  await expect(warning).toBeVisible();
  await page.waitForTimeout(1600);
  await expect(warning).toBeVisible();
  await expect(page.getByText('Alle Inhalte sind aktuell.', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('read-count')).toHaveText('Datenstand 1');
});
test('horizontal gestures do not refresh', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  await swipe(page, 100, 10);
  await expect(page.getByTestId('read-count')).toHaveText('Datenstand 1');
  await expect(page.getByText('Alle Inhalte sind aktuell.', { exact: true })).toHaveCount(0);
});
