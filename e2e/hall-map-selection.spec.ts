import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const phase = process.env.KWS_MAP_PHASE || 'after';
const output = process.env.KWS_MAP_OUTPUT || 'test-results/hall-map-selection-20261006';
test.use({ trace: 'off', video: 'off' });

async function open(page: Page, extra = '', renderer: 'webgl' | 'fallback' = 'webgl') {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useAuth } from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.route('**/src/hooks/useHallMaps.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: extra.includes('boundaries')
    ? `export const useActiveHallMap=()=>({data:{id:'boundary-map',name:'Prüfkarte',width:735,height:466}});export const useSectorMapRegions=()=>({data:['a','b'].map((sector_id,i)=>({id:sector_id,sector_id,label_x:30+i*40,label_y:50,points_json:[{x:10+i*40,y:20},{x:50+i*40,y:20},{x:50+i*40,y:80},{x:10+i*40,y:80}]}))});`
    : "export * from '/test/fixtures/admin-hallmap-hooks.ts';" }));
  await page.goto(`/test/fixtures/hall-map-selection.html?state=hierarchy&${extra}`);
  await expect(page.locator('[data-sector-marker-group]').first()).toBeVisible();
  if (!extra.includes('framed')) {
    await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', renderer, { timeout: 20000 });
    if (renderer === 'webgl') await expect(page.locator('[data-map-renderer] canvas')).toBeVisible();
  }
  if (phase !== 'before') {
    const portrait = page.viewportSize()!.width < 768 && !extra.includes('fixed');
    await expect(page.locator('svg[data-map-orientation]')).toHaveAttribute('data-map-orientation', portrait ? 'portrait' : 'landscape');
  }
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}

async function point(page: Page, x: number, y: number) {
  return page.locator('svg:has([data-sector-marker-group])').evaluate((svg: SVGSVGElement, pos) => {
    const box = svg.viewBox.baseVal;
    const rotated = svg.dataset.mapOrientation === 'portrait';
    const x = rotated ? 100 - pos.y : pos.x;
    const y = rotated ? pos.x : pos.y;
    const p = new DOMPoint(x * Number(svg.dataset.mapWidth) / 100, y * Number(svg.dataset.mapHeight) / 100).matrixTransform(svg.getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, { x, y });
}

test('adjacent regions cannot steal taps through an invisible expanded hit area', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, 'boundaries&static');
  const canvas = await page.locator('[data-map-renderer] canvas').elementHandle();
  const insideA = await point(page, 48, 65);
  await page.mouse.click(insideA.x, insideA.y);
  await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
  // The boundary hook deliberately returns fresh arrays on every render.
  // Identical points must not repeatedly recreate the GPU scene.
  expect(await canvas!.evaluate(node => node.isConnected)).toBe(true);
  await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', 'webgl');
  const outside = await point(page, 94, 65);
  await page.mouse.click(outside.x, outside.y);
  await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
});

