import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('test-results/admin-block-20260913', { recursive: true });
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

async function openFixture(page: Page, view = 'users', state = '', integration = false) {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route(/\/src\/hooks\/(useAuth\.tsx|useIsAdmin\.tsx|useHasRole\.ts)(\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/integrations/supabase/client.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-foundations-hooks.ts';" }));
  await page.route('**/src/components/DashboardHeader.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export const DashboardHeader = () => null; export const AdminTabTitleProvider = ({children}) => children;" }));
  await page.route(/\/src\/components\/admin\/(ColorManagement|SectorManagement|HallMapManagement|BoulderOperationLogs|FeedbackManagement|PushNotificationTest)\.tsx(\?.*)?$/, route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!.replace('.tsx', '');
    return route.fulfill({ contentType: 'application/javascript', body: `export const ${name} = () => 'Isoliert: ${name}';` });
  });
  await page.goto(`/test/fixtures/admin-foundations.html?view=${view}&state=${state}${integration ? '&integration=1' : ''}`);
}

test('capture admin component comparisons', async ({ page }) => {
  const phase = process.env.ADMIN_CAPTURE_PHASE || 'after';
  const directory = 'test-results/admin-block-20260913';
  await mkdir(directory, { recursive: true });
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page);
    await page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true }).click();
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: `${directory}/${phase}-user-${width}.png`, animations: 'disabled' });
    await openFixture(page, 'monitoring', 'partial');
    await expect(page.getByRole('button', { name: 'Aktualisieren', exact: true })).toBeVisible();
    await page.screenshot({ path: `${directory}/${phase}-monitoring-${width}.png`, animations: 'disabled' });
  }
});

async function openEditor(page: Page) {
  await openFixture(page);
  await page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Admin-Rechte', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('profile editor protects drafts, supports Escape and restores focus', async ({ page }) => {
  await openEditor(page);
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Geburtsdatum', { exact: false })).toHaveValue('12.06.1994');
  await page.getByLabel('Vorname', { exact: true }).fill('Alex');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-block-20260913/after-discard.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByLabel('Vorname', { exact: true })).toHaveValue('Alex');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.adminQA.writes.length)).toBe(0);
});

