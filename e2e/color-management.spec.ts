import { expect, test, type Page } from '@playwright/test';

async function openFixture(page: Page, state = '') {
  // No production requests or auth changes: all catalog operations are in-memory.
  await page.route('**/*.supabase.co/**', route => route.abort());
  await page.route('**/src/hooks/useColors.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/color-management-hooks.ts';" }));
  await page.goto('/test/fixtures/color-management.html' + (state ? '?state=' + state : ''));
}

async function expectInViewport(page: Page) {
  const viewport = page.viewportSize()!;
  for (const element of await page.getByRole('dialog').locator('input, button').all()) {
    if (!await element.isVisible()) continue;
    const box = (await element.boundingBox())!;
    const inset = viewport.width < 768 ? 8 : 15;
    expect(box.x).toBeGreaterThanOrEqual(inset);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - inset);
  }
  const box = (await page.getByRole('dialog').boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(15);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.width < 768 ? viewport.height : viewport.height - 15);
}

async function orderIds(page: Page) {
  return page.getByRole('list', { name: 'Farbreihenfolge' }).locator('li').evaluateAll(rows => rows.map(row => row.getAttribute('data-color-id')));
}

for (const width of [375, 768, 1280, 1920]) {
  test(`drag order, full catalog, cancel and confirmed save at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openFixture(page);
    await page.getByRole('button', { name: 'Aktiv', exact: true }).click();
    await page.getByLabel('Farben suchen').fill('Pink');
    await page.getByRole('button', { name: 'Reihenfolge', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Farbreihenfolge' }).locator('li')).toHaveCount(3);
    await expectInViewport(page);
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
    const handle = page.getByRole('button', { name: 'Pink verschieben', exact: true });
    const source = (await handle.boundingBox())!;
    const target = (await page.getByRole('button', { name: 'Inaktives Blau verschieben' }).boundingBox())!;
    await page.mouse.move(source.x + 22, source.y + 22);
    await page.mouse.down();
    await page.mouse.move(target.x + 22, target.y + 22, { steps: 15 });
    await expect(page.getByText('Neue Position 3', { exact: true })).toBeVisible();
    await page.mouse.up();
    expect(await orderIds(page)).toEqual(['dual', 'inactive', 'pink']);
    expect(await page.evaluate(() => window.colorQA.writes)).toHaveLength(0);
    await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reihenfolge', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Reihenfolge', exact: true }).click();
    expect(await orderIds(page)).toEqual(['pink', 'dual', 'inactive']);
    await page.getByRole('button', { name: 'Pink verschieben', exact: true }).focus();
    await page.keyboard.press('End');
    expect(await orderIds(page)).toEqual(['dual', 'inactive', 'pink']);
    await page.evaluate(() => { window.colorQA.delay = 600; });
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(await page.evaluate(() => window.colorQA.writes)).toEqual([{ kind: 'reorder', payload: { expected: [{ id: 'pink', sort_order: 0 }, { id: 'dual', sort_order: 1 }, { id: 'inactive', sort_order: 2 }], ids: ['dual', 'inactive', 'pink'] } }]);
    await page.getByRole('button', { name: 'Reihenfolge', exact: true }).click();
    expect(await orderIds(page)).toEqual(['dual', 'inactive', 'pink']);
  });
}

test('order keyboard, arrow buttons, reduced motion and write/conflict recovery', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 550 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  await page.getByRole('button', { name: 'Reihenfolge', exact: true }).click();
  await page.getByRole('button', { name: 'Pink nach unten', exact: true }).click();
  expect(await orderIds(page)).toEqual(['dual', 'pink', 'inactive']);
  await expect(page.getByRole('button', { name: 'Pink verschieben', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  expect(await orderIds(page)).toEqual(['pink', 'dual', 'inactive']);
  await page.keyboard.press('End');
  await page.evaluate(() => { window.colorQA.failWrite = true; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Entwurf bleibt erhalten');
  expect(await orderIds(page)).toEqual(['dual', 'inactive', 'pink']);
  await page.evaluate(() => { window.colorQA.failWrite = false; window.colorQA.reloadRequired = true; });
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
  const footer = (await page.getByRole('button', { name: 'Abbrechen', exact: true }).boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(534);
  await page.evaluate(() => { window.colorQA.reloadRequired = false; });
  await page.getByRole('button', { name: 'Gespeicherte Liste neu laden' }).click();
  expect(await orderIds(page)).toEqual(['pink', 'dual', 'inactive']);
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
});

test('touch handle drag and escape cancellation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 550 });
  await openFixture(page);
  await page.getByRole('button', { name: 'Reihenfolge', exact: true }).click();
  const touch = await page.context().newCDPSession(page);
  const source = (await page.getByRole('button', { name: 'Pink verschieben', exact: true }).boundingBox())!;
  const target = (await page.getByRole('button', { name: 'Inaktives Blau verschieben' }).boundingBox())!;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source.x + 22, y: source.y + 22 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + 22, y: target.y + 22 }] });
  await expect(page.getByText('Neue Position 3', { exact: true })).toBeVisible();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await orderIds(page)).toEqual(['dual', 'inactive', 'pink']);
  const handle = (await page.getByRole('button', { name: 'Pink verschieben', exact: true }).boundingBox())!;
  await page.mouse.move(handle.x + 22, handle.y + 22);
  await page.mouse.down();
  await page.mouse.move(handle.x + 22, source.y + 22, { steps: 10 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await orderIds(page)).toEqual(['dual', 'inactive', 'pink']);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => window.colorQA.writes)).toHaveLength(0);
  await touch.detach();
});

test('long list auto-scrolls while dragging and outside drop cancels', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 550 });
  await openFixture(page, 'long');
  await page.getByRole('button', { name: 'Reihenfolge', exact: true }).click();
  const scroll = page.getByTestId('color-order-scroll');
  const bounds = (await scroll.boundingBox())!;
  const source = (await page.getByRole('button', { name: 'Farbe 1 verschieben', exact: true }).boundingBox())!;
  await page.mouse.move(source.x + 22, source.y + 22);
  await page.mouse.down();
  await page.mouse.move(source.x + 22, bounds.y + bounds.height - 10, { steps: 12 });
  await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(200);
  await page.mouse.up();
  expect((await orderIds(page)).indexOf('long-0')).toBeGreaterThan(2);
  const moved = await orderIds(page);
  await scroll.evaluate(el => el.scrollTop = 0);
  const first = (await page.getByRole('button', { name: 'Farbe 2 verschieben', exact: true }).boundingBox())!;
  await page.mouse.move(first.x + 22, first.y + 22);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 10, { steps: 10 });
  await page.mouse.up();
  expect(await orderIds(page)).toEqual(moved);
  expect(await page.evaluate(() => window.colorQA.writes)).toHaveLength(0);
});

for (const width of [375, 768, 1280, 1920]) {
  test(`color list, editor, palette and save at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page);
    await expect(page.getByRole('list', { name: 'Grifffarben' }).getByRole('listitem')).toHaveCount(3);
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
    await page.getByRole('button', { name: 'Inaktiv', exact: true }).click();
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Inaktives Blau bearbeiten' })).toBeVisible();
    await page.getByRole('button', { name: 'Alle', exact: true }).click();
    await page.getByLabel('Farben suchen').fill('FACC15');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('button', { name: 'Suche leeren' }).click();
    await page.getByRole('button', { name: 'Pink bearbeiten', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
    await page.getByLabel('Farbname', { exact: true }).fill('Pink neu');
    await page.getByLabel('Reihenfolge').focus();
    expect(await page.evaluate(() => window.colorQA.writes)).toHaveLength(0);
    await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Änderungen verwerfen?');
    await page.getByRole('button', { name: 'Zurück', exact: true }).click();
    await expect(page.getByLabel('Farbname', { exact: true })).toHaveValue('Pink neu');
    await page.getByRole('button', { name: 'Zweifarbig', exact: true }).click();
    await expectInViewport(page);
    for (const label of ['Erste Farbe', 'Zweite Farbe']) {
      const input = page.getByLabel(label, { exact: true });
      expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(120);
    }
    await page.getByRole('button', { name: 'Zweite Farbe auswählen', exact: true }).click();
    await page.getByRole('button', { name: 'Blau (#3B82F6)', exact: true }).click();
    await expect(page.getByLabel('Zweite Farbe', { exact: true })).toHaveValue('#3B82F6');
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Pink neu bearbeiten' })).toBeVisible();
    const writes = await page.evaluate(() => window.colorQA.writes);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ kind: 'update', payload: { name: 'Pink neu', secondary_hex: '#3B82F6', id: 'pink' } });
    expect(errors).toEqual([]);
  });
}

