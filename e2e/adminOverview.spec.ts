import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const directory = 'test-results/launch-monitoring-admin-overview-20261019';
const widths = [375, 768, 1280, 1920];
const accountId = '00000000-0000-4000-8000-000000000001';
const errors = new WeakMap<Page, string[]>();
async function overview(page: Page, state = '') {
  await page.goto(`/test/fixtures/launchMonitoring.html?page=overview&state=${state}`);
}
async function issue(page: Page, state = '') {
  await page.goto(`/test/fixtures/launchMonitoring.html?monitoringView=errors&state=${state}`);
  await page.getByRole('button', { name: /Boulder-Video konnte nicht geladen werden/ }).click();
  return page.getByRole('dialog');
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test.beforeEach(async ({ page }) => {
  await mkdir(directory, { recursive: true });
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page)!.push(error.message));
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('overview and identified issue render at four widths without leaking identities into exports', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => { document.documentElement.dataset.copiedReport = value; } } }));
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await overview(page);
    await expect(page.getByRole('heading', { name: 'Alle Bereiche im Blick', exact: true })).toBeVisible();
    for (const name of ['Konten', 'Halle', 'Rückmeldungen & Moderation', 'Fehler & Uploads', 'Mitteilungen', 'Datenquellen']) {
      await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(1);
    }
    await expect(page.getByText('Neue Konten sind Registrierungen – keine Store-Downloads.', { exact: true })).toHaveCount(1);
    await expect(page.getByText(/Gezählt werden nur Nutzer, die der Nutzungsstatistik zugestimmt haben/)).toBeVisible();
    await expect(page.getByText('Alexandra Bergmann', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${directory}/loop1-overview-${width}.png`, fullPage: true, animations: 'disabled' });
    await fits(page);
    const dialog = await issue(page);
    const actors = dialog.getByRole('region', { name: 'Nutzerzuordnung', exact: true });
    await expect(actors.getByText('Alexandra Bergmann', { exact: true })).toBeVisible();
    await expect(actors.getByText('alexandra@example.test', { exact: true })).toBeVisible();
    const profile = actors.getByRole('link', { name: 'Nutzerprofil öffnen (neuer Tab)', exact: true });
    await expect(profile).toHaveAttribute('href', `/admin?tab=users&userId=${accountId}`);
    await expect(profile).toHaveAttribute('target', '_blank');
    await dialog.getByRole('button', { name: 'Bericht für Technik kopieren', exact: true }).click();
    const copied = await page.locator('html').getAttribute('data-copied-report');
    expect(copied).toContain('technischer Fehlerbericht');
    for (const privateValue of ['Alexandra', 'alexandra@example.test', accountId]) expect(copied).not.toContain(privateValue);
    await actors.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${directory}/loop1-account-${width}.png`, animations: 'disabled' });
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Fehleransicht schließen', exact: true })).toBeInViewport();
  }
});

