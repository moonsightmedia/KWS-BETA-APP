import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const phase = process.env.KWS_MAP_PHASE || 'after';
const output = 'test-results/hall-map-selection-20261006';
test.use({ trace: 'off', video: 'off' });

async function open(page: Page, extra = '') {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useAuth } from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.route('**/src/hooks/useHallMaps.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: extra.includes('boundaries')
    ? `export const useActiveHallMap=()=>({data:{id:'boundary-map',name:'Prüfkarte',width:735,height:466}});export const useSectorMapRegions=()=>({data:['a','b'].map((sector_id,i)=>({id:sector_id,sector_id,label_x:30+i*40,label_y:50,points_json:[{x:10+i*40,y:20},{x:50+i*40,y:20},{x:50+i*40,y:80},{x:10+i*40,y:80}]}))});`
    : "export * from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.goto(`/test/fixtures/hall-map-selection.html?state=hierarchy&${extra}`);
  await expect(page.locator('[data-sector-marker-group]').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}

async function point(page: Page, x: number, y: number) {
  return page.locator('svg:has([data-sector-marker-group])').evaluate((svg: SVGSVGElement, pos) => {
    const box = svg.viewBox.baseVal;
    const p = new DOMPoint(pos.x * box.width / 100, pos.y * box.height / 100).matrixTransform(svg.getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, { x, y });
}

test('adjacent regions cannot steal taps through an invisible expanded hit area', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, 'boundaries&static');
  const insideA = await point(page, 48, 65);
  await page.mouse.click(insideA.x, insideA.y);
  await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
  const outside = await point(page, 94, 65);
  await page.mouse.click(outside.x, outside.y);
  await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
});

for (const width of [375, 768, 1280, 1920]) {
  test(`loop1 map hierarchy and clear selection at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await page.screenshot({ path: `${output}/${phase}-overview-${width}.png`, animations: 'disabled' });
    await page.locator('[data-sector-marker-group="bug:A"]').click();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${phase}-selected-${width}.png`, animations: 'disabled' });
    if (phase === 'before') return;
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByRole('status')).toContainText('Bug A');
    await expect(page.getByRole('button', { name: 'Bug A abwählen', exact: true })).toBeVisible();
    // Bug A intentionally contains two physical regions, but no neighbouring group.
    await expect(page.locator('[data-sector-region-group="bug:A"][data-selected="true"]')).toHaveCount(2);
    await expect(page.locator('[data-sector-region-group][data-selected="true"]')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });

  test(`loop2 hover, focus, multi-select, reset and reduced motion at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const a = page.locator('[data-sector-marker-group="bug:A"]');
    const b = page.locator('[data-sector-marker-group="bug:B"]');
    await a.click();
    const fill = await page.locator('[data-sector-region-group="bug:B"]').getAttribute('fill');
    await b.hover();
    expect(await page.locator('[data-sector-region-group="bug:B"]').getAttribute('fill')).toBe(fill);
    await expect(b).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Tab');
    await b.focus();
    await page.screenshot({ path: `${output}/loop2-focus-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Space');
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `${output}/loop2-multi-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Bug A abwählen', exact: true }).click();
    await expect(a).toHaveAttribute('aria-pressed', 'false');
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await a.click();
    await b.focus();
    await page.keyboard.press('Enter');
    await expect(b).toHaveAttribute('aria-pressed', 'false');
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Sektorauswahl zurücksetzen', exact: true }).click();
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Ganze Halle');
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
  });
}

test.describe('touch', () => {
  test.use({ hasTouch: true });
  test('touch near a shared edge selects the visible surface, not its neighbour', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 1000 });
    await open(page, 'boundaries&static');
    const insideA = await point(page, 48, 65);
    await page.touchscreen.tap(insideA.x, insideA.y);
    await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
    const outside = await point(page, 94, 65);
    await page.touchscreen.tap(outside.x, outside.y);
    await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
  });
  test('all logical groups toggle independently by touch without sticky hover', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 1000 });
    await open(page, 'mode=ids');
    const markers = page.locator('[data-sector-marker-group]');
    await expect(markers).toHaveCount(18);
    for (const marker of await markers.all()) {
      await marker.tap();
      await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
      await expect(marker).toHaveAttribute('aria-pressed', 'true');
      await marker.tap();
      await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
    }
  });
});

test('ID and name channels describe one logical selection, not two', async ({ page }) => {
  await open(page, 'mode=both&framed');
  await page.locator('[data-sector-marker-group="bug:A"]').click();
  await expect(page.getByRole('status')).toContainText('1 Teilbereich');
  await expect(page.getByRole('button', { name: 'Bug A abwählen', exact: true })).toHaveCount(1);
});

test('an empty ID array overrides the old single ID and conflicting names', async ({ page }) => {
  await open(page, 'mode=ids&staleSingle&staleNames');
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Ganze Halle');
});

test('the ID channel cannot colour a different sector from a stale name channel', async ({ page }) => {
  await open(page, 'mode=ids&initialB&staleNames');
  await expect(page.locator('[data-sector-marker-group="bug:B"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sector-marker-group="bug:A"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
});

for (const width of [375, 1280]) {
  test(`actual Boulder page shares map and filter selection at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
      await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/filter-user-hooks.ts';" }));
    }
    await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
    await page.goto('/test/fixtures/filter-boulders.html');
    await page.getByRole('button', { name: 'Karte', exact: true }).click();
    await page.locator('[data-sector-marker-group="bug:A"]').click();
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByText('4 Boulder in Bug A', { exact: true })).toBeVisible();
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${output}/page-selected-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Sektor Bug A', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Sektor Bug A', exact: true }).click();
    await dialog.getByRole('button', { name: '8 Boulder anzeigen', exact: true }).click();
    await page.getByRole('button', { name: 'Karte', exact: true }).click();
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  });
}
