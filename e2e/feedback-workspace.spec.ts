import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'test-results/feedback-workspace-20260914';
async function open(page: Page, large = false) {
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route(/\/src\/hooks\/useAuth\.tsx(\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-operations-hooks.ts';" }));
  await page.route('**/src/integrations/supabase/client.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export { supabase } from '/test/fixtures/admin-operations-hooks.ts';" }));
  await page.goto(`/test/fixtures/admin-operations.html?view=feedback${large ? '&large=1' : ''}`);
  await expect(page.getByText('3 Treffer von 3 insgesamt')).toBeVisible();
}
async function editor(page: Page) {
  await page.getByRole('button', { name: /Video lädt nicht/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await mkdir(output, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  (page as Page & { errors: string[] }).errors = errors;
});
test.afterEach(async ({ page }) => { expect((page as Page & { errors: string[] }).errors).toEqual([]); });

test('responsive list, automatic groups, sheet and editor at all four widths', async ({ page }) => {
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${output}/people-${width}.png`, animations: 'disabled' });
    if (width >= 768) {
      await expect(page.getByRole('button', { name: 'Feedback aktualisieren' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Aktualisieren', exact: true })).toBeVisible();
      expect((await page.getByRole('group', { name: 'Feedbackansicht' }).boundingBox())?.width).toBeLessThanOrEqual(480);
    }
    await page.getByRole('button', { name: 'Automatische Fehler', exact: true }).click();
    await expect(page.getByText('1105 Fehlermeldungen von 1105 insgesamt · 2 Gruppen')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(2);
    await page.screenshot({ path: `${output}/errors-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: /^Filter/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    if (width === 375) {
      const box = await dialog.boundingBox();
      expect(box?.x).toBe(0); expect(box?.width).toBe(width);
      expect(Math.round((box?.y || 0) + (box?.height || 0))).toBe(900);
    }
    await page.screenshot({ path: `${output}/filter-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Rückmeldungen', exact: true }).click();
    await editor(page);
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Priorität', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Typ', exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/editor-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
  }
});

test('filters keep global totals, empty search differs from empty catalog, Escape discards draft', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /^Filter/ }).click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Geschlossen', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('3 Treffer von 3 insgesamt')).toBeVisible();
  await page.getByRole('button', { name: /^Filter/ }).click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: 'Geschlossen', exact: true }).click();
  await page.getByRole('button', { name: 'Anwenden' }).click();
  await expect(page.getByText('0 Treffer von 3 insgesamt')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keine passenden Einträge' })).toBeVisible();
  await expect(page.getByText('Noch kein Feedback vorhanden.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
  await expect(page.getByText('3 Treffer von 3 insgesamt')).toBeVisible();
});

test('over 1000 capped results group completely, search reaches oldest and priority order is correct', async ({ page }) => {
  await open(page, true);
  await page.getByRole('button', { name: 'Automatische Fehler', exact: true }).click();
  await expect(page.getByText('1105 Fehlermeldungen von 1105 insgesamt · 2 Gruppen')).toBeVisible();
  await page.getByRole('combobox', { name: 'Sortierung' }).click();
  await page.getByRole('option', { name: 'Priorität zuerst' }).click();
  await expect(page.locator('article').first()).toContainText('Ältester Sonderfall');
  await page.getByRole('textbox', { name: 'Feedback suchen' }).fill('Suche [100%], exakt');
  await expect(page.getByText('1 Fehlermeldung von 1105 insgesamt · 1 Gruppe')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Suche löschen' }).click();
  await expect(page.locator('article')).toHaveCount(2);
  await page.locator('article').filter({ hasText: 'Fehlender Wert: replace' }).getByRole('button').click();
  await expect(page.locator('article')).toHaveCount(30);
  await page.getByRole('button', { name: 'Weitere Einträge anzeigen' }).click();
  await expect(page.locator('article')).toHaveCount(60);
});

test('edit is explicit, rejects unconfirmed save, preserves failed draft, then persists', async ({ page }) => {
  await open(page);
  await editor(page);
  await page.getByLabel('Titel', { exact: true }).fill('Video lädt langsam');
  expect(await page.evaluate(() => window.adminOperationsQA.writes.length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toContainText('Änderungen verwerfen?');
  await page.getByRole('button', { name: 'Weiter bearbeiten' }).click();
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'empty'; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Speichern nicht bestätigt');
  await expect(page.getByLabel('Titel', { exact: true })).toHaveValue('Video lädt langsam');
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'fail'; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('503');
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'success'; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Video lädt langsam/ })).toBeVisible();
});

test('selecting only visible entries and changing scope cannot mutate hidden rows', async ({ page }) => {
  await open(page);
  await page.getByRole('checkbox', { name: 'Video lädt nicht auswählen' }).check();
  await expect(page.getByText('1 Meldungen ausgewählt')).toBeVisible();
  await page.getByRole('button', { name: 'In Arbeit', exact: true }).click();
  await expect(page.getByText(/Meldungen ausgewählt/)).toHaveCount(0);
  expect(await page.evaluate(() => window.adminOperationsQA.writes.length)).toBe(0);
});

test('confirmed bulk status, zero-row failure, delete confirmation and recovery', async ({ page }) => {
  await open(page);
  await page.getByRole('checkbox', { name: 'Video lädt nicht auswählen' }).check();
  await page.getByRole('button', { name: 'Status setzen' }).click();
  expect(await page.evaluate(() => window.adminOperationsQA.writes.length)).toBe(0);
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'empty'; });
  await page.getByRole('button', { name: 'Status bestätigen' }).click();
  await expect(page.getByRole('alert')).toContainText('0 von 1 bestätigt');
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'success'; });
  await page.getByRole('button', { name: 'Status bestätigen' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('article').filter({ hasText: 'Video lädt nicht' })).toContainText('Gelöst');
  await page.getByRole('button', { name: /Video lädt nicht/ }).click();
  await page.getByRole('button', { name: 'Rückmeldung löschen' }).click();
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'fail'; });
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'success'; });
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('2 Treffer von 2 insgesamt')).toBeVisible();
});

test('loading failures remain errors, not empty inboxes', async ({ page }) => {
  await open(page);
  await page.evaluate(() => { window.adminOperationsQA.readMode = 'fail'; });
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('503');
  await expect(page.getByText('Noch keine Rückmeldungen', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { window.adminOperationsQA.readMode = undefined; });
  await page.getByRole('button', { name: 'Erneut laden', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(3);
});

test('keyboard detail and filter return focus to their trigger', async ({ page }) => {
  await open(page);
  const trigger = page.getByRole('button', { name: /Video lädt nicht/ });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('Die Beta bleibt beim Laden stehen.');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  const filter = page.getByRole('button', { name: 'Filter', exact: true });
  await filter.click();
  await page.keyboard.press('Escape');
  await expect(filter).toBeFocused();
});

test('slow saving blocks Escape and duplicate writes', async ({ page }) => {
  await open(page);
  await editor(page);
  await page.getByLabel('Titel', { exact: true }).fill('Neuer Titel');
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'slow'; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speichert …', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.adminOperationsQA.writes.length)).toBe(1);
});

test('partial batch failure reloads state and retries only remaining IDs', async ({ page }) => {
  await open(page, true);
  await page.getByRole('button', { name: 'Automatische Fehler', exact: true }).click();
  await page.locator('article').filter({ hasText: 'Fehlender Wert: replace' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Weitere Einträge anzeigen' }).click();
  await page.getByRole('checkbox', { name: 'Sichtbare Einträge auswählen', exact: true }).check();
  await expect(page.getByText('60 Meldungen ausgewählt')).toBeVisible();
  await page.getByRole('button', { name: 'Status setzen' }).click();
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'partial_second'; });
  await page.getByRole('button', { name: 'Status bestätigen' }).click();
  await expect(page.getByRole('alert')).toContainText('50 von 60 bestätigt');
  await expect(page.getByRole('alertdialog')).toContainText('10 Einträge aktualisieren?');
  await page.evaluate(() => { window.adminOperationsQA.writeMode = 'success'; });
  await page.getByRole('button', { name: 'Status bestätigen' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.adminOperationsQA.writes.length)).toBe(3);
});
