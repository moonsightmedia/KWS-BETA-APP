import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

type Row = Record<string, string | number | boolean | null>;
async function backend(page: Page) {
  const store = { ticks: [] as Row[], sessions: [] as Row[], ratings: [] as Row[], comments: [
    { id: 'comment-1', boulder_id: 'feed-a', user_id: 'lea', comment: 'Hoher rechter Fuß hilft.', moderation_status: 'approved' },
    { id: 'comment-2', boulder_id: 'feed-a', user_id: 'jonas', comment: 'Schöne Linie!', moderation_status: 'approved' },
  ] as Row[], failTick: false, writes: [] as { table: string; method: string; body: Row }[] };
  await page.route('**/__feed-api/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const table = url.pathname.split('/').pop()!, method = request.method();
    const body = (request.postDataJSON() ?? {}) as Row;
    const json = (rows: unknown) => route.fulfill({ json: rows });
    if (table === 'get_boulder_tick_summary') return json([{ total_ticks: 0, attempted_count: 0, top_count: 0, flash_count: 0 }]);
    if (table === 'get_community_display_names') return json(['lea', 'jonas', 'feed-user'].map(id => ({ id, full_name: id === 'feed-user' ? 'Du' : id })));
    if (table === 'get_comment_author_avatars') return json([]);
    if (table === 'profiles') return json([{ id: 'feed-user', full_name: 'QA', avatar_url: null }]);
    if (table === 'boulders') return json([]);
    const name = ({ boulder_ticks: 'ticks', boulder_tracking_sessions: 'sessions', boulder_ratings: 'ratings', boulder_comments: 'comments' } as const)[table as 'boulder_ticks'];
    if (!name) return json([]);
    const matches = (row: Row) => [...url.searchParams].every(([key, value]) => {
      if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
      if (value.startsWith('gt.')) return String(row[key]) > value.slice(3);
      if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(row[key]));
      return true;
    });
    if (method === 'GET') return json(store[name].filter(matches));
    store.writes.push({ table, method, body });
    if (table === 'boulder_ticks' && method === 'POST' && store.failTick) { store.failTick = false; return route.fulfill({ status: 503, json: { message: 'Test: Status konnte nicht gespeichert werden.' } }); }
    if (method === 'PATCH') { const rows = store[name].filter(matches); rows.forEach(row => Object.assign(row, body)); return json(rows); }
    if (method === 'DELETE') { store[name] = store[name].filter(row => !matches(row)); return route.fulfill({ status: 204 }); }
    const existing = store[name].find(row => row.boulder_id === body.boulder_id && row.user_id === body.user_id && (name !== 'sessions' || row.session_date === body.session_date));
    if (existing && name !== 'comments') Object.assign(existing, body, { updated_at: new Date().toISOString() });
    else store[name].push({ id: `${name}-${store[name].length + 1}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(name === 'comments' ? { moderation_status: 'pending' } : {}), ...body });
    return route.fulfill({ status: 204 });
  });
  return store;
}
const frame = (page: Page) => page.locator('.kws-feed .reel-page[data-active=true]');

for (const guest of [false, true]) test(`feed sort is global across sectors (${guest ? 'guest' : 'signed in'})`, async ({ page }) => {
  await backend(page);
  await page.goto(`/test/fixtures/boulder-feed.html?sortcases${guest ? '&guest' : ''}#/${guest ? 'guest' : 'boulders'}`);
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  for (const [label, ids] of [
    ['Grad aufsteigend', ['sort-c', 'sort-e', 'sort-d', 'sort-f', 'feed-b', 'feed-a']],
    ['Älteste zuerst', ['sort-e', 'sort-c', 'feed-b', 'feed-a', 'sort-d', 'sort-f']],
    ['Neueste zuerst', ['sort-f', 'sort-d', 'feed-a', 'feed-b', 'sort-c', 'sort-e']],
  ] as const) {
    await page.getByRole('button', { name: 'Sortierung öffnen' }).click();
    await page.getByRole('button', { name: guest && label === 'Grad aufsteigend' ? 'Leicht → schwer' : label, exact: true }).click();
    for (let i = 0; i < ids.length; i++) {
      await expect(frame(page)).toHaveAttribute('data-boulder-id', ids[i]);
      if (i < ids.length - 1) { await page.locator('.kws-feed .reel').focus(); await page.keyboard.press('ArrowDown'); }
    }
  }
});

test('horizontal touch exits feed without advancing a video; vertical touch stays feed navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const db = await backend(page); await enter(page);
  const client = await page.context().newCDPSession(page);
  const swipe = async (x: number, y: number, dx: number, dy: number, cancel = false) => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
    for (let i = 1; i <= 10; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + dx * i / 10, y: y + dy * i / 10 }] });
    await client.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  };
  await swipe(90, 320, 160, 8, true);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
  await swipe(150, 450, 2, -240);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await swipe(80, 320, 170, 12);
  await expect(page.locator('.kws-feed')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Videoansicht', exact: true })).toBeVisible();
  expect(db.writes).toHaveLength(0);
  await client.detach();
});