for (const width of [375, 768, 1280, 1920]) {
  test(`sector explanations appear only for selected areas at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await expect(page.locator('[data-map-area-label]')).toHaveCount(0);
    await expect(page.getByLabel('Hallenbereiche', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('[data-sector-marker-group="kurze-platte:A"] text')).toHaveText('A');
    await page.screenshot({ path: `${output}/loop1-unselected-${width}.png`, animations: 'disabled' });
    await page.locator('[data-sector-marker-group="bug:A"]').click();
    await expect(page.locator('[data-map-area-label]')).toHaveCount(1);
    await expect(page.locator('[data-map-area-label="bug"]')).toHaveText('Bug');
    await expect(page.getByRole('status')).toContainText('Bug A');
    await page.locator('[data-sector-marker-group="grotte:D"]').click();
    await expect(page.locator('[data-map-area-label]')).toHaveCount(2);
    await page.screenshot({ path: `${output}/loop2-selected-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Bug A abwählen', exact: true }).click();
    await expect(page.locator('[data-map-area-label="bug"]')).toHaveCount(0);
    await expect(page.locator('[data-map-area-label="grotte"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Sektorauswahl zurücksetzen', exact: true }).click();
    await expect(page.locator('[data-map-area-label]')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.locator('[data-sector-marker-group]')).toHaveCount(19);
  });

  test(`fine sector boundaries retain shape and selection at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    const regions = page.locator('[data-sector-region-group]');
    const originalPoints = await regions.evaluateAll(nodes => nodes.map(node => node.getAttribute('points')));
    await page.locator('[data-sector-marker-group="lange-platte:D"]').click();
    await page.locator('[data-sector-marker-group="grotte:D"]').click();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${phase}-boundaries-${width}.png`, animations: 'disabled' });
    if (phase === 'before') return;
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(2);
    expect(await regions.evaluateAll(nodes => nodes.map(node => node.getAttribute('points')))).toEqual(originalPoints);
    for (const region of await regions.all()) {
      await expect(region).toHaveAttribute('stroke-width', '0.65');
      await expect(region).toHaveAttribute('stroke-linejoin', 'round');
      await expect(region).toHaveAttribute('vector-effect', 'non-scaling-stroke');
      expect(await region.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('fill');
    }
    const outlines = page.locator('[data-sector-region-outline]');
    await expect(outlines).toHaveCount(2);
    for (const outline of await outlines.all()) {
      await expect(outline).toHaveAttribute('stroke-width', '1.5');
      await expect(outline).toHaveAttribute('stroke-linejoin', 'round');
      await expect(outline).toHaveAttribute('pointer-events', 'none');
    }
    await expect(page.locator('[data-sector-region-group="bug:B"]')).toHaveAttribute('fill-opacity', '1');
    await expect(page.locator('svg[data-map-appearance]')).toHaveAttribute('data-map-appearance', 'white-walls');
    await expect(outlines.first()).toHaveAttribute('stroke', '#36B531');
    // The colour surfaces render first; neighbouring white separators cannot
    // partially hide a selected edge. Tags stay above both layers.
    expect(await outlines.first().evaluate(outline => {
      const surface = document.querySelector('[data-sector-region-group="bug:B"]')!;
      const marker = document.querySelector('[data-sector-marker-group]')!;
      return Boolean(surface.compareDocumentPosition(outline) & Node.DOCUMENT_POSITION_FOLLOWING)
        && Boolean(outline.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
  });

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
    // The upper Bug A wedge and left Kurze Platte strip are independent.
    await expect(page.locator('[data-sector-region-group="bug:A"][data-selected="true"]')).toHaveCount(1);
    await expect(page.locator('[data-sector-region-group][data-selected="true"]')).toHaveCount(1);
    await expect(page.locator('[data-sector-region-group="kurze-platte:A"]')).toHaveAttribute('data-selected', 'false');
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
    await page.screenshot({ path: `${output}/${phase}-loop2-focus-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Space');
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `${output}/${phase}-loop2-multi-${width}.png`, animations: 'disabled' });
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
    await expect(page.getByRole('status')).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
  });
}

test('missing WebGL keeps the vector map and all selection controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (id: string, ...args: unknown[]) {
      if (id === 'webgl' || id === 'webgl2') return null;
      return getContext.apply(this, [id, ...args]);
    } as typeof getContext;
  });
  await open(page, '', 'fallback');
  await page.locator('[data-sector-marker-group="kurze-platte:A"]').click();
  await expect(page.locator('[data-sector-marker-group="kurze-platte:A"] text')).toHaveText('A');
  await expect(page.getByRole('button', { name: 'Kurze Platte abwählen', exact: true })).toBeVisible();
  expect(await page.locator('[data-sector-region-group="kurze-platte:A"]').evaluate(node => getComputedStyle(node).fillOpacity)).toBe('1');
  await page.screenshot({ path: `${output}/${phase}-webgl-fallback-375.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Sektorauswahl zurücksetzen', exact: true }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});

test('context loss falls back without losing selection and restores 3D', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 375, height: 1000 });
  await open(page);
  await page.locator('[data-sector-marker-group="bug:A"]').click();
  const canvas = page.locator('[data-map-renderer] canvas');
  expect(await canvas.evaluate((node: HTMLCanvasElement) => {
    const context = node.getContext('webgl2');
    const extension = context?.getExtension('WEBGL_lose_context');
    (window as Window & { restoreHallMapContext?: () => void }).restoreHallMapContext = () => extension?.restoreContext();
    extension?.loseContext();
    return Boolean(extension);
  })).toBe(true);
  await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', 'fallback');
  await page.locator('[data-sector-marker-group="kurze-platte:A"]').click();
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(2);
  await page.evaluate(() => (window as Window & { restoreHallMapContext?: () => void }).restoreHallMapContext!());
  await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', 'webgl');
  await expect(page.locator('[data-map-renderer] canvas')).toHaveCount(1);
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(2);
  expect(errors).toEqual([]);
});

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
    await expect(markers).toHaveCount(19);
    for (const marker of await markers.all()) {
      await marker.tap();
      await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
      await expect(marker).toHaveAttribute('aria-pressed', 'true');
      await marker.tap();
      await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
    }
  });
});

