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
  await expect(page.locator('video')).not.toHaveAttribute('controls');
  await expect(page.getByRole('slider', { name: 'Videoposition' })).toBeVisible();

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

test('paused mobile frame can hide every control without changing its position or size', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  const video = page.locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await video.evaluate(element => ({ time: element.currentTime, rect: element.getBoundingClientRect().toJSON() }));
  await video.click({ position: { x: 8, y: 120 } });
  await expect(page.locator('[data-fullscreen]')).toHaveAttribute('data-controls-visible', 'false');
  await expect(page.getByRole('slider', { name: 'Videoposition' })).toHaveCount(0);
  expect(await video.evaluate(element => ({ time: element.currentTime, rect: element.getBoundingClientRect().toJSON() }))).toEqual(before);
  await expect(video).toHaveJSProperty('paused', true);
  await video.click({ position: { x: 8, y: 120 } });
  await expect(page.getByRole('slider', { name: 'Videoposition' })).toBeVisible();
});

test('quality change preserves paused position, slow motion and loop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  const video = page.locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Videoposition' });
  await slider.focus();
  await slider.press('End');
  await slider.press('ArrowLeft');
  await slider.press('Home');
  await slider.press('ArrowRight');
  const time = await video.evaluate(element => element.currentTime);
  await page.getByRole('button', { name: 'Geschwindigkeit: 1×' }).click();
  await page.getByRole('menuitemradio', { name: /0,5×/ }).click();
  await page.getByRole('button', { name: 'Video wiederholen' }).click();
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /Low/ }).click();
  await expect(video).toHaveAttribute('src', /quality=low/);
  await expect(video).toHaveJSProperty('readyState', 4);
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveJSProperty('playbackRate', .5);
  await expect(video).toHaveJSProperty('loop', true);
  expect(Math.abs(await video.evaluate(element => element.currentTime) - time)).toBeLessThan(.2);
});

test('fallback fullscreen moves the same media out of clipped ancestors without restarting', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  const video = page.locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  await page.evaluate(() => {
    const player = document.querySelector<HTMLElement>('[data-fullscreen]')!;
    Object.defineProperty(player, 'requestFullscreen', { value: undefined });
    Object.defineProperty(player, 'webkitRequestFullscreen', { value: undefined });
    player.closest('section')!.style.transform = 'translateY(1px)';
    (window as unknown as { retainedVideo: HTMLVideoElement }).retainedVideo = document.querySelector('video')!;
  });
  await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Boulder-Videoplayer' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => Math.round(element.getBoundingClientRect().height))).toBe(812);
  expect(await video.evaluate(element => element === (window as unknown as { retainedVideo: HTMLVideoElement }).retainedVideo)).toBe(true);
  await expect(video).toHaveJSProperty('paused', false);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await video.evaluate(element => element === (window as unknown as { retainedVideo: HTMLVideoElement }).retainedVideo)).toBe(true);
  await expect(video).toHaveJSProperty('paused', false);
});

test('wide mouse layouts retain native playback controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  await expect(page.locator('video')).toHaveAttribute('controls', '');
  await expect(page.getByRole('button', { name: /Geschwindigkeit:/ })).toHaveCount(0);
});

test('drag seeking keeps playback intent and cancellation restores the old frame', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  const video = page.locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  const slider = page.getByRole('slider', { name: 'Videoposition' });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width * .2, box.y + 22);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .5, box.y + 22, { steps: 5 });
  await expect(video).toHaveJSProperty('paused', true);
  await page.mouse.up();
  await expect(video).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const oldPosition = await video.evaluate(element => element.currentTime);
  await page.mouse.move(box.x + box.width * .3, box.y + 22);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + 22, { steps: 5 });
  await slider.press('Escape');
  await page.mouse.up();
  await expect(video).toHaveJSProperty('paused', true);
  expect(Math.abs(await video.evaluate(element => element.currentTime) - oldPosition)).toBeLessThan(.2);
});

test('failed high quality falls back to the existing lower source and plays', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { effectiveType: '4g', downlink: 20, saveData: false }, configurable: true }));
  await page.route('**/vertical-player.mp4?quality=hd', route => route.abort());
  await page.goto('/test/fixtures/video-fullscreen.html');
  await expect(page.locator('video')).toHaveAttribute('src', /quality=sd/);
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await expect(page.getByRole('button', { name: 'Videoqualität: SD' })).toBeVisible();
});

test('retry after a failed source restores custom controls and playback preferences', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/test/fixtures/video-fullscreen.html');
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: /Geschwindigkeit:/ }).click();
  await page.getByRole('menuitemradio', { name: /0,5×/ }).click();
  await page.getByRole('button', { name: 'Video wiederholen' }).click();
  await page.route('**/vertical-player.mp4?quality=low', route => route.abort());
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /Low/ }).click();
  await expect(page.getByText('Video konnte nicht geladen werden', { exact: true })).toBeVisible();
  await page.unroute('**/vertical-player.mp4?quality=low');
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await expect(page.locator('video')).toHaveJSProperty('playbackRate', .5);
  await expect(page.locator('video')).toHaveJSProperty('loop', true);
  await expect(page.getByRole('slider', { name: 'Videoposition' })).toBeVisible();
  await page.locator('video').evaluate(video => { video.muted = false; video.volume = 1; });
  await expect(page.locator('video')).toHaveJSProperty('muted', true);
  await expect(page.locator('video')).toHaveJSProperty('volume', 0);
});
