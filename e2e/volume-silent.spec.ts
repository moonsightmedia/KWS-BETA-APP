import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const output = 'test-results/volume-silent-20261013';
test.use({ trace: 'off', video: 'off' });
async function setter(page: Page, section = 'create') {
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  for (const name of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps']) {
    await page.route(`**/src/hooks/${name}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/setter-hooks.ts';" }));
  }
  await page.route('**/src/contexts/UploadContext.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: "export { useUpload } from '/test/fixtures/setter-hooks.ts';" }));
  await page.goto(`/test/fixtures/setter-workspace.html?page=${section}`);
}

for (const width of [375, 768, 1280, 1920]) {
  test(`volume editor keeps color and dual color at ${width}px`, async ({ page }) => {
    await mkdir(output, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    await setter(page);
    await page.getByRole('button', { name: 'Boulder hinzufügen', exact: true }).click();
    const volume = page.getByRole('checkbox', { name: /Nur Volumen/ });
    await volume.check();
    await page.getByRole('button', { name: 'Farbe Blau', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Zweite Farbe', exact: true }).check();
    await expect(volume).toBeChecked();
    await expect(page.getByRole('button', { name: 'Farbe Blau', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
    await volume.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/loop1-editor-${width}.png` });
    // Second loop: toggle does not reset either primary color or dual-color selection.
    await volume.uncheck();
    await volume.check();
    await expect(page.getByRole('checkbox', { name: 'Zweite Farbe', exact: true })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Farbe Blau', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `${output}/loop2-editor-${width}.png` });
  });
}

test('existing volume-only boulder hydrates in the editor and writes the flag back', async ({ page }) => {
  await setter(page, 'edit');
  await expect(page.getByLabel('Nur Volumen', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Grüne Welle bearbeiten', exact: true }).click();
  const volume = page.getByRole('checkbox', { name: /Nur Volumen/ });
  await expect(volume).toBeChecked();
  await volume.uncheck();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  const writes = await page.evaluate(() => window.setterQA.writes);
  const update = writes.find(w => w.kind === 'update-boulder')!.payload as Record<string, unknown>;
  expect(update.volume_only).toBe(false);
  expect(update.color).toBe('Grün');
});

test('creating a dual-color volume boulder sends an independent boolean and both colors', async ({ page }) => {
  await setter(page);
  await page.route('**/src/components/setter/BatchUpload.tsx*', async r => {
    const response = await r.fetch();
    const body = (await response.text()).replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify(new URL('/qa', page.url()).href))
      .replaceAll('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY', JSON.stringify('fixture-only'));
    await r.fulfill({ response, body });
  });
  await page.reload();
  let payload: any;
  await page.route('**/qa/rest/v1/boulders', r => {
    payload = r.request().postDataJSON();
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'created-volume' }]) });
  });
  await page.getByRole('button', { name: 'Boulder hinzufügen', exact: true }).click();
  await page.getByRole('checkbox', { name: /Nur Volumen/ }).check();
  await page.getByRole('checkbox', { name: 'Zweite Farbe', exact: true }).check();
  await page.getByRole('button', { name: 'Zweite Farbe Weiß', exact: true }).click();
  await page.getByLabel('Video', { exact: true }).setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('mocked local upload') });
  await page.getByLabel('Vorschaubild', { exact: true }).setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: await readFile('src/assets/boulderkarte-original.png') });
  await page.getByRole('combobox', { name: 'Sektor wählen', exact: true }).click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: 'Zum Stapel hinzufügen', exact: true }).click();
  await expect(page.getByLabel('Nur Volumen', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1 Boulder hochladen', exact: true }).click();
  await expect(page.getByText('1 Boulder übertragen', { exact: true })).toBeVisible();
  expect(payload.volume_only).toBe(true);
  expect(payload.color).toBe('Grün'); expect(payload.color_2).toBe('Weiß');
  expect(payload.beta_video_status).toBe('uploading');
});

