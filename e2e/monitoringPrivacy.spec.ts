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

test('a broken session reports once without its invalid token or usage consent', async ({ page }) => {
  const events = await collector(page);
  const headers: string[] = [];
  page.on('request', request => { if (request.url().includes('/qa/functions/v1/monitoring-events')) headers.push(request.headers().authorization); });
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  const acknowledged = await page.evaluate(async () => {
    const api = await import('/src/utils/monitoring.ts');
    api.setMonitoringUser({ id: '00000000-0000-4000-8000-000000000001', token: 'fixture-invalid-session' });
    api.reportSessionLoss(); api.reportSessionLoss();
    await api.flushMonitoring();
    const report = api.reportMonitoringError(new Error('Test without authentication'), 'qa');
    return report ? api.confirmMonitoringReport(report) : false;
  });
  expect(acknowledged).toBe(true);
  expect(events.filter(event => event.props.code === 'AuthenticationSessionLost')).toHaveLength(1);
  expect(events.every(event => event.name === 'app_error')).toBe(true);
  expect(headers.every(header => header === 'Bearer fixture-public')).toBe(true);
  expect(JSON.stringify(events)).not.toContain('fixture-invalid-session');
});

test('SDK network and invalid-session login failures reach diagnostics without passwords', async ({ page }) => {
  const events = await collector(page);
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await page.evaluate(async () => {
    const api = await import('/src/utils/monitoring.ts');
    api.trackAuthenticationFailure('login_failed', { status: 400, code: 'invalid_credentials', message: 'password=must-not-appear' });
    api.trackAuthenticationFailure('login_failed', { status: 0, name: 'AuthRetryableFetchError', message: 'private-request-body' });
    await api.flushMonitoring();
    api.trackAuthenticationFailure('login_failed', { status: 403, code: 'session_not_found' });
    await api.flushMonitoring();
  });
  expect(events).toHaveLength(2);
  expect(events.every(event => event.name === 'app_error' && event.props.code === 'AuthenticationServiceError')).toBe(true);
  expect(JSON.stringify(events)).toContain('network_unavailable');
  expect(JSON.stringify(events)).toContain('session_not_found');
  expect(JSON.stringify(events)).not.toMatch(/invalid_credentials|must-not-appear|private-request-body/);
});

test('no usage before consent, sanitized errors remain available and choice survives reload', async ({ page }) => {
  const events = await collector(page);
  await page.goto('/test/fixtures/monitoringPrivacy.html');
  await expect(page.getByRole('complementary', { name: 'Nutzungsstatistik auswählen' })).toBeVisible();
  const prompt = page.getByRole('complementary', { name: 'Nutzungsstatistik auswählen' });
  await expect(prompt.getByRole('heading', { name: 'Nutzungsstatistik erlauben?', exact: true })).toBeVisible();
  await expect(prompt).toContainText('Admins sehen auch die Onlinezahl und aktuell geöffnete Boulder – ohne Namen.');
  await expect(prompt).toContainText('Freiwillig. Nur für dieses Gerät. Jederzeit im Profil änderbar.');
  await expect(prompt).toContainText('Technische Fehlerberichte sind davon unabhängig.');
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

for (const choice of ['granted', 'denied'] as const) {
  test(`copy update preserves existing v2 choice: ${choice}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('kws_usage_consent_v2', value), choice);
    const events = await collector(page);
    await page.goto('/test/fixtures/monitoringPrivacy.html');
    await expect(page.getByRole('complementary', { name: 'Nutzungsstatistik auswählen' })).toHaveCount(0);
    const setting = page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' });
    if (choice === 'granted') {
      await expect(setting).toBeChecked();
      await expect.poll(() => events.some(event => event.name === 'first_open')).toBe(true);
    } else {
      await expect(setting).not.toBeChecked();
      expect(events).toHaveLength(0);
    }
  });
}

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
    const output = 'test-results/launch-monitoring-consent-20261019'; await mkdir(output, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const prompt = page.getByRole('complementary'); await expect(prompt).toBeVisible();
    const accept = page.getByRole('button', { name: 'Statistik erlauben', exact: true });
    const decline = page.getByRole('button', { name: 'Ohne Statistik', exact: true });
    expect((await accept.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await decline.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const bounds = (await prompt.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await page.screenshot({ path: `${output}/loop1-choice-${width}.png`, animations: 'disabled' });
    await decline.focus();
    await page.keyboard.press('Enter');
    await expect(prompt).toHaveCount(0);
    const setting = page.getByRole('switch', { name: 'Nutzungsstatistik erlauben' });
    await expect(setting).not.toBeChecked();
    await setting.focus();
    await page.keyboard.press('Space');
    await expect(setting).toBeChecked();
    await page.keyboard.press('Space');
    await expect(setting).not.toBeChecked();
    await page.screenshot({ path: `${output}/loop2-settings-${width}.png`, animations: 'disabled' });
  });
}
