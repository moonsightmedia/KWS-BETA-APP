import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const phase = process.env.KWS_HEADER_PHASE || 'after';
const output = process.env.KWS_HEADER_OUTPUT || 'test-results/header-stability-20261006';
// Keep classic desktop scrollbars visible: overlay/hidden scrollbars mask
// navigation shifts between a short Home page and longer content pages.
test.use({ trace: 'off', video: 'off', launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function open(page: Page, extra = '') {
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  for (const hook of ['useAuth', 'useBoulders', 'useSectors', 'useColors', 'useBoulderCommunity', 'useSectorSchedule', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/personal-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useNotifications.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const useUnreadCount=()=>({data:0});export const useNotifications=()=>({data:[],isLoading:false});export const useMarkAsRead=()=>({mutate(){},mutateAsync:async()=>{}});export const useMarkAllAsRead=useMarkAsRead;export const useChangeNotification=useMarkAsRead;' }));
  await page.route('**/src/hooks/usePreloadBoulderThumbnails.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const usePreloadBoulderThumbnails=()=>{};' }));
  await page.route('**/src/utils/feedbackUtils.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const reportError=async()=>({success:true});' }));
  await page.route('**/src/utils/sentry.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const captureSentryException=()=>{};' }));
  await page.route('**/src/lib/profileCompat.ts*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const fetchProfileRecord=async()=>({first_name:"Alex"});' }));
  await page.goto(`/test/fixtures/personal-workspace.html?route=/&${extra}`);
  await page.addStyleTag({ url: '/fonts.css' });
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
}

async function geometry(page: Page) {
  return page.locator('.sticky.top-0').first().evaluate(header => {
    const rect = header.getBoundingClientRect();
    const title = header.querySelector('h1')!.getBoundingClientRect();
    return { top: rect.top, height: rect.height, titleTop: title.top, titleLeft: title.left };
  });
}

async function opticalAlignment(page: Page) {
  return page.locator('.sticky.top-0').first().evaluate(header => {
    const title = header.querySelector('h1')!;
    const text = title.innerText;
    const style = getComputedStyle(title);
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    title.append(marker);
    const baseline = marker.getBoundingClientRect().top;
    marker.remove();
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = context.measureText(text);
    const button = header.querySelector('.justify-end button')!.getBoundingClientRect();
    return { inkCenter: baseline + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2, buttonCenter: button.top + button.height / 2 };
  });
}

