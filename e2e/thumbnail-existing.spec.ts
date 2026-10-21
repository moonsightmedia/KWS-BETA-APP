import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
const fixture = '/test/fixtures/thumbnail-existing.html?state=hierarchy';
const backend = 'https://beta-api.kletterwelt-sauerland.de';
async function setup(page: Page, options: { missing?: boolean; fail?: boolean; slow?: boolean; legacy?: boolean } = {}) {
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 360; c.height = 480;
    const x = c.getContext('2d')!; x.fillStyle = '#d4c6ad'; x.fillRect(0, 0, 360, 480);
    x.fillStyle = '#36B531'; x.fillRect(40, 70, 80, 65); x.fillRect(210, 290, 90, 70);
    return c.toDataURL('image/png');
  });
  const bytes = Buffer.from(image.split(',')[1], 'base64'), hash = createHash('sha256').update(bytes).digest('hex');
  const state = { commits: [] as Record<string, unknown>[], source: { original_url: 'https://video.kletterwelt-sauerland.de/videos/fixture/original.png', original_sha256: hash, selection: null as unknown, color: 'Grün', color_2: null }, fail: !!options.fail, analyses: 0 };
  if(!options.legacy)state.source.selection={version:'synthetic-v1',image_hash:hash,width:360,height:480,candidates:[{id:'one',polygon:[[40,70],[120,70],[120,135],[40,135]],box:[40,70,80,65],area:5200,source:'automatic'},{id:'two',polygon:[[210,290],[300,290],[300,360],[210,360]],box:[210,290,90,70],area:6300,source:'automatic'}],selected:['one','two'],automatic:['one','two']};
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'blob:' || url.protocol === 'data:') { await route.continue(); return; }
    if (url.origin === backend && url.pathname === '/rest/v1/boulder_thumbnail_sources') {
      if (options.slow) await new Promise(resolve => setTimeout(resolve, 800));
      await route.fulfill({ json: options.missing ? [] : [state.source] }); return;
    }
    if (url.origin === backend && url.pathname === '/rest/v1/rpc/save_boulder_thumbnail') {
      const body = route.request().postDataJSON(); state.commits.push(body);
      if (state.fail) { await route.fulfill({ status: 409, json: { message: 'Isolierter Speicherkonflikt. Deine Auswahl bleibt erhalten.' } }); return; }
      state.source = { original_url: body.p_original_url, original_sha256: body.p_original_sha256, selection: body.p_selection, color: body.p_color, color_2: body.p_color_2 };
      await route.fulfill({ json: true }); return;
    }
    if (url.pathname === '/qa-thumbnail/api/analyze') {
      state.analyses++;
      const body = route.request().postDataJSON();
      await route.fulfill({ json: { version: 'synthetic-v1', image_hash: hash, image, width: 360, height: 480,
        candidates: [{ id: 'one', polygon: [[40, 70], [120, 70], [120, 135], [40, 135]], box: [40, 70, 80, 65], area: 5200, source: 'automatic' }, { id: 'two', polygon: [[210, 290], [300, 290], [300, 360], [210, 360]], box: [210, 290, 90, 70], area: 6300, source: 'automatic' }], selected: body.point ? ['one'] : ['one', 'two'] } }); return;
    }
    if (url.hostname.endsWith('.kletterwelt-sauerland.de')) { await route.fulfill({ contentType: 'image/png', body: bytes }); return; }
    if (url.hostname !== '127.0.0.1') { await route.abort(); return; }
    await route.continue();
  });
  await page.goto(fixture); await page.evaluate(() => document.fonts.ready);
  return state;
}
async function edit(page: Page) {
  await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count', '2');
  await page.locator('[data-thumbnail-focus]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-thumbnail-focus] canvas')).toHaveAttribute('tabindex', '0');
}
async function deselect(page: Page) {
  const canvas = page.locator('[data-thumbnail-focus] canvas'), rect = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: 70 / 360 * rect.width, y: 100 / 480 * rect.height } });
  await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count', '1');
}
test('existing selection opens automatically; one Boulder save persists correction and reopening never analyzes', async ({ page }) => {
  const state = await setup(page); await edit(page);
  expect(state.commits).toHaveLength(0); expect(state.analyses).toBe(0); await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeEnabled();
  await expect(page.getByRole('button',{name:'Vorschau bestätigen',exact:true})).toHaveCount(0); await deselect(page);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('[data-fixture-result]')).toHaveText('Boulder gespeichert');
  expect(state.commits).toHaveLength(1); expect(state.commits[0].p_original_url).toBe(state.source.original_url);
  expect(state.source.selection).not.toHaveProperty('image'); expect((state.source.selection as { selected: unknown[] }).selected).toHaveLength(1);
  const calls = state.analyses;
  await page.getByRole('button', { name: 'Boulder bearbeiten', exact: true }).click();
  await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count', '1');
  expect(state.analyses).toBe(calls); // Same source/geometry restored, no new automatic selection.
  expect(await page.evaluate(() => (window as unknown as { thumbnailUploads: unknown[] }).thumbnailUploads.length)).toBe(1);
});
test('discard only the photo change retains other unsaved form fields and performs no write', async ({ page }) => {
  const state = await setup(page); await page.getByLabel('Name', { exact: true }).fill('Neuer Bouldername');
  await edit(page); await deselect(page); await page.getByRole('button', { name: 'Bildänderung verwerfen' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Neuer Bouldername');
  await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count','2');
  expect(state.commits).toHaveLength(0);
});
test('missing original is explained without editing an already desaturated variant; retry and file picker remain available', async ({ page }) => {
  const state = await setup(page, { missing: true });
  await expect(page.getByRole('alert')).toContainText('Farboriginal'); await expect(page.locator('[data-thumbnail-focus]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Erneut laden', exact: true })).toBeEnabled(); await expect(page.getByAltText('Aktuell gespeichertes Boulderbild')).toBeVisible();
  expect(state.commits).toHaveLength(0);
});
test('save conflict preserves confirmed selection; retry reuses the immutable upload', async ({ page }) => {
  const state = await setup(page, { fail: true }); await edit(page); await deselect(page);
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Speicherkonflikt'); await expect(page.locator('[data-thumbnail-focus]')).toHaveAttribute('data-selected-count', '1');
  state.fail = false; await page.getByRole('button', { name: 'Erneut speichern', exact: true }).click();
  await expect(page.locator('[data-fixture-result]')).toHaveText('Boulder gespeichert');
  expect(state.commits).toHaveLength(2); expect(state.commits[0].p_thumbnail_url).toBe(state.commits[1].p_thumbnail_url);
  expect(await page.evaluate(() => (window as unknown as { thumbnailUploads: unknown[] }).thumbnailUploads.length)).toBe(1);
});
test('keeping the original explicitly publishes its verified URL without another image upload', async ({ page }) => {
  const state = await setup(page); await edit(page);
  await page.getByRole('button',{name:'Vorschau-Optionen'}).click(); await page.getByRole('menuitem',{name:'Original verwenden',exact:true}).click();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('[data-fixture-result]')).toHaveText('Boulder gespeichert');
  expect(state.commits[0].p_thumbnail_url).toBe(state.commits[0].p_original_url); expect(state.commits[0].p_selection).toMatchObject({mode:'original',selected:[]});
  expect(await page.evaluate(() => (window as unknown as { thumbnailUploads: unknown[] }).thumbnailUploads.length)).toBe(0);
});
test('closing during photo loading cancels the result and never applies it to a reopened editor', async ({ page }) => {
  const state = await setup(page, { slow: true });
  await expect(page.getByAltText('Aktuell gespeichertes Boulderbild')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Boulder bearbeiten', exact: true }).click();
  await edit(page); expect(state.commits).toHaveLength(0); expect(state.analyses).toBe(0);
});
for (const loop of [1, 2]) test(`rendered QA loop ${loop}: four widths, fixed actions, direct selection and no overflow`, async ({ page }, info) => {
  await setup(page); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1080 });
    await page.goto(fixture); await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-thumbnail-focus]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/thumbnail-existing/${info.project.name}-loop${loop}-entry-${width}.png` });
    await edit(page); if (loop === 2) await deselect(page);
    await page.screenshot({ path: `output/thumbnail-existing/${info.project.name}-loop${loop}-editor-${width}.png` });
    const dialog = page.getByRole('dialog', { name: 'Boulder bearbeiten', exact: true });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const save = page.getByRole('button', { name: 'Speichern', exact: true }), box = (await save.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(errors).toEqual([]);
});

test('opening and saving unchanged image performs no upload or thumbnail transaction',async({page})=>{
 const state=await setup(page);await edit(page);await page.getByLabel('Name',{exact:true}).fill('Nur Name geändert');await page.getByRole('button',{name:'Speichern',exact:true}).click();await expect(page.locator('[data-fixture-result]')).toHaveText('Boulder gespeichert');expect(state.commits).toHaveLength(0);expect(state.analyses).toBe(0);expect(await page.evaluate(()=>(window as unknown as {thumbnailUploads:unknown[]}).thumbnailUploads.length)).toBe(0);
});

test('legacy pixels stay the base; correcting one hold preserves the other and saves geometry without pixels',async({page})=>{
 const state=await setup(page,{legacy:true});const focus=page.locator('[data-thumbnail-focus]');await expect(focus).toHaveAttribute('data-selected-count','0');await expect(focus.getByRole('status')).toHaveText('Gespeicherte Version');expect(state.analyses).toBe(0);
 const canvas=focus.locator('canvas');await canvas.scrollIntoViewIfNeeded();const rect=(await canvas.boundingBox())!;await canvas.click({position:{x:70/360*rect.width,y:100/480*rect.height}});await expect(focus.getByText('1 Bildkorrekturen',{exact:true})).toBeVisible();
 await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>{const x=c.getContext('2d')!;const a=x.getImageData(70,100,1,1).data,b=x.getImageData(250,320,1,1).data;return a[0]===a[1]&&b[1]>b[0]+50;})).toBe(true);
 await page.getByRole('button',{name:'Speichern',exact:true}).click();await expect(page.locator('[data-fixture-result]')).toHaveText('Boulder gespeichert');expect(state.commits).toHaveLength(1);expect(state.source.selection).toHaveProperty('base_thumbnail_url');expect(state.source.selection).not.toHaveProperty('base_image');expect(state.source.selection).not.toHaveProperty('image');
});