test('regular guest list does not load feed community code until the third view opens', async ({ page }) => {
  await backend(page);
  const requested: string[] = [];
  page.on('request', request => requested.push(request.url()));
  await page.goto('/test/fixtures/boulder-feed.html?guest#/guest');
  await expect(page.getByRole('button', { name: 'Videoansicht', exact: true })).toBeVisible();
  expect(requested.some(url => url.includes('/useBoulderFeedCommunity.'))).toBe(false);
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  expect(requested.some(url => url.includes('/useBoulderFeedCommunity.'))).toBe(true);
});
test('combined guest onboarding waits for a persisted video feed and keeps its filter tour', async ({ page }) => {
  const store = await backend(page);
  await page.addInitScript(() => localStorage.setItem('boulder_view_mode', 'video'));
  await page.goto('/test/fixtures/boulder-feed.html?guest&onboarding#/guest');
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await expect(page.locator('[data-coachmark]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zur Boulderübersicht', exact: true }).click();
  const tip = (id: string) => page.locator(`[data-coachmark=${id}]`);
  await expect(tip('discover')).toBeVisible();
  await tip('discover').getByRole('button', { name: 'Boulder öffnen', exact: true }).click();
  await expect(page.locator('[data-boulder-detail-scroll]')).toBeVisible();
  await tip('beta').getByRole('button', { name: 'Weiter zu den Filtern', exact: true }).click();
  await tip('filter').getByRole('button', { name: 'Filter öffnen', exact: true }).click();
  for (const [step, action] of [['filter-grade', 'Weiter zur Farbe'], ['filter-color', 'Weiter zum Bereich'], ['filter-area', 'Auswahl ansehen'], ['filter-show', 'Boulder anzeigen']]) {
    await tip(step).getByRole('button', { name: action, exact: true }).click();
  }
  await expect(tip('filter-results')).toBeVisible();
  await tip('filter-results').getByRole('button', { name: 'Einführung schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await expect(page.locator('[data-coachmark]')).toHaveCount(0);
  expect(store.writes).toHaveLength(0);
});

async function enter(page: Page) {
  await page.goto('/test/fixtures/boulder-feed.html#/boulders');
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await expect(frame(page).getByRole('button', { name: 'Als Projekt markieren', exact: true })).toBeEnabled();
}

async function chooseDoubleTap(page: Page, name: string) {
  const origin = page.url();
  await page.goto('/test/fixtures/boulder-feed.html#/profile');
  await page.getByRole('button', { name: /^Bedienung/ }).click();
  await expect(page.getByRole('heading', { name: 'Video-Feed', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Doppeltipp auf das Video' }).click();
  await page.getByRole('option', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Zurück zu Einstellungen', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Bedienung/ })).toBeVisible();
  await page.goto(origin);
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
}

test('third view shares filters and retains the real detail origin, video and focus', async ({ page }) => {
  await backend(page); await enter(page);
  await expect(page.locator('[data-app-navigation]')).toBeHidden();
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
  await expect(frame(page).locator('.playback>span')).toHaveText('1 / 2');
  await page.getByRole('button', { name: 'Boulder filtern' }).click();
  await page.locator('section[aria-label="Schwierigkeit"]').getByRole('button', { name: 'Grad 5', exact: true }).click();
  await page.getByRole('button', { name: '1 Boulder anzeigen', exact: true }).click();
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  const media = frame(page).locator('video');
  await frame(page).locator('.playback button').click();
  await media.evaluate(node => { node.currentTime = .5; });
  await frame(page).locator('.boulder-title').click();
  await expect(page.locator('[data-boulder-detail-scroll]')).toBeVisible();
  await expect(media).toHaveJSProperty('paused', true);
  await page.goBack();
  await expect(page.locator('[data-boulder-detail-scroll]')).toHaveCount(0);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await expect(media).toHaveJSProperty('paused', true);
  expect(await media.evaluate(node => node.currentTime)).toBeCloseTo(.5, 1);
  await expect(frame(page).locator('.boulder-title')).toBeFocused();
  await page.getByRole('button', { name: 'Zur Boulderübersicht' }).click();
  await expect(page.locator('.kws-feed')).toHaveCount(0);
  await expect(page.locator('[data-app-navigation]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Ansicht wechseln' })).toBeVisible();
});

test('project preserves existing progress and favorite; ratings and moderated comments use real hooks', async ({ page }) => {
  const db = await backend(page);
  db.ticks.push({ id: 'tick-existing', boulder_id: 'feed-a', user_id: 'feed-user', status: 'top', attempt_count: 4, note: 'Alte Notiz', is_favorite: true, is_project: false });
  await enter(page);
  await frame(page).getByRole('button', { name: 'Als Projekt markieren', exact: true }).click();
  await expect(frame(page).getByRole('button', { name: 'Projektmarkierung entfernen', exact: true })).toBeEnabled();
  expect(db.ticks[0]).toMatchObject({ status: 'top', attempt_count: 4, note: 'Alte Notiz', is_favorite: true, is_project: true });
  await frame(page).getByRole('button', { name: '4 von 5 Sternen', exact: true }).click();
  await expect(frame(page).getByRole('button', { name: '4 von 5 Sternen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(db.ratings[0].rating).toBe(4);
  await frame(page).getByRole('button', { name: '2 Kommentare öffnen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Kommentar schreiben' }).fill('Hilfreiche Beta');
  await page.getByRole('button', { name: 'Kommentar senden' }).click();
  await expect(page.getByText('Wartet auf Freigabe', { exact: true })).toBeVisible();
  expect(db.comments.at(-1)).toMatchObject({ comment: 'Hilfreiche Beta', moderation_status: 'pending' });
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(frame(page).getByRole('button', { name: '2 Kommentare öffnen', exact: true })).toBeVisible();
});

test('tracking confirms both writes, preserves draft on partial failure and retries the same day', async ({ page }) => {
  const db = await backend(page); await enter(page);
  await frame(page).getByRole('button', { name: 'Tracking öffnen', exact: true }).click();
  await page.getByRole('button', { name: 'Einen Versuch mehr' }).click();
  await page.getByRole('button', { name: 'Notiz hinzufügen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Private Notiz' }).fill('Am letzten Zug arbeiten');
  db.failTick = true;
  await page.getByRole('button', { name: 'Top für heute speichern' }).click();
  await expect(page.locator('.kws-feed-sheet .feed-form-error')).toBeVisible();
  expect(db.sessions).toHaveLength(1); expect(db.ticks).toHaveLength(0);
  await expect(page.getByRole('textbox', { name: 'Private Notiz' })).toHaveValue('Am letzten Zug arbeiten');
  await page.getByRole('button', { name: 'Top für heute speichern' }).click();
  await expect(page.locator('.kws-feed-sheet')).toHaveCount(0);
  expect(db.sessions).toHaveLength(1);
  expect(db.ticks[0]).toMatchObject({ status: 'top', attempt_count: 2, note: 'Am letzten Zug arbeiten' });
  await expect(frame(page).getByRole('button', { name: 'Heute: Top · Tracking öffnen' })).toBeVisible();
});

test('tap, double tap, hold, swipe and quality remain independent', async ({ page }) => {
  await backend(page); await enter(page);
  await chooseDoubleTap(page, 'Layout ausblenden');
  const client = await page.context().newCDPSession(page);
  const down = (x: number, y: number) => client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const up = () => client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const tap = async () => { await down(180, 320); await up(); };
  await tap(); await tap(); await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'true');
  await down(90, 320); await expect(page.locator('.speed-feedback')).toHaveText('0,5×');
  await expect(frame(page).locator('video')).toHaveJSProperty('playbackRate', .5);
  await up(); await expect(frame(page).locator('video')).toHaveJSProperty('playbackRate', 1);
  await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'true');
  await tap(); await tap(); await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'false');
  await tap(); await expect(frame(page).locator('video')).toHaveJSProperty('paused', true);
  await down(280, 320); await expect(page.locator('.speed-feedback')).toHaveText('2×');
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
  await up(); await expect(frame(page).locator('video')).toHaveJSProperty('paused', true);
  await frame(page).locator('video').evaluate(node => { node.currentTime = .5; });
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /Low/ }).click();
  await expect(frame(page).locator('video')).toHaveAttribute('src', /q=low/);
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', true);
  await expect.poll(() => frame(page).locator('video').evaluate(node => node.currentTime)).toBeCloseTo(.5, 1);
  await down(180, 450); await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 190 }] }); await up();
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await expect(page.locator('.kws-feed video')).toHaveCount(2);
});

