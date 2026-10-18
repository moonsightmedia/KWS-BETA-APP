import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const widths = [375, 768, 1280, 1920];
const directory = 'test-results/launch-monitoring-20261017';
async function open(page: Page, state = '') { await page.goto(`/test/fixtures/launchMonitoring.html${state ? `?state=${state}` : ''}`); }
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
      await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: label, exact: true }).click();
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
  await page.getByRole('combobox', { name: 'Plattform', exact: true }).click();
  await page.getByRole('option', { name: 'Android', exact: true }).click();
  await expect(page.getByText('Nicht verfügbar', { exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.launchMonitoringQA.requests.filter(request => request.path.endsWith('kws_monitoring_dashboard')).at(-1)?.payload)).toEqual({ p_days: 7, p_platform: 'android', p_release: 'all' });
  await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Uploads', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Upload-Sessions filtern' })).toBeVisible();
  await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Übersicht', exact: true }).click();
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
  await expect(page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Übersicht', exact: true })).toBeFocused();
});

test('stale foreground entries disappear and notification acceptance is not display proof', async ({ page }) => {
  await open(page, 'stale');
  await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Nutzung', exact: true }).click();
  await expect(page.getByText('Keine aktuellen Vordergrundsignale.')).toBeVisible();
  await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Mitteilungen', exact: true }).click();
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
  await page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Fehler', exact: true }).click();
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