test('zoom keeps boundaries fine without changing selected shapes or hit areas', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await open(page);
  await page.locator('[data-sector-marker-group="lange-platte:D"]').click();
  const region = page.locator('[data-sector-region-group="lange-platte:D"]');
  const points = await region.getAttribute('points');
  const centre = await point(page, 50, 38);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => Number(await region.getAttribute('stroke-width'))).toBeCloseTo(0.65 / 1.35, 5);
  const outline = page.locator('[data-sector-region-outline="lange-platte:D"]');
  expect(Number(await outline.getAttribute('stroke-width'))).toBeCloseTo(1.5 / 1.35, 5);
  await expect(region).toHaveAttribute('points', points!);
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
  await page.screenshot({ path: `${output}/${phase}-zoom-768.png`, animations: 'disabled' });
  await page.mouse.wheel(0, 200);
  await expect.poll(async () => Number(await region.getAttribute('stroke-width'))).toBeCloseTo(0.65, 5);
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});

test('ID and name channels describe one logical selection, not two', async ({ page }) => {
  await open(page, 'mode=both&framed');
  await page.locator('[data-sector-marker-group="bug:A"]').click();
  await expect(page.getByRole('status')).toContainText('1 Teilbereich');
  await expect(page.getByRole('button', { name: 'Bug A abwählen', exact: true })).toHaveCount(1);
});

test('mobile portrait keeps labels upright and selection across responsive changes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await open(page);
  const svg = page.locator('svg[data-map-orientation]');
  const region = page.locator('[data-sector-region-group="bug:B"]');
  const portraitPoints = await region.getAttribute('points');
  const portraitSize = await svg.evaluate((node: SVGSVGElement) => ({ width: node.viewBox.baseVal.width, height: node.viewBox.baseVal.height }));
  expect(portraitSize.height).toBeGreaterThan(portraitSize.width);
  for (const label of await page.locator('[data-sector-marker-group] text').all()) {
    const matrix = await label.evaluate((node: SVGGraphicsElement) => {
      const { a, b, c, d } = node.getScreenCTM()!;
      return { a, b, c, d };
    });
    expect(matrix.b).toBeCloseTo(0); expect(matrix.c).toBeCloseTo(0);
    expect(matrix.a).toBeGreaterThan(0); expect(matrix.d).toBeGreaterThan(0);
  }
  await page.locator('[data-sector-marker-group="bug:A"]').click();
  for (const width of [768, 1280, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(svg).toHaveAttribute('data-map-orientation', width < 768 ? 'portrait' : 'landscape');
    await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
    await expect(page.locator('[data-sector-region-group="bug:A"][data-selected="true"]')).toHaveCount(1);
    if (width < 768) await expect(region).toHaveAttribute('points', portraitPoints!);
    else {
      const size = await svg.evaluate((node: SVGSVGElement) => ({ width: node.viewBox.baseVal.width, height: node.viewBox.baseVal.height }));
      expect(size).toEqual({ width: portraitSize.height, height: portraitSize.width });
      expect(await region.getAttribute('points')).not.toBe(portraitPoints);
    }
  }
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});