test('double tap is opt-in and selected through the regular settings page', async ({ page }) => {
  const db = await backend(page); await enter(page);
  const client = await page.context().newCDPSession(page);
  const tap = async () => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 320 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await tap(); await expect(frame(page).locator('video')).toHaveJSProperty('paused', true);
  await tap(); await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
  await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'false');
  await expect(frame(page).getByRole('button', { name: 'Bedienungseinstellungen öffnen' })).toHaveCount(0);
  expect(db.writes).toHaveLength(0);
  await chooseDoubleTap(page, 'Layout ausblenden');
  const box = await frame(page).locator('video').boundingBox();
  await tap(); await tap(); await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'true');
  expect(await frame(page).locator('video').boundingBox()).toEqual(box);
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Bedienelemente einblenden' }).click();
  await chooseDoubleTap(page, 'Aus');
  await page.getByRole('button', { name: 'Bedienelemente ausblenden' }).click();
  await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'true');
  await page.getByRole('button', { name: 'Bedienelemente einblenden' }).click();
  await tap(); await tap(); await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'false');
  expect(db.writes).toHaveLength(0);
});

test('project double tap only saves, preserves tracking and never removes an existing project', async ({ page }) => {
  const db = await backend(page);
  db.ticks.push({ id: 'tick-existing', boulder_id: 'feed-a', user_id: 'feed-user', status: 'top', attempt_count: 4, note: 'Alte Notiz', is_favorite: true, is_project: false });
  await enter(page); await chooseDoubleTap(page, 'Als Projekt speichern');
  const doubleTap = () => page.locator('.kws-feed .reel').dblclick({ position: { x: 180, y: 320 } });
  await doubleTap();
  await expect(frame(page).getByRole('button', { name: 'Projektmarkierung entfernen', exact: true })).toBeEnabled();
  expect(db.ticks[0]).toMatchObject({ status: 'top', attempt_count: 4, note: 'Alte Notiz', is_favorite: true, is_project: true });
  const writes = db.writes.length;
  await doubleTap();
  await expect(frame(page).getByRole('button', { name: 'Projektmarkierung entfernen', exact: true })).toBeEnabled();
  expect(db.writes).toHaveLength(writes);
  await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'false');
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
});

