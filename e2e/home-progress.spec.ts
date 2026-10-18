import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/home-progress-20261018';
test.use({ trace: 'off', video: 'off', timezoneId: 'Europe/Berlin' });

async function open(page: Page, state = '', sessionRows?: Record<string, unknown>[]) {
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  // All data are synthetic. No production read or write requests are allowed.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth', 'useBoulders', 'useSectors', 'useColors', 'useBoulderCommunity', 'useSectorSchedule', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/personal-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useNotifications.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const useUnreadCount=()=>({data:0});export const useNotifications=()=>({data:[],isLoading:false});export const useMarkAsRead=()=>({mutate(){},mutateAsync:async()=>{}});export const useMarkAllAsRead=useMarkAsRead;export const useChangeNotification=useMarkAsRead;' }));
  await page.route('**/src/hooks/usePreloadBoulderThumbnails.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const usePreloadBoulderThumbnails=()=>{};' }));
  await page.route('**/src/lib/profileCompat.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const fetchProfileRecord=async()=>({first_name:"Alex"});' }));
  await page.route('**/src/hooks/useResetPlan.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const useResetPlan=()=>({appointments:[{day:'2026-09-16',when:new Date('2026-09-16T08:00:00Z'),sectors:[{name:'Bug B'}]}],now:new Date('2026-09-15T12:00:00Z'),pending:false,failed:false,fetching:false,retry:async()=>{}});" }));
  if (sessionRows) await page.route('**/src/hooks/useBoulderCommunity.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export * from '/test/fixtures/personal-hooks.ts'; export const useMyTrackingSessions=()=>({data:${JSON.stringify(sessionRows)},isLoading:false,error:null});` }));
  await page.goto(`/test/fixtures/personal-workspace.html?route=/&${state}`);
  await page.addStyleTag({ url: '/fonts.css' });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}

test('large values and attempt-only days remain legible without inventing tops', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const rows = Array.from({ length: 1248 }, (_, index) => ({ id: `large-${index}`, boulder_id: `large-${index}`, session_date: '2026-09-15', result: index < 1000 ? 'flash' : 'top', attempt_count: 1, updated_at: '2026-09-15' }));
  await open(page, '', rows);
  await expect(page.locator('[data-metric="weekly-tops"]')).toHaveText('1.248');
  await expect(page.locator('[data-metric="weekly-flashes"]')).toHaveText('1.000');
  await expect(page.locator('[data-metric="weekly-days"]')).toHaveText('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/large.png`, fullPage: true, animations: 'disabled' });
  await page.unroute('**/src/hooks/useBoulderCommunity.ts*');
  await open(page, '', [{ id: 'attempt', boulder_id: 'attempt', session_date: '2026-09-15', result: 'attempted', attempt_count: 3, updated_at: '2026-09-15' }]);
  await expect(page.locator('[data-metric="weekly-tops"]')).toHaveText('0');
  await expect(page.locator('[data-metric="weekly-days"]')).toHaveText('1');
  await expect(page.getByText('Deine Versuche zählen. Deine nächsten Tops erscheinen hier.', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/attempt-only.png`, fullPage: true, animations: 'disabled' });
});

for (const width of [375, 768, 1280, 1920]) {
  test(`weekly card stays above boulders and opens matching statistics at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const card = page.getByTestId('weekly-progress-card');
    await expect(card).toBeVisible();
    await expect(card.locator('[data-metric="weekly-tops"]')).toHaveText('11');
    await expect(card.locator('[data-metric="weekly-flashes"]')).toHaveText('5');
    await expect(card.locator('[data-metric="weekly-days"]')).toHaveText('7');
    await expect(card.getByText('davon als Flash', { exact: false })).toBeVisible();
    await expect(card.locator('.weekly-progress-day')).toHaveCount(7);
    await expect(card.getByRole('figure')).toHaveAccessibleName(/Jeder Boulder zählt im Zeitraum einmal/);
    const cardBounds = (await card.boundingBox())!;
    const nextBounds = (await page.getByRole('heading', { name: 'Neu an der Wand', exact: true }).boundingBox())!;
    expect(cardBounds.y + cardBounds.height).toBeLessThan(nextBounds.y);
    await expect(card.locator('svg.lucide-kws-flash')).toHaveCount(1);
    await expect(card.locator('svg.lucide-kws-calendar')).toHaveCount(1);
    expect(await card.locator('svg').first().evaluate(icon => getComputedStyle(icon).strokeWidth)).toBe('1.75px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true, animations: 'disabled' });
    const progress = page.getByRole('button', { name: 'Fortschritt', exact: true });
    await progress.focus();
    await expect(progress).toBeFocused();
    await progress.press('Enter');
    await expect(page.getByRole('button', { name: '7 Tage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-metric="tops"]')).toHaveText('11');
    await expect(page.locator('[data-metric="flashes"]')).toHaveText('5');
    await expect(page.locator('[data-metric="days"]')).toHaveText('7');
    await page.screenshot({ path: `${output}/statistics-${width}.png`, fullPage: true, animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}

for (const state of ['empty', 'loading', 'error']) {
  test(`weekly ${state} state remains honest and recoverable`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await open(page, `state=${state}`);
    if (state === 'empty') {
      await expect(page.locator('[data-metric="weekly-tops"]')).toHaveText('0');
      await expect(page.getByText('Deine nächsten Tops erscheinen hier.', { exact: true })).toBeVisible();
      await expect(page.locator('.weekly-progress-zero')).toHaveCount(7);
    } else {
      await expect(page.getByTestId('weekly-progress-card')).toHaveCount(0);
      await expect(page.getByText(state === 'loading' ? 'Dein Fortschritt wird geladen …' : 'Fortschritt gerade nicht verfügbar', { exact: true })).toBeVisible();
    }
    await page.screenshot({ path: `${output}/${state}.png`, fullPage: true, animations: 'disabled' });
    if (state === 'error') {
      await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
      await expect(page.locator('[data-metric="weekly-tops"]')).toHaveText('11');
    }
  });
}

for (const width of [375, 768, 1280, 1920]) {
  for (const catalog of [false, true]) {
    test(`${catalog ? 'initial Home' : 'personal-only'} skeleton resolves without moving weekly content at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await open(page, `state=loading&loadingControls=1${catalog ? '&catalogState=loading' : ''}`);
      const skeleton = page.getByTestId('weekly-progress-skeleton');
      await expect(skeleton).toBeVisible();
      await expect(skeleton).toHaveAttribute('aria-busy', 'true');
      await expect(skeleton.locator('[data-metric]')).toHaveCount(0);
      await expect(page.getByTestId('weekly-progress-card')).toHaveCount(0);
      await expect(page.getByText('Keine Daten geladen', { exact: true })).toHaveCount(0);
      const before = (await skeleton.boundingBox())!;
      const next = page.getByRole('heading', { name: 'Neu an der Wand', exact: true });
      const nextBefore = (await next.boundingBox())!;
      expect(before.y + before.height).toBeLessThan(nextBefore.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${output}/${catalog ? 'initial' : 'personal'}-loading-${width}.png`, fullPage: true, animations: 'disabled' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(skeleton.locator('.weekly-placeholder').first()).toHaveCSS('animation-name', 'none');
      if (catalog) {
        await expect(page.locator('main [aria-busy="true"]').filter({ has: page.locator('.aspect-\\[4\\/5\\]') })).toHaveCount(1);
        await expect(page.locator('main .animate-pulse').first()).toHaveCSS('animation-name', 'none');
      }
      await page.getByRole('button', { name: 'Testdaten freigeben', exact: true }).click();
      const loaded = page.getByTestId('weekly-progress-card');
      await expect(loaded).toBeVisible();
      await expect(skeleton).toHaveCount(0);
      await expect(loaded.locator('[data-metric="weekly-tops"]')).toHaveText('11');
      const after = (await loaded.boundingBox())!;
      expect(after.height).toBeCloseTo(before.height, 0);
      expect(after.y).toBeCloseTo(before.y, 0);
      expect((await next.boundingBox())!.y).toBeCloseTo(nextBefore.y, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${output}/${catalog ? 'initial' : 'personal'}-loaded-${width}.png`, fullPage: true, animations: 'disabled' });
      expect(errors).toEqual([]);
    });
  }
}

test('approved Beta-logo app-start screen remains a separate full-screen status', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/test/fixtures/loading-preview.html?state=app');
  await page.addStyleTag({ url: '/fonts.css' });
  const start = page.getByRole('status', { name: 'App wird geladen …' });
  await expect(start).toBeVisible();
  await expect(start).toHaveAttribute('aria-busy', 'true');
  await expect(start.locator('.beta-loading-logo')).toBeVisible();
  await expect(start.locator('.beta-loading-logo')).toHaveCSS('width', '152px');
  await expect(start.locator('.beta-loading-track')).toHaveCSS('width', '96px');
  await expect(page.getByTestId('weekly-progress-skeleton')).toHaveCount(0);
  const bounds = (await start.boundingBox())!;
  expect(bounds).toMatchObject({ x: 0, y: 0, width: 375, height: 900 });
  await page.screenshot({ path: `${output}/preserved-app-start-375.png`, animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(start.locator('.beta-loading-logo')).toHaveCSS('animation-name', 'none');
  await expect(start.locator('.beta-loading-indicator')).toHaveCSS('animation-name', 'none');
});
