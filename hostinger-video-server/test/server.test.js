import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createApp } from '../src/server.js';
import { JobQueue, QUALITIES } from '../src/transcode.js';

function auth(req, res, next) {
  const userId = req.headers['x-test-user'];
  if (!userId) return res.status(401).json({ error: 'Missing bearer token' });
  const roles = String(req.headers['x-test-role'] || 'setter').split(',');
  if (!roles.includes('admin') && !roles.includes('setter')) return res.status(403).json({ error: 'Insufficient permissions' });
  req.userId = String(userId); req.roles = roles; next();
}
async function upload(base, { user = 'owner-a', session = 'session-1234', index, total = 2, bytes, declared = 6, fileName = 'clip.mp4', fileType = 'video/mp4', sector = 'sector', boulderId = null }) {
  const form = new FormData(); form.append('chunk', new Blob([bytes]), 'chunk');
  const headers = { 'x-test-user': user, 'x-upload-session-id': session, 'x-chunk-number': String(index), 'x-total-chunks': String(total), 'x-file-name': fileName, 'x-file-size': String(declared), 'x-file-type': fileType, 'x-sector-id': sector }; if (boulderId) headers['x-boulder-id'] = boulderId;
  return fetch(`${base}/upload.php`, { method: 'POST', headers, body: form });
}

test('async boulder upload returns no URLs and its boulder binding is immutable', { timeout: 20_000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-async-upload-')); let server; let close; let created;
  try {
    const config = { port: 3000, dataDir: root, publicBaseUrl: 'http://example.invalid', maxChunkBytes: 5, maxUploadBytes: 100, maxTotalChunks: 20, maxQueueJobs: 1, maxDataBytes: 100_000_000, minFreeBytes: 1, maxMultipartConcurrency: 2, maxActiveSessionsPerUser: 2, tempSessionMaxAgeMs: 60_000, supabaseUrl: 'https://supabase.example.invalid', supabaseServiceRoleKey: 'test-only', publisherRetryBaseMs: 1, publisherRetryMaxMs: 10 };
    const published = []; const publisher = { enabled: true, schedule: async (job) => { published.push(job); } };
    created = await createApp({ config, authMiddleware: auth, publisher }); close = created.close; server = created.app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const boulderId = '11111111-1111-4111-8111-111111111111'; const first = await upload(base, { session: 'async-session', index: 0, total: 1, bytes: 'abc', declared: 3, boulderId }); assert.equal(first.status, 200); const response = await first.json(); assert.equal(response.status, 'queued'); assert.equal(response.session_id, 'async-session'); assert.equal(response.url, null); assert.equal(response.urls, null); assert.ok(response.job_id); assert.equal(published.length, 1);
    const changed = await upload(base, { session: 'async-session', index: 0, total: 1, bytes: 'abc', declared: 3, boulderId: '22222222-2222-4222-8222-222222222222' }); assert.equal(changed.status, 409);
    const jobStatus = await fetch(`${base}/jobs/${response.job_id}`, { headers: { 'x-test-user': 'owner-a' } }); const job = await jobStatus.json(); assert.equal(job.url, null); assert.equal(job.urls, null);
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); await created?.queue.waitForIdle(); close?.(); await fs.rm(root, { recursive: true, force: true }); }
});

test('server accepts the native 5 MiB plus one-byte boundary and rejects chunks above 6 MiB', { timeout: 20_000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-chunk-boundary-')); let server; let close;
  try {
    const maxChunkBytes = 6 * 1024 * 1024; const config = { port: 3000, dataDir: root, publicBaseUrl: 'http://example.invalid', maxChunkBytes, maxUploadBytes: 20 * 1024 * 1024, maxTotalChunks: 20, maxQueueJobs: 1, maxDataBytes: 100_000_000, minFreeBytes: 1, maxMultipartConcurrency: 2, maxActiveSessionsPerUser: 2, tempSessionMaxAgeMs: 60_000 };
    const created = await createApp({ config, authMiddleware: auth }); close = created.close; server = created.app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const nativeBoundary = Buffer.alloc(5 * 1024 * 1024 + 1); const accepted = await upload(base, { session: 'boundary-ok', index: 0, total: 1, bytes: nativeBoundary, declared: nativeBoundary.length, fileName: 'chunk.png', fileType: 'image/png' }); assert.equal(accepted.status, 200); const acceptedBody = await accepted.json(); assert.ok(acceptedBody.url);
    const completedImageStatus = await fetch(`${base}/upload-status.php?session_id=boundary-ok`, { headers: { 'x-test-user': 'owner-a' } }); assert.equal(completedImageStatus.status, 200); assert.equal((await completedImageStatus.json()).url, acceptedBody.url);
    const tooLarge = Buffer.alloc(maxChunkBytes + 1); const rejected = await upload(base, { session: 'boundary-too-large', index: 0, total: 1, bytes: tooLarge, declared: tooLarge.length }); assert.equal(rejected.status, 413);
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); close?.(); await fs.rm(root, { recursive: true, force: true }); }
});