test('saved project gesture does not mutate guest data', async ({ page }) => {
  const db = await backend(page);
  await page.addInitScript(() => localStorage.setItem('boulder_feed_double_tap_v1', 'project'));
  await page.goto('/test/fixtures/boulder-feed.html?guest=1#/guest');
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await page.locator('.kws-feed .reel').dblclick({ position: { x: 180, y: 320 } });
  await expect(frame(page).getByRole('button', { name: 'Bedienungseinstellungen öffnen' })).toHaveCount(0);
  expect(db.writes).toHaveLength(0);
});

test('guests can use videos and details without personal actions', async ({ page }) => {
  const db = await backend(page);
  await page.goto('/test/fixtures/boulder-feed.html?guest=1#/guest');
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  await expect(frame(page)).toBeVisible();
  await expect(frame(page).getByRole('button', { name: /Projekt|Tracking|Kommentare/ })).toHaveCount(0);
  await expect(frame(page).getByRole('group', { name: 'Deine Sternebewertung' })).toHaveCount(0);
  await frame(page).locator('.boulder-title').click();
  await expect(page.locator('[data-boulder-detail-scroll]')).toBeVisible();
  expect(db.writes).toHaveLength(0);
});

test('a short pinch snaps between original size and fullscreen and preserves media state', async ({ page }) => {
  const db = await backend(page); await enter(page); await chooseDoubleTap(page, 'Als Projekt speichern');
  const reel = page.locator('.kws-feed .reel'), video = frame(page).locator('video');
  const client = await page.context().newCDPSession(page);
  const touch = (type: string, points: Array<{ id: number; x: number; y: number }>) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await frame(page).locator('.playback button').click();
  await video.evaluate(v => { v.currentTime = .5; });
  const fullscreen = Number(await reel.getAttribute('data-zoom-scale'));
  expect(fullscreen).toBeGreaterThan(1);
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 97, y: 320 }, { id: 2, x: 273, y: 320 }]);
  // Only 14px total travel, still above the midpoint: direction must win.
  expect(Number(await reel.getAttribute('data-zoom-scale'))).toBeGreaterThan((1 + fullscreen) / 2);
  await touch('touchEnd', []);
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fit');
  await expect(reel).toHaveAttribute('data-zoom-scale', '1');
  await expect.poll(() => video.evaluate(v => new DOMMatrix(getComputedStyle(v).transform).a)).toBeCloseTo(1, 5);
  await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /Low/ }).click();
  await expect(video).toHaveJSProperty('readyState', 4);
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fit');
  await expect(reel).toHaveAttribute('data-zoom-scale', '1');
  expect(await video.evaluate(v => v.currentTime)).toBeCloseTo(.5, 1);
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 83, y: 320 }, { id: 2, x: 287, y: 320 }]);
  // Again a short gesture, below the midpoint, now snapping all the way to fill.
  expect(Number(await reel.getAttribute('data-zoom-scale'))).toBeLessThan((1 + fullscreen) / 2);
  await touch('touchEnd', [{ id: 1, x: 83, y: 320 }]);
  await touch('touchMove', [{ id: 2, x: 287, y: 100 }]);
  await touch('touchEnd', []);
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect.poll(() => video.evaluate(v => new DOMMatrix(getComputedStyle(v).transform).a)).toBeCloseTo(fullscreen, 5);
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveJSProperty('playbackRate', 1);
  expect(db.writes).toHaveLength(0);
  await touch('touchStart', [{ id: 1, x: 180, y: 450 }]);
  await touch('touchMove', [{ id: 1, x: 180, y: 190 }]);
  await touch('touchEnd', []);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: 'Originalgröße', exact: true }).click();
  await expect(reel).toHaveAttribute('data-zoom-scale', '1');
});

