import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { createClient } = createRequire('/app/package.json')('@supabase/supabase-js');

const config = JSON.parse(readFileSync(0, 'utf8'));
assert.equal(config.database, 'kws_restore_probe_20261008_121055');
const origin = 'http://127.0.0.1:9090';
const checks = [];
function check(name, condition) {
  checks.push({ check: name, passed: Boolean(condition) });
  console.log(JSON.stringify(checks.at(-1)));
  assert(condition, name);
}
async function api(path, token, body, method = body === undefined ? 'GET' : 'POST', extras = {}) {
  const r = await fetch(origin + path, { method, headers: { apikey: config.anon, Authorization: 'Bearer ' + token, 'content-type': 'application/json', ...extras }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const raw = await r.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  return { status: r.status, data };
}
async function account(role) {
  const email = `migration-live-${role}-${randomUUID()}@example.invalid`;
  const password = randomBytes(32).toString('base64url');
  const created = await api('/auth/v1/admin/users', config.service, { email, password, email_confirm: true, user_metadata: { full_name: 'Private Migration Live Test ' + role } });
  check('create_' + role, created.status === 200 && Boolean(created.data.id));
  const id = created.data.id;
  if (role !== 'user') {
    const roleResult = await api('/rest/v1/user_roles', config.service, { user_id: id, role });
    check('assign_' + role, roleResult.status === 201);
  }
  const login = await api('/auth/v1/token?grant_type=password', config.anon, { email, password });
  check('login_' + role, login.status === 200 && login.data.user.id === id);
  return { id, token: login.data.access_token, refresh: login.data.refresh_token };
}
const user = await account('user');
const setter = await account('setter');
const other = await account('setter');
const client = createClient(origin, config.anon, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } });
await client.realtime.setAuth(user.token);
const events = [];
let readyResolve, readyReject;
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
const timer = setTimeout(() => readyReject(new Error('PRIVATE_REALTIME_SUBSCRIPTION_TIMEOUT')), 35000);
const channel = client.channel('migration-live-' + randomUUID()).on('system', { event: '*' }, payload => {
  console.log(JSON.stringify({ system_status: payload.status, extension: payload.extension, diagnostic_classes: ['Unable to subscribe', 'permission denied', 'does not exist', 'Subscribed'].filter(s => String(payload.message).includes(s)) }));
  if (payload.status === 'ok' && payload.extension === 'postgres_changes') { clearTimeout(timer); readyResolve(); }
}).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, event => events.push(event.new.id)).subscribe(status => {
  if (status === 'CHANNEL_ERROR') { clearTimeout(timer); readyReject(new Error('PRIVATE_REALTIME_CHANNEL_ERROR')); }
});
try {
  await ready;
  check('authenticated_realtime_subscription', true);
  const ownId = randomUUID(), otherId = randomUUID();
  for (const [id, owner] of [[ownId, user.id], [otherId, other.id]]) {
    const inserted = await api('/rest/v1/notifications', config.service, { id, user_id: owner, title: 'Private migration test', message: 'Realtime verification', type: 'admin_announcement' });
    check('insert_private_notification_' + (owner === user.id ? 'own' : 'other'), inserted.status === 201);
  }
  const visible = await api('/rest/v1/notifications?id=eq.' + ownId + '&select=id', user.token);
  check('own_inserted_notification_visible_by_rest', visible.status === 200 && visible.data.length === 1);
  const deadline = Date.now() + 15000;
  while (!events.includes(ownId) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  await new Promise(resolve => setTimeout(resolve, 1500));
  check('realtime_receives_own_notification', events.includes(ownId));
  check('realtime_hides_other_users_notification', !events.includes(otherId));
} finally { clearTimeout(timer); await client.removeChannel(channel); client.realtime.disconnect(); }

const health = await fetch(origin + '/video-api/health').then(r => r.json());
check('video_health_queue_idle', health.ok && health.queue === 0);
const denied = await fetch(origin + '/video-api/upload-status.php?session_id=migration-nonexistent', { headers: { Authorization: 'Bearer ' + user.token } });
console.log(JSON.stringify({ video_user_http_status: denied.status }));
check('ordinary_user_video_management_denied', denied.status === 403);
const allowed = await fetch(origin + '/video-api/upload-status.php?session_id=migration-nonexistent', { headers: { Authorization: 'Bearer ' + setter.token } });
console.log(JSON.stringify({ video_setter_http_status: allowed.status }));
check('setter_video_management_allowed', allowed.status === 404);
const results = [];
for (const audio of [true, false]) {
  const baseBoulder = await api('/rest/v1/boulders?select=*&limit=1', config.service);
  check('read_probe_boulder_template', baseBoulder.status === 200 && baseBoulder.data.length === 1);
  const boulder = { ...baseBoulder.data[0], id: randomUUID(), name: 'PRIVATE MIGRATION VIDEO TEST ' + (audio ? 'AUDIO' : 'SILENT'), beta_video_url: null, beta_video_urls: null, beta_video_status: 'none', beta_video_job_id: null, beta_video_upload_session_id: null, beta_video_error: null };
  const created = await api('/rest/v1/boulders', config.service, boulder);
  if (created.status !== 201) console.log(JSON.stringify({ boulder_insert_status: created.status, error_code: created.data?.code, error_identifiers: String(created.data?.message || '').match(/(?:column|constraint|key) "[A-Za-z0-9_]+"/g) }));
  check('create_probe_video_boulder', created.status === 201);
  const session = randomUUID();
  const begin = await api('/rest/v1/rpc/begin_boulder_video_upload', setter.token, { p_boulder_id: boulder.id, p_upload_session_id: session });
  check('setter_begin_async_video_upload', begin.status === 200);
  const bytes = readFileSync('/work/live-flow-' + (audio ? 'audio' : 'silent') + '.mp4');
  const form = new FormData(); form.append('chunk', new Blob([bytes], { type: 'video/mp4' }), 'migration-test.mp4');
  const upload = await fetch(origin + '/video-api/upload.php', { method: 'POST', headers: { Authorization: 'Bearer ' + setter.token, 'X-Upload-Session-Id': session, 'X-Chunk-Number': '0', 'X-Total-Chunks': '1', 'X-File-Size': String(bytes.length), 'X-File-Name': 'migration-test.mp4', 'X-File-Type': 'video/mp4', 'X-Sector-Id': 'migration-test', 'X-Boulder-Id': boulder.id }, body: form });
  const accepted = await upload.json();
  check('async_upload_queued_' + (audio ? 'audio' : 'silent'), upload.status === 200 && accepted.status === 'queued' && accepted.url === null && accepted.urls === null);
  const forbidden = await fetch(origin + '/video-api/jobs/' + accepted.job_id, { headers: { Authorization: 'Bearer ' + other.token } });
  check('foreign_user_cannot_read_video_job', forbidden.status === 403);
  const deadline = Date.now() + 90000;
  let job;
  while (Date.now() < deadline) {
    const status = await fetch(origin + '/video-api/jobs/' + accepted.job_id, { headers: { Authorization: 'Bearer ' + setter.token } });
    assert.equal(status.status, 200); job = await status.json();
    if (job.status === 'completed' || job.status === 'failed') break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  check('ffmpeg_completed_' + (audio ? 'audio' : 'silent'), job?.status === 'completed');
  for (const quality of ['hd', 'sd', 'low']) {
    const published = new URL(job.urls[quality]);
    assert.equal(published.origin, 'https://video.kletterwelt-sauerland.de');
    const playback = await fetch(origin + '/video-api' + published.pathname, { headers: { Range: 'bytes=0-63' } });
    check('new_' + quality + '_playback_' + (audio ? 'audio' : 'silent'), playback.status === 206 && (await playback.arrayBuffer()).byteLength === 64);
  }
  let persisted;
  for (let attempt = 0; attempt < 30; attempt++) {
    persisted = await api('/rest/v1/boulders?id=eq.' + boulder.id + '&select=*', config.service);
    if (persisted.data[0]?.beta_video_status === 'ready') break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  check('publisher_saved_ready_and_three_urls', persisted.data[0]?.beta_video_status === 'ready' && ['hd', 'sd', 'low'].every(q => persisted.data[0].beta_video_urls?.[q] === job.urls[q]));
  results.push({ audio, job: accepted.job_id, boulder: boulder.id, completed: true });
}
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1kAAAAASUVORK5CYII=', 'base64');
const imageForm = new FormData(); imageForm.append('chunk', new Blob([image], { type: 'image/png' }), 'migration-thumbnail.png');
const imageUpload = await fetch(origin + '/video-api/upload.php', { method: 'POST', headers: {
  Authorization: 'Bearer ' + setter.token, 'X-Upload-Session-Id': randomUUID(), 'X-Chunk-Number': '0', 'X-Total-Chunks': '1',
  'X-File-Size': String(image.length), 'X-File-Name': 'migration-thumbnail.png', 'X-File-Type': 'image/png', 'X-Sector-Id': 'migration-test',
}, body: imageForm });
const imageResult = await imageUpload.json();
check('thumbnail_upload_completed', imageUpload.status === 200 && imageResult.status === 'completed' && imageResult.job_id === null);
const imagePath = new URL(imageResult.url).pathname;
const imageDownload = await fetch(origin + '/video-api' + imagePath);
check('thumbnail_download_matches_uploaded_bytes', imageDownload.status === 200 && Buffer.from(await imageDownload.arrayBuffer()).equals(image));
const imageDenied = await api('/video-api/delete.php', user.token, { url: imageResult.url });
check('ordinary_user_cannot_delete_thumbnail', imageDenied.status === 403);
const imageRemoved = await api('/video-api/delete.php', setter.token, { url: imageResult.url });
check('setter_can_delete_thumbnail', imageRemoved.status === 200 && imageRemoved.data.status === 'deleted');
check('deleted_thumbnail_no_longer_served', (await fetch(origin + '/video-api' + imagePath)).status === 404);
console.log(JSON.stringify({ live_flow_tests_passed: checks.length, source_changed: false, test_database_only: true, new_video_jobs: results }));
