import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createApp } from '../src/server.js';
import { JobQueue, QUALITIES } from '../src/transcode.js';

function auth(req, _res, next) { req.userId = String(req.headers['x-test-user'] || 'owner-a'); req.roles = String(req.headers['x-test-role'] || 'setter').split(','); next(); }
async function upload(base, { user = 'owner-a', session = 'session-1234', index, total = 2, bytes, declared = 6, fileName = 'clip.mp4', sector = 'sector' }) {
  const form = new FormData(); form.append('chunk', new Blob([bytes]), 'chunk');
  return fetch(`${base}/upload.php`, { method: 'POST', headers: { 'x-test-user': user, 'x-upload-session-id': session, 'x-chunk-number': String(index), 'x-total-chunks': String(total), 'x-file-name': fileName, 'x-file-size': String(declared), 'x-file-type': 'video/mp4', 'x-sector-id': sector }, body: form });
}

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

test('new-family deletion is owner/admin bound and exact', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-delete-')); let server; let close;
  try {
    const config = { port: 3000, dataDir: root, publicBaseUrl: 'http://example.invalid', maxChunkBytes: 5, maxUploadBytes: 100, maxTotalChunks: 20, maxQueueJobs: 1, maxDataBytes: 100_000_000, minFreeBytes: 1, maxMultipartConcurrency: 2, maxActiveSessionsPerUser: 2, tempSessionMaxAgeMs: 60_000 };
    const created = await createApp({ config, authMiddleware: auth }); close = created.close; const dir = path.join(root, 'final', 'sector'); await fs.mkdir(dir); for (const q of ['hd', 'sd', 'low']) { await fs.writeFile(path.join(dir, `family_${q}.mp4`), q); await fs.writeFile(path.join(dir, `family-neighbor_${q}.mp4`), q); } const familyJobId = '30000000-0000-4000-8000-000000000001'; await fs.writeFile(path.join(dir, '.family.ready.json'), JSON.stringify({ job_id: familyJobId, owner_id: 'owner-a' })); await fs.writeFile(path.join(root, 'jobs', `${familyJobId}.json`), JSON.stringify({ job_id: familyJobId, status: 'completed', owner_id: 'owner-a', sector: 'sector', base_name: 'family' }));
    await fs.writeFile(path.join(dir, 'pending_hd.mp4'), 'pending'); const pendingId = '00000000-0000-4000-8000-000000000001'; await fs.writeFile(path.join(root, 'jobs', `${pendingId}.json`), JSON.stringify({ job_id: pendingId, status: 'processing', owner_id: 'owner-a', sector: 'sector', base_name: 'pending' }));
    server = created.app.listen(0); await new Promise((resolve) => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const pending = await fetch(`${base}/videos/sector/pending_hd.mp4`); assert.equal(pending.status, 404); assert.equal(pending.headers.get('cache-control'), 'no-store'); const ready = await fetch(`${base}/videos/sector/family_hd.mp4`); assert.equal(ready.status, 200); assert.match(ready.headers.get('cache-control'), /immutable/);
    const request = (user, role) => fetch(`${base}/delete.php`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': user, 'x-test-role': role }, body: JSON.stringify({ url: 'http://example.invalid/videos/sector/family_hd.mp4' }) });
    assert.equal((await request('owner-b', 'setter')).status, 403); assert.equal((await request('owner-a', 'setter')).status, 200); assert.equal(await fs.readFile(path.join(dir, 'family-neighbor_hd.mp4'), 'utf8'), 'hd');
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
