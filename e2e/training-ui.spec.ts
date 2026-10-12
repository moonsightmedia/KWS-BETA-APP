import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshots = 'test-results/training-ui';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', request => new URL(request.request().url()).hostname === '127.0.0.1' ? request.continue() : request.abort());
});
async function open(page: Page, route = '/training') {
  await page.goto(route); await page.evaluate(() => document.fonts.ready);
}
async function next(page: Page) { await page.getByRole('button', { name: 'Weiter', exact: true }).click(); }
async function plan(page: Page) {
  await open(page, '/training/plan'); await next(page); await next(page);
  await page.getByRole('group', { name: 'Was fühlt sich schon vertraut an?' }).getByRole('button', { name: 'Körperposition', exact: true }).click();
  await page.getByRole('group', { name: 'Was möchtest du besser kennenlernen?' }).getByRole('button', { name: 'Fußtechnik', exact: true }).click();
  await next(page); await next(page); await next(page);
  await page.getByRole('button', { name: 'Vorschau ansehen', exact: true }).click();
}
for (const width of [375, 768, 1280, 1920]) test(`layout and states at ${width}px`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 }); await mkdir(screenshots, { recursive: true });
  for (const [name, route] of [['home', '/training'], ['strength', '/training/library/strength?q=Brust'], ['feet', '/training/library/boulder?q=Fußtechnik'], ['rehab', '/training/library/rehab'], ['detail', '/training/exercises/quiet-feet'], ['planner', '/training/plan'], ['empty', '/training/favorites']] as const) {
    await open(page, route);
    await expect(page.getByText('UI-Vorschau', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `${screenshots}/${name}-${width}.png`, fullPage: true, animations: 'disabled' });
  }
  await plan(page); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `${screenshots}/week-${width}.png`, fullPage: true, animations: 'disabled' });
  await page.locator('a[href="/training/sessions/preview-0"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `${screenshots}/session-${width}.png`, fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('search, equipment, empty results and favorite collection', async ({ page }) => {
  await open(page, '/training/library/strength');
  await page.getByRole('searchbox', { name: 'Übung suchen' }).fill('Brust');
  await expect(page.getByRole('list', { name: 'Übungen', exact: true }).getByRole('listitem')).toHaveCount(5);
  await page.getByRole('combobox', { name: 'Equipment' }).click();
  await page.getByRole('option', { name: 'Kurzhanteln', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Übungen', exact: true }).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Kurzhantel-Floor-Press: als Favorit merken' }).click();
  await page.getByRole('searchbox').fill('unpassend123');
  await expect(page.getByText('Keine passenden Übungen')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await expect(page.getByRole('list', { name: 'Übungen', exact: true }).getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: /Weitere .* anzeigen/ }).click();
  await expect(page.getByRole('list', { name: 'Übungen', exact: true }).getByRole('listitem')).toHaveCount(9);
  await page.getByRole('link', { name: 'Training-Übersicht', exact: true }).click();
  await page.getByRole('link', { name: /Favoriten/ }).last().click();
  await expect(page.getByRole('list', { name: 'Gemerkte Übungen' }).getByRole('listitem')).toHaveCount(1);
});

