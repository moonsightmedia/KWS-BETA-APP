import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshots = 'test-results/training-ui';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', request => new URL(request.request().url()).hostname === '127.0.0.1' ? request.continue() : request.abort());
});
async function open(page: Page, route = '/training') {
  await page.goto(route);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = [...new Set([...document.querySelectorAll('[role="img"]')].map(node => getComputedStyle(node).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1]).filter(Boolean))];
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    await Promise.all(urls.map(url => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error(`Illustration failed to load: ${url}`)); image.src = url!; })));
  });
}
async function next(page: Page) { await page.getByRole('button', { name: 'Weiter', exact: true }).click(); }
async function intake(page: Page, options: { age?: string; fixed?: boolean; constraints?: string; dialog?: boolean } = {}) {
  if (options.dialog) { await open(page); await page.getByRole('button', { name: 'Trainingschat öffnen', exact: true }).click(); }
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
  for (const [name, route] of [['home', '/training'], ['strength', '/training/library/strength?q=Brust'], ['feet', '/training/library/boulder?q=Fußtechnik'], ['rehab', '/training/library/rehab'], ['kids', '/training/library/kids'], ['kids-detail', '/training/exercises/kids-colour-post'], ['detail', '/training/exercises/quiet-feet'], ['planner', '/training/plan'], ['empty', '/training/favorites']] as const) {
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
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('radio', { name: 'Kettlebell', exact: true }).check();
  await page.getByRole('button', { name: 'Filter schließen' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('radio', { name: 'Kettlebell', exact: true }).check();
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Kettlebell-Floor-Press');
  await page.getByRole('button', { name: 'Equipment Kettlebell entfernen' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('searchbox').fill('unpassend123');
  await expect(page.getByText('Keine passenden Übungen')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(16);
  await expect(page.getByRole('button', { name: /Weitere .* anzeigen/ })).toHaveCount(0);
});
test('mixed manual session, unknown duration, reorder, editing, replacement and scheduling', async ({ page }) => {
  await open(page, '/training/exercises/incline-pushup');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Im Einheitsentwurf' })).toBeDisabled();
  await open(page, '/training/exercises/quiet-feet');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await page.getByRole('complementary', { name: 'Deine Übungsauswahl' }).getByRole('link', { name: 'Einheit öffnen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name deiner Einheit' }).fill('Kraft und Füße');
  await page.getByRole('button', { name: 'Nach oben: Präzise Fußplatzierung' }).click();
  const list = page.getByRole('list', { name: 'Übungen deiner Einheit' });
  await expect(list.getByRole('listitem').first()).toContainText('Präzise Fußplatzierung');
  await page.getByRole('button', { name: 'Umfang anpassen' }).first().click();
  await page.getByLabel('Versuche', { exact: true }).fill('');
  await expect(page.getByText('Dauer offen', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit speichern' })).toBeDisabled();
  await page.getByLabel('Versuche', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Einheit speichern' }).click();
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
  await page.getByRole('link', { name: 'Training', exact: true }).first().click();
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
  await expect(page.getByRole('list', { name: 'Gemerkte Inhalte' }).getByRole('listitem')).toHaveCount(1);
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
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter schließen' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await expect(page.getByRole('group', { name:'Thema schnell wählen' }).getByRole('button', { name:'Brust',exact:true })).toHaveAttribute('aria-pressed','true');
  await page.getByRole('group', { name:'Thema schnell wählen' }).getByRole('button', { name:'Rücken',exact:true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('list', { name:'Übungen',exact:true }).getByRole('listitem')).toHaveCount(3);
});

test('stale saved-session links cannot add or replace exercises', async ({ page }) => {
  await open(page, '/training/library/strength?append=missing');
  await expect(page.getByRole('alert')).toContainText('Diese Einheit ist nicht mehr verfügbar');
  await expect(page.getByRole('button', { name:/^Erhöhter Liegestütz: Zur Einheit hinzufügen/ })).toBeDisabled();
  await open(page, '/training/library/boulder?session=missing&item=missing');
  await expect(page.getByRole('alert')).toContainText('Die ursprüngliche Übung ist nicht mehr verfügbar');
  await expect(page.getByRole('button', { name:'Präzise Fußplatzierung: Übung ersetzen',exact:true })).toBeDisabled();
});

test('hall equipment, optional external equipment and supported spraywall passages', async ({ page }) => {
  await open(page, '/training/library/strength?q=Kurzhanteln');
  await expect(page.getByText('Keine passenden Übungen')).toBeVisible();
  await page.getByRole('button', { name:'Alle Geräte einbeziehen',exact:true }).click();
  await expect(page.getByRole('list', { name:'Übungen',exact:true }).getByRole('listitem')).toHaveCount(2);
  await expect(page).toHaveURL(/allEquipment=1/);
  await open(page, '/training/library/boulder?equipment=Spraywall');
  expect(await page.getByRole('list', { name:'Übungen',exact:true }).getByRole('listitem').count()).toBeGreaterThanOrEqual(6);
  await expect(page.getByRole('button', { name:/Weitere .* anzeigen/ })).toHaveCount(0);
  await expect(page.getByRole('list', { name:'Übungen',exact:true })).not.toContainText('Heelhook');
});

test('typing has no outer outline or shadow; compact chat and own-unit entry', async ({ page }) => {
  await page.setViewportSize({width:375,height:900}); await open(page);
  const launcher = page.getByRole('button', {name:'Trainingschat öffnen',exact:true});
  const box = await launcher.boundingBox(); expect(box!.width).toBe(56); expect(box!.height).toBe(56);
  const own = await page.getByRole('link', {name:/Eigene Einheiten/}).boundingBox(); expect(own!.height).toBeLessThanOrEqual(80);
  await launcher.click(); await expect(page.getByRole('dialog')).toBeVisible();
  const chatBox = await page.getByRole('dialog').boundingBox(); expect(chatBox!.height).toBeCloseTo(630,0);
  await page.keyboard.press('Escape'); await expect(launcher).toBeFocused();
  await open(page, '/training/library/strength');
  const field = page.getByRole('searchbox'); await field.click(); await field.fill('Kettlebell');
  const focus = await field.evaluate(element=>{const style=getComputedStyle(element);return {outline:style.outlineStyle,shadow:style.boxShadow,border:style.borderWidth};});
  expect(focus).toEqual({outline:'none',shadow:'none',border:'1px'});
  await expect(page.getByRole('list', {name:'Übungen',exact:true}).getByRole('listitem')).toHaveCount(4);
});

test('fingerboard orientation has a graphic, source and no plannable prescription', async ({ page }) => {
  await open(page, '/training/exercises/fingerboard-feet-supported');
  await expect(page.getByRole('img', {name:/Schematische Illustration/})).toBeVisible();
  await expect(page.getByRole('button', {name:'Zur Einheit hinzufügen',exact:true})).toHaveCount(0);
  await expect(page.getByText('Umfang & Pausen', {exact:true})).toHaveCount(0);
  await expect(page.getByText('Vor dem Fingertraining', {exact:true})).toBeVisible();
  await page.getByText('Hintergrund & Quellen', {exact:true}).click();
  await expect(page.getByRole('link', {name:/Devise/})).toBeVisible();
});

test('side plank uses hold phases rather than movement repetition labels', async ({ page }) => {
  await open(page, '/training/exercises/side-plank');
  await page.getByRole('button', {name:'Zur Einheit hinzufügen',exact:true}).click();
  await page.getByRole('complementary', {name:'Deine Übungsauswahl'}).getByRole('link', {name:'Einheit öffnen',exact:true}).click();
  await expect(page.getByRole('list', {name:'Übungen deiner Einheit'})).toContainText('Haltephasen');
  await expect(page.getByRole('list', {name:'Übungen deiner Einheit'})).toContainText('je Seite');
  await page.getByRole('button', {name:'Umfang anpassen'}).click();
  await expect(page.getByLabel('Haltephasen', {exact:true})).toBeVisible();
});

test('expanded boulder library shows all 33 cards and ten games with stable search and return', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, '/training/library/boulder');
  const list = page.getByRole('list', { name: 'Übungen', exact: true });
  await expect(list.getByRole('listitem')).toHaveCount(33);
  await expect(page.getByRole('button', { name: /Weitere .* anzeigen/ })).toHaveCount(0);
  await page.getByRole('group', { name: 'Übungen oder Spiele wählen' }).getByRole('button', { name: 'Spiele', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await expect(list.getByRole('img', { name: /Schematische Illustration/ })).toHaveCount(10);
  const gameTitle = await list.getByRole('heading').first().innerText();
  await list.getByRole('link', { name: `${gameTitle}: Anleitung öffnen`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'So läuft das Spiel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zur Bibliothek', exact: true }).click();
  await expect(page).toHaveURL(/format=game/);
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await page.getByRole('searchbox').fill('unpassend123');
  await expect(page.getByText('Keine passenden Übungen')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(33);
  await open(page, '/training/library/rehab');
  await expect(page.getByRole('heading', { name: 'Wiedereinstieg', exact: true }).first()).toBeVisible();
});

test('completed sessions persist, repeat without losing a draft, and can be undone', async ({ page, context }) => {
  await open(page);
  await expect(page.getByText('Hier erscheinen Einheiten, die du als trainiert markierst.', { exact: true })).toBeVisible();
  await open(page, '/training/exercises/quiet-feet');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await page.getByRole('link', { name: 'Einheit öffnen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name deiner Einheit' }).fill('Meine Fuß-Einheit');
  await page.getByRole('button', { name: 'Einheit speichern', exact: true }).click();
  const originalUrl = page.url();
  await page.getByRole('button', { name: 'Als trainiert markieren', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Als trainiert erfasst');
  await open(page); await page.reload();
  const recent = page.getByRole('region', { name: 'Zuletzt trainiert' });
  await expect(recent.getByRole('heading', { name: 'Meine Fuß-Einheit', exact: true })).toBeVisible();
  // Starting a different unit must not be overwritten when a previous unit is repeated.
  await open(page, '/training/exercises/pushup');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await open(page);
  await page.getByRole('button', { name: 'Erneut zusammenstellen: Meine Fuß-Einheit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meine Fuß-Einheit · Wiederholung', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kws-training-v2:training-demo')!));
  expect(saved.history).toHaveLength(1);
  expect(saved.draft.exercises.map((item: { exerciseId: string }) => item.exerciseId)).toEqual(['pushup']);
  expect(saved.sessions).toHaveLength(2);
  expect(saved.sessions[1].id).not.toBe(saved.history[0].session.id);
  expect(saved.sessions[1].exercises[0].id).not.toBe(saved.history[0].session.exercises[0].id);
  const otherTab = await context.newPage(); await otherTab.goto('/training');
  await expect(otherTab.getByRole('button', { name: 'Erneut zusammenstellen: Meine Fuß-Einheit', exact: true })).toBeVisible();
  await page.goto(originalUrl);
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await expect(otherTab.getByText('Hier erscheinen Einheiten, die du als trainiert markierst.', { exact: true })).toBeVisible();
  await open(page);
  await expect(page.getByText('Hier erscheinen Einheiten, die du als trainiert markierst.', { exact: true })).toBeVisible();
});

test('completed week snapshot survives regeneration and stays isolated from a different account', async ({ page }) => {
  test.setTimeout(60000);
  await plan(page);
  await page.getByRole('button', { name: /als erledigt markieren/ }).first().click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('kws-training-v2:training-demo')!));
  expect(before.history).toHaveLength(1);
  await plan(page);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('kws-training-v2:training-demo')!));
  expect(after.plan.id).not.toBe(before.plan.id);
  expect(after.history).toEqual(before.history);
  expect(after.plan.entries.every((entry: { completed: boolean }) => !entry.completed)).toBeTruthy();
  await open(page);
  await expect(page.getByRole('region', { name: 'Zuletzt trainiert' }).getByRole('button', { name: /Erneut zusammenstellen:/ })).toHaveCount(1);
  await page.evaluate(async () => { const hooks = await import('/test/fixtures/training-preview-hooks.ts'); hooks.switchPreviewAccount(); });
  await expect(page.getByText('Hier erscheinen Einheiten, die du als trainiert markierst.', { exact: true })).toBeVisible();
});

test('kids games support nursery and school browsing, sources and favorites without adult prescriptions', async ({ page }) => {
  await open(page, '/training/exercises/pushup');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  await open(page, '/training/library/kids');
  const list = page.getByRole('list', { name: 'Übungen', exact: true });
  await expect(list.getByRole('listitem')).toHaveCount(12);
  const illustrations = list.getByRole('img', { name: /Schematische Illustration/ });
  await expect(illustrations).toHaveCount(12);
  const positions = await illustrations.evaluateAll(nodes => nodes.map(node => (node as HTMLElement).style.backgroundPosition));
  expect(new Set(positions).size).toBe(12);
  await expect(page.getByRole('button', { name: /Zur Einheit hinzufügen/ })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Deine Übungsauswahl' })).toHaveCount(0);
  await expect(page.getByText('In der KWS verfügbar', { exact: true })).toHaveCount(0);
  await page.getByRole('group', { name: 'Altersbereich wählen' }).getByRole('button', { name: 'Kita', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(6);
  await list.getByRole('link', { name: 'Farbenpost: Spiel ansehen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kinderspiel', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Für Kitakinder vereinfachen', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Betreuung', exact: true })).toBeVisible();
  await expect(page.getByText('Umfang & Pausen', { exact: true })).toHaveCount(0);
  await page.getByText('Hintergrund & Quellen', { exact: true }).click();
  await expect(page.getByRole('link', { name: /DGUV/ })).toBeVisible();
  await page.getByRole('button', { name: 'Farbenpost: als Favorit merken', exact: true }).click();
  await page.getByRole('button', { name: 'Zur Bibliothek', exact: true }).click();
  await expect(page).toHaveURL(/age=kita/);
  await expect(list.getByRole('listitem')).toHaveCount(6);
  await open(page, '/training/favorites'); await page.reload();
  await expect(page.getByRole('list', { name: 'Gemerkte Inhalte' }).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('complementary', { name: 'Deine Übungsauswahl' })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kws-training-v2:training-demo')!));
  expect(saved.draft.exercises.map((item: { exerciseId: string }) => item.exerciseId)).toEqual(['pushup']);
  expect(saved.sessions).toHaveLength(0);
});

test('exercise illustrations remain primary and corrected single images override atlas cells', async ({ page }) => {
  await open(page, '/training/exercises/heel-hook');
  const art = page.getByRole('img', { name: /Schematische Illustration/ });
  await expect(art).toHaveCSS('background-image', /boulder-atlas/);
  await expect(art.locator('svg')).toHaveCount(0);
  await open(page, '/training/exercises/dead-bug');
  await expect(art).toHaveCSS('background-image', /dead-bug-v3/);
  await open(page, '/training/exercises/side-plank');
  await expect(art).toHaveCSS('background-image', /side-plank-knees/);
  await open(page, '/training/library/boulder?format=game');
  const list = page.getByRole('list', { name: 'Übungen', exact: true });
  await expect(list.getByRole('img', { name: /Schematische Illustration/ })).toHaveCount(10);
  await expect(list.locator('svg[data-training-icon]')).toHaveCount(0);
});

test('visibility settings retain data, hide direct kids links and update another tab', async ({ page, context }) => {
  await open(page, '/training/exercises/kids-colour-post');
  await page.getByRole('button', { name: 'Farbenpost: als Favorit merken', exact: true }).click();
  await open(page, '/training/exercises/pushup');
  await page.getByRole('button', { name: 'Zur Einheit hinzufügen', exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem('kws-training-v2:training-demo'));
  const second = await context.newPage(); await second.goto('/training/library/kids');
  await open(page, '/profile/training');
  await page.getByRole('switch', { name: 'Kinderbouldern anzeigen', exact: true }).uncheck();
  await expect(second.getByRole('heading', { name: 'Kinderbouldern ist ausgeblendet', exact: true })).toBeVisible();
  await open(page); await expect(page.getByRole('link', { name: 'Kinderspiele' })).toHaveCount(0);
  await open(page, '/training/favorites');
  await expect(page.getByRole('list', { name: 'Gemerkte Inhalte' })).toHaveCount(0);
  await open(page, '/training/exercises/kids-colour-post');
  await expect(page.getByRole('heading', { name: 'Kinderbouldern ist ausgeblendet', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Trainingseinstellungen', exact: true }).click();
  await page.getByRole('switch', { name: 'Training anzeigen', exact: true }).uncheck();
  await expect(second.getByRole('heading', { name: 'Training ist ausgeblendet', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Training', exact: true })).toHaveCount(0);
  await page.reload(); await expect(page.getByRole('switch', { name: 'Training anzeigen', exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('kws-training-v2:training-demo'))).toBe(saved);
  await page.getByRole('switch', { name: 'Training anzeigen', exact: true }).check();
  await page.getByRole('switch', { name: 'Kinderbouldern anzeigen', exact: true }).check();
  await expect(second.getByRole('list', { name: 'Übungen', exact: true }).getByRole('listitem')).toHaveCount(12);
  await open(page, '/training/favorites');
  await expect(page.getByRole('list', { name: 'Gemerkte Inhalte' }).getByRole('listitem')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('kws-training-v2:training-demo'))).toBe(saved);
});

test('visibility preferences stay isolated per account', async ({ page }) => {
  await open(page, '/profile/training');
  await page.getByRole('switch', { name: 'Training anzeigen', exact: true }).uncheck();
  await page.getByRole('switch', { name: 'Kinderbouldern anzeigen', exact: true }).uncheck();
  await page.evaluate(async () => { const hooks = await import('/test/fixtures/training-preview-hooks.ts'); hooks.switchPreviewAccount(); });
  await expect(page.getByRole('switch', { name: 'Training anzeigen', exact: true })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Kinderbouldern anzeigen', exact: true })).toBeChecked();
  await page.evaluate(async () => { const hooks = await import('/test/fixtures/training-preview-hooks.ts'); hooks.switchPreviewAccount(); });
  await expect(page.getByRole('switch', { name: 'Training anzeigen', exact: true })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Kinderbouldern anzeigen', exact: true })).not.toBeChecked();
});

test('disabled training is excluded from horizontal main navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const swipe = async () => {
    const surface = page.locator('main .min-h-\\[60dvh\\]');
    await surface.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 80, clientY: 300 });
    await surface.dispatchEvent('pointermove', { pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: 230, clientY: 300 });
    await surface.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: 230, clientY: 300 });
  };
  await open(page, '/statistics'); await swipe(); await expect(page).toHaveURL(/\/training$/);
  await open(page, '/profile/training');
  await page.getByRole('switch', { name: 'Training anzeigen', exact: true }).uncheck();
  await open(page, '/statistics'); await swipe(); await expect(page).toHaveURL(/\/statistics$/);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Training', exact: true })).toHaveCount(0);
});

test('failed preference persistence is visible while the current choice stays usable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('kws-training-preferences-v1:')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await open(page, '/profile/training');
  await page.getByRole('switch', { name: 'Training anzeigen', exact: true }).uncheck();
  await expect(page.getByRole('alert')).toContainText('Auswahl gilt nur in diesem geöffneten App-Fenster');
  await expect(page.getByRole('switch', { name: 'Training anzeigen', exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('kws-training-preferences-v1:training-demo'))).toBeNull();
});

test('short instructions are reachable directly while explanations stay expandable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, '/training/exercises/edge-choice');
  await page.getByRole('link', { name: 'Zur Anleitung', exact: true }).click();
  await expect(page.locator('#exercise-instructions')).toBeInViewport();
  await expect(page.locator('#exercise-instructions')).toContainText('Großzehenseite');
  await expect(page.locator('#exercise-instructions')).toContainText('Kleinzehenseite');
  const background = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Hintergrund & Quellen' }) });
  await expect(background).not.toHaveAttribute('open', '');
  await background.locator('summary').click();
  await expect(background).toContainText('noch nicht fachlich freigegeben');
  await open(page, '/training/exercises/kids-colour-post');
  await page.getByRole('link', { name: 'Zum Spielablauf', exact: true }).click();
  await expect(page.locator('#exercise-instructions')).toBeInViewport();
  const group = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Alter, Gruppe & Spielzeit' }) });
  await expect(group).not.toHaveAttribute('open', '');
  await group.locator('summary').click();
  await expect(group.getByRole('heading', { name: 'Gruppe', exact: true })).toBeVisible();
  await open(page, '/training/exercises/kids-colour-post?age=kita');
  await page.getByRole('link', { name: 'Zur Kita-Idee', exact: true }).click();
  await expect(page.locator('#exercise-kita')).toBeInViewport();
});

test('specific grip techniques use their own appropriate illustration cells', async ({ page }) => {
  const positions: string[] = [];
  for (const id of ['sidepull-lab', 'undercling-lab', 'hand-match-order', 'flagging-basics']) {
    await open(page, `/training/exercises/${id}`);
    const art = page.getByRole('img', { name: /Schematische Illustration/ });
    await expect(art).toHaveCSS('background-image', /boulder-grip-atlas/);
    await expect(art).toHaveCSS('background-size', '200% 200%');
    positions.push(await art.evaluate(node => getComputedStyle(node).backgroundPosition));
  }
  expect(new Set(positions).size).toBe(4);
});