for (const width of [375, 768, 1280, 1920]) {
  test(`volume marker in production Boulder grid and list at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setter(page);
    for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
      await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/filter-user-hooks.ts';" }));
    }
    await page.goto('/test/fixtures/filter-boulders.html?volumeQA=1');
    const marker = page.getByLabel('Nur Volumen', { exact: true });
    await page.getByRole('button', { name: 'Gridansicht', exact: true }).click();
    await marker.first().scrollIntoViewIfNeeded();
    await expect(marker.first()).toBeVisible();
    await page.screenshot({ path: `${output}/loop1-grid-${width}.png` });
    await page.getByRole('button', { name: 'Listenansicht', exact: true }).click();
    await marker.first().scrollIntoViewIfNeeded();
    await expect(marker.first()).toBeVisible();
    await page.screenshot({ path: `${output}/loop2-list-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

for (const format of ['mp4', 'webm']) {
test(`real browser remux removes audio from ${format} and preserves video packets without uploading media`, async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(output, { recursive: true });
  const source = join(output, `source-audio.${format}`);
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=30:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', format === 'mp4' ? 'libx264' : 'libvpx', '-c:a', format === 'mp4' ? 'aac' : 'libopus', '-shortest', source], { stdio: 'ignore' });
  await page.route('**/*', r => {
    const url = new URL(r.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'unpkg.com' || url.protocol === 'blob:' ? r.continue() : r.abort();
  });
  await page.goto('/test/fixtures/silent-video.html');
  await page.getByLabel('Video').setInputFiles(source);
  await expect(page.getByRole('status')).toHaveText('Ohne Ton', { timeout: 90_000 });
  const bytes = await page.evaluate(async () => Array.from(new Uint8Array(await (window as any).silentResult.arrayBuffer())));
  const saved = join(output, `silent.${format}`);
  await writeFile(saved, Buffer.from(bytes));
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', saved], { encoding: 'utf8' }));
  expect(info.streams.filter(s => s.codec_type === 'audio')).toHaveLength(0);
  expect(info.streams.filter(s => s.codec_type === 'video')).toHaveLength(1);
  expect(info.streams[0].width).toBe(320);
  expect(info.streams[0].height).toBe(240);
  const hash = (path: string) => execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { encoding: 'utf8' }).trim();
  expect(hash(saved)).toBe(hash(source));
});
}

test('unavailable processor fails closed; cancellation never returns an original file', async ({ page }) => {
  await page.route('https://unpkg.com/**', r => r.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/test/fixtures/silent-video.html');
  await page.getByLabel('Video').setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not uploaded') });
  await expect(page.getByRole('status')).toContainText('Tonspur konnte nicht entfernt werden');
  expect(await page.evaluate(() => (window as any).silentResult)).toBeUndefined();
  const aborted = await page.evaluate(async () => {
    const controller = new AbortController(); controller.abort();
    try { await (window as any).prepareSilentVideoFile(new File(['original'], 'source.mp4'), controller.signal); return 'unexpected success'; }
    catch (error) { return (error as Error).name; }
  });
  expect(aborted).toBe('AbortError');
});

for (const width of [375, 768, 1280, 1920]) {
  test(`remaining volume marker surfaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setter(page);
    for (const view of ['edit', 'status']) {
      await page.goto(`/test/fixtures/setter-workspace.html?page=${view}&volumeQA=1`);
      const marker = page.getByLabel('Nur Volumen', { exact: true }).first();
      await marker.scrollIntoViewIfNeeded(); await expect(marker).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${output}/loop1-${view}-${width}.png` });
      await page.reload(); await marker.scrollIntoViewIfNeeded(); await expect(marker).toBeVisible();
      await page.screenshot({ path: `${output}/loop2-${view}-${width}.png` });
    }
    for (const hook of ['useAuth', 'useColors', 'useSectors', 'useBoulders', 'useBoulderCommunity', 'useSectorSchedule', 'useHallMaps', 'useHasRole', 'useIsAdmin']) {
      await page.route(`**/src/hooks/${hook}.ts*`, r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/filter-user-hooks.ts';" }));
    }
    await page.route('**/src/hooks/useBoulderCommunity.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: "export * from '/test/fixtures/filter-user-hooks.ts'; export const useMyTrackedBoulders=()=>({data:[]}); export const useMyTrackingSessions=()=>({data:[]});" }));
    await page.route('**/src/components/NotificationCenter.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const NotificationCenter=()=>null;' }));
    await page.route('**/test/fixtures/filter-user-hooks.ts*', async r => {
      const response = await r.fetch();
      await r.fulfill({ response, body: (await response.text()).replaceAll('new Date("2026-09-14T08:00:00Z")', 'new Date()').replaceAll("new Date('2026-09-14T08:00:00Z')", 'new Date()') });
    });
    // Only the header/marker is in scope; untouched community tab contents are isolated.
    await page.route('**/src/components/boulder/BoulderDetailSections.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const BoulderInfoTab=()=>null;export const BoulderTrackTab=()=>null;export const BoulderBetaTab=()=>null;' }));
    await page.route('**/src/components/BoulderCommunityPanel.tsx*', r => r.fulfill({ contentType: 'application/javascript', body: 'export const BoulderBetaPreview=()=>null;export const BoulderStatsPanel=()=>null;export const BoulderTrackingPanel=()=>null;' }));
    for (const view of ['guest', 'home', 'detail', 'dialog']) {
      await page.goto(`/test/fixtures/volume-pages.html?view=${view}&volumeQA=1`);
      const marker = page.getByLabel('Nur Volumen', { exact: true }).first();
      await marker.scrollIntoViewIfNeeded(); await expect(marker).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${output}/loop1-${view}-${width}.png` });
      await page.reload(); await marker.scrollIntoViewIfNeeded(); await expect(marker).toBeVisible();
      await page.screenshot({ path: `${output}/loop2-${view}-${width}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
  });
}