for (const width of [375, 768, 1280, 1920]) {
  test(`header remains aligned across navigation at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const measurements: Awaited<ReturnType<typeof geometry>>[] = [];
    for (const label of ['Home', 'Boulder', 'Statistiken', 'Home']) {
      await page.getByRole('link', { name: label, exact: true }).locator('visible=true').first().click();
      measurements.push(await geometry(page));
      await expect(page.locator('.sticky.top-0').first().getByRole('img', { name: 'beta', exact: true })).toHaveCount(0);
      const sidebarBrand = page.getByRole('button', { name: 'beta – zur Startseite', exact: true });
      if (width >= 768) await expect(sidebarBrand).toBeVisible();
      else await expect(sidebarBrand).toBeHidden();
      if (label === 'Boulder') {
        const background = page.locator('[data-brand-watermark]');
        await expect(background).toHaveAttribute('aria-hidden', 'true');
        await expect(background).toHaveCSS('pointer-events', 'none');
        await expect(background.locator('svg')).toHaveCSS('opacity', '0.08');
        const centered = await background.evaluate(layer => {
          const area = layer.getBoundingClientRect();
          const mark = layer.querySelector('svg')!.getBoundingClientRect();
          return Math.abs(area.x + area.width / 2 - mark.x - mark.width / 2) < 0.5
            && Math.abs(window.innerHeight / 2 - mark.y - mark.height / 2) < 0.5;
        });
        expect(centered).toBe(true);
      }
      const alignment = await opticalAlignment(page);
      console.log(`${phase} ${width} ${label} optical: ${JSON.stringify(alignment)}`);
      if (phase !== 'before') expect(Math.abs(alignment.inkCenter - alignment.buttonCenter)).toBeLessThanOrEqual(1.5);
      await page.screenshot({ path: `${output}/${phase}-${label}-${width}.png`, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    console.log(`${phase} ${width}: ${JSON.stringify(measurements)}`);
    expect(errors).toEqual([]);
    if (phase !== 'before') {
      for (const measurement of measurements) expect(measurement).toEqual(measurements[0]);
    }
  });
}

for (const width of [375, 768, 1280, 1920]) test(`loop 2: safe area, scroll, menus and data states at ${width}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width, height: 900 });
  await open(page);
  await page.addStyleTag({ content: ':root { --app-safe-area-top: 32px; }' });
  const initial = await geometry(page);
  await page.getByRole('button', { name: 'Benachrichtigungen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Benachrichtigungen', exact: true })).toBeVisible();
  expect(await geometry(page)).toEqual(initial);
  await page.screenshot({ path: `${output}/loop2-notifications-${width}.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Benachrichtigungen schließen' }).click();
  for (const label of ['Boulder', 'Statistiken', 'Home']) {
    await page.getByRole('link', { name: label, exact: true }).locator('visible=true').first().click();
    expect(await geometry(page)).toEqual(initial);
    if (label === 'Boulder') {
        const visibleBackgroundCenter = () => page.locator('[data-brand-watermark] svg').evaluate(mark => {
          const box = mark.getBoundingClientRect();
          return Math.abs(box.y + box.height / 2 - window.innerHeight / 2);
        });
        await expect.poll(visibleBackgroundCenter).toBeLessThan(0.5);
        await page.evaluate(() => window.scrollTo({ top: 240, behavior: 'instant' }));
        await expect.poll(visibleBackgroundCenter).toBeLessThan(0.5);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
      const expanded = await geometry(page);
      expect(expanded.titleTop).toBe(initial.titleTop);
      expect(expanded.height).toBeGreaterThan(initial.height);
      await page.screenshot({ path: `${output}/loop2-search-${width}.png`, animations: 'disabled' });
      await page.getByRole('button', { name: 'Suche schließen' }).click();
      expect(await geometry(page)).toEqual(initial);
    }
    await page.evaluate(() => window.scrollTo({ top: 160, behavior: 'instant' }));
    await expect.poll(async () => (await geometry(page)).top).toBe(0);
  }
  for (const state of ['loading', 'error', 'empty']) {
    await open(page, `state=${state}`);
    await page.addStyleTag({ content: ':root { --app-safe-area-top: 32px; }' });
    expect(await geometry(page)).toEqual(initial);
    await page.screenshot({ path: `${output}/loop2-${state}-${width}.png`, animations: 'disabled' });
  }
  expect(errors).toEqual([]);
});

for (const collapsed of [false, true]) test(`desktop navigation keeps short and long pages aligned (sidebar ${collapsed ? 'collapsed' : 'expanded'})`, async ({ page }) => {
  // The approved weekly chart makes Home taller. Keep this regression's
  // short-page/long-page scrollbar comparison with enough height for Home.
  const height = 1280;
  await page.setViewportSize({ width: 1920, height });
  await open(page);
  if (collapsed) {
    await page.getByRole('button', { name: 'Navigation einklappen', exact: true }).click();
    await expect(page.locator('#desktop-navigation')).toHaveAttribute('data-expanded', 'false');
    // Wait for the existing sidebar/content transition before measuring.
    await expect.poll(() => page.locator('.sticky.top-0').first().evaluate(el => el.getBoundingClientRect().left)).toBe(80);
  }
  const measurements = [];
  const typography = [];
  for (const label of ['Home', 'Boulder', 'Statistiken', 'Home']) {
    await page.getByRole('link', { name: label, exact: true }).locator('visible=true').first().click();
    await expect(page.getByRole('heading', { name: label === 'Home' ? 'Hallo Alex' : label, exact: true })).toBeVisible();
    if (label === 'Statistiken') {
      // Expand real day rows to guarantee a long page even with the taller
      // viewport; the boulder page may now also fit at this height.
      const more = page.getByRole('button', { name: /Ältere Klettertage anzeigen/ });
      while (await more.count()) await more.click();
    }
    measurements.push(await geometry(page));
    typography.push(await page.locator('.sticky.top-0 h1').evaluate(el => {
      const style = getComputedStyle(el);
      return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight, spacing: style.letterSpacing };
    }));
    if (label === 'Home') {
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    } else if (label === 'Statistiken') {
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(height);
    }
  }
  for (const measurement of measurements) expect(measurement).toEqual(measurements[0]);
  for (const style of typography) expect(style).toEqual(typography[0]);
  expect(typography[0].family).toContain('Teko');
  expect(await page.evaluate(() => document.fonts.check('600 34.4px Teko'))).toBe(true);
});

for (const width of [375, 768, 1280, 1920]) test(`brand colors agree across header and controls at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await open(page);
  await expect(page.locator('.sticky.top-0 h1')).toHaveCSS('color', 'rgb(25, 36, 54)');
  await expect(page.getByRole('button', { name: 'Benachrichtigungen', exact: true })).toHaveCSS('background-color', 'rgb(241, 245, 241)');
  if (width >= 768) await expect(page.locator('.sticky.top-0 p').first()).toHaveCSS('color', 'rgb(100, 108, 113)');
  await page.getByRole('link', { name: 'Statistiken', exact: true }).locator('visible=true').first().click();
  const selected = page.getByRole('button', { name: 'Fortschritt', exact: true });
  await expect(selected).toHaveCSS('background-color', 'rgb(54, 181, 49)');
  await expect(selected).toHaveCSS('color', 'rgb(25, 36, 54)');
  await expect(page.locator('.sticky.top-0 h1')).toHaveCSS('color', 'rgb(25, 36, 54)');
  // Check rendered utilities and semantic tokens, including fixed brand
  // surfaces inside a dark context and the equivalent semantic light tokens.
  const readPalette = () => page.evaluate(() => {
    const styles: Record<string, string> = {};
    for (const name of ['bg-primary', 'bg-accent', 'bg-success', 'bg-brand', 'text-foreground', 'text-brand-ink', 'text-muted-foreground', 'text-brand-muted', 'bg-secondary', 'bg-brand-secondary', 'border-border', 'border-brand-border']) {
      const sample = document.createElement('span');
      sample.className = name;
      // Unused full-opacity utilities are intentionally absent from Tailwind's
      // output; these two aliases currently appear only as tinted utilities.
      if (name === 'bg-accent' || name === 'bg-success') sample.style.backgroundColor = `hsl(var(--${name.slice(3)}))`;
      document.body.append(sample);
      const computed = getComputedStyle(sample);
      styles[name] = name.startsWith('bg-') ? computed.backgroundColor : name.startsWith('text-') ? computed.color : computed.borderColor;
      sample.remove();
    }
    return styles;
  });
  const palette = await readPalette();
  for (const name of ['bg-primary', 'bg-accent', 'bg-success', 'bg-brand']) expect(palette[name]).toBe('rgb(54, 181, 49)');
  for (const [semantic, brand, color] of [
    ['text-foreground', 'text-brand-ink', 'rgb(25, 36, 54)'],
    ['text-muted-foreground', 'text-brand-muted', 'rgb(100, 108, 113)'],
    ['bg-secondary', 'bg-brand-secondary', 'rgb(241, 245, 241)'],
    ['border-border', 'border-brand-border', 'rgb(221, 231, 223)'],
  ]) {
    expect(palette[semantic]).toBe(color);
    expect(palette[brand]).toBe(color);
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const dark = await readPalette();
  for (const name of ['bg-primary', 'bg-accent', 'bg-success', 'bg-brand', 'text-brand-ink', 'text-brand-muted', 'bg-brand-secondary', 'border-brand-border']) expect(dark[name]).toBe(palette[name]);
  expect(dark['text-foreground']).not.toBe(palette['text-foreground']);
});
