import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

type Event = { event_id: string; name: string; props: Record<string, unknown> };
async function collector(page: Page) {
  const events: Event[] = [];
  await page.route('**/qa/functions/v1/monitoring-events', async route => {
    if (route.request().postDataJSON().presence) { await route.fulfill({ json: { accepted: true } }); return; }
    const batch = route.request().postDataJSON().events as Event[];
    events.push(...batch);
    await route.fulfill({ json: { accepted_ids: batch.map(event => event.event_id), rejected_ids: [] } });
  });
  return events;
}

test('no usage before consent, sanitized errors remain available and choice survives reload', async ({ page }) => {
  const events = await collector(page);
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await expect(page.getByRole('complementary', { name: 'Nutzungsstatistik auswählen' })).toBeVisible();
  expect(events).toHaveLength(0);
  await page.getByRole('button', { name: 'Testfehler auslösen' }).click();
  await expect.poll(() => events.length).toBeGreaterThan(0);
  expect(events.every(event => event.name === 'app_error')).toBe(true);
  expect(JSON.stringify(events)).not.toContain('fixture-secret');
  expect(JSON.stringify(events)).not.toContain('test@example.invalid');
  await page.getByRole('button', { name: 'Ohne Statistik', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' })).not.toBeChecked();
  await expect(page.getByRole('complementary')).toHaveCount(0);
});

test('consented real media playback is counted once under StrictMode; withdrawal stops usage', async ({ page }) => {
  const events = await collector(page);
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await page.getByRole('button', { name: 'Statistik erlauben', exact: true }).click();
  await expect.poll(() => events.some(event => event.name === 'first_open')).toBe(true);
  await page.reload();
  await expect.poll(() => events.some(event => event.name === 'play_started'), { timeout: 20_000 }).toBe(true);
  expect(events.filter(event => event.name === 'first_open')).toHaveLength(1);
  expect(events.filter(event => event.name === 'play_requested')).toHaveLength(1);
  expect(events.filter(event => event.name === 'play_started')).toHaveLength(1);
  await page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' }).click();
  const previous = events.filter(event => event.name !== 'app_error').length;
  await page.reload();
  await page.getByRole('button', { name: 'Testfehler auslösen' }).click();
  await expect.poll(() => events.some(event => event.name === 'app_error')).toBe(true);
  expect(events.filter(event => event.name !== 'app_error')).toHaveLength(previous);
});

test('guest can open an editable privacy route without requiring a profile', async ({ page }) => {
  await collector(page);
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await page.getByRole('link', { name: 'Datenschutz & Auswahl' }).click();
  await expect(page.getByRole('heading', { name: 'Datenschutz der App', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ohne Statistik', exact: true }).click();
  await page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' }).click();
  await expect(page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' })).toBeChecked();
});

test('legacy consent is not reused for live presence and revoke/background send immediate tombstones', async ({ page }) => {
  const messages: Array<{ sequence: number; active: boolean; screen: string; boulder_id: string | null }> = [];
  await page.addInitScript(() => localStorage.setItem('kws_usage_consent_v1', 'granted'));
  await page.route('**/qa/functions/v1/monitoring-events', async route => {
    const payload = route.request().postDataJSON();
    if (payload.presence) { messages.push(payload.presence); await route.fulfill({ json: { accepted: true } }); }
    else await route.fulfill({ json: { accepted_ids: payload.events.map((event: Event) => event.event_id), rejected_ids: [] } });
  });
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await expect(page.getByRole('complementary', { name: 'Nutzungsstatistik auswählen' })).toBeVisible();
  expect(messages).toHaveLength(0);
  await page.getByRole('button', { name: 'Statistik erlauben', exact: true }).click();
  await expect.poll(() => messages.some(message => message.active)).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => messages.at(-1)?.active).toBe(false);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => messages.at(-1)?.active).toBe(true);
  await page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' }).click();
  await expect.poll(() => messages.at(-1)?.active).toBe(false);
  expect(messages.at(-1)?.boulder_id).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('kws_usage_consent_v1'))).toBe('denied');
  expect(messages.every((message, index) => index === 0 || message.sequence > messages[index - 1].sequence)).toBe(true);
});

test('already cached Boulder details survive child-before-parent route effects; unloaded pages never count a Boulder', async ({ page }) => {
  const messages: Array<{ active: boolean; screen: string; boulder_id: string | null }> = [];
  await page.route('**/qa/functions/v1/monitoring-events', async route => {
    const payload = route.request().postDataJSON();
    if (payload.presence) { messages.push(payload.presence); await route.fulfill({ json: { accepted: true } }); }
    else await route.fulfill({ json: { accepted_ids: payload.events.map((event: Event) => event.event_id), rejected_ids: [] } });
  });
  await page.goto('/test/fixtures/monitoringPrivacy.html?cached-navigation');
  await page.getByRole('button', { name: 'Statistik erlauben', exact: true }).click();
  await page.getByRole('button', { name: 'Geladenen Boulder öffnen', exact: true }).click();
  await expect.poll(() => messages.at(-1)?.boulder_id).toBe('00000000-0000-4000-8000-000000000005');
  await page.getByRole('button', { name: 'Nicht geladenen Boulder öffnen', exact: true }).click();
  await expect.poll(() => messages.at(-1)?.boulder_id).toBeNull();
  await page.getByRole('button', { name: 'Zur Übersicht', exact: true }).click();
  await expect.poll(() => messages.at(-1)?.screen).toBe('boulders');
  await page.getByRole('button', { name: 'Geladenen Boulder öffnen', exact: true }).click();
  await expect.poll(() => messages.at(-1)?.boulder_id).toBe('00000000-0000-4000-8000-000000000005');
});

test('data request failures are classified without response content and media aborts are not failures', async ({ page }) => {
  const events = await collector(page);
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await page.getByRole('button', { name: 'Ohne Statistik', exact: true }).click();
  await page.locator('video').evaluate(video => { Object.defineProperty(video, 'error', { configurable: true, value: { code: 1, message: 'User navigation' } }); video.dispatchEvent(new Event('error')); });
  await page.getByRole('button', { name: 'Datenfehler testen' }).click();
  await expect.poll(() => events.some(event => event.props.code === 'QueryServer503')).toBe(true);
  expect(events.filter(event => event.name === 'app_error')).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain('private-response-content');
});

for (const width of [375, 768, 1280, 1920]) {
  test(`privacy choice responsive loops at ${width}px`, async ({ page }) => {
    await collector(page); await page.setViewportSize({ width, height: width === 375 ? 812 : 960 });
    await page.goto('/test/fixtures/monitoringPrivacy.html');
    const output = 'test-results/launch-monitoring-privacy-20261017'; await mkdir(output, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const prompt = page.getByRole('complementary'); await expect(prompt).toBeVisible();
    const accept = page.getByRole('button', { name: 'Statistik erlauben', exact: true });
    expect((await accept.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${output}/loop1-choice-${width}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Ohne Statistik', exact: true }).click();
    await expect(prompt).toHaveCount(0);
    await page.screenshot({ path: `${output}/loop2-settings-${width}.png`, animations: 'disabled' });
  });
}