test('profile validates before saving and saves one confirmed payload', async ({ page }) => {
  await openEditor(page);
  await page.getByLabel('Geburtsdatum', { exact: false }).fill('31.02.2000');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('Geburtsdatum', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Geburtsdatum', { exact: false })).toBeFocused();
  expect(await page.evaluate(() => window.adminQA.writes.length)).toBe(0);
  await page.getByLabel('Geburtsdatum', { exact: false }).fill('29.02.2000');
  await page.getByLabel('Vorname', { exact: true }).fill(' Alex ');
  await page.evaluate(() => { window.adminQA.delay = 800; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByLabel('Vorname', { exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.adminQA.writes)).toEqual([{ table: 'profiles', id: 'qa-member', payload: { first_name: 'Alex', last_name: 'Bergmann', full_name: 'Alex Bergmann', birth_date: '2000-02-29' } }]);
  await expect(page.getByRole('heading', { name: 'Alex Bergmann', exact: true })).toBeVisible();
});

for (const mode of ['fail', 'empty'] as const) test(`profile ${mode} update preserves draft and can recover`, async ({ page }) => {
  await openEditor(page);
  await page.getByLabel('Vorname', { exact: true }).fill('Alex');
  await page.evaluate(mode => { window.adminQA.writeMode = mode; }, mode);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Deine Eingaben bleiben erhalten');
  await expect(page.getByLabel('Vorname', { exact: true })).toHaveValue('Alex');
  await page.evaluate(() => { window.adminQA.writeMode = 'success'; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('monitoring distinguishes complete failure, partial failure, empty data and recovery', async ({ page }) => {
  await openFixture(page, 'monitoring', 'error');
  await expect(page.getByRole('alert')).toContainText('8 von 8 Abfragen fehlgeschlagen');
  await expect(page.getByText('Nicht verfügbar', { exact: true })).toHaveCount(5);
  await expect(page.getByText('0', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { window.adminQA.failSources = ['upload_logs']; });
  await page.getByRole('button', { name: 'Erneut laden', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('3 von 8 Abfragen fehlgeschlagen');
  await expect(page.getByText('Nicht verfügbar', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Upload-Sessions filtern' })).toBeDisabled();
  await expect(page.getByText('Keine Upload-Logs in den letzten 24 Stunden.', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { window.adminQA.failSources = []; });
  await page.getByRole('button', { name: 'Erneut laden', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Übersicht', exact: true }).click();
  await expect(page.getByText('0', { exact: true })).toHaveCount(5);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.getByRole('textbox', { name: 'Upload-Sessions filtern' }).fill('nicht vorhanden');
  await expect(page.getByText('Keine Treffer für diesen Filter.')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(page.getByText('Keine Upload-Logs in den letzten 24 Stunden.', { exact: true })).toBeVisible();
});

test('all six mobile admin destinations and keyboard menu are reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openFixture(page);
  const nav = page.getByRole('navigation', { name: 'Adminnavigation', exact: true });
  await expect(nav).toBeVisible();
  for (const label of ['Benutzer', 'Halle', 'Feedback']) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await nav.getByRole('button', { name: 'Betrieb', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-block-20260913/after-mobile-navigation.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(nav.getByRole('button', { name: 'Betrieb', exact: true })).toBeFocused();
  for (const label of ['Monitoring', 'Protokoll', 'Push-Test']) {
    await nav.getByRole('button', { name: /^Betrieb/ }).click();
    await page.getByRole('menuitem', { name: label, exact: true }).click();
    await expect(nav.getByRole('button', { name: 'Betrieb: ' + label, exact: true })).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(0);
  }
  await nav.getByRole('button', { name: /^Betrieb/ }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(nav).toBeHidden();
});

test('dialog fits short mobile screens with one scrolling body and fixed actions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 550 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  const dialog = page.getByRole('dialog');
  const box = await dialog.boundingBox();
  expect(box!.x).toBe(0);
  expect(box!.width).toBe(375);
  expect(box!.y).toBeGreaterThanOrEqual(15);
  expect(box!.y + box!.height).toBeCloseTo(550, 0);
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-block-20260913/after-user-short.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Benutzereditor schließen' }).click();
  await expect(dialog).toHaveCount(0);
});

test('actual admin page mounts a single active content tree at every width', async ({ page }) => {
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'users', '', true);
    await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toHaveCount(1);
    await page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true }).click();
    await expect(page.locator('button[role="switch"]')).toHaveCount(2);
    const duplicates = await page.locator('[id]').evaluateAll(elements => { const ids = elements.map(el => el.id); return ids.filter((id, index) => ids.indexOf(id) !== index); });
    expect(duplicates).toEqual([]);
    if (width >= 768) {
      await expect(page.locator('#desktop-navigation a[aria-current="page"]')).toHaveCount(1);
      await page.getByRole('link', { name: 'Halle', exact: true }).click();
      await page.getByRole('tab', { name: 'Farben', exact: true }).click();
      await expect(page.getByText('Isoliert: ColorManagement', { exact: true })).toHaveCount(1);
      await page.getByRole('link', { name: 'Monitoring', exact: true }).click();
      await expect(page.getByRole('group', { name: 'Monitoringansicht', exact: true })).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await openFixture(page, 'invalid', '', true);
  await expect(page.getByRole('heading', { name: 'Alexandra Bergmann', exact: true })).toBeVisible();
  await openFixture(page, 'users', 'auth-loading', true);
  await expect(page.getByRole('status', { name: 'Adminbereich wird geladen' })).toBeVisible();
  await expect(page.getByTestId('current-route')).toHaveText('/admin?tab=users');
});

test('monitoring starts with a loading state and times out unavailable sources', async ({ page }) => {
  await openFixture(page, 'monitoring', 'loading');
  await expect(page.getByText('Monitoring wird geladen …', { exact: true })).toBeVisible();
  await expect(page.getByText('0', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Aktualisieren', exact: true })).toBeVisible();
  await page.clock.install();
  await openFixture(page, 'monitoring', 'timeout');
  await expect(page.getByText('Monitoring wird geladen …', { exact: true })).toBeVisible();
  await page.clock.runFor(16000);
  await expect(page.getByRole('alert')).toContainText('8 von 8 Abfragen fehlgeschlagen');
  await expect(page.getByText('0', { exact: true })).toHaveCount(0);
});
