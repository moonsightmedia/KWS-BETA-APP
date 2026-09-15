import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const directory = 'test-results/admin-workbench-20260914';
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  (page as Page & { errors: string[] }).errors = errors;
  await mkdir(directory, { recursive: true });
});
test.afterEach(async ({ page }) => expect((page as Page & { errors: string[] }).errors).toEqual([]));
async function openFixture(page: Page, view = 'users', state = '') {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route(/\/src\/hooks\/(useAuth\.tsx|useIsAdmin\.tsx|useHasRole\.ts)(\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/integrations/supabase/client.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/components/DashboardHeader.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const DashboardHeader = () => null; export const AdminTabTitleProvider = ({children}) => children;' }));
  await page.route(/\/src\/components\/admin\/(ColorManagement|SectorManagement|HallMapManagement|FeedbackManagement)\.tsx(\?.*)?$/, route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!.replace('.tsx', '');
    return route.fulfill({ contentType: 'application/javascript', body: `export const ${name} = () => null;` });
  });
  await page.goto(`/test/fixtures/admin-foundations.html?workbench=1&many=1&view=${view}&state=${state}`);
}

test('capture workbench comparison', async ({ page }) => {
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['users', 'monitoring', 'logs', 'tests']) {
      await openFixture(page, view);
      if (view === 'users') await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
      if (view === 'monitoring') await expect(page.getByText('Feedback-Fehler · 24 h', { exact: true })).toBeVisible();
      if (view === 'logs') await expect(page.getByText(/Einzeloperationen/)).toBeVisible();
      if (view === 'tests') await expect(page.getByLabel('Titel', { exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/${process.env.ADMIN_CAPTURE_PHASE || 'after'}-${view}-${width}.png`, animations: 'disabled' });
    }
  }
  expect(errors).toEqual([]);
});

test('users: view, search, result order; role filters, sorting, empty state and protected admin', async ({ page }) => {
  await openFixture(page);
  const count = page.getByText('43 Benutzer', { exact: true });
  await expect(count).toBeVisible();
  const group = page.getByRole('group', { name: 'Benutzer nach Rolle filtern' });
  const search = page.getByLabel('Benutzer nach Name oder E-Mail suchen');
  expect((await group.boundingBox())!.y).toBeLessThan((await search.boundingBox())!.y);
  expect((await search.boundingBox())!.y).toBeLessThan((await count.boundingBox())!.y);
  await page.getByRole('button', { name: 'Admins', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('heading', { name: 'Lena Berg1' }).click();
  await expect(page.getByRole('switch', { name: 'Admin-Rechte' })).toBeDisabled();
  await search.fill('gibt-es-nicht');
  await expect(page.getByText('Keine Benutzer gefunden.')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await page.getByRole('combobox', { name: 'Benutzer sortieren' }).click();
  await page.getByRole('option', { name: 'Name A–Z' }).click();
  await expect(page.locator('article').first()).toContainText('Alexandra Bergmann');
  await page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Setter-Rechte' })).toBeChecked();
  await page.getByRole('switch', { name: 'Setter-Rechte' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(await page.evaluate(() => window.adminQA.writes)).toEqual([]);
});

test('monitoring: search, status, full details, live pause and activity at four widths', async ({ page }) => {
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'monitoring');
    await expect(page.getByText('Letzte Uploads', { exact: true })).toBeVisible();
    await page.getByRole('switch', { name: 'Live · jede Minute' }).click();
    await expect(page.getByRole('switch', { name: 'Live · jede Minute' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Uploads', exact: true }).click();
    await page.getByRole('combobox', { name: 'Uploadstatus' }).click();
    await page.getByRole('option', { name: 'Fehler / Abbruch' }).click();
    await expect(page.getByText('1 von 3 Uploads', { exact: false })).toBeVisible();
    const row = page.getByRole('button', { name: /^Fehlgeschlagen/ });
    await row.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Die Verbindung wurde unterbrochen. Bitte erneut versuchen.');
    await expect(dialog).toContainText('session-2');
    if (width === 375) { const box = await dialog.boundingBox(); expect(box!.x).toBe(0); expect(box!.width).toBe(375); expect(Math.round(box!.y + box!.height)).toBe(900); }
    await page.screenshot({ path: `${directory}/upload-detail-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(row).toBeFocused();
    await page.getByLabel('Upload-Sessions filtern').fill('unfindbar');
    await expect(page.getByText('Keine Treffer für diesen Filter.')).toBeVisible();
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await page.getByRole('button', { name: 'Aktivität', exact: true }).click();
    await expect(page.getByText('test-device-iphone', { exact: true })).toBeVisible();
    await page.getByText('Upload abgeschlossen', { exact: false }).click();
    await expect(page.getByText('session-0', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${directory}/activity-${width}.png`, animations: 'disabled' });
  }
});

test('logs: real filters, search, full-width sheet, keyboard detail and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 550 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page, 'logs');
  await expect(page.getByText('3 Einzeloperationen · 2 Gruppen')).toBeVisible();
  await page.getByRole('button', { name: 'Bearbeitet', exact: true }).click();
  await expect(page.getByText('1 Einzeloperation · 1 Gruppe')).toBeVisible();
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.getByLabel('Protokoll durchsuchen').fill('Pfeil');
  await expect(page.getByText('1 Einzeloperation · 1 Gruppe')).toBeVisible();
  await page.getByRole('button', { name: /Alexandra Bergmann/ }).click();
  const detail = page.getByRole('button', { name: /Grüner Pfeil/ });
  await detail.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('Grüner Pfeil');
  await expect(page.getByRole('button', { name: 'Schließen', exact: true })).toBeInViewport();
  await page.screenshot({ path: `${directory}/log-detail-short.png`, animations: 'disabled' });
  await page.keyboard.press('Escape'); await expect(detail).toBeFocused();
  await page.getByRole('button', { name: 'Suche löschen' }).click();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.x).toBe(0); expect(box!.width).toBe(375); expect(Math.round(box!.y + box!.height)).toBe(550);
  await page.getByRole('combobox', { name: 'Person', exact: true }).click();
  await page.getByRole('option', { name: 'Alexandra Bergmann' }).click();
  await page.getByRole('button', { name: 'Fertig' }).click();
  await expect(page.getByText('2 Einzeloperationen · 1 Gruppe')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter · 1' })).toBeFocused();
  await page.getByRole('button', { name: 'Filter · 1' }).click();
  await page.getByRole('combobox', { name: 'Zeitraum' }).click();
  await page.getByRole('option', { name: 'Letzte 7 Tage' }).click();
  await page.getByRole('button', { name: 'Fertig' }).click();
  expect(await page.evaluate(() => window.adminQA.reads?.some(url => decodeURIComponent(url).includes('created_at=gte.')))).toBe(true);
  expect(await page.evaluate(() => window.adminQA.writes)).toEqual([]);
});

test('push: preview, private device list, one request, honest provider result and unchanged draft', async ({ page }) => {
  let sent = 0;
  await openFixture(page, 'tests');
  await page.route('**/functions/v1/send-push-notification', async route => { sent++; await new Promise(resolve => setTimeout(resolve, 500)); await route.fulfill({ json: { success: true, results: [{ success: true }, { success: false }] } }); });
  await page.getByLabel('Titel', { exact: true }).fill('Boulder-Test');
  await page.getByLabel('Nachricht', { exact: true }).fill('Hallo\nKletterwelt');
  await expect(page.getByRole('complementary', { name: 'Nachrichtenvorschau' })).toContainText('Boulder-Test');
  await page.getByRole('button', { name: 'Geräte', exact: true }).click();
  await expect(page.getByText('iPhone / iPad')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('synthetic-device');
  const reads = await page.evaluate(() => window.adminQA.reads!.filter(url => url.includes('push_tokens')));
  expect(reads.every(url => !url.includes('select=token'))).toBe(true);
  await page.getByRole('button', { name: 'Nachricht', exact: true }).click();
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Boulder-Test');
  await page.getByRole('button', { name: 'Test-Benachrichtigung senden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wird gesendet …' })).toBeDisabled();
  await expect(page.getByLabel('Titel', { exact: true })).toBeDisabled();
  await expect(page.getByText('Nur teilweise angenommen', { exact: true })).toBeVisible();
  expect(sent).toBe(1);
  await page.screenshot({ path: `${directory}/push-partial.png`, animations: 'disabled' });
  await page.getByLabel('Titel', { exact: true }).fill('   ');
  await expect(page.getByRole('button', { name: 'Test-Benachrichtigung senden' })).toBeDisabled();
});

for (const outcome of ['accepted', 'rejected', 'unconfirmed', 'disabled', 'no_devices'] as const) test('push outcome: ' + outcome, async ({ page }) => {
  let sends = 0;
  await openFixture(page, 'tests');
  await expect(page.getByRole('button', { name: 'Test-Benachrichtigung senden' })).toBeEnabled();
  await page.route('**/functions/v1/send-push-notification', route => { sends++; return route.fulfill({ json: outcome === 'unconfirmed' ? { success: true } : { success: true, results: [{ success: outcome === 'accepted' }, { success: outcome === 'accepted' }] } }); });
  if (outcome === 'disabled') await page.evaluate(() => { window.adminQA.pushEnabled = false; });
  if (outcome === 'no_devices') await page.evaluate(() => { window.adminQA.pushDevicesEmpty = true; });
  await page.getByRole('button', { name: 'Test-Benachrichtigung senden' }).click();
  await expect(page.getByText(outcome === 'accepted' ? 'Vom Push-Dienst angenommen' : outcome === 'rejected' ? 'Vom Push-Dienst abgelehnt' : outcome === 'unconfirmed' ? 'Versand nicht vollständig bestätigt' : 'Nicht gesendet', { exact: true })).toBeVisible();
  expect(sends).toBe(outcome === 'disabled' || outcome === 'no_devices' ? 0 : 1);
});

test('push read errors, disabled/empty setup, read timeout and recovery are not success', async ({ page }) => {
  await openFixture(page, 'tests', 'error');
  await expect(page.getByText('Gerätestatus nicht verfügbar. Bitte erneut laden.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test-Benachrichtigung senden' })).toBeDisabled();
  await page.evaluate(() => { window.adminQA.failSources = []; window.adminQA.pushEnabled = false; });
  await page.getByRole('button', { name: 'Erneut laden' }).click();
  await expect(page.getByText('Aktiviere Push in deinen Benachrichtigungseinstellungen.')).toBeVisible();
  await page.evaluate(() => { window.adminQA.pushEnabled = true; window.adminQA.pushDevicesEmpty = true; });
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByText(/Noch kein Gerät registriert/)).toBeVisible();
  await page.clock.install();
  await openFixture(page, 'tests', 'timeout');
  await expect(page.getByText('Geräte werden geprüft …')).toBeVisible();
  await page.clock.runFor(16_000);
  await expect(page.getByText('Gerätestatus nicht verfügbar. Bitte erneut laden.')).toBeVisible();
});

test('push send timeout remains unconfirmed and unlocks manual retry', async ({ page }) => {
  await openFixture(page, 'tests');
  await expect(page.getByRole('button', { name: 'Test-Benachrichtigung senden' })).toBeEnabled();
  await page.clock.install();
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = (input, init) => String(input).includes('/functions/v1/send-push-notification') ? new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new DOMException('Test timeout', 'AbortError')))) : original(input, init);
  });
  await page.getByRole('button', { name: 'Test-Benachrichtigung senden' }).click();
  await expect(page.getByRole('button', { name: 'Wird gesendet …' })).toBeDisabled();
  await page.clock.runFor(21_000);
  await expect(page.getByText('Versand nicht bestätigt', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test-Benachrichtigung senden' })).toBeEnabled();
});

test('comparison page switches all screenshots without missing images', async ({ page }) => {
  await page.goto('/test-results/admin-workbench-20260914/comparison.html');
  for (const view of ['users', 'monitoring', 'logs', 'tests']) {
    await page.locator('[data-view="' + view + '"]').click();
    for (const width of [375, 768, 1280, 1920]) {
      await page.locator('[data-width="' + width + '"]').click();
      await expect(page.locator('#after')).toHaveAttribute('src', `after-${view}-${width}.png`);
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    }
  }
});
