import { expect, test, type Locator } from '@playwright/test';

async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const composite = (front: number[], back: number[]) => front.slice(0, 3).map((c, i) => c * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
    const parents: Element[] = [];
    for (let current: Element | null = element; current; current = current.parentElement) parents.unshift(current);
    let background = [255, 255, 255];
    for (const parent of parents) background = composite(rgb(getComputedStyle(parent).backgroundColor), background);
    const foreground = composite(rgb(getComputedStyle(element).color), background);
    const luminance = (color: number[]) => color.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  });
}

for (const width of [375, 768, 1280, 1920]) {
  test(`foundation geometry, contrast and interactions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/*.supabase.co/**', route => route.abort());
    await page.goto('/test/fixtures/foundations.html');
    await expect(page.getByTestId('card')).toHaveCSS('border-radius', '12px');
    await expect(page.getByTestId('badge')).toHaveCSS('border-radius', '4px');
    await expect(page.getByRole('heading', { name: 'Farben und Bedienung' })).toHaveCSS('font-family', /Poppins/);
    await expect(page.getByRole('heading', { name: 'Terminplanung' })).toHaveCSS('font-family', /Poppins/);
    // Brand green is not darkened to accommodate white labels.
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toHaveCSS('background-color', 'rgb(54, 180, 49)');
    await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toHaveCSS('color', 'rgb(24, 35, 52)');
    for (const name of ['Speichern', 'Abbrechen', 'Entfernen']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toHaveCSS('border-radius', '8px');
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      await button.hover();
      await page.waitForTimeout(200);
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
    }
    for (const id of ['secondary-text', 'setter-text', 'badge']) expect(await contrast(page.getByTestId(id))).toBeGreaterThanOrEqual(4.5);
    const input = page.getByLabel('Name', { exact: true });
    const before = await input.boundingBox();
    await input.focus();
    expect(await input.boundingBox()).toEqual(before);
    await expect(input).toHaveCSS('border-radius', '8px');
    await expect(input).not.toHaveCSS('box-shadow', 'none');
    const activeTab = page.getByRole('tab', { name: 'Übersicht' });
    expect(await contrast(activeTab)).toBeGreaterThanOrEqual(4.5);
    await activeTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Einstellungen' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('combobox').click();
    await expect(page.getByRole('listbox')).toHaveCSS('border-radius', '12px');
    await page.getByRole('option', { name: 'Ein Sektor' }).click();
    await expect(page.getByRole('combobox')).toHaveText('Ein Sektor');
    await page.getByRole('switch').click();
    await expect(page.getByRole('switch')).toBeChecked();
    // The compact switch track also accepts touches in its 44px-high hit area.
    const track = (await page.getByRole('switch').boundingBox())!;
    await page.mouse.click(track.x + track.width / 2, track.y - 5);
    await expect(page.getByRole('switch')).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Deaktiviert' })).toBeDisabled();
    await page.getByRole('button', { name: 'Dialog öffnen' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('border-radius', width < 768 ? '12px 12px 0px 0px' : '12px');
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(width < 768 ? 0 : 15);
    expect(box.x + box.width).toBeLessThanOrEqual(width < 768 ? width : width - 15);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Dialog öffnen' })).toBeFocused();
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
  });
}