test('pinch cancellation and a second finger during speed hold never cause an extra action', async ({ page }) => {
  await backend(page); await enter(page);
  const client = await page.context().newCDPSession(page);
  const touch = (type: string, points: Array<{ id: number; x: number; y: number }>) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const reel = page.locator('.kws-feed .reel');
  const scale = await reel.getAttribute('data-zoom-scale');
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 40, y: 280 }, { id: 2, x: 330, y: 280 }]);
  await touch('touchCancel', []);
  await expect(reel).toHaveAttribute('data-zoom-scale', scale!);
  await expect(page.locator('.zoom-feedback')).toHaveCount(0);
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
  await frame(page).locator('.playback button').click();
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }]);
  await expect(page.locator('.speed-feedback')).toHaveText('0,5×');
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await expect(page.locator('.speed-feedback')).toHaveCount(0);
  await expect(frame(page).locator('video')).toHaveJSProperty('playbackRate', 1);
  await touch('touchCancel', []);
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', true);
  await expect(page.locator('.kws-feed')).toHaveAttribute('data-clean', 'false');
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 40, y: 300 }, { id: 2, x: 330, y: 300 }]);
  await touch('touchStart', [{ id: 1, x: 40, y: 300 }, { id: 2, x: 330, y: 300 }, { id: 3, x: 180, y: 400 }]);
  await touch('touchEnd', []);
  await expect(reel).toHaveAttribute('data-zoom-scale', scale!);
  await expect(page.locator('.zoom-feedback')).toHaveCount(0);
});

test('menu keyboard and trackpad snap to the same two modes', async ({ page }) => {
  await backend(page); await enter(page);
  const reel = page.locator('.kws-feed .reel');
  const fullscreen = Number(await reel.getAttribute('data-zoom-scale'));
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: 'Originalgröße', exact: true }).click();
  await expect(reel).toHaveAttribute('data-zoom-scale', '1');
  await reel.focus(); await page.keyboard.press('+');
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect.poll(async () => Number(await reel.getAttribute('data-zoom-scale'))).toBeCloseTo(fullscreen, 5);
  await page.keyboard.press('-'); await expect(reel).toHaveAttribute('data-zoom-scale', '1');
  await page.mouse.move(180, 320); await page.keyboard.down('Control'); await page.mouse.wheel(0, -200); await page.keyboard.up('Control');
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect.poll(async () => Number(await reel.getAttribute('data-zoom-scale'))).toBeCloseTo(fullscreen, 5);
  expect(await page.evaluate(() => ({ width: innerWidth, scale: visualViewport?.scale }))).toEqual({ width: 375, scale: 1 });
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
  await page.setViewportSize({ width: 812, height: 375 });
  await reel.focus(); await page.keyboard.press('0');
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect.poll(async () => Number(await reel.getAttribute('data-zoom-scale'))).toBeGreaterThan(2);
});

test('small movement stays put and reduced motion snaps immediately', async ({ page }) => {
  const db = await backend(page); await enter(page);
  const reel = page.locator('.kws-feed .reel'), video = frame(page).locator('video');
  const fullscreen = await reel.getAttribute('data-zoom-scale');
  const client = await page.context().newCDPSession(page);
  const touch = (type: string, points: Array<{ id: number; x: number; y: number }>) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 110, y: 350 }, { id: 2, x: 300, y: 350 }]);
  await touch('touchEnd', []);
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect(reel).toHaveAttribute('data-zoom-scale', fullscreen!);
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 93, y: 320 }, { id: 2, x: 277, y: 320 }]);
  await touch('touchEnd', []);
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect(reel).toHaveAttribute('data-zoom-scale', fullscreen!);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchMove', [{ id: 1, x: 97, y: 320 }, { id: 2, x: 273, y: 320 }]);
  await touch('touchEnd', []);
  await expect(reel).toHaveAttribute('data-zoom-scale', '1');
  await expect(video).toHaveCSS('transition-duration', '0s');
  expect(db.writes).toHaveLength(0);
});

test('a second finger on or after rating controls does not submit a rating', async ({ page }) => {
  const db = await backend(page); await enter(page);
  const stars = (await frame(page).getByRole('group', { name: 'Deine Sternebewertung' }).boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const touch = (type: string, points: Array<{ id: number; x: number; y: number }>) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }]);
  await touch('touchStart', [{ id: 1, x: 90, y: 320 }, { id: 2, x: stars.x + 60, y: stars.y + 20 }]);
  await touch('touchEnd', []);
  await touch('touchStart', [{ id: 1, x: stars.x + 60, y: stars.y + 20 }]);
  await touch('touchStart', [{ id: 1, x: stars.x + 60, y: stars.y + 20 }, { id: 2, x: 280, y: 320 }]);
  await touch('touchEnd', []);
  expect(db.writes).toHaveLength(0);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
});

test('sort, video-only empty selection, reload and demo notice keep a usable fullscreen view', async ({ page }) => {
  await backend(page); await enter(page);
  await page.getByRole('button', { name: 'Sortierung öffnen' }).click();
  await page.getByRole('button', { name: 'Name Z-A', exact: true }).click();
  await expect(page.locator('.kws-feed-sheet')).toHaveCount(0);
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await page.getByRole('button', { name: 'Boulder filtern' }).click();
  await page.getByRole('button', { name: 'Grad 4', exact: true }).click();
  await page.getByRole('button', { name: '0 Boulder anzeigen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keine passenden Videos' })).toBeVisible();
  await page.getByRole('button', { name: 'Suche und Filter zurücksetzen', exact: true }).click();
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await page.evaluate(() => { document.documentElement.dataset.kwsReview = 'true'; document.documentElement.style.setProperty('--kws-review-notice-height', '84px'); });
  const box = await page.locator('.kws-feed').boundingBox();
  expect(box?.y).toBe(84); expect(box?.height).toBe(812 - 84);
  await page.reload();
  await expect(frame(page)).toBeVisible();
  await expect(page.locator('[data-app-navigation]')).toBeHidden();
});

