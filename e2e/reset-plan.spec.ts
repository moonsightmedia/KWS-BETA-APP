import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const output = process.env.KWS_RESET_OUTPUT || 'test-results/reset-plan-20261012';
const phase = process.env.KWS_RESET_PHASE || 'loop1';
test.use({ trace: 'off', video: 'off' });
const sectors = [{ id: 'a', name: 'Atta-Höhle', boulder_count: 12 }, { id: 'b', name: 'Felsenmeer', boulder_count: 8 }, { id: 'c', name: 'Grotte D', boulder_count: 9 }];
const rows = [{ id: '1', sector_id: 'a', scheduled_at: '2026-10-13T08:00:00Z', note: 'Während des Schraubens bleibt dieser Teilbereich gesperrt.' }, { id: '2', sector_id: 'b', scheduled_at: '2026-10-13T08:00:00Z', note: null }, { id: '3', sector_id: 'c', scheduled_at: '2026-10-16T08:00:00Z', note: 'Neue Boulder ab dem Nachmittag.' }];
async function open(page: Page, route = '/schedule', state = 'ready', extra = '') {
  await page.clock.setFixedTime(new Date('2026-10-12T10:00:00Z'));
  await page.route('**/*', request => new URL(request.request().url()).hostname === '127.0.0.1' ? request.continue() : request.abort());
  let mode = state;
  const requests: string[] = [];
  await page.route('**/qa/rest/v1/**', async request => {
    requests.push(request.request().method());
    expect(request.request().method()).toBe('GET');
    const url = new URL(request.request().url());
    const schedule = url.pathname.endsWith('/sector_schedule');
    if (schedule) {
      expect(url.searchParams.get('select')).toBe('id,sector_id,scheduled_at,note');
      if (mode === 'error') return request.fulfill({ status: 500, json: { message: 'isolated error' } });
      if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 2500));
      return request.fulfill({ json: mode === 'empty' ? [] : rows });
    }
    return request.fulfill({ json: url.pathname.endsWith('/sectors') ? sectors : [] });
  });
  await page.goto(`/test/fixtures/reset-plan.html?route=${encodeURIComponent(route)}&${extra}`);
  await mkdir(output, { recursive: true });
  return { requests, ready: () => { mode = 'ready'; } };
}
for (const width of [375, 768, 1280, 1920]) test(`agenda and calendar ${width}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 }); await open(page);
  await expect(page.getByText('2 Termine geplant · Hallenzeit')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aktuelle Boulder in Bug A', exact: true })).toBeVisible();
  await expect(page.getByText('Als Nächstes', { exact: true })).toBeVisible();
  const firstCard = page.locator('[data-reset-plan] section').first().locator('article').first().locator('..');
  expect(await firstCard.evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');
  await page.screenshot({ path: `${output}/${phase}-agenda-${width}.png`, fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.getByText('Kalender', { exact: true }).click();
  await expect(page.locator('[data-schedule-calendar]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Termin hinzufügen/ })).toHaveCount(0);
  await page.locator('button[name="day"]').filter({ hasText: /^13/ }).click();
  await expect(page.getByRole('link', { name: 'Aktuelle Boulder in Kurze Platte' })).toBeVisible();
  await page.screenshot({ path: `${output}/${phase}-calendar-${width}.png`, fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Heute', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oktober 2026', exact: true })).toBeVisible();
  await page.locator('button[name="day"]').filter({ hasText: /^12/ }).focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Aktuelle Boulder in Bug A' })).toBeVisible();
  await page.getByRole('link', { name: 'Aktuelle Boulder in Bug A' }).click();
  await expect(page.getByRole('heading', { name: 'Boulder-Auswahl' })).toBeVisible();
  await expect(page.getByText('Bug A', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('empty, loading and error are distinct and retry restores real read data', async ({ page }) => {
  await open(page, '/schedule', 'empty');
  await expect(page.getByText('Noch keine Umschraubung geplant', { exact: true })).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
  await open(page, '/schedule', 'loading');
  await expect(page.getByRole('status', { name: 'Schraubplan wird geladen' })).toBeVisible();
  await expect(page.getByText('2 Termine geplant · Hallenzeit')).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
  const mock = await open(page, '/schedule', 'error');
  await expect(page.getByRole('alert')).toContainText('konnte nicht geladen');
  await expect(page.getByText('Noch keine Umschraubung geplant', { exact: true })).toHaveCount(0);
  mock.ready(); await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByText('2 Termine geplant · Hallenzeit')).toBeVisible();
  expect(mock.requests.every(method => method === 'GET')).toBe(true);
});
test('dashboard and profile entries lead to shared schedule; profile back returns correctly', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await open(page, '/');
  await expect(page.getByRole('heading', { name: 'Nächste Umschraubung' })).toBeVisible();
  await page.getByRole('button', { name: 'Alle Termine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Schraubplan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zur App', exact: true }).click();
  await page.getByRole('button', { name: /Profil und Einstellungen/ }).click();
  await page.getByRole('menuitem', { name: /Schraubplan/ }).click();
  await expect(page.getByRole('heading', { name: 'Schraubplan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zum Profil', exact: true }).click();
  await page.getByRole('button').filter({ hasText: 'Schraubplan' }).click();
  await expect(page.getByRole('heading', { name: 'Schraubplan', exact: true })).toBeVisible();
});
test('guest can view and use calendar without signing in', async ({ page }) => {
  await open(page, '/schedule', 'ready', 'guest');
  await expect(page.getByText('2 Termine geplant · Hallenzeit')).toBeVisible();
  await page.getByText('Kalender', { exact: true }).click();
  await page.locator('button[name="day"]').filter({ hasText: /^16/ }).click();
  await expect(page.getByText('Neue Boulder ab dem Nachmittag.')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zur App', exact: true }).click();
  await expect(page.getByText('Gastansicht geöffnet')).toBeVisible();
});
test('public read paginates beyond 500 and timer removes expired appointments', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
  const offsets: string[] = [];
  await page.route('**/qa/rest/v1/**', request => {
    const url = new URL(request.request().url());
    expect(request.request().method()).toBe('GET');
    if (url.pathname.endsWith('/sector_schedule')) {
      const offset = url.searchParams.get('offset')!; offsets.push(offset);
      return request.fulfill({ json: offset === '0' ? Array.from({ length: 500 }, (_, i) => ({ id: String(i), sector_id: 'a', scheduled_at: '2026-10-12T10:00:30Z', note: null })) : [rows[2]] });
    }
    return request.fulfill({ json: url.pathname.endsWith('/sectors') ? sectors : [] });
  });
  await page.goto('/test/fixtures/reset-plan.html');
  await expect(page.getByText('2 Termine geplant · Hallenzeit')).toBeVisible();
  expect(offsets).toEqual(['0', '500']);
  await page.clock.fastForward(61_000);
  await expect(page.getByText('1 Termin geplant · Hallenzeit')).toBeVisible();
});

for (const width of [375, 1280]) test(`explicit view, month and day survive Home, Boulder links and reload ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await open(page);
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  const novemberDay = page.locator('button[name="day"][aria-label^="Dienstag, 17. November 2026"]');
  await novemberDay.click();
  await page.getByRole('button', { name: 'Zurück zur App', exact: true }).click();
  await page.getByRole('button', { name: 'Alle Termine', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kalender', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await expect(novemberDay).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(novemberDay).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vorheriger Monat' }).click();
  const octoberDay = page.locator('button[name="day"][aria-label^="Freitag, 16. Oktober 2026"]');
  await octoberDay.click();
  await page.getByRole('link', { name: 'Aktuelle Boulder in Grotte D' }).click();
  await page.getByRole('link', { name: 'Zum Schraubplan', exact: true }).click();
  await expect(octoberDay).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Termine', exact: true }).click();
  await page.getByRole('button', { name: 'Zurück zur App', exact: true }).click();
  await page.getByRole('button', { name: 'Alle Termine', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Termine', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('375px: next-day details fit above navigation, day targets remain 44px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  await expect(page.getByRole('heading', { name: 'Morgen', exact: true })).toBeVisible();
  await expect(page.getByText('Dienstag, 13. Oktober 2026', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  const calendar = await page.locator('[data-schedule-calendar]').boundingBox();
  expect(calendar!.height).toBeLessThan(380);
  const days = await page.locator('button[name="day"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
  expect(Math.min(...days)).toBeGreaterThanOrEqual(44);
  expect(await page.locator('button[data-reset-day="true"]').count()).toBe(2);
  const selected = page.locator('button[name="day"][aria-selected="true"]');
  const contrast = await selected.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  const note = await page.getByText('Während des Schraubens bleibt dieser Teilbereich gesperrt.').boundingBox();
  const navigation = await page.getByRole('navigation', { name: 'Hauptnavigation', exact: true }).boundingBox();
  expect(note!.y + note!.height).toBeLessThan(navigation!.y);
  await page.screenshot({ path: `${output}/${phase}-calendar-375-812.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  // A genuine six-week month remains complete rather than hiding its final days.
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.getByRole('heading', { name: 'Mai 2027', exact: true })).toBeVisible();
  await expect(page.locator('button[name="day"]')).toHaveCount(42);
});

test('invalid storage never blocks the plan', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kws.reset-plan.view.v1', '{broken'));
  await open(page);
  await expect(page.getByText('2 Termine geplant · Hallenzeit')).toBeVisible();
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
});

test('blocked preference reads and writes still allow calendar navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem;
    const write = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) { if (key === 'kws.reset-plan.view.v1') throw new DOMException('QA denied', 'SecurityError'); return read.call(this, key); };
    Storage.prototype.setItem = function (key, value) { if (key === 'kws.reset-plan.view.v1') throw new DOMException('QA denied', 'SecurityError'); return write.call(this, key, value); };
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.getByRole('heading', { name: 'November 2026', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('multiple appointments and long notes remain readable without changing calendar size on selection', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await open(page);
  const longNote = 'Bitte diesen Bereich während der Umschraubung freihalten. '.repeat(12);
  await page.route('**/qa/rest/v1/sector_schedule*', request => request.fulfill({ json: [
    { ...rows[0], note: longNote }, { ...rows[1], scheduled_at: '2026-10-13T13:00:00Z' }, rows[2],
  ] }));
  await page.getByRole('button', { name: 'Schraubplan aktualisieren' }).click();
  await expect(page.getByText('3 Termine geplant · Hallenzeit')).toBeVisible();
  await page.getByRole('button', { name: 'Kalender', exact: true }).click();
  const day = page.locator('button[name="day"][aria-label^="Dienstag, 13. Oktober 2026"]');
  await expect(day).toHaveAttribute('aria-label', /2 Termine anzeigen/);
  const height = (await page.locator('[data-schedule-calendar]').boundingBox())!.height;
  await page.locator('button[name="day"][aria-label^="Freitag, 16. Oktober 2026"]').click();
  expect((await page.locator('[data-schedule-calendar]').boundingBox())!.height).toBe(height);
  await day.click();
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.getByText('15:00 Uhr', { exact: true })).toBeVisible();
  await expect(page.getByText(longNote.trim(), { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
