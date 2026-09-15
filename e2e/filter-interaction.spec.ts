import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/filter-interaction-20260915';
const phase = process.env.KWS_FILTER_PHASE || 'after';
test.use({ trace: 'off', video: 'off' });

async function open(page: Page, name = 'edit', extra = '') {
  page.on('pageerror', error => console.log('Filter fixture runtime:', error.message));
  await page.clock.setFixedTime(new Date('2026-09-15T08:00:00Z'));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole']) {
    const fixture = name === 'boulders' || hook === 'useColors' ? 'filter-user-hooks' : name === 'guest' && hook === 'useAuth' ? 'guest-loading-hooks' : 'setter-hooks';
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: `export * from '/test/fixtures/${fixture}.ts';` }));
  }
  await page.route('**/src/hooks/useIsAdmin.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useIsAdmin } from '/test/fixtures/filter-user-hooks.ts';" }));
  await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.goto(name === 'boulders' ? `/test/fixtures/filter-boulders.html?${extra}` : name === 'guest' ? `/test/fixtures/guest-loading.html?${extra}` : `/test/fixtures/setter-workspace.html?page=${name}&${extra}`);
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}

test('category reset preserves other choices; collapse, keyboard and focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page);
  const trigger = page.getByRole('button', { name: /Filter öffnen/ });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  for (const grade of ['1', '2']) await dialog.getByRole('button', { name: `Grad ${grade}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Farbe Weiß', exact: true }).click();
  const category = dialog.getByRole('button', { name: 'Schwierigkeit Grad 1 · 2', exact: true });
  await category.focus();
  await page.keyboard.press('Enter');
  await expect(category).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog.getByRole('button', { name: 'Grad 1', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Schwierigkeit zurücksetzen', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Farbe Weiß', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('button', { name: '4 Boulder anzeigen', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: /^Schwierigkeit Alle Grade/ }).click();
  for (const grade of ['1', '2']) await expect(dialog.getByRole('button', { name: `Grad ${grade}`, exact: true })).toHaveAttribute('aria-pressed', 'false');
  await dialog.getByRole('button', { name: 'Grifffarbe zurücksetzen', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '12 Boulder anzeigen', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('more colors retains selected swatches and allows an honest empty result', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page);
  await page.getByRole('button', { name: /Filter öffnen/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: /^Farbe / })).toHaveCount(6);
  await dialog.getByRole('button', { name: 'Weitere 5 Farben' }).click();
  await dialog.getByRole('button', { name: 'Farbe Schwarz-Gelb', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '0 Boulder anzeigen' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Weniger Farben' }).click();
  await expect(dialog.getByRole('button', { name: /^Farbe / })).toHaveCount(7);
  const color = dialog.getByRole('button', { name: 'Farbe Schwarz-Gelb', exact: true });
  await expect(color).toHaveAttribute('aria-pressed', 'true');
  expect(await color.locator('span').first().evaluate(e => getComputedStyle(e).backgroundImage)).toContain('linear-gradient');
  await dialog.getByRole('button', { name: /^Grifffarbe Schwarz-Gelb/ }).click();
  await dialog.getByRole('button', { name: /^Schwierigkeit Alle Grade/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/loop2-collapsed-375.png`, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Grifffarbe zurücksetzen', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '12 Boulder anzeigen' })).toBeVisible();
});

for (const mode of ['loading', 'empty', 'error']) {
  test(`colors: ${mode} is explicit`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await open(page, 'guest', `colorState=${mode}`);
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(mode === 'loading' ? 'Farben werden geladen …' : mode === 'empty' ? 'Noch keine Farben verfügbar.' : 'Farben konnten nicht aktualisiert werden.', { exact: true })).toBeVisible();
    if (mode === 'error') {
      await page.screenshot({ path: `${output}/loop2-error-375.png`, animations: 'disabled' });
      await dialog.getByRole('button', { name: 'Farben erneut laden' }).click();
      await expect(dialog.getByRole('button', { name: /^Farbe / })).toHaveCount(6);
    }
  });
}