test('tracking can discard edits explicitly and flash locks the attempt count to one', async ({ page }) => {
  const db = await backend(page); await enter(page);
  await frame(page).getByRole('button', { name: 'Tracking öffnen', exact: true }).click();
  await page.getByRole('button', { name: 'Einen Versuch mehr', exact: true }).click();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter bearbeiten', exact: true }).click();
  await page.getByRole('button', { name: 'Flash', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Einen Versuch mehr', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Flash für heute speichern', exact: true }).click();
  await expect(page.locator('.kws-feed-sheet')).toHaveCount(0);
  expect(db.sessions[0]).toMatchObject({ result: 'flash', attempt_count: 1 });
  expect(db.ticks[0]).toMatchObject({ status: 'flash', attempt_count: 1 });
});

test('failed media falls back to an available quality and offers a working retry', async ({ page }) => {
  await backend(page); await enter(page);
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /Low/ }).click();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await page.route('**/vertical-player.mp4?q=hd', route => route.abort());
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /HD/ }).click();
  await expect(page.getByRole('button', { name: /Videoqualität: SD/ })).toBeVisible();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await page.route('**/vertical-player.mp4?q=low', route => route.abort());
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /Low/ }).click();
  await expect(page.getByText('Video gerade nicht verfügbar', { exact: true })).toBeVisible();
  await page.unroute('**/vertical-player.mp4?q=low');
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
  await expect(page.getByText('Video gerade nicht verfügbar', { exact: true })).toHaveCount(0);
});

test('external beta has an honest detail fallback rather than unsupported native controls', async ({ page }) => {
  await backend(page);
  await page.route('https://**', route => route.abort());
  await page.goto('/test/fixtures/boulder-feed.html?guest=1&external=1#/guest');
  await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-external');
  await expect(frame(page).locator('video')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Videoqualität/ })).toHaveCount(0);
  await frame(page).getByRole('button', { name: 'Beta in der Detailansicht ansehen' }).click();
  await expect(page.locator('[data-boulder-detail-scroll]')).toBeVisible();
  await expect(page.locator('[data-boulder-detail-scroll] iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'YouTube-Video laden', exact: true }).click();
  await expect(page.locator('[data-boulder-detail-scroll] iframe')).toHaveCount(1);
});

test('swiping preserves image size and moves boulder actions inside a stationary header', async ({ page }) => {
  await backend(page); await enter(page);
  const reel = page.locator('.kws-feed .reel');
  const incoming = page.locator('.reel-page[data-boulder-id=feed-b] video');
  await expect(incoming).toHaveAttribute('preload', 'auto');
  await expect.poll(() => incoming.evaluate(v => v.readyState)).toBeGreaterThanOrEqual(2);
  await expect(incoming).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: 'Originalgröße', exact: true }).click();
  await expect(frame(page).locator('video')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(incoming).toHaveCSS('object-fit', 'contain');
  const header = page.locator('.feed-global-chrome .reel-header');
  const headerNode = await header.elementHandle();
  const headerBefore = await header.boundingBox(), footerBefore = (await frame(page).locator('.reel-footer').boundingBox())!;
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 450 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 350 }] });
  expect(await header.boundingBox()).toEqual(headerBefore);
  expect((await frame(page).locator('.reel-footer').boundingBox())!.y).toBeCloseTo(footerBefore.y - 100);
  await expect(frame(page).locator('.reel-media')).toHaveCSS('overflow', 'hidden');
  await page.screenshot({ path: 'output/video-feed/integration/transition-fit-mid-swipe.png', animations: 'disabled' });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 160 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-b');
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fit');
  await expect(reel).toHaveAttribute('data-zoom-scale', '1');
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
  expect(await header.boundingBox()).toEqual(headerBefore);
  expect(await headerNode!.evaluate(node => node.isConnected)).toBe(true);
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: 'Vollbild', exact: true }).click();
  await expect(page.locator('.reel-page[data-boulder-id=feed-a] video')).toHaveCSS('object-fit', 'cover');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 350 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 650 }] });
  await page.screenshot({ path: 'output/video-feed/integration/transition-fill-mid-swipe.png', animations: 'disabled' });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(frame(page)).toHaveAttribute('data-boulder-id', 'feed-a');
  await expect(reel).toHaveAttribute('data-zoom-mode', 'fill');
  await expect(frame(page).locator('video')).toHaveJSProperty('paused', false);
  await expect(page.locator('.reel-page[data-active=false] video')).toHaveJSProperty('paused', true);
});