test('validation, pending, error recovery and explicit destructive confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await openFixture(page);
  await page.getByRole('button', { name: 'Neue Farbe', exact: true }).click();
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByLabel('Farbname', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Farbname', { exact: true }).fill('Neue Kombination');
  await page.getByRole('button', { name: 'Zweifarbig', exact: true }).click();
  await page.getByLabel('Erste Farbe', { exact: true }).fill('#XX');
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  expect(await page.evaluate(() => window.colorQA.writes)).toHaveLength(0);
  await page.getByLabel('Erste Farbe', { exact: true }).fill('#abc');
  await page.evaluate(() => { window.colorQA.failWrite = true; window.colorQA.delay = 500; });
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Anlegen', exact: true })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Eingaben bleiben erhalten');
  await expect(page.getByLabel('Farbname', { exact: true })).toHaveValue('Neue Kombination');
  await page.evaluate(() => { window.colorQA.failWrite = false; });
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Neue Kombination bearbeiten' }).click();
  await page.getByRole('button', { name: 'Neue Kombination löschen' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('„Neue Kombination“ löschen?');
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  expect((await page.evaluate(() => window.colorQA.writes)).filter(w => w.kind === 'delete')).toHaveLength(0);
  await page.getByRole('button', { name: 'Neue Kombination löschen' }).click();
  await page.getByRole('button', { name: 'Farbe löschen', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Neue Kombination bearbeiten' })).not.toBeVisible();
});

test('reactivation and removing second color persist as one explicit update', async ({ page }) => {
  await openFixture(page);
  await page.getByRole('button', { name: 'Inaktives Blau bearbeiten' }).click();
  await page.getByRole('switch', { name: 'Aktiv' }).click();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Inaktiv', exact: true }).click();
  await expect(page.getByText('Keine passenden Farben')).toBeVisible();
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await page.getByRole('button', { name: /Grün–Gelb.*bearbeiten/ }).click();
  await page.getByRole('button', { name: 'Einfarbig', exact: true }).click();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => window.colorQA.rows.find(r => r.id === 'dual')?.secondary_hex)).toBeNull();
});

test('empty, loading, failed loading and recovery remain distinct', async ({ page }) => {
  await openFixture(page, 'empty');
  await expect(page.getByText('Deine Farbpalette ist noch leer')).toBeVisible();
  await page.goto('/test/fixtures/color-management.html?state=loading');
  await expect(page.getByRole('status', { name: 'Farben werden geladen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neue Farbe', exact: true })).toBeDisabled();
  await page.goto('/test/fixtures/color-management.html?state=error');
  await expect(page.getByRole('alert')).toContainText('konnten nicht geladen werden');
  await page.evaluate(() => { window.colorQA.readError = false; });
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Standardfarben ergänzen' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('bleiben unverändert');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Standardfarben ergänzen' })).toBeFocused();
  expect(await page.evaluate(() => window.colorQA.writes)).toHaveLength(0);
});

test('keyboard, reduced motion and a short mobile viewport preserve reachable actions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 550 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  const trigger = page.getByRole('button', { name: 'Neue Farbe', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Zweifarbig', exact: true }).click();
  const save = (await page.getByRole('button', { name: 'Anlegen', exact: true }).boundingBox())!;
  expect(save.y + save.height).toBeLessThanOrEqual(534);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