test('vector walls need no background image and fixed previews stay landscape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await open(page, 'framed&static');
  const svg = page.locator('svg[data-map-orientation]');
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.locator('[data-sector-region-group]')).toHaveCount(19);
  await page.route('**/boulderkarte-original.png*', route => route.abort());
  await page.screenshot({ path: `${output}/${phase}-framed-375.png`, animations: 'disabled' });
  await page.setViewportSize({ width: 768, height: 1000 });
  await expect(svg).toHaveAttribute('data-map-orientation', 'landscape');
  await page.setViewportSize({ width: 375, height: 1000 });
  await open(page, 'fixed&static');
  await expect(svg).toHaveAttribute('data-map-orientation', 'landscape');
  const size = await svg.evaluate((node: SVGSVGElement) => ({ width: node.viewBox.baseVal.width, height: node.viewBox.baseVal.height }));
  expect(size.width).toBeGreaterThan(size.height);
});

test('portrait mobile zoom retains transformed selection and fine contours', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 1000 });
  await open(page);
  await page.locator('[data-sector-marker-group="bug:A"]').click();
  const region = page.locator('[data-sector-region-group="bug:B"]');
  const points = await region.getAttribute('points');
  const centre = await point(page, 50, 50);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => Number(await region.getAttribute('stroke-width'))).toBeCloseTo(0.65 / 1.35, 5);
  await expect(region).toHaveAttribute('points', points!);
  await expect(page.getByTestId('selection')).toHaveText('["Bug A"]');
  expect(await page.evaluate(() => window.hallMapQA.writes)).toEqual([]);
});

