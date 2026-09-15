import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/video-fullscreen-20260915';

test.use({ trace: 'off', video: 'off' });

test('mobile fullscreen keeps video, controls and quality selection inside safe bounds', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('video')).toHaveJSProperty('readyState', 4);

  const player = page.locator('[data-fullscreen]');
  await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
  await expect(player).toHaveAttribute('data-fullscreen', 'true');
  await expect(player).toHaveCSS('background-color', 'rgb(247, 249, 247)');
  await expect(page.locator('video')).toHaveAttribute('controls', '');

  const topControls = page.getByRole('button', { name: /Videoqualität/ });
  const topBox = await topControls.boundingBox();
  expect(topBox).not.toBeNull();
  expect(topBox!.y).toBeGreaterThanOrEqual(28);

  await topControls.click();
  const menu = player.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: /SD/ })).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.y).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(390);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(844);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/fullscreen-quality-open.png`, animations: 'disabled' });
  await menu.getByRole('menuitemradio', { name: /SD/ }).click();
  await expect(topControls).toContainText('SD');

  const videoBox = await page.locator('video').boundingBox();
  expect(videoBox).not.toBeNull();
  expect(videoBox!.y).toBeGreaterThanOrEqual(20);
  expect(videoBox!.y + videoBox!.height).toBeLessThanOrEqual(844 - 16);

  await page.screenshot({ path: `${output}/fullscreen-quality-and-controls.png`, animations: 'disabled' });

  await page.getByRole('button', { name: 'Vollbild beenden' }).click();
  await expect(player).toHaveAttribute('data-fullscreen', 'false');
  expect(errors).toEqual([]);
});

test('compact mobile layout does not clip the player actions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
  const player = page.locator('[data-fullscreen="true"]');
  await expect(player).toBeVisible();
  await expect(player.getByText('Offizielle Beta')).toBeVisible();
  await expect(page.getByRole('button', { name: /Videoqualität/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vollbild beenden' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