test('mixed session, duplicate prevention, reorder, editing and replacement', async ({ page }) => {
  await open(page, '/training/exercises/incline-pushup');
  await page.getByRole('button', { name: 'Zur eigenen Einheit hinzufügen' }).click();
  await expect(page.getByRole('button', { name: 'In eigener Einheit' })).toBeDisabled();
  await page.getByRole('link', { name: 'Training-Übersicht', exact: true }).click();
  await page.locator('a[href="/training/library/boulder"]').click();
  await page.getByRole('searchbox').fill('Fußtechnik');
  await expect(page.getByRole('list', { name: 'Übungen', exact: true }).getByRole('listitem')).toHaveCount(5);
  await page.getByRole('link', { name: /Präzise Fußplatzierung/ }).click();
  await page.getByRole('button', { name: 'Zur eigenen Einheit hinzufügen' }).click();
  await page.getByRole('link', { name: 'Eigene Einheit öffnen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name deiner Einheit' }).fill('Kraft und Füße');
  await page.getByRole('button', { name: 'Nach oben: Präzise Fußplatzierung' }).click();
  await expect(page.getByRole('list', { name: 'Übungen deiner Einheit' }).getByRole('listitem').first()).toContainText('Präzise Fußplatzierung');
  await page.getByLabel('Sätze', { exact: true }).first().fill('1');
  await page.getByRole('button', { name: 'Einheit übernehmen' }).click();
  await expect(page.getByRole('heading', { name: 'Kraft und Füße', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Austauschen' }).first().click();
  await page.getByRole('link', { name: /Fußwechsel/ }).click();
  await page.getByRole('button', { name: 'Übung ersetzen' }).click();
  await expect(page.getByRole('list', { name: 'Übungen deiner Einheit' }).getByRole('listitem').first()).toContainText('Fußwechsel');
});

test('questionnaire validation, preserved answers, weekly moves and completion', async ({ page }) => {
  await open(page, '/training/plan'); await next(page); await next(page); await next(page);
  await expect(page.getByRole('alert')).toContainText('Wähle');
  await page.getByRole('group', { name: 'Was fühlt sich schon vertraut an?' }).getByRole('button', { name: 'Hooks', exact: true }).click();
  await page.getByRole('group', { name: 'Was möchtest du besser kennenlernen?' }).getByRole('button', { name: 'Fußtechnik', exact: true }).click();
  await next(page); await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Was möchtest du besser kennenlernen?' }).getByRole('button', { name: 'Fußtechnik', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await next(page); await next(page); await next(page);
  await page.getByRole('button', { name: 'Vorschau ansehen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deine Beispielwoche' })).toBeVisible();
  await page.getByRole('button', { name: 'Technik · Fußtechnik: als erledigt markieren' }).first().click();
  await expect(page.getByText('1 von 3 als erledigt markiert')).toBeVisible();
  await page.getByRole('combobox', { name: 'Technik · Fußtechnik: Tag ändern' }).first().click();
  await expect(page.getByRole('option', { name: 'Mittwoch · belegt' })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('option', { name: 'Dienstag', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Dienstag');
});

test('rehab is informational, unknown exercise and refresh discard demo state', async ({ page }) => {
  await open(page, '/training/exercises/rehab-shoulder');
  await expect(page.getByRole('button', { name: 'Zur eigenen Einheit hinzufügen' })).toHaveCount(0);
  await expect(page.getByText('Umfang & Pausen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Als Favorit merken' }).click();
  await page.getByRole('link', { name: 'Training-Übersicht', exact: true }).click();
  await page.getByRole('link', { name: /Favoriten/ }).last().click();
  await expect(page.getByRole('list', { name: 'Gemerkte Übungen' }).getByRole('listitem')).toHaveCount(1);
  await page.reload(); await expect(page.getByText('Noch keine Favoriten')).toBeVisible();
  await open(page, '/training/exercises/missing'); await expect(page.getByText('Übung nicht gefunden')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Training', exact: true }).first()).toHaveAttribute('aria-current', 'page');
});

test('keyboard selection, reduced motion and source disclosure', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/training/library/strength?q=Brust');
  await page.getByRole('combobox', { name: 'Equipment' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('option', { name: 'Alle Geräte', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown'); await expect(page.getByRole('option', { name: 'Klimmzugstange', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.getByRole('option', { name: 'Körpergewicht', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/equipment=K/);
  await page.getByRole('link', { name: /Liegestütz/ }).first().click();
  await expect(page.getByRole('link', { name: /ACSM/ })).not.toBeVisible();
  await page.getByText('Hintergrund & Quellen', { exact: true }).click();
  await expect(page.getByRole('link', { name: /ACSM/ })).toBeVisible();
});

test('fixed sessions count toward the week and cannot move', async ({ page }) => {
  await open(page, '/training/plan'); await next(page); await next(page);
  for (const label of ['Was fühlt sich schon vertraut an?', 'Was möchtest du besser kennenlernen?']) await page.getByRole('group', { name: label }).getByRole('button', { name: 'Weiß ich nicht', exact: true }).click();
  await next(page); await next(page);
  await page.getByRole('group', { name: /Welche davon sind fest/ }).getByRole('button', { name: 'Montag', exact: true }).click();
  await next(page); await page.getByRole('button', { name: 'Vorschau ansehen', exact: true }).click();
  await expect(page.getByText('0 von 3 als erledigt markiert')).toBeVisible();
  await expect(page.getByText('Fester Termin', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Dein fester Trainingstermin: Tag ändern' })).toHaveCount(0);
});

test('changing the synthetic account clears private preview state', async ({ page }) => {
  await open(page, '/training/exercises/pushup');
  await page.getByRole('button', { name: 'Als Favorit merken' }).click();
  await page.getByRole('button', { name: 'Zur eigenen Einheit hinzufügen' }).click();
  await page.evaluate(async () => {
    const hooks = await import('/test/fixtures/training-preview-hooks.ts');
    hooks.switchPreviewAccount();
  });
  await expect(page.getByRole('button', { name: 'Als Favorit merken' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Zur eigenen Einheit hinzufügen' })).toBeEnabled();
});

test('route swipes respect forms and navigate from the Training home', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, '/training/plan');
  await page.mouse.move(340, 320); await page.mouse.down(); await page.mouse.move(40, 322, { steps: 8 }); await page.mouse.up();
  await expect(page).toHaveURL(/\/training\/plan$/);
  await page.getByRole('link', { name: 'Training-Übersicht', exact: true }).click();
  await page.mouse.move(340, 180); await page.mouse.down(); await page.mouse.move(40, 182, { steps: 8 }); await page.mouse.up();
  await expect(page).toHaveURL(/\/statistics$/);
});
