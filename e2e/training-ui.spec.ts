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
async function intake(page: Page, options: { age?: string; fixed?: boolean; constraints?: string; dialog?: boolean } = {}) {
  if (options.dialog) { await open(page); await page.getByRole('button', { name: 'Assistent starten', exact: true }).click(); }
  else await open(page, '/training/plan');
  await next(page);
  await page.getByRole('button', { name: options.age ?? '18 oder älter', exact: true }).click(); await next(page);
  await next(page); await next(page);
  await page.getByRole('group', { name: 'Was fühlt sich an der Wand schon vertraut an?' }).getByRole('button', { name: 'Körperposition', exact: true }).click(); await next(page);
  const fields = page.getByRole('group', { name: 'Was möchtest du als Nächstes besser kennenlernen?' });
  await fields.getByRole('button', { name: 'Fußtechnik', exact: true }).click();
  await fields.getByRole('button', { name: 'Boulder lesen', exact: true }).click();
  await next(page); await next(page); await next(page); await next(page); await next(page);
  if (options.fixed) await page.getByRole('button', { name: 'Montag', exact: true }).click();
  await next(page); await next(page); await next(page);
  if (options.constraints) await page.getByRole('button', { name: options.constraints, exact: true }).click();
  await next(page);
  await expect(page.getByRole('region', { name: 'Angaben prüfen' })).toBeVisible();
}
async function plan(page: Page, options: Parameters<typeof intake>[1] = {}) {
  await intake(page, options);
  await page.getByRole('button', { name: 'Beispielwoche erstellen', exact: true }).click();
  await expect(page).toHaveURL(/\/training\/week$/);
}
for (const width of [375, 768, 1280, 1920]) test(`layout and illustrated states at ${width}px`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 }); await mkdir(screenshots, { recursive: true });
  for (const [name, route] of [['home', '/training'], ['strength', '/training/library/strength?q=Brust'], ['feet', '/training/library/boulder?q=Fußtechnik'], ['rehab', '/training/library/rehab'], ['detail', '/training/exercises/quiet-feet'], ['planner', '/training/plan'], ['empty', '/training/favorites']] as const) {
    await open(page, route);
    await expect(page.getByRole('button', { name: 'Informationen zur UI-Vorschau' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `${screenshots}/${name}-${width}.png`, fullPage: true, animations: 'disabled' });
  }
  await plan(page); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await expect(page.getByRole('list', { name: 'Übungen im Wochenplan' }).getByRole('listitem')).not.toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/week-${width}.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: 'Einheit anpassen', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.screenshot({ path: `${screenshots}/session-${width}.png`, fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('filters apply, cancel, reset and remove individually', async ({ page }) => {
  await open(page, '/training/library/strength?q=Brust');
  const list = page.getByRole('list', { name: 'Übungen', exact: true });
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('button', { name: 'Kurzhanteln', exact: true }).click();
  await page.getByRole('button', { name: 'Filter schließen' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('button', { name: 'Kurzhanteln', exact: true }).click();
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Equipment Kurzhanteln entfernen' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await page.getByRole('searchbox').fill('unpassend123');
  await expect(page.getByText('Keine passenden Übungen')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
  await page.getByRole('button', { name: /Weitere .* anzeigen/ }).click();
  await expect(list.getByRole('listitem')).toHaveCount(9);
});

test('mixed manual session, unknown duration, reorder, editing, replacement and scheduling', async ({ page }) => {
  await open(page, '/training/exercises/incline-pushup');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'In eigener Einheit' })).toBeDisabled();
  await open(page, '/training/exercises/quiet-feet');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await page.getByRole('complementary', { name: 'Deine Übungsauswahl' }).getByRole('link', { name: 'Einheit ansehen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name deiner Einheit' }).fill('Kraft und Füße');
  await page.getByRole('button', { name: 'Nach oben: Präzise Fußplatzierung' }).click();
  const list = page.getByRole('list', { name: 'Übungen deiner Einheit' });
  await expect(list.getByRole('listitem').first()).toContainText('Präzise Fußplatzierung');
  await page.getByRole('button', { name: 'Umfang anpassen' }).first().click();
  await page.getByLabel('Versuche', { exact: true }).fill('');
  await expect(page.getByText('Dauer offen', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit übernehmen' })).toBeDisabled();
  await page.getByLabel('Versuche', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Einheit übernehmen' }).click();
  await expect(page.getByRole('heading', { name: 'Kraft und Füße', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Umfang anpassen' }).first().click();
  await page.getByRole('link', { name: 'Austauschen' }).first().click();
  await page.getByRole('link', { name: /^Fußwechsel/ }).first().click();
  await page.getByRole('button', { name: 'Übung ersetzen' }).click();
  await expect(list.getByRole('listitem').first()).toContainText('Fußwechsel');
  await page.getByRole('button', { name: 'Montag', exact: true }).click();
  await page.getByRole('button', { name: 'In Woche einplanen', exact: true }).click();
  await expect(page).toHaveURL(/\/training\/week$/);
  await expect(page.getByRole('heading', { name: 'Kraft und Füße', exact: true })).toBeVisible();
});

test('chat review editing, both learning fields, persistence, navigation and account isolation', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await intake(page, { dialog: true });
  await page.getByRole('region', { name: 'Angaben prüfen' }).getByRole('button', { name: /Zeitbudget/ }).click();
  await page.getByRole('button', { name: '30 Min.', exact: true }).click();
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await page.getByRole('button', { name: 'Beispielwoche erstellen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('kws-training-v2:training-demo')!));
  expect(state.plan.status).toBe('draft'); expect(state.sessions.every((session: {minutes:number}) => session.minutes <= 30)).toBeTruthy();
  const plannedIds = state.sessions.flatMap((session: {exercises:{exerciseId:string}[]}) => session.exercises.map(item => item.exerciseId));
  expect(plannedIds).toContain('edge-choice'); expect(plannedIds).toContain('read-boulder');
  expect(state).not.toHaveProperty('answers');
  await page.getByRole('button', { name: /als erledigt markieren/ }).first().click();
  await page.getByRole('link', { name: 'Boulder', exact: true }).first().click();
  await page.getByRole('link', { name: 'Training öffnen' }).click();
  await page.getByRole('link', { name: /Mein Wochenplan/ }).click();
  await expect(page.getByText('1 von 3 erledigt', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('1 von 3 erledigt', { exact: true })).toBeVisible();
  const otherTab = await context.newPage(); await otherTab.goto('/training/week');
  await expect(otherTab.getByText('1 von 3 erledigt', { exact: true })).toBeVisible();
  await page.evaluate(async () => { const hooks = await import('/test/fixtures/training-preview-hooks.ts'); hooks.switchPreviewAccount(); });
  await expect(page.getByText('Noch keine Woche geplant')).toBeVisible();
});

for (const options of [{ age:'16–17 Jahre' }, { constraints:'Belastung aktuell eingeschränkt' }]) test(`review pathway without automatic load: ${JSON.stringify(options)}`, async ({ page }) => {
  await plan(page, options);
  await expect(page.getByRole('heading', { name: 'Deine Planung zur Besprechung', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Übungen im Wochenplan' })).toHaveCount(0);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Deine Planung zur Besprechung', exact: true })).toBeVisible();
});

test('fixed sessions count toward the week and cannot move', async ({ page }) => {
  await plan(page, { fixed: true });
  await expect(page.getByText('0 von 3 erledigt', { exact: true })).toBeVisible();
  await expect(page.getByText(/Fester Termin ·/)).toBeVisible();
  await expect(page.getByRole('button', {name:'Termin verschieben',exact:true})).toHaveCount(0);
  await page.getByRole('button', { name: /^Mittwoch:/ }).click();
  await page.getByRole('button', {name:'Termin verschieben',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('button', {name:'Montag · belegt',exact:true})).toBeDisabled();
  await page.getByRole('dialog').getByRole('button', {name:'Dienstag',exact:true}).click();
  await expect(page.getByRole('status').last()).toContainText('Dienstag');
});

test('rehab orientation, lasting favorites, sources and unknown exercise', async ({ page }) => {
  await open(page, '/training/exercises/rehab-shoulder');
  await expect(page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true })).toHaveCount(0);
  await expect(page.getByText('Umfang & Pausen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Als Favorit merken' }).click();
  await open(page, '/training/favorites'); await page.reload();
  await expect(page.getByRole('list', { name: 'Gemerkte Übungen' }).getByRole('listitem')).toHaveCount(1);
  await open(page, '/training/exercises/incline-pushup');
  await page.getByText('Hintergrund & Quellen', { exact:true }).click();
  await expect(page.getByRole('link', { name: /ACSM/ })).toBeVisible();
  await open(page, '/training/exercises/missing'); await expect(page.getByText('Übung nicht gefunden')).toBeVisible();
});

test('storage failure and corrupted stored plan recover gracefully', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('kws-training-v2:training-demo', '{"version":2,"sessions":[{}]}'); });
  await open(page, '/training/week'); await expect(page.getByText('Noch keine Woche geplant')).toBeVisible();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
  await open(page, '/training/exercises/pushup');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
  await page.getByRole('button', { name: 'Als Favorit merken' }).click();
  await page.getByRole('button', { name: 'Informationen zur UI-Vorschau' }).click();
  await expect(page.getByText(/Speichern ist in diesem Browser nicht möglich/)).toBeVisible();
});

test('keyboard filter sheet preserves focus and topic selection resolves search', async ({ page }) => {
  await page.setViewportSize({ width:375,height:900 }); await page.emulateMedia({ reducedMotion:'reduce' });
  await open(page, '/training/library/strength?q=Brust');
  const trigger = page.getByRole('button', { name:'Filter',exact:true }); await trigger.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await expect(page.getByRole('group', { name:'Thema schnell wählen' }).getByRole('button', { name:'Brust',exact:true })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('group', { name:'Thema schnell wählen' }).getByRole('button', { name:'Rücken',exact:true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('list', { name:'Übungen',exact:true }).getByRole('listitem')).toHaveCount(2);
});

test('stale saved-session links cannot add or replace exercises', async ({ page }) => {
  await open(page, '/training/library/strength?append=missing');
  await expect(page.getByRole('alert')).toContainText('Diese Einheit ist nicht mehr verfügbar');
  await expect(page.getByRole('button', { name:'Erhöhter Liegestütz: zur eigenen Einheit hinzufügen',exact:true })).toBeDisabled();
  await open(page, '/training/library/boulder?session=missing&item=missing');
  await expect(page.getByRole('alert')).toContainText('Die ursprüngliche Übung ist nicht mehr verfügbar');
  await expect(page.getByRole('button', { name:'Präzise Fußplatzierung: als Ersatz wählen',exact:true })).toBeDisabled();
});