test('second responsive loop distinguishes stale snapshots and account-free diagnostics', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 812 });
    await overview(page, width < 1000 ? 'overview-stale' : 'overview-empty');
    await expect(page.getByRole('heading', { name: 'Alle Bereiche im Blick', exact: true })).toBeVisible();
    if (width < 1000) await expect(page.getByRole('alert')).toContainText('älter als zwei Minuten');
    else await expect(page.getByText('In den verfügbaren Bereichen sind keine offenen Aufgaben erfasst.', { exact: true })).toBeVisible();
    await fits(page);
    await page.screenshot({ path: `${directory}/loop2-overview-${width}.png`, fullPage: true, animations: 'disabled' });
    const dialog = await issue(page, width < 1000 ? 'actor-guest' : 'actor-unassigned');
    const actors = dialog.getByRole('region', { name: 'Nutzerzuordnung', exact: true });
    await expect(actors.getByText(width < 1000 ? 'Ohne Konto gemeldet' : 'Nicht zugeordnet', { exact: true })).toBeVisible();
    await expect(actors.getByRole('link')).toHaveCount(0);
    await actors.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${directory}/loop2-account-${width}.png`, animations: 'disabled' });
    await fits(page);
  }
});

test('overview fails explicitly for absent schema, denied access and a failed refresh', async ({ page }) => {
  await overview(page, 'overview-unconfigured');
  await expect(page.getByRole('alert')).toContainText('noch nicht eingerichtet');
  await expect(page.getByRole('heading', { name: 'Konten', exact: true })).toHaveCount(0);
  await overview(page, 'overview-denied');
  await expect(page.getByRole('alert')).toContainText('erneut als Administrator anmelden');
  await expect(page.getByRole('heading', { name: 'Konten', exact: true })).toHaveCount(0);
  await overview(page);
  await expect(page.getByRole('heading', { name: 'Konten', exact: true })).toBeVisible();
  await page.evaluate(() => { window.launchMonitoringQA.readMode = 'fail'; });
  await page.getByRole('button', { name: 'Admin-Übersicht aktualisieren', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Aktualisierung fehlgeschlagen' })).toContainText('letzten erfolgreichen Abruf');
  await expect(page.getByRole('heading', { name: 'Konten', exact: true })).toBeVisible();
});

test('work queue expands and sends administrators to the matching error workspace', async ({ page }) => {
  await overview(page);
  const queue = page.getByTestId('admin-work-queue');
  await expect(queue.getByRole('link')).toHaveCount(5);
  await queue.getByRole('button', { name: /weitere Aufgabenbereiche/ }).click();
  await expect(queue.getByRole('link', { name: /Vom Push-Dienst abgelehnte Versuche/ })).toBeVisible();
  await queue.getByRole('link', { name: /Aktive App-Fehlergruppen/ }).click();
  await expect(page.getByTestId('fixture-route')).toHaveText('/admin?tab=monitoring&monitoringView=errors&monitoringDays=30');
  expect(await page.evaluate(() => window.launchMonitoringQA.requests.some(request => request.path.endsWith('kws_monitoring_dashboard') && request.payload.p_days === 30))).toBe(true);
});

test('mobile menu exposes overview, operational areas and feedback with keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await overview(page);
  const nav = page.getByRole('navigation', { name: 'Adminnavigation', exact: true });
  for (const name of ['Übersicht', 'Benutzer', 'Halle', 'Moderation']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Mehr', exact: true }).focus();
  await page.keyboard.press('Enter');
  for (const name of ['Feedback', 'Monitoring', 'Protokoll', 'Push-Test']) await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav.getByRole('button', { name: 'Mehr', exact: true })).toBeFocused();
});

test('profile deep link fetches only its exact account and invalid or absent accounts never show another user', async ({ page }) => {
  await page.goto(`/test/fixtures/launchMonitoring.html?page=user&userId=${accountId}`);
  await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
  await expect(page.locator('article dd').filter({ hasText: 'alexandra@example.test' })).toBeVisible();
  expect(await page.evaluate(() => window.launchMonitoringQA.requests.filter(request => request.path.endsWith('/profiles')).every(request => new URLSearchParams(request.query).get('id') === `eq.00000000-0000-4000-8000-000000000001`))).toBe(true);
  await expect(page.getByRole('switch')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Passwort/ })).toHaveCount(0);
  await page.goto('/test/fixtures/launchMonitoring.html?page=user&userId=invalid');
  await expect(page.getByText('Ungültiger Nutzerlink', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.launchMonitoringQA.requests.some(request => request.path.endsWith('/profiles')))).toBe(false);
  await page.goto('/test/fixtures/launchMonitoring.html?page=user&userId=00000000-0000-4000-8000-000000000002');
  await expect(page.getByText('Dieses Nutzerkonto ist nicht verfügbar oder hat noch kein Profil.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle Benutzer anzeigen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
});

test('legacy and failed actor reads stay distinct from a guest report', async ({ page }) => {
  let dialog = await issue(page, 'actor-unavailable');
  await expect(dialog.getByRole('region', { name: 'Nutzerzuordnung', exact: true })).toContainText('auf dem Server noch nicht verfügbar');
  await expect(dialog.getByText('Ohne Konto gemeldet', { exact: true })).toHaveCount(0);
  await page.goto('/test/fixtures/launchMonitoring.html?monitoringView=errors&state=reports-error');
  await page.getByRole('button', { name: /App-Daten konnten nicht geladen werden/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('region', { name: 'Nutzerzuordnung', exact: true })).toContainText('konnte nicht geprüft');
  await expect(dialog.getByText('Alexandra Bergmann', { exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Zuordnung erneut prüfen', exact: true }).click();
  await expect(dialog.getByText('Ohne Konto gemeldet', { exact: true })).toHaveCount(0);
});
