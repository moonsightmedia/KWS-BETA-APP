import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function openFixture(page: Page, state = '') {
  await page.route('**/*.supabase.co/**', (route) => route.abort());
  await page.route('**/src/hooks/useSectorAreas.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-hooks.ts';" }));
  await page.route(/\/src\/hooks\/useSectors\.tsx(\?.*)?$/, (route) => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-hooks.ts';" }));
  await page.route(/\/src\/hooks\/useSectorSchedule\.ts(\?.*)?$/, (route) => route.fulfill({ contentType: 'application/javascript', body: "export { useSectorSchedule } from '/test/fixtures/admin-sectors-hooks.ts';" }));
  await page.route(/\/src\/integrations\/supabase\/storage\.ts(\?.*)?$/, (route) => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-storage.ts';" }));
  await page.route(/\/src\/utils\/qrCodeUtils\.ts(\?.*)?$/, (route) => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/admin-sectors-qr.ts';" }));
  await page.goto(`/test/fixtures/admin-sectors.html${state ? `?state=${state}` : ''}`);
  await expect(page.getByRole('heading', { name: 'Sektoren', exact: true })).toBeVisible();
}

for (const width of [375, 768, 1280, 1920]) {
  test(`sector list has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mkdir('test-results/admin-workspace-20260913', { recursive: true });
    await page.screenshot({ path: `test-results/admin-workspace-20260913/after-sectors-${width}.png`, animations: 'disabled' });
  });
}

test('create and edit use fixture-only writes and replace images in safe order', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await openFixture(page);
  await page.getByRole('button', { name: 'Neuer Sektor', exact: true }).click();
  await page.getByLabel('Name *').fill('Top-Out');
  await page.getByLabel('Beschreibung').fill('Neue Wand');
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByText('Top-Out', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Testwand bearbeiten', exact: true }).click();
  await page.getByLabel('Name *').fill('Bug Nord');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByText('Bug Nord', { exact: true })).toBeVisible();
  const writes = await page.evaluate(() => window.sectorQA.writes);
  expect(writes.map((write) => write.operation)).toContain('create');
  expect(writes.map((write) => write.operation)).toContain('update');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('fast repeated create submits only one mutation', async ({ page }) => {
  await openFixture(page, 'slow');
  await page.getByRole('button', { name: 'Neuer Sektor', exact: true }).click();
  await page.getByLabel('Name *').fill('Nur einmal');
  await page.locator('form').evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByText('Nur einmal', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.sectorQA.writes.filter((write) => write.operation === 'create'))).toHaveLength(1);
});

test('ambiguous create update keeps committed row and image for readback', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Neuer Sektor', exact: true }).click();
  await page.getByLabel('Name *').fill('Upload-Rollback');
  await page.locator('input[type="file"]').setInputFiles({ name: 'sector.png', mimeType: 'image/png', buffer: Buffer.from('fixture-image') });
  await page.evaluate(() => { window.sectorQA.lostAcknowledgements = ['update']; });
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Speichern wurde nicht bestätigt');
  const writes = await page.evaluate(() => window.sectorQA.writes);
  expect(writes.map((write) => write.operation)).toEqual(expect.arrayContaining(['create', 'upload', 'update']));
  expect(writes.map((write) => write.operation)).not.toContain('image-delete');
  expect(writes.map((write) => write.operation)).not.toContain('delete');
  expect(await page.evaluate(() => window.sectorQA.sectors.some((sector) => sector.name === 'Upload-Rollback' && sector.image_url?.includes('replacement.jpg')))).toBe(true);
  await page.evaluate(() => { window.sectorQA.lostAcknowledgements = []; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.sectorQA.writes.filter(write => write.operation === 'create'))).toHaveLength(1);
});

test('dirty cancel asks before closing and lost update ack preserves replacement image', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Testwand bearbeiten', exact: true }).click();
  await page.getByLabel('Beschreibung').fill('Noch nicht gespeichert');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Änderungen verwerfen?');
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Testwand bearbeiten', exact: true }).click();
  await page.getByLabel('Name *').fill('Updatefehler');
  await page.locator('input[type="file"]').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from('fixture-image') });
  await page.evaluate(() => { window.sectorQA.lostAcknowledgements = ['update']; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Speichern wurde nicht bestätigt');
  const writes = await page.evaluate(() => window.sectorQA.writes);
  expect(writes.map((write) => write.operation)).toEqual(expect.arrayContaining(['upload', 'update']));
  expect(writes.map((write) => write.operation)).not.toContain('image-delete');
  expect(await page.evaluate(() => window.sectorQA.sectors.find((sector) => sector.id === 'sector-bug')?.image_url?.includes('replacement.jpg'))).toBe(true);
});

test('lost create acknowledgement blocks retry until list reload and deliberate cancel', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Neuer Sektor', exact: true }).click();
  await page.getByLabel('Name *').fill('Create-Lost-Ack');
  await page.evaluate(() => { window.sectorQA.lostAcknowledgements = ['create']; });
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('möglicherweise bereits angelegt');
  await expect(page.getByRole('button', { name: 'Anlegen', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Liste neu laden', exact: true }).click();
  await expect(page.getByText('Create-Lost-Ack', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.sectorQA.writes.filter((write) => write.operation === 'create'))).toHaveLength(1);
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Änderungen verwerfen?');
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('delete error keeps confirmation open, success closes it, and QR has close/download actions', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Grotte Details öffnen', exact: true }).click();
  await page.getByRole('button', { name: 'Grotte löschen', exact: true }).click();
  await page.evaluate(() => { window.sectorQA.failures = ['delete']; });
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect.poll(async () => (await page.evaluate(() => window.sectorQA.settled.filter((entry) => entry.operation === 'delete').length))).toBe(1);
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.evaluate(() => { window.sectorQA.failures = []; });
  await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect.poll(async () => (await page.evaluate(() => window.sectorQA.settled.filter((entry) => entry.operation === 'delete').length))).toBe(2);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Testwand QR-Code anzeigen', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('QR-Code');
  await page.getByRole('button', { name: 'QR-Code herunterladen', exact: true }).click();
  await expect.poll(async () => (await page.evaluate(() => window.sectorQA.writes.some((write) => write.operation === 'qr-download')))).toBe(true);
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
