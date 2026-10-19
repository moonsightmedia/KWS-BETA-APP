import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const widths = [375, 768, 1280, 1920];
const directory = 'test-results/launch-monitoring-optimized-20261018';
const consentNotice = 'Gezählt werden nur Nutzer, die der Nutzungsstatistik zugestimmt haben – nicht alle App-Nutzer.';
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
async function chooseIssueStatus(page: Page, label: string) {
  const selector = page.getByRole('combobox', { name: 'Fehlerstatus', exact: true });
  if (await selector.isVisible()) {
    await selector.click();
    await page.getByRole('option', { name: new RegExp(`^${label} \\(`) }).click();
  } else {
    await page.getByRole('group', { name: 'Fehlerstatus', exact: true }).getByRole('button', { name: new RegExp(`^${label} \\d+$`) }).click();
  }
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
    for (const [label, key] of [['Übersicht', 'overview'], ['Fehler', 'errors'], ['Nutzung', 'usage'], ['Mitteilungen', 'notifications'], ['Aktivität', 'activity']]) {
      await chooseView(page, label);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/loop1-${key}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
  }
});

test('activity uses current launch signals instead of disabled legacy telemetry', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await open(page, 'long');
    await chooseView(page, 'Aktivität');
    await expect(page.getByRole('heading', { name: 'Zuletzt aktiv gemeldet', exact: true })).toBeVisible();
    await expect(page.getByText('Instanz fixture-3a9f · Konto fixture-konto-82c1', { exact: true })).toBeVisible();
    await expect(page.getByText('Vordergrundsignal, höchstens 3 Minuten alt. Kein Nachweis, dass jemand den Bildschirm betrachtet.', { exact: true })).toBeVisible();
    if (width < 1280) {
      const activity = await page.getByRole('heading', { name: 'Zuletzt aktiv gemeldet', exact: true }).boundingBox();
      const popular = await page.getByRole('heading', { name: 'Häufig angesehene Boulder', exact: true }).boundingBox();
      expect(activity!.y).toBeLessThan(popular!.y);
    }
    expect(await page.evaluate(() => window.launchMonitoringQA.requests.every(request => /\/kws_monitoring_(dashboard|live)$/.test(request.path)))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await open(page, 'stale');
    await chooseView(page, 'Aktivität');
    await expect(page.getByText('Keine aktuellen Vordergrundsignale.', { exact: true })).toBeVisible();
    await expect(page.getByText('Instanz fixture-3a9f · Konto fixture-konto-82c1', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${directory}/loop2-activity-stale-${width}.png`, fullPage: true, animations: 'disabled' });
  }
});

test('live counts update on push signals, reconnect and filter without historical period; failures never show false zero', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await open(page);
    const live = page.getByTestId('live-monitoring');
    await expect(live.getByText('Online mit Zustimmung', { exact: true })).toBeVisible();
    await expect(live.getByText(consentNotice, { exact: true })).toBeVisible();
    await expect(live.getByText('Live verbunden', { exact: true })).toBeVisible();
    await expect(live.getByTestId('live-online')).toHaveText('12');
    await expect(live.getByRole('link', { name: /Grüne Kante/ })).toHaveAttribute('href', '/boulder/00000000-0000-4000-8000-000000000005');
    await page.evaluate(() => { Object.assign(window.launchMonitoringQA.live!, { online: 13, accounts: 10 }); window.dispatchEvent(new Event('qa:live-update')); });
    await expect(live.getByTestId('live-online')).toHaveText('13');
    await page.screenshot({ path: `${directory}/live-loop1-${width}.png`, fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { window.launchMonitoringQA.liveDisconnected = true; window.dispatchEvent(new Event('qa:live-connection')); });
    await expect(live.getByText('Verzögert · Ersatzabfrage alle 15 Sekunden')).toBeVisible();
    await page.evaluate(() => { window.launchMonitoringQA.liveError = true; window.dispatchEvent(new Event('qa:live-update')); });
    await expect(live.getByTestId('live-online')).toHaveText('–');
    await expect(live.getByText('Live-Daten nicht bestätigt', { exact: true })).toBeVisible();
    await expect(live.getByText(consentNotice, { exact: true })).toBeVisible();
    await page.screenshot({ path: `${directory}/live-loop2-error-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.evaluate(() => { window.launchMonitoringQA.liveError = false; window.launchMonitoringQA.liveDisconnected = false; window.dispatchEvent(new Event('qa:live-connection')); window.dispatchEvent(new Event('qa:live-update')); });
    await expect(live.getByTestId('live-online')).toHaveText('13');
    await chooseView(page, 'Aktivität');
    await expect(page.getByTestId('live-online')).toHaveText('13');
    const sheet = await openFilters(page);
    await sheet.getByRole('combobox', { name: 'Plattform' }).click();
    await page.getByRole('option', { name: 'Web', exact: true }).click();
    await sheet.getByRole('button', { name: 'Ergebnisse anzeigen' }).click();
    await expect.poll(() => page.evaluate(() => window.launchMonitoringQA.requests.some(request => request.path.endsWith('/kws_monitoring_live') && request.payload.p_platform === 'web' && !('p_days' in request.payload)))).toBe(true);
  }
});

test('live expiry hides old numbers during failed refresh and empty is a confirmed zero', async ({ page }) => {
  await open(page, 'empty');
  const live = page.getByTestId('live-monitoring');
  await expect(live.getByTestId('live-online')).toHaveText('0');
  await expect(live.getByText(consentNotice, { exact: true })).toBeVisible();
  await expect(live.getByText('Gerade ist kein Boulder geöffnet.', { exact: true })).toBeVisible();
  await page.clock.install();
  await page.evaluate(() => { window.launchMonitoringQA.liveError = true; });
  await page.clock.fastForward(46000);
  await expect(live.getByTestId('live-online')).toHaveText('–');
});

test('temporary HTTP failure recovers automatically even when the websocket stays connected and no new user arrives', async ({ page }) => {
  await open(page, 'empty');
  const live = page.getByTestId('live-monitoring');
  await expect(live.getByTestId('live-online')).toHaveText('0');
  await page.clock.install();
  await page.evaluate(() => { window.launchMonitoringQA.liveError = true; window.dispatchEvent(new Event('qa:live-update')); });
  await page.clock.fastForward(500);
  await expect(live.getByTestId('live-online')).toHaveText('–');
  await page.evaluate(() => { window.launchMonitoringQA.liveError = false; });
  await page.clock.fastForward(16000);
  await expect(live.getByTestId('live-online')).toHaveText('0');
  await expect(live.getByText('Live verbunden', { exact: true })).toBeVisible();
});

test('complete live view expands real rows and remains usable at all widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await open(page);
    await page.evaluate(() => {
      window.launchMonitoringQA.live!.boulders = Array.from({ length: 10 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: `Aktueller Boulder ${index + 1}`, viewers: 1 }));
      window.dispatchEvent(new Event('qa:live-update'));
    });
    await page.getByRole('button', { name: 'Live-Details', exact: true }).click();
    const live = page.getByTestId('live-monitoring');
    await expect(live.getByText('Online mit Zustimmung', { exact: true })).toBeVisible();
    await expect(live.getByText(consentNotice, { exact: true })).toBeVisible();
    await expect(live.getByRole('link')).toHaveCount(8);
    await live.getByRole('button', { name: 'Alle 10 Boulder anzeigen' }).focus();
    await page.keyboard.press('Enter');
    await expect(live.getByRole('link')).toHaveCount(10);
    await expect(live.getByText('9 angemeldet · 3 Gäste', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${directory}/live-full-loop2-${width}.png`, fullPage: true, animations: 'disabled' });
    await live.getByRole('button', { name: 'Weniger anzeigen' }).click();
    await expect(live.getByRole('link')).toHaveCount(8);
  }
});

test('live numbers align when the consent label wraps in narrow content', async ({ page }) => {
  await page.setViewportSize({ width: 335, height: 812 });
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  const live = page.getByTestId('live-monitoring');
  for (const view of ['overview', 'activity']) {
    if (view === 'activity') await page.getByRole('button', { name: 'Live-Details', exact: true }).click();
    await expect(live.getByTestId('live-online')).toHaveText('12');
    const online = (await live.getByTestId('live-online').boundingBox())!;
    const viewers = (await live.getByTestId('live-viewers').boundingBox())!;
    expect(Math.abs(online.y - viewers.y)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('consent scope is prominent in both live views at every required width', async ({ page }) => {
  const output = 'test-results/launch-monitoring-consent-20261019';
  await mkdir(output, { recursive: true });
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 960 });
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    const live = page.getByTestId('live-monitoring');
    for (const view of ['overview', 'activity']) {
      if (view === 'activity') await page.getByRole('button', { name: 'Live-Details', exact: true }).click();
      const notice = live.getByText(consentNotice, { exact: true });
      await expect(notice).toBeVisible();
      await expect(live.getByTestId('live-online')).toHaveText('12');
      const noticeBounds = (await notice.boundingBox())!;
      const countBounds = (await live.getByTestId('live-online').boundingBox())!;
      expect(noticeBounds.y + noticeBounds.height).toBeLessThanOrEqual(countBounds.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await live.screenshot({ path: `${output}/loop1-${view}-${width}.png`, animations: 'disabled' });
      await page.evaluate(() => { window.launchMonitoringQA.liveError = true; window.dispatchEvent(new Event('qa:live-update')); });
      await expect(live.getByTestId('live-online')).toHaveText('–');
      await expect(notice).toBeVisible();
      await live.screenshot({ path: `${output}/loop2-${view}-error-${width}.png`, animations: 'disabled' });
      await page.evaluate(() => { window.launchMonitoringQA.liveError = false; window.dispatchEvent(new Event('qa:live-update')); });
      await expect(live.getByTestId('live-online')).toHaveText('12');
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
  await expect(page.getByText('Konten sind diesem Filter nicht zuordenbar', { exact: true })).toBeVisible();
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
  await expect(dialog.getByText('Letzte Einzelberichte')).not.toBeVisible();
  await dialog.getByText('Technische Details', { exact: true }).click();
  await expect(dialog.getByText('Letzte Einzelberichte')).toBeVisible();
  await dialog.getByText('Technische Details', { exact: true }).click();
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
  await expect(page.getByText('2 von 2 geladenen Problemen', { exact: true })).toBeVisible();
});

test('issue inbox defaults to active work and keeps resolved and ignored issues out of the queue', async ({ page }) => {
  await open(page, 'workspace');
  await chooseView(page, 'Fehler');
  const list = page.getByRole('list', { name: 'Fehlerliste' });
  await expect(list.getByRole('button')).toHaveCount(4);
  await expect(list.getByRole('button').first()).toContainText('Video nach bestätigter Korrektur erneut ausgefallen');
  await expect(list).not.toContainText('Bewusst ignorierter Testfall');
  await expect(list).not.toContainText('Technischer Fehler gemeldet');
  await expect(list.getByText('Betroffene Geräte unbekannt')).toBeVisible();
  await expect(list.getByText('0 Nutzerreferenzen')).toHaveCount(0);
  await chooseIssueStatus(page, 'Behoben');
  await expect(list.getByRole('button')).toHaveCount(1);
  await expect(list).toContainText('Technischer Fehler gemeldet');
  await chooseIssueStatus(page, 'Alle');
  await expect(list.getByRole('button')).toHaveCount(6);
  await expect(list).toContainText('Bewusst ignorierter Testfall');
  await page.getByRole('combobox', { name: 'Fehler sortieren' }).click();
  await page.getByRole('option', { name: 'Zuletzt aufgetreten', exact: true }).click();
  await expect(list.getByRole('button').last()).toContainText('Abgebrochener Vorgang gemeldet');
  await page.getByRole('textbox', { name: 'Fehlergruppen filtern' }).fill('JAVASCRIPT-REACT-J');
  await expect(list.getByRole('button')).toHaveCount(1);
  await expect(list).toContainText('Auswirkung noch ungeklärt');
});

test('issue source, status, search and sorting survive scope changes without pretending hidden Sentry data is zero', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page, 'workspace');
  await chooseView(page, 'Fehler');
  await chooseIssueStatus(page, 'Alle');
  await page.getByRole('combobox', { name: 'Fehlerquelle' }).click();
  await page.getByRole('option', { name: 'Sentry', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Fehlerliste' }).getByRole('button')).toHaveCount(2);
  const sheet = await openFilters(page);
  await sheet.getByRole('combobox', { name: 'Plattform', exact: true }).click();
  await page.getByRole('option', { name: 'Web', exact: true }).click();
  await sheet.getByRole('button', { name: 'Ergebnisse anzeigen' }).click();
  await expect(page.getByText('Sentry ist mit Plattform- oder Versionsfilter ausgeblendet.')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Fehlerquelle' })).toContainText('Sentry');
  await expect(page.getByRole('list', { name: 'Fehlerliste' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Diese Filter aufheben' }).click();
  await expect(page.getByRole('list', { name: 'Fehlerliste' }).getByRole('button')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Monitoringzeitraum', exact: true }).click();
  await page.getByRole('option', { name: '7 Tage', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Fehlerquelle' })).toContainText('Sentry');
  await expect(page.getByRole('combobox', { name: 'Fehlerstatus', exact: true })).toContainText('Alle');
  await expect.poll(() => page.evaluate(() => window.launchMonitoringQA.requests.filter(request => request.path.endsWith('kws_monitoring_dashboard')).at(-1)?.payload.p_days)).toBe(7);
  await page.getByRole('textbox', { name: 'Fehlergruppen filtern' }).fill('web 1.0.246');
  await expect(page.getByRole('list', { name: 'Fehlerliste' }).getByRole('button')).toHaveCount(1);
  await chooseView(page, 'Übersicht');
  await chooseView(page, 'Fehler');
  await expect(page.getByRole('textbox', { name: 'Fehlergruppen filtern' })).toHaveValue('web 1.0.246');
});

test('issue inbox design loops show clear source semantics at all widths and support keyboard details', async ({ page }) => {
  const output = 'test-results/launch-monitoring-inbox-20261019';
  await mkdir(output, { recursive: true });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await open(page, 'workspace');
    await chooseView(page, 'Fehler');
    await expect(page.getByText('4 von 6 geladenen Problemen')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${output}/loop1-active-${width}.png`, fullPage: true, animations: 'disabled' });
    await chooseIssueStatus(page, 'Alle');
    await page.getByRole('combobox', { name: 'Fehlerquelle' }).click();
    await page.getByRole('option', { name: 'Sentry', exact: true }).click();
    await expect(page.getByText('Gesamter Problemverlauf', { exact: true })).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${output}/loop2-sentry-${width}.png`, fullPage: true, animations: 'disabled' });
    const trigger = page.getByRole('list', { name: 'Fehlerliste' }).getByRole('button').first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /In Sentry öffnen/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});

test('issue source failures and load limits do not masquerade as a complete healthy inbox', async ({ page }) => {
  await open(page, 'issues-error');
  await chooseView(page, 'Fehler');
  await expect(page.getByText('Fehlerquelle derzeit nicht verfügbar', { exact: true })).toBeVisible();
  await expect(page.getByText('Keine verlässliche Fehlerübersicht', { exact: true })).toBeVisible();
  await expect(page.getByText('Keine Probleme gemeldet', { exact: true })).toHaveCount(0);
  await open(page, 'limit');
  await chooseView(page, 'Fehler');
  await expect(page.getByText(/Die Ladegrenze von 200 Problemen ist erreicht/)).toBeVisible();
  await page.evaluate(() => { window.launchMonitoringQA.readMode = 'fail'; });
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByText('Aktualisierung fehlgeschlagen', { exact: true })).toBeVisible();
  await expect(page.getByText('200 von 200 geladenen Problemen')).toBeVisible();
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
  const dialog = page.getByRole('dialog', { name: 'Video konnte nicht abgespielt werden', exact: true });
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Behoben', exact: true }).click();
  await dialog.getByLabel('Behoben ab App-Version').fill('android@1.0.68');
  await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Status gespeichert.');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Monitoringansicht', exact: true }).getByRole('button', { name: 'Übersicht', exact: true })).toBeFocused();
});

test('error detail design loops keep plain-language guidance and fixed actions usable at all widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, 'query');
    await page.getByRole('button', { name: /App-Daten konnten nicht geladen werden/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'App-Daten wurden nicht geladen', exact: true })).toBeVisible();
    await expect(dialog.getByText('Das kannst du tun', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Webbrowser', { exact: true })).toBeVisible();
    await expect(dialog.getByText('1.0.246', { exact: true })).toBeVisible();
    await expect(dialog.getByText(/Ob Gerät, Netzwerk oder Server die Ursache war/)).toBeVisible();
    await expect(dialog.getByText('kws-beta-app@1.0.246+5086e1f42b61', { exact: true })).not.toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    if (width >= 768) expect(bounds!.width).toBeLessThanOrEqual(680);
    for (const label of ['Fehleransicht schließen', 'Schließen', 'Status speichern']) {
      const action = dialog.getByRole('button', { name: label, exact: true });
      const box = await action.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(900);
      await expect(action).toHaveCSS('height', '44px');
    }
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: `${directory}/issue-loop1-query-${width}.png`, animations: 'disabled' });
    await dialog.getByText('Technische Details', { exact: true }).click();
    await expect(dialog.getByText('kws-beta-app@1.0.246+5086e1f42b61', { exact: true })).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
    await page.getByRole('option', { name: 'In Bearbeitung', exact: true }).click();
    await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('Status gespeichert.');
    await page.screenshot({ path: `${directory}/issue-loop2-saved-${width}.png`, animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Fehleransicht schließen', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test('support copy exports a useful technical reference without identities or arbitrary properties', async ({ page }) => {
  let copied = '';
  await page.exposeFunction('recordCopiedReport', (value: string) => { copied = value; });
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => (window as unknown as { recordCopiedReport: (text: string) => Promise<void> }).recordCopiedReport(value) } }));
  await open(page, 'query');
  await page.getByRole('button', { name: /App-Daten konnten nicht geladen werden/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('region', { name: 'Was bedeutet das?', exact: true }).getByText(/Ob Gerät, Netzwerk oder Server/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Bericht für Technik kopieren', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Bericht kopiert');
  expect(copied).toContain('fixture-event-82');
  expect(copied).toContain('QueryNetwork');
  expect(copied).not.toContain('fixture-3a9f');
  expect(copied).not.toContain('do-not-export');
});

test('a saved status becomes the confirmed baseline and reversing it is a new protected edit', async ({ page }) => {
  await open(page, 'query');
  await page.getByRole('button', { name: /App-Daten konnten nicht geladen werden/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'In Bearbeitung', exact: true }).click();
  await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Status gespeichert.');
  await expect(dialog.getByText('In Bearbeitung', { exact: true })).toHaveCount(2);
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Offen', exact: true }).click();
  await expect(dialog.getByText('In Bearbeitung', { exact: true })).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'Status speichern', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Fehleransicht schließen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
  await dialog.getByRole('button', { name: 'Status speichern', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Status gespeichert.');
  await dialog.getByRole('button', { name: 'Fehleransicht schließen', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('clipboard failure offers a selectable report and unavailable reports remain visible and retryable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('clipboard blocked'); } } }));
  await open(page, 'reports-error');
  await page.getByRole('button', { name: /App-Daten konnten nicht geladen werden/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('Technische Einzelberichte');
  await dialog.getByRole('button', { name: 'Bericht für Technik kopieren', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Bericht manuell kopieren', exact: true })).toHaveValue(/Beta – technischer Fehlerbericht/);
  await dialog.getByText('Technische Details', { exact: true }).click();
  await page.evaluate(() => { window.launchMonitoringQA.eventMode = 'success'; });
  await dialog.getByRole('button', { name: 'Erneut laden', exact: true }).click();
  await expect(dialog.getByText(/Technische Einzelberichte konnten nicht/)).toHaveCount(0);
  await expect(dialog.getByRole('region', { name: 'Was bedeutet das?', exact: true }).getByText(/Ob Gerät, Netzwerk oder Server/)).toBeVisible();
});

test('long unknown errors, empty reports and a short mobile viewport keep a reachable close action', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 568 });
  await open(page, 'long');
  await page.getByRole('button', { name: /Technischer Fehler gemeldet/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Video konnte nicht abgespielt werden', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Fehleransicht schließen', exact: true })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: 'Schließen', exact: true })).toBeInViewport();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: `${directory}/issue-short-mobile-375.png`, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).click();
  await open(page, 'reports-empty');
  await page.getByRole('button', { name: /App-Daten konnten nicht geladen werden/ }).click();
  await dialog.getByText('Technische Details', { exact: true }).click();
  await expect(dialog.getByText('Keine Einzelberichte mehr verfügbar.', { exact: true })).toBeVisible();
});
