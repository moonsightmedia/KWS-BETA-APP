import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'output/setter-quick-actions/qa';
test.use({ viewport: { width: 375, height: 900 }, trace: 'off', video: 'off' });

async function openSetter(page: Page, extra = '') {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const hook of ['useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps']) {
    await page.route(`**/src/hooks/${hook}.ts*`, route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/setter-hooks.ts';" }));
  }
  await page.route('**/src/hooks/useAuth.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `
    const role=new URLSearchParams(location.search).get('role');
    export const useAuth=()=>({user:role==='loggedout'?null:{id:'fixture-setter',email:'setter@example.invalid'},session:role==='loggedout'?null:{access_token:'fixture-only'},loading:false,authTransition:null,signOut(){}});
  ` }));
  await page.route('**/src/hooks/useHasRole.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const useHasRole=value=>({hasRole:(new URLSearchParams(location.search).get('role')||'setter')===value,loading:false});" }));
  await page.route('**/src/hooks/useIsAdmin.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export const useIsAdmin=()=>({isAdmin:false,loading:false});" }));
  await page.route('**/src/contexts/UploadContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: "export {useUpload} from '/test/fixtures/setter-hooks.ts';" }));
  await page.goto(`/test/fixtures/setter-desktop.html?route=%2Fsetter%2Fedit${extra}`);
  await page.evaluate(() => document.fonts.ready);
}
const rename = (page: Page) => page.getByRole('button', { name: 'Grüne Welle umbenennen', exact: true });
const nameField = (page: Page) => page.getByLabel('Bouldername', { exact: true });
async function openMenu(page: Page, name = 'Kleine Kante') {
  await page.getByRole('button', { name: `Aktionen für ${name}`, exact: true }).click();
}
async function confirmDelete(page: Page, name = 'Kleine Kante') {
  await openMenu(page, name);
  await page.getByRole('menuitem', { name: 'Boulder löschen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
}
async function blueFilter(page: Page) {
  await page.getByRole('button', { name: 'Filter öffnen', exact: true }).click();
  await page.getByRole('button', { name: 'Farbe Blau', exact: true }).click();
  await page.getByRole('button', { name: /Boulder anzeigen$/ }).click();
}
async function shot(page: Page, name: string) {
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
}

test('rename validates, never saves on blur, and Escape/unchanged values do not write', async ({ page }) => {
  await openSetter(page);
  await rename(page).click();
  await expect(nameField(page)).toBeFocused();
  await nameField(page).fill('');
  await page.getByRole('button', { name: 'Name speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Bitte einen Namen eingeben.');
  await expect(nameField(page)).toBeFocused();
  await nameField(page).fill('Neuer Entwurf');
  await page.getByLabel('Bouldername', { exact: true }).press('Tab');
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(nameField(page)).toHaveCount(0);
  await expect(rename(page)).toBeFocused();
  await rename(page).click();
  await page.getByRole('button', { name: 'Name speichern', exact: true }).click();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('rename waits for confirmation, locks duplicates and changes only id/name', async ({ page }) => {
  await openSetter(page);
  await page.evaluate(() => { window.setterQA.delay = 600; });
  await rename(page).click();
  await nameField(page).fill('  Neue grüne Welle  ');
  await nameField(page).press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Wird gespeichert …', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Grüne Welle bearbeiten', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neue grüne Welle bearbeiten', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Neue grüne Welle umbenennen', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([{ kind: 'update-boulder', payload: { id: 'b-0', name: 'Neue grüne Welle' } }]);
});

test('rename failure preserves the draft and a retry saves the same id', async ({ page }) => {
  await openSetter(page);
  await page.evaluate(() => { window.setterQA.fail = true; });
  await rename(page).click();
  await nameField(page).fill('Nicht verloren');
  await page.getByRole('button', { name: 'Name speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Deine Eingabe bleibt erhalten');
  await expect(nameField(page)).toHaveValue('Nicht verloren');
  await expect(page.getByRole('button', { name: 'Grüne Welle bearbeiten', exact: true })).toBeVisible();
  await page.evaluate(() => { window.setterQA.fail = false; });
  await page.getByRole('button', { name: 'Name speichern', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nicht verloren bearbeiten', exact: true })).toBeVisible();
});

test('a read failure during rename retains input through retry and allows cancel', async ({ page }) => {
  await openSetter(page);
  await rename(page).click();
  await nameField(page).fill('Entwurf trotz Ladefehler');
  await page.evaluate(async () => { window.setterQA.readError = 'boulders'; await window.setterQA.refetch(); });
  await expect(nameField(page)).toHaveValue('Entwurf trotz Ladefehler');
  await expect(page.getByRole('button', { name: 'Abbrechen', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Name speichern', exact: true })).toBeDisabled();
  await page.evaluate(() => { window.setterQA.readError = null; });
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Name speichern', exact: true })).toBeEnabled();
  await expect(nameField(page)).toHaveValue('Entwurf trotz Ladefehler');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('menu edit opens the real editor; delete cancel restores focus and writes nothing', async ({ page }) => {
  await openSetter(page);
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Boulder bearbeiten', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Kleine Kante');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await confirmDelete(page);
  await expect(page.getByRole('alertdialog')).toContainText('„Kleine Kante“ löschen?');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aktionen für Kleine Kante', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('single delete ignores another selected boulder and keeps the target on failure', async ({ page }) => {
  await openSetter(page);
  await page.getByRole('checkbox', { name: 'Grüne Welle auswählen', exact: true }).check();
  await confirmDelete(page);
  await page.evaluate(() => { window.setterQA.fail = true; });
  await page.getByRole('alertdialog').getByRole('button', { name: 'Boulder löschen', exact: true }).click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText('Testfehler');
  await page.evaluate(() => { window.setterQA.fail = false; });
  await page.getByRole('alertdialog').getByRole('button', { name: 'Boulder löschen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kleine Kante bearbeiten', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Grüne Welle auswählen', exact: true })).toBeChecked();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([
    { kind: 'delete-boulder', payload: 'b-1' }, { kind: 'delete-boulder', payload: 'b-1' },
  ]);
});

test('editor delete uses the concrete object/action and remains cancellable', async ({ page }) => {
  await openSetter(page);
  await page.getByRole('button', { name: 'Kleine Kante bearbeiten', exact: true }).click();
  await page.getByRole('button', { name: 'Boulder löschen', exact: true }).click();
  await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText('„Kleine Kante“ löschen?');
  await expect(page.getByRole('alertdialog')).toContainText('nicht rückgängig');
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Boulder löschen', exact: true })).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('no results explains the query and the local action resets both query and filters', async ({ page }) => {
  await openSetter(page);
  await blueFilter(page);
  await page.getByLabel('Boulder suchen', { exact: true }).fill('Mondkante');
  await expect(page.getByRole('status').filter({ hasText: 'Keine passenden Boulder' })).toContainText('„Mondkante“');
  await page.getByRole('button', { name: 'Suche und Filter zurücksetzen', exact: true }).click();
  await expect(page.getByLabel('Boulder suchen', { exact: true })).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: /^12 Boulder$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Farbe Blau entfernen', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
});

test('retry stays pending, omits false zeroes and retains search/filter context', async ({ page }) => {
  await openSetter(page);
  await blueFilter(page);
  await page.getByLabel('Boulder suchen', { exact: true }).fill('Kleine Kante');
  await page.evaluate(async () => { window.setterQA.readError = 'boulders'; await window.setterQA.refetch(); });
  await expect(page.getByRole('alert')).toContainText('Suche und Filter bleiben erhalten');
  await expect(page.getByRole('status').filter({ hasText: /^0 Boulder$/ })).toHaveCount(0);
  await page.evaluate(() => { window.setterQA.readError = null; window.setterQA.readDelay = 650; });
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wird geladen …', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Kleine Kante bearbeiten', exact: true })).toBeVisible();
  await expect(page.getByLabel('Boulder suchen', { exact: true })).toHaveValue('Kleine Kante');
  await expect(page.getByRole('button', { name: 'Farbe Blau entfernen', exact: true })).toBeVisible();
});

for (const role of ['member', 'loggedout']) {
  test(`existing route guard keeps quick actions unavailable for ${role}`, async ({ page }) => {
    await openSetter(page, `&role=${role}`);
    await expect(page.getByText(role === 'loggedout' ? 'Anmeldung' : 'Kein Zugriff auf den Setterbereich', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /umbenennen|Aktionen für/ })).toHaveCount(0);
  });
}

for (const width of [375, 768, 1280, 1920]) {
  test(`two visual loops: full shell, inline, menu, confirmation, empty/error at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openSetter(page);
    await shot(page, `loop1-list-${width}`);
    const checkBounds = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await checkBounds();
    await rename(page).click();
    await nameField(page).fill('Ein sehr langer neuer Bouldername für die unveränderte Halle');
    await shot(page, `loop2-inline-${width}`);
    await checkBounds();
    await nameField(page).press('Escape');
    await openMenu(page);
    const deleteItem = page.getByRole('menuitem', { name: 'Boulder löschen', exact: true });
    await expect(deleteItem).toBeVisible();
    await expect.poll(() => deleteItem.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { hasTouchHeight: rect.height >= 43.9, reachable: element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
    })).toEqual({ hasTouchHeight: true, reachable: true });
    await shot(page, `loop2-menu-${width}`);
    await page.getByRole('menuitem', { name: 'Boulder löschen', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await shot(page, `loop2-delete-${width}`);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await page.getByLabel('Boulder suchen', { exact: true }).fill('Mondkante');
    await shot(page, `loop2-empty-${width}`);
    await page.evaluate(async () => { window.setterQA.readError = 'boulders'; await window.setterQA.refetch(); });
    await shot(page, `loop2-error-${width}`);
    await checkBounds();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.setterQA.writes)).toEqual([]);
  });
}