test('brief stalls stay quiet and repeated insufficient buffer waits for playable headroom', async ({ page }) => {
  await backend(page); await enter(page);
  const video = frame(page).locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  await video.evaluate(node => {
    node.dataset.bufferHeadroom = '0.02';
    Object.defineProperty(node, 'buffered', { configurable: true, get: () => ({ length: 1, start: () => 0, end: () => node.currentTime + Number(node.dataset.bufferHeadroom) }) });
    node.dispatchEvent(new Event('waiting'));
  });
  await expect(video).toHaveJSProperty('paused', true);
  await video.evaluate(node => { node.dataset.bufferHeadroom = '2'; node.dispatchEvent(new Event('progress')); });
  await expect(video).toHaveJSProperty('paused', false);
  await expect(page.getByText('Video wird geladen …', { exact: true })).toHaveCount(0);
  await video.evaluate(node => { node.currentTime = 0; node.dataset.bufferHeadroom = '0.02'; node.dispatchEvent(new Event('waiting')); });
  await expect(page.getByText('Video wird geladen …', { exact: true })).toBeVisible();
  // Partial progress must not restart playback or reset the fallback deadline.
  for (const headroom of [.1, .3, .7]) {
    await video.evaluate((node, value) => { node.dataset.bufferHeadroom = String(value); node.dispatchEvent(new Event('progress')); node.dispatchEvent(new Event('waiting')); }, headroom);
    await expect(video).toHaveJSProperty('paused', true);
    await expect(page.getByText('Video wird geladen …', { exact: true })).toBeVisible();
  }
  await video.evaluate(node => { node.dataset.bufferHeadroom = '2'; node.dispatchEvent(new Event('progress')); });
  await expect(video).toHaveJSProperty('paused', false);
  await expect(page.getByText('Video wird geladen …', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Video pausieren', exact: true }).click();
  await video.evaluate(node => { node.dataset.bufferHeadroom = '0'; node.dispatchEvent(new Event('waiting')); });
  await expect(page.getByText('Video wird geladen …', { exact: true })).toHaveCount(0);
  await expect(video).toHaveJSProperty('paused', true);
});

test('repeated underruns lower quality instead of replaying tiny fragments indefinitely', async ({ page }) => {
  await backend(page); await enter(page);
  const video = frame(page).locator('video');
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /HD/ }).click();
  await expect(video).toHaveJSProperty('paused', false);
  await expect.poll(() => video.evaluate(node => node.currentTime)).toBeGreaterThan(.2);
  await video.evaluate(node => {
    Object.defineProperty(node, 'buffered', { configurable: true, get: () => ({ length: 1, start: () => 0, end: () => node.currentTime + Number(node.dataset.bufferHeadroom ?? '2') }) });
  });
  for (let count = 0; count < 3; count++) {
    await video.evaluate(node => { node.dataset.bufferHeadroom = '.02'; node.dispatchEvent(new Event('waiting')); });
    if (count < 2) {
      await expect(video).toHaveJSProperty('paused', true);
      await video.evaluate(node => { node.dataset.bufferHeadroom = '2'; node.dispatchEvent(new Event('progress')); });
      await expect(video).toHaveJSProperty('paused', false);
    }
  }
  await expect(video).toHaveAttribute('src', /q=sd/);
  await video.evaluate(node => { delete (node as unknown as Record<string, unknown>).buffered; node.dispatchEvent(new Event('progress')); });
  await expect(video).toHaveJSProperty('paused', false);
});

test('a quality change on a slow connection buffers once before steady playback', async ({ page }) => {
  await backend(page); await enter(page);
  const video = frame(page).locator('video');
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 8192, uploadThroughput: 8192 });
  await video.evaluate(node => {
    node.dataset.playingCount = '0'; node.dataset.loadingCount = '0';
    node.addEventListener('playing', () => { node.dataset.playingCount = String(Number(node.dataset.playingCount) + 1); });
    let visible = false;
    const observer = new MutationObserver(() => {
      const next = document.querySelector('.media-status [role=status]') !== null;
      if (next && !visible) node.dataset.loadingCount = String(Number(node.dataset.loadingCount) + 1);
      visible = next;
    });
    observer.observe(document.querySelector('.kws-feed')!, { childList: true, subtree: true });
  });
  await page.getByRole('button', { name: /Videoqualität/ }).click();
  await page.getByRole('menuitemradio', { name: /HD/ }).click();
  await expect(video).toHaveAttribute('src', /q=hd/);
  await expect(video).toHaveJSProperty('paused', false, { timeout: 12000 });
  await expect.poll(() => video.evaluate(node => node.currentTime), { timeout: 12000 }).toBeGreaterThan(.3);
  expect(Number(await video.getAttribute('data-playing-count'))).toBeLessThanOrEqual(2);
  expect(Number(await video.getAttribute('data-loading-count'))).toBeLessThanOrEqual(1);
});

