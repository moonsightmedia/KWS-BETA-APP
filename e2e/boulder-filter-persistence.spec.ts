import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = 'test-results/boulder-filter-persistence-20261019';
test.use({ trace: 'off', video: 'off' });
async function open(page: Page, start = '/boulders', blocked = false, accountSwitch = false) {
  page.on('pageerror', error => console.error('Filter fixture:', error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/continuity-hooks.ts';" }));
  }
  if (accountSwitch) await page.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `
    import React from '/node_modules/.vite/deps/react.js'; const {useState,useEffect}=React;
    export function useAuth(){ const [id,setId]=useState('fixture-setter');useEffect(()=>{const receive=e=>setId(e.detail);window.addEventListener('qa:account',receive);return()=>window.removeEventListener('qa:account',receive);},[]);return {user:id?{id}:null,session:{access_token:'fixture-token'},loading:false}; }
  ` }));
  await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.route('**/src/components/NotificationCenter.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const NotificationCenter=()=>null;' }));
  await page.route('**/src/components/boulder/BoulderDetailSections.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const BoulderInfoTab=()=>null;export const BoulderTrackTab=()=>null;export const BoulderBetaTab=()=>null;' }));
  if (blocked) await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage disabled for QA'); } });
  });
  await page.goto('/test/fixtures/boulder-continuity.html?filterSession=1&start=' + encodeURIComponent(start));
  await expect(page.getByRole('button', { name: 'Filter', exact: true })).toBeEnabled();
}
const cards = (page: Page) => page.locator('#boulder-results button').filter({ has: page.locator('img') });
async function visitHomeAndReturn(page: Page) {
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('route')).toHaveText('/');
  await page.getByRole('link', { name: 'Boulder', exact: true }).click();
  await expect(page.getByTestId('route')).toHaveText('/boulders');
}
async function chooseFilters(page: Page) {
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: 'Grad 2', exact: true }).click();
  await panel.getByRole('button', { name: 'Farbe Blau', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(cards(page)).toHaveCount(1);
}
async function snapshot(page: Page, name: string) {
  await mkdir(output, { recursive: true });
  await expect.poll(() => page.locator('#boulder-results img').evaluateAll(images => images.every(image => {
    const box = image.getBoundingClientRect();
    return box.bottom <= 0 || box.top >= innerHeight || ((image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0);
  }))).toBe(true);
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}
for (const width of [375, 768, 1280, 1920]) {
  test(`loop 1: filters survive detail, Home, browser Back and reload at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await open(page);
    await chooseFilters(page);
    await snapshot(page, `loop1-selected-${width}`);
    await cards(page).first().click();
    await page.getByRole('button', { name: 'Zurück zur Boulderübersicht', exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await visitHomeAndReturn(page);
    await expect(cards(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Grad 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Farbe Blau', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await snapshot(page, `loop1-returned-${width}`);
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: 'Verlauf zurück', exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await page.reload();
    await expect(cards(page)).toHaveCount(1);
    expect(errors).toEqual([]);
  });
  test(`loop 2: search, sorting, empty result and reset survive navigation at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
    await page.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true }).fill('Kleine');
    await page.getByRole('button', { name: 'Sortierung', exact: true }).click();
    await page.getByRole('button', { name: 'Name A-Z', exact: true }).click();
    await visitHomeAndReturn(page);
    await expect(cards(page)).toHaveCount(2);
    await page.getByRole('button', { name: 'Sortierung', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Name A-Z', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
    const search = page.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true });
    await expect(search).toHaveValue('Kleine');
    await search.fill('Kein passender Boulder');
    await visitHomeAndReturn(page);
    await expect(cards(page)).toHaveCount(0);
    await snapshot(page, `loop2-empty-${width}`);
    await page.getByRole('button', { name: 'Nur Suche leeren', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true })).toBeFocused();
    await chooseFilters(page);
    await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
    await page.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true }).fill('Kein Treffer');
    await page.getByRole('button', { name: 'Nur Suche leeren', exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Grad 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Farbe Blau', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Boulder suchen', exact: true }).click();
    await page.getByRole('textbox', { name: 'Boulder oder Bereich suchen', exact: true }).fill('Kein Treffer');
    await page.getByRole('button', { name: 'Suche und Filter zurücksetzen', exact: true }).click();
    await visitHomeAndReturn(page);
    await expect(cards(page)).toHaveCount(8);
    await snapshot(page, `loop2-reset-${width}`);
  });
}

test('blocked browser storage still keeps filters during page navigation', async ({ page }) => {
  await open(page, '/boulders', true);
  await chooseFilters(page);
  await visitHomeAndReturn(page);
  await expect(cards(page)).toHaveCount(1);
});

test('explicit sector and quick links replace prior filters and retain resolved sector labels', async ({ page }) => {
  await open(page);
  await chooseFilters(page);
  await page.goto('/test/fixtures/boulder-continuity.html?start=' + encodeURIComponent('/boulders?show=new&sector=Grotte%20A'));
  await expect(page.getByRole('button', { name: 'Filter', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grad 2', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Sektor Grotte A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await visitHomeAndReturn(page);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sektor Grotte A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('switch', { name: 'Neu', exact: false })).toBeChecked();
});

test('switching accounts keeps their selections separate', async ({ page }) => {
  await open(page, '/boulders', false, true);
  await chooseFilters(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('qa:account', { detail: 'other-account' })));
  await expect(cards(page)).toHaveCount(8);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('qa:account', { detail: 'fixture-setter' })));
  await expect(cards(page)).toHaveCount(1);
});

test('browser Back restores manual additions to an explicit quick-filter link', async ({ page }) => {
  await open(page, '/boulders?show=new');
  await chooseFilters(page);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Verlauf zurück', exact: true }).click();
  await expect(cards(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grad 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('guest filters survive leaving the public overview and reloading', async ({ page }) => {
  await open(page, '/guest');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('button', { name: 'Grad 2', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'QA Home', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'QA Gast', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grad 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Grad 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
