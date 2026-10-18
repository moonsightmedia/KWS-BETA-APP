import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const widths = [375, 768, 1280, 1920];
const directory = 'test-results/launch-monitoring-optimized-20261018';
async function open(page: Page, state = '') { await page.goto(`/test/fixtures/launchMonitoring.html${state ? `?state=${state}` : ''}`); }
async function chooseView(page: Page, label: string) {
  const selector = page.getByRole('combobox', { name: 'Monitoringansicht', exact: true });
  if (await selector.isVisible()) {
    await selector.click();
    await page.getByRole('option', { name: label, exact: true }).click();
  } else {
    await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: label, exact: true }).click();
  }
}
async function openFilters(page: Page) {
  await page.getByRole('button', { name: 'Monitoringfilter öffnen', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Monitoring filtern', exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}
test.beforeEach(async ({ page }) => {
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  (page as Page & { qaErrors: string[] }).qaErrors = errors;
});
test.afterEach(async ({ page }) => { expect((page as Page & { qaErrors: string[] }).qaErrors).toEqual([]); });

test('layout loop: all cockpit views fit required widths with long content', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await open(page, 'long');
    await expect(page.getByText('Erstmals erfasste App-Instanzen', { exact: true })).toBeVisible();
    for (const [label, key] of [['Übersicht', 'overview'], ['Fehler', 'errors'], ['Nutzung', 'usage'], ['Mitteilungen', 'notifications']]) {
      await chooseView(page, label);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/loop1-${key}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
  }
});

test('behavior loop: states remain distinguishable across required widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const [state, message] of [['empty', 'Keine Fehler in dieser Messperiode gemeldet.'], ['error', 'Launch-Monitoring nicht verfügbar'], ['partial', 'Nicht verfügbar'], ['stale', 'Messdaten sind teilweise veraltet'], ['unconfigured', 'Launch-Monitoring noch nicht eingerichtet']]) {
      await open(page, state);
      await expect(page.getByText(message, { exact: state !== 'empty' }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/loop2-${state}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
  }
});

test('filters send server predicates, keep unknown account counts and preserve upload access', async ({ page }) => {
  await open(page);
  await page.getByRole('group', { name: 'Monitoringzeitraum' }).getByRole('button', { name: '7 Tage', exact: true }).click();
  const sheet = await openFilters(page);
  await sheet.getByRole('combobox', { name: 'Plattform', exact: true }).click();
  await page.getByRole('option', { name: 'Android', exact: true }).click();
  await sheet.getByRole('button', { name: 'Ergebnisse anzeigen', exact: true }).click();
  await expect(page.getByText('Nicht verfügbar', { exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.launchMonitoringQA.requests.filter(request => request.path.endsWith('kws_monitoring_dashboard')).at(-1)?.payload)).toEqual({ p_days: 7, p_platform: 'android', p_release: 'all' });
  await chooseView(page, 'Uploads');
  await expect(page.getByRole('textbox', { name: 'Upload-Sessions filtern' })).toBeVisible();
  await chooseView(page, 'Übersicht');
  await expect(page.getByText('Erstmals erfasste App-Instanzen', { exact: true })).toBeVisible();
});

test('keyboard detail lazily loads reports, saves confirmed status and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  const trigger = page.getByRole('button', { name: /Boulder-Video konnte nicht geladen werden/ });
  await expect(trigger).toBeVisible();
  expect(await page.evaluate(() => window.launchMonitoringQA.requests.some(request => request.path.endsWith('kws_monitoring_issue_events')))).toBe(false);
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Letzte Einzelberichte')).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Behoben', exact: true }).click();
  await dialog.getByLabel('Behoben ab App-Version').fill('android@1.0.68');
  await page.evaluate(() => { window.launchMonitoringQA.writeMode = 'fail'; });
  await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('fehlgeschlagen');
  await expect(dialog.getByLabel('Behoben ab App-Version')).toHaveValue('android@1.0.68');
  await page.evaluate(() => { window.launchMonitoringQA.writeMode = 'success'; });
  await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Status gespeichert.');
  await page.screenshot({ path: `${directory}/loop2-issue-dialog-375.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Monitoringansicht', exact: true })).toBeFocused();
});

test('stale foreground entries disappear and notification acceptance is not display proof', async ({ page }) => {
  await open(page, 'stale');
  await chooseView(page, 'Nutzung');
  await expect(page.getByText('Keine aktuellen Vordergrundsignale.')).toBeVisible();
  await chooseView(page, 'Mitteilungen');
  await expect(page.getByText('Vom Versanddienst angenommen', { exact: true })).toBeVisible();
  await expect(page.getByText(/Die Annahme bestätigt keine Anzeige auf dem Handy/)).toBeVisible();
});

test('loading and refresh failures preserve honest state', async ({ page }) => {
  await open(page, 'loading');
  await expect(page.getByText('Messquellen werden geprüft.')).toBeVisible();
  await open(page);
  await expect(page.getByText('Erstmals erfasste App-Instanzen', { exact: true })).toBeVisible();
  await page.evaluate(() => { window.launchMonitoringQA.readMode = 'fail'; });
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByText('Aktualisierung fehlgeschlagen', { exact: true })).toBeVisible();
  await expect(page.getByText('Erstmals erfasste App-Instanzen', { exact: true })).toBeVisible();
});

test('unsaved error status has discard protection and search reset restores the complete list', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /Boulder-Video konnte nicht geladen werden/ }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'In Bearbeitung', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('combobox', { name: 'Status', exact: true })).toContainText('In Bearbeitung');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await chooseView(page, 'Fehler');
  await page.getByRole('textbox', { name: 'Fehlergruppen filtern' }).fill('kein-treffer');
  await expect(page.getByText('Keine Fehlergruppen für diesen Filter.')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
  await expect(page.getByText(/2 von 2 Fehlergruppen/)).toBeVisible();
});

test('regressions and Sentry counters keep distinct meanings and external status is readonly', async ({ page }) => {
  await open(page, 'external');
  await expect(page.getByText('Erneut aufgetreten', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Sentry-Testproblem/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Nutzerreferenzen in Sentry', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Status speichern', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('mobile prioritizes first metrics and errors while desktop navigation uses one row', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 812 });
    await open(page);
    await expect(page.getByText('Erstmals erfasste App-Instanzen', { exact: true })).toBeVisible();
    if (width < 1024) {
      await expect(page.getByRole('combobox', { name: 'Monitoringansicht', exact: true })).toBeVisible();
      await expect(page.getByRole('group', { name: 'Monitoringansicht', exact: true })).toHaveCount(0);
    } else {
      const navigation = page.getByRole('group', { name: 'Monitoringansicht', exact: true });
      await expect(navigation).toBeVisible();
      const positions = await navigation.getByRole('button').evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().top)));
      expect(new Set(positions).size).toBe(1);
      expect((await navigation.boundingBox())!.height).toBeLessThan(60);
      expect((await navigation.boundingBox())!.width).toBeGreaterThan(900);
    }
    if (width === 375) {
      expect((await page.locator('dl').first().boundingBox())!.y).toBeLessThan(330);
      expect((await page.getByRole('heading', { name: 'Fehler zuerst prüfen', exact: true }).boundingBox())!.y).toBeLessThan(700);
    }
    await page.screenshot({ path: `${directory}/priority-overview-${width}.png`, fullPage: true, animations: 'disabled' });
  }
});

test('mobile touch filter sheet applies and resets filters without changing the period', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await open(page);
    await page.getByRole('group', { name: 'Monitoringzeitraum' }).getByRole('button', { name: '7 Tage', exact: true }).tap();
    const trigger = page.getByRole('button', { name: 'Monitoringfilter öffnen', exact: true });
    await trigger.tap();
    const sheet = page.getByRole('dialog', { name: 'Monitoring filtern', exact: true });
    await expect(sheet).toBeVisible();
    const bounds = (await sheet.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
    await sheet.getByRole('combobox', { name: 'Plattform', exact: true }).tap();
    await page.getByRole('option', { name: 'Android', exact: true }).tap();
    await sheet.getByRole('combobox', { name: 'App-Version', exact: true }).tap();
    await page.getByRole('option', { name: 'android@1.0.67', exact: true }).tap();
    await expect.poll(() => page.evaluate(() => window.launchMonitoringQA.requests.filter(request => request.path.endsWith('kws_monitoring_dashboard')).at(-1)?.payload)).toEqual({ p_days: 7, p_platform: 'android', p_release: 'android@1.0.67' });
    await page.screenshot({ path: `${directory}/loop2-touch-filter-375.png`, animations: 'disabled' });
    await sheet.getByRole('button', { name: 'Ergebnisse anzeigen', exact: true }).tap();
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.tap();
    await sheet.getByRole('button', { name: 'Zurücksetzen', exact: true }).tap();
    await expect(sheet.getByRole('combobox', { name: 'Plattform', exact: true })).toHaveText('Alle Plattformen');
    await expect(sheet.getByRole('combobox', { name: 'App-Version', exact: true })).toHaveText('Alle App-Versionen');
    await sheet.getByRole('button', { name: 'Ergebnisse anzeigen', exact: true }).tap();
    await expect(page.getByRole('group', { name: 'Monitoringzeitraum' }).getByRole('button', { name: '7 Tage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Aktualisieren', exact: true }).tap();
    await expect.poll(() => page.evaluate(() => window.launchMonitoringQA.requests.filter(request => request.path.endsWith('kws_monitoring_dashboard')).at(-1)?.payload)).toEqual({ p_days: 7, p_platform: 'all', p_release: 'all' });
  } finally { await context.close(); }
});

test('measurement definitions open from keyboard and return focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  const trigger = page.getByRole('button', { name: 'Messdefinitionen anzeigen', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/keine eindeutigen Personen oder Storedownloads/)).toBeVisible();
  await page.screenshot({ path: `${directory}/loop2-measurement-popover-375.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('daily history initially shows seven days and can expand or collapse', async ({ page }) => {
  await page.route('**/test/fixtures/launchMonitoring-data.mjs', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('export function launchDashboardFixture', 'function baselineLaunchDashboardFixture');
    await route.fulfill({ response, contentType: 'application/javascript', body: `${body}\nexport function launchDashboardFixture(now=Date.now()){const fixture=baselineLaunchDashboardFixture(now);fixture.daily=Array.from({length:30},(_,index)=>({date:new Date(now-(29-index)*86400000).toISOString().slice(0,10),first_opens:index,sessions:index+1,affected_sessions:0,boulder_views:index+3}));return fixture;}` });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page);
  await chooseView(page, 'Nutzung');
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Tagesverlauf', exact: true }) });
  await expect(section.locator('dl')).toHaveCount(7);
  await section.getByRole('button', { name: 'Alle 30 Tage anzeigen', exact: true }).click();
  await expect(section.locator('dl')).toHaveCount(30);
  await section.getByRole('button', { name: 'Weniger Tage anzeigen', exact: true }).click();
  await expect(section.locator('dl')).toHaveCount(7);
});

test('desktop focus returns to the selected view when the resolved issue row disappears', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  await page.getByRole('button', { name: /Boulder-Video konnte nicht geladen werden/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fehlerdetails', exact: true });
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Behoben', exact: true }).click();
  await dialog.getByLabel('Behoben ab App-Version').fill('android@1.0.68');
  await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Status gespeichert.');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Übersicht', exact: true })).toBeFocused();
});