for (const width of [375, 768, 1280, 1920]) {
  test(`signed-in quick filters and icons ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await open(page, 'boulders');
    await expect(page.getByText('Kleine Kante', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/icons-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: '8 Boulder anzeigen' })).toBeVisible();
    await dialog.getByRole('switch', { name: 'Auch abgeschraubte', exact: true }).check();
    await expect(dialog.getByRole('button', { name: '12 Boulder anzeigen' })).toBeVisible();
    await dialog.getByRole('switch', { name: 'Gespeichert', exact: true }).check();
    await expect(dialog.getByRole('button', { name: '2 Boulder anzeigen' })).toBeVisible();
    await dialog.getByRole('switch', { name: /^Neu/ }).check();
    await expect(dialog.getByRole('button', { name: '2 Boulder anzeigen' })).toBeVisible();
    await page.screenshot({ path: `${output}/loop2-quick-${width}.png`, animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '8 Boulder anzeigen' })).toBeVisible();
    await expect(dialog.getByRole('switch', { checked: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Unbekannter Grad', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '1 Boulder anzeigen' })).toBeVisible();
    const icon = dialog.locator('svg.lucide').first();
    await expect(icon).toHaveCSS('stroke-width', '1.75px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  });
}

test('reduced motion and SVG isolation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.getByRole('button', { name: /Filter öffnen/ }).click();
  await expect(page.locator('.kws-filter-collapse').first()).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Grad 1', exact: true })).toHaveCSS('transition-property', 'none');
  // A map/diagram SVG must retain its explicitly declared stroke.
  const stroke = await page.evaluate(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('stroke-width', '0.75');
    document.body.append(svg);
    const value = getComputedStyle(svg).strokeWidth;
    svg.remove();
    return value;
  });
  expect(stroke).toBe('0.75px');
});

test('touch targets and selected text contrast', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  await page.getByRole('button', { name: /Filter öffnen/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Grad 1', exact: true }).click();
  await dialog.getByRole('button', { name: 'Farbe Weiß', exact: true }).click();
  const targets = dialog.getByRole('button', { name: /^(Grad \d|Unbekannter Grad|Farbe .+)$/ });
  for (const box of await targets.evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return [r.width, r.height]; }))) {
    expect(box[0]).toBeGreaterThanOrEqual(44);
    expect(box[1]).toBeGreaterThanOrEqual(44);
  }
  const contrast = await dialog.evaluate(root => {
    const rgb = (s: string) => (s.match(/[\d.]+/g) || []).map(Number);
    const luminance = (c: number[]) => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    return [...root.querySelectorAll('button[aria-pressed="true"], h3 button span.text-primary-ink')].map(n => {
      const ancestors: Element[] = []; let e: Element | null = n;
      while (e) { ancestors.unshift(e); e = e.parentElement; }
      let bg = [255, 255, 255];
      for (const ancestor of ancestors) { const color = rgb(getComputedStyle(ancestor).backgroundColor); const a = color[3] ?? 1; bg = bg.map((v, i) => color[i] * a + v * (1 - a)); }
      const fg = luminance(rgb(getComputedStyle(n).color)); const surface = luminance(bg);
      return (Math.max(fg, surface) + .05) / (Math.min(fg, surface) + .05);
    });
  });
  expect(contrast.length).toBeGreaterThanOrEqual(2);
  contrast.forEach(ratio => expect(ratio).toBeGreaterThanOrEqual(4.5));
});

test('comparison report: every original and current image resolves', async ({ page }) => {
  await page.goto(`/${output}/comparison.html`);
  for (const width of [375, 768, 1280, 1920]) {
    await page.locator(`[data-width="${width}"]`).click();
    for (let state = 0; state < 2; state++) {
      await expect.poll(() => page.locator('.compare img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await page.locator('#state').click();
    }
  }
  await expect.poll(() => page.locator('.extras img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
});

for (const width of [375, 768, 1280, 1920]) {
  test(`filter visual ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await page.getByRole('button', { name: /Filter öffnen/ }).click();
    await page.screenshot({ path: `${output}/${phase}-${width}.png`, animations: 'disabled' });
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Grad 1', exact: true }).click();
    await dialog.getByRole('button', { name: 'Farbe Weiß', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '1 Boulder anzeigen', exact: true })).toBeInViewport();
    await page.screenshot({ path: `${output}/${phase}-selected-${width}.png`, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}