test('session lock, SHA retry, queue backpressure and ownership remain safe', { timeout: 20_000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-server-')); let server; let close;
  try {
    const config = { port: 3000, dataDir: root, publicBaseUrl: 'http://example.invalid', maxChunkBytes: 5, maxUploadBytes: 100, maxTotalChunks: 20, maxQueueJobs: 1, maxDataBytes: 100_000_000, minFreeBytes: 1, maxMultipartConcurrency: 3, maxActiveSessionsPerUser: 2, tempSessionMaxAgeMs: 60_000 };
    const created = await createApp({ config, authMiddleware: auth }); close = created.close; server = created.app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/health`).then((response) => response.json()); assert.equal(typeof health.queue, 'number'); assert.equal(health.queue_capacity, 1); assert.deepEqual(health.queue_details, { depth: health.queue, capacity: 1 });
    const blocker = created.queue.reserve({ owner_id: 'blocker' });
    const [first, duplicate] = await Promise.all([upload(base, { index: 0, bytes: 'abc' }), upload(base, { index: 0, bytes: 'abc' })]); assert.equal(first.status, 200); assert.equal(duplicate.status, 200);
    const changed = await upload(base, { index: 0, bytes: 'xyz' }); assert.equal(changed.status, 409);
    const deniedStatus = await fetch(`${base}/upload-status.php?session_id=session-1234`, { headers: { 'x-test-user': 'owner-b' } }); assert.equal(deniedStatus.status, 403);
    const full = await upload(base, { index: 1, bytes: 'def' }); assert.equal(full.status, 429); assert.equal(full.headers.get('retry-after'), '5');
    const resumable = await fetch(`${base}/upload-status.php?session_id=session-1234`, { headers: { 'x-test-user': 'owner-a' } }); const resumableBody = await resumable.json(); assert.deepEqual(resumableBody.uploaded_chunks, [0, 1]); assert.equal(await fs.readFile(path.join(root, 'temp', 'session-1234', 'part_0'), 'utf8'), 'abc');
    created.queue.cancel(blocker); const accepted = await upload(base, { index: 1, bytes: 'def' }); assert.equal(accepted.status, 200); const body = await accepted.json(); assert.equal(body.status, 'queued'); assert.ok(body.job_id);
    const deniedJob = await fetch(`${base}/jobs/${body.job_id}`, { headers: { 'x-test-user': 'owner-b' } }); assert.equal(deniedJob.status, 403); const adminJob = await fetch(`${base}/jobs/${body.job_id}`, { headers: { 'x-test-user': 'owner-b', 'x-test-role': 'admin' } }); assert.equal(adminJob.status, 200); assert.equal(adminJob.headers.get('cache-control'), 'no-store');
    for (let attempt = 0; attempt < 100; attempt++) { const response = await fetch(`${base}/jobs/${body.job_id}`, { headers: { 'x-test-user': 'owner-a' } }); if ((await response.json()).status === 'failed') break; await new Promise((resolve) => setTimeout(resolve, 10)); }
    assert.equal((await upload(base, { index: 1, bytes: 'def' })).status, 200); assert.equal((await upload(base, { index: 1, bytes: 'xyz' })).status, 409); assert.equal((await upload(base, { index: 1, bytes: 'def', fileName: 'other.mp4' })).status, 409);
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); close?.(); await fs.rm(root, { recursive: true, force: true }); }
});

test('setters can delete completed and legacy families across ownership, but auth and path safety remain enforced', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-delete-')); let server; let close;
  try {
    const config = { port: 3000, dataDir: root, publicBaseUrl: 'http://example.invalid', maxChunkBytes: 5, maxUploadBytes: 100, maxTotalChunks: 20, maxQueueJobs: 1, maxDataBytes: 100_000_000, minFreeBytes: 1, maxMultipartConcurrency: 2, maxActiveSessionsPerUser: 2, tempSessionMaxAgeMs: 60_000 };
    const created = await createApp({ config, authMiddleware: auth }); close = created.close; const dir = path.join(root, 'final', 'sector'); await fs.mkdir(dir); for (const q of ['hd', 'sd', 'low']) { await fs.writeFile(path.join(dir, `family_${q}.mp4`), q); await fs.writeFile(path.join(dir, `family-neighbor_${q}.mp4`), q); await fs.writeFile(path.join(dir, `legacy_${q}.mp4`), q); } const familyJobId = '30000000-0000-4000-8000-000000000001'; await fs.writeFile(path.join(dir, '.family.ready.json'), JSON.stringify({ job_id: familyJobId, owner_id: 'owner-a' })); await fs.writeFile(path.join(root, 'jobs', `${familyJobId}.json`), JSON.stringify({ job_id: familyJobId, status: 'completed', owner_id: 'owner-a', sector: 'sector', base_name: 'family' }));
    await fs.writeFile(path.join(dir, 'pending_hd.mp4'), 'pending'); const pendingId = '00000000-0000-4000-8000-000000000001'; await fs.writeFile(path.join(root, 'jobs', `${pendingId}.json`), JSON.stringify({ job_id: pendingId, status: 'processing', owner_id: 'owner-a', sector: 'sector', base_name: 'pending' }));
    server = created.app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const pending = await fetch(`${base}/videos/sector/pending_hd.mp4`); assert.equal(pending.status, 404); assert.equal(pending.headers.get('cache-control'), 'no-store'); const ready = await fetch(`${base}/videos/sector/family_hd.mp4`); assert.equal(ready.status, 200); assert.match(ready.headers.get('cache-control'), /immutable/);
    const request = (url, headers = {}) => fetch(`${base}/delete.php`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ url }) });
    assert.equal((await request('http://example.invalid/videos/sector/family_hd.mp4')).status, 401);
    assert.equal((await request('http://example.invalid/videos/sector/family_hd.mp4', { 'x-test-user': 'viewer', 'x-test-role': 'viewer' })).status, 403);
    assert.equal((await request('http://example.invalid/videos/sector/family_hd.mp4%2f..', { 'x-test-user': 'owner-b', 'x-test-role': 'setter' })).status, 400);
    assert.equal((await request('http://example.invalid/videos/sector/family_hd.mp4', { 'x-test-user': 'owner-b', 'x-test-role': 'setter' })).status, 200);
    assert.equal((await request('http://example.invalid/videos/sector/legacy_hd.mp4', { 'x-test-user': 'owner-b', 'x-test-role': 'setter' })).status, 200);
    assert.equal(await fs.readFile(path.join(dir, 'family-neighbor_hd.mp4'), 'utf8'), 'hd');
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); close?.(); await fs.rm(root, { recursive: true, force: true }); }
});

test('delete waits for publish completion and deleted remains terminal', { timeout: 10_000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-lifecycle-')); let server; let close; let releasePublish;
  try {
    let markerReadyResolve; const markerReady = new Promise((resolve) => { markerReadyResolve = resolve; }); const release = new Promise((resolve) => { releasePublish = resolve; });
    class BarrierQueue extends JobQueue {
      async process(job) {
        const dir = path.join(this.finalDir, job.sector); await fs.mkdir(dir, { recursive: true });
        for (const quality of QUALITIES) await fs.writeFile(path.join(dir, `${job.base_name}_${quality.suffix}.mp4`), quality.suffix);
        await fs.writeFile(path.join(dir, `.${job.base_name}.claim.json`), JSON.stringify({ job_id: job.job_id, owner_id: job.owner_id }));
        await fs.writeFile(path.join(dir, `.${job.base_name}.ready.json`), JSON.stringify({ job_id: job.job_id, owner_id: job.owner_id }));
        markerReadyResolve(); await release;
      }
    }
    const config = { port: 3000, dataDir: root, publicBaseUrl: 'http://example.invalid', maxChunkBytes: 5, maxUploadBytes: 100, maxTotalChunks: 20, maxQueueJobs: 1, maxDataBytes: 100_000_000, minFreeBytes: 1, maxMultipartConcurrency: 2, maxActiveSessionsPerUser: 2, tempSessionMaxAgeMs: 60_000 };
    const queue = new BarrierQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir: path.join(root, 'final'), tempDir: path.join(root, 'temp'), maxQueue: 1 }); const created = await createApp({ config, authMiddleware: auth, queue }); close = created.close;
    server = created.app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const accepted = await upload(base, { session: 'race-session', index: 0, total: 1, bytes: 'abc', declared: 3 }); const submitted = await accepted.json(); await markerReady;
    const deletion = fetch(`${base}/delete.php`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': 'owner-a', 'x-test-role': 'setter' }, body: JSON.stringify({ url: submitted.url }) });
    const early = await Promise.race([deletion.then(() => 'returned'), new Promise((resolve) => setTimeout(() => resolve('blocked'), 50))]); assert.equal(early, 'blocked');
    releasePublish(); const deleted = await deletion; assert.equal(deleted.status, 200); await queue.waitForIdle(); assert.equal((await queue.get(submitted.job_id)).status, 'deleted');
    for (const quality of QUALITIES) assert.equal(await fs.stat(path.join(root, 'final', 'sector', `${path.basename(new URL(submitted.urls.hd).pathname).replace(/_hd\.mp4$/, '')}_${quality.suffix}.mp4`)).then(() => true).catch(() => false), false);
    const restarted = new JobQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir: path.join(root, 'final'), tempDir: path.join(root, 'temp'), maxQueue: 1 }); await restarted.initialize(); await restarted.recover(); await restarted.waitForIdle(); assert.equal((await restarted.get(submitted.job_id)).status, 'deleted');
  } finally { releasePublish?.(); if (server) await new Promise((resolve) => server.close(resolve)); close?.(); await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 }); }
});