test('an empty ID array overrides the old single ID and conflicting names', async ({ page }) => {
  await open(page, 'mode=ids&staleSingle&staleNames');
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('the ID channel cannot colour a different sector from a stale name channel', async ({ page }) => {
  await open(page, 'mode=ids&initialB&staleNames');
  await expect(page.locator('[data-sector-marker-group="bug:B"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sector-marker-group="bug:A"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
});

for (const width of [375, 768, 1280, 1920]) {
  test(`actual Boulder page shares map and filter selection at ${width}`, async ({ page }) => {
    const engineRequests: string[] = [];
    const errors: string[] = [];
    page.on('request', request => { if (/\/three(?:\.|\/)/.test(request.url())) engineRequests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 810 });
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
      await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/filter-user-hooks.ts';" }));
    }
    await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
    await page.goto('/test/fixtures/filter-boulders.html');
    await expect(page.getByRole('button', { name: 'Karte', exact: true })).toBeVisible();
    expect(engineRequests).toEqual([]);
    await page.getByRole('button', { name: 'Karte', exact: true }).click();
    await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', 'webgl', { timeout: 20000 });
    await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-mesh-count', '19');
    await expect(page.getByRole('group', { name: 'Boulderansicht', exact: true })).toHaveCount(0);
    const panel = page.getByRole('region', { name: 'Hallenkarten-Auswahl' });
    const allResults = panel.getByRole('button', { name: 'Alle Boulder anzeigen', exact: true });
    await expect(allResults).toBeInViewport();
    const initialBox = await allResults.boundingBox();
    expect(initialBox!.y + initialBox!.height).toBeLessThanOrEqual(810 - (width < 768 ? 88 : 0));
    await page.screenshot({ path: `${output}/loop1-panel-${width}.png`, animations: 'disabled' });
    expect(engineRequests.length).toBeGreaterThan(0);
    const firstCanvas = await page.locator('[data-map-renderer] canvas').elementHandle();
    await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
    await expect(panel.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true })).toBeFocused();
    await expect(panel).toBeVisible();
    await page.locator('[data-sector-marker-group="bug:A"]').click();
    expect(await firstCanvas!.evaluate(node => node.isConnected)).toBe(true);
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByText('4 Boulder in Bug A', { exact: true })).toBeVisible();
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(panel.getByRole('button', { name: 'Boulder anzeigen', exact: true })).toBeInViewport();
    await page.screenshot({ path: `${output}/${phase}-page-selected-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Boulder anzeigen', exact: true }).click();
    await expect(page.locator('[data-map-appearance]')).toHaveCount(0);
    expect(await firstCanvas!.evaluate(node => node.isConnected)).toBe(false);
    await expect.poll(() => firstCanvas!.evaluate((node: HTMLCanvasElement) => node.getContext('webgl2')?.isContextLost())).toBe(true);
    await expect(page.getByText('4 Boulder in Bug A', { exact: true })).toBeVisible();
    await expect(page.getByText('4 Boulder in Bug A', { exact: true })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole('button', { name: 'Karte', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Karte', exact: true }).click();
    await expect(page.locator('[data-map-renderer]')).toHaveAttribute('data-map-renderer', 'webgl');
    await expect(page.locator('[data-map-renderer] canvas')).toHaveCount(1);
    await expect(page.locator('[data-sector-marker-group="bug:A"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-sector-marker-group="kurze-platte:A"]').click();
    await expect(page.locator('[data-sector-marker-group="kurze-platte:A"] text')).toHaveText('A');
    await expect(page.getByRole('button', { name: 'Kurze Platte abwählen', exact: true })).toBeVisible();
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(2);
    await expect(page.locator('[data-sector-region-group="kurze-platte:A"]')).toHaveAttribute('data-selected', 'true');
    await page.locator('[data-sector-marker-group="kurze-platte:A"]').click();
    await expect(page.locator('[data-sector-marker-group="bug:A"]')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Sektor Bug A', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Sektor Bug A', exact: true }).click();
    await dialog.getByRole('button', { name: '8 Boulder anzeigen', exact: true }).click();
    await page.getByRole('button', { name: 'Karte', exact: true }).click();
    await expect(page.locator('[data-sector-marker-group][aria-pressed="true"]')).toHaveCount(0);
    await panel.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true }).fill('nichtvorhanden');
    await expect(page.getByText('0 Boulder', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Kartensuche zurücksetzen', exact: true }).click();
    await expect(page.getByText('8 Boulder', { exact: true })).toBeVisible();
    // A short display with native safe areas must still expose the action;
    // all selected chips remain in a single horizontal strip.
    await page.setViewportSize({ width, height: 667 });
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--app-safe-area-top', '24px');
      document.documentElement.style.setProperty('--app-safe-area-bottom', '20px');
    });
    for (const key of ['bug:A', 'bug:B', 'bug:C', 'bug:D', 'grotte:A', 'grotte:B', 'grotte:C', 'grotte:D']) {
      await page.locator(`[data-sector-marker-group="${key}"]`).click();
    }
    await expect(panel.getByRole('button', { name: 'Boulder anzeigen', exact: true })).toBeInViewport();
    const manyBox = await panel.getByRole('button', { name: 'Boulder anzeigen', exact: true }).boundingBox();
    expect(manyBox!.y + manyBox!.height).toBeLessThanOrEqual(667 - (width < 768 ? 108 : 0));
    await panel.getByRole('button', { name: 'Sektorauswahl zurücksetzen', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Alle Boulder anzeigen', exact: true })).toBeInViewport();
    await page.screenshot({ path: `${output}/loop2-panel-short-${width}.png`, animations: 'disabled' });
    await panel.getByRole('button', { name: 'Alle Boulder anzeigen', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.getByText('8 Boulder', { exact: true })).toBeInViewport();
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
    expect(errors).toEqual([]);
  });
}