test('two visual loops on all four required widths', async ({ page }) => {
  await backend(page); await mkdir('output/video-feed/integration', { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const touchClient = await page.context().newCDPSession(page);
  const inspectTransition = async (path: string) => {
    const reel = page.locator('.kws-feed .reel'), header = page.locator('.feed-global-chrome .reel-header');
    const box = (await reel.boundingBox())!, before = await header.boundingBox();
    const x = box.x + box.width * .4, y = box.y + box.height * .55;
    await touchClient.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await touchClient.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 100 }] });
    expect(await header.boundingBox()).toEqual(before);
    await page.screenshot({ path, animations: 'disabled' });
    await touchClient.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.reel-track.is-settling')).toHaveCount(0);
  };
  const showRegularView = async () => {
    const exit = page.getByRole('button', { name: 'Zur Boulderübersicht', exact: true });
    const grid = page.getByRole('button', { name: 'Gridansicht', exact: true });
    // A persisted video preference can still be loading its lazy entry after goto.
    await expect(exit.or(grid)).toBeVisible();
    if (await exit.isVisible()) await exit.click();
    await expect(grid).toBeVisible();
  };
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : width === 1280 ? 900 : 1080 });
    await page.goto('/test/fixtures/boulder-feed.html#/boulders');
    await showRegularView();
    await page.getByRole('button', { name: 'Gridansicht', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-overview.png`, animations: 'disabled' });
    if (await page.locator('.kws-feed').count() === 0) await page.getByRole('button', { name: 'Videoansicht', exact: true }).click();
    await expect(frame(page).locator('video')).toHaveJSProperty('readyState', 4);
    await expect(frame(page).getByRole('button', { name: 'Als Projekt markieren', exact: true })).toBeEnabled();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-feed.png`, animations: 'disabled' });
    const geometry = await frame(page).evaluate(node => {
      const video = node.querySelector('video')!;
      const media = node.querySelector('.reel-media')!.getBoundingClientRect(), stage = node.getBoundingClientRect();
      const fit = Math.min(stage.width / video.videoWidth, stage.height / video.videoHeight);
      const scale = new DOMMatrix(getComputedStyle(video).transform).a;
      return { fit: getComputedStyle(video).objectFit, paintedWidth: video.videoWidth * fit * scale, paintedHeight: video.videoHeight * fit * scale, media: { x: media.x, y: media.y, width: media.width, height: media.height }, stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height } };
    });
    expect(geometry.fit).toBe('contain');
    expect(geometry.media).toEqual(geometry.stage);
    expect(geometry.paintedWidth).toBeGreaterThanOrEqual(geometry.stage.width - .1);
    expect(geometry.paintedHeight).toBeGreaterThanOrEqual(geometry.stage.height - .1);
    await frame(page).getByRole('button', { name: '2 Kommentare öffnen', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-comments.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
    await frame(page).getByRole('button', { name: 'Tracking öffnen', exact: true }).click();
    await page.getByRole('button', { name: 'Notiz hinzufügen', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop2-${width}-track.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Schließen', exact: true }).click();
    await page.getByRole('button', { name: 'Boulder filtern' }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop2-${width}-filters.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /Videoqualität/ }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-zoom-menu.png`, animations: 'disabled' });
    await page.getByRole('menuitemradio', { name: 'Originalgröße', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-zoom-fit.png`, animations: 'disabled' });
    await inspectTransition(`output/video-feed/integration/loop1-${width}-transition.png`);
    await page.getByRole('button', { name: /Videoqualität/ }).click();
    await page.getByRole('menuitemradio', { name: 'Vollbild', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop2-${width}-zoom-fill.png`, animations: 'disabled' });
    await inspectTransition(`output/video-feed/integration/loop2-${width}-transition.png`);
    await page.getByRole('button', { name: /Videoqualität/ }).click();
    await page.getByRole('menuitemradio', { name: 'Vollbild', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await page.locator('.kws-feed').boundingBox())?.width).toBe(width);
  }
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : width === 1280 ? 900 : 1080 });
    await page.goto('/test/fixtures/boulder-feed.html?guest=1#/guest');
    await showRegularView();
    await page.getByRole('button', { name: 'Gridansicht', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-guest-grid.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Listenansicht', exact: true }).click();
    await page.screenshot({ path: `output/video-feed/integration/loop2-${width}-guest-list.png`, animations: 'disabled' });
  }
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : width === 1280 ? 900 : 1080 });
    await page.goto('/test/fixtures/boulder-feed.html#/profile');
    await page.getByRole('button', { name: /^Bedienung/ }).click();
    const select = page.getByRole('combobox', { name: 'Doppeltipp auf das Video' });
    await expect(select).toBeVisible();
    await page.screenshot({ path: `output/video-feed/integration/loop1-${width}-preferences.png`, animations: 'disabled' });
    await select.click();
    await page.screenshot({ path: `output/video-feed/integration/loop2-${width}-preferences.png`, animations: 'disabled' });
    await page.getByRole('option', { name: 'Als Projekt speichern', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await select.boundingBox()).toMatchObject({ height: 44 });
  }
  expect(errors).toEqual([]);
});
