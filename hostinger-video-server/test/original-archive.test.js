import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { archiveOriginal, verifyOriginal } from '../src/original-archive.js';
import { JobQueue } from '../src/transcode.js';
import { createApp } from '../src/server.js';

function capture(command, args) { return new Promise((resolve, reject) => { const p = spawn(command, args); let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d); p.on('error', reject); p.on('close', c => c ? reject(new Error(err)) : resolve(out)); }); }
const job = { job_id: '41000000-0000-4000-8000-000000000001', owner_id: 'owner-a', original_ext: 'mp4', source_provenance: 'selected-video-lossless' };
async function fixture(dir, { audio = false, hdr = false, large = false } = {}) {
  const file = path.join(dir, `input-${audio}-${hdr}-${large}.mp4`);
  const transfer = typeof hdr === 'string' ? hdr : 'arib-std-b67';
  await capture('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${large ? '2160x3840' : '160x240'}:rate=12`, ...(audio ? ['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100'] : []), '-t', '0.5', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', ...(hdr ? ['-vf', `setparams=color_primaries=bt2020:color_trc=${transfer}:colorspace=bt2020nc`, '-color_trc', transfer, '-color_primaries', 'bt2020', '-colorspace', 'bt2020nc'] : []), ...(audio ? ['-c:a', 'aac', '-shortest'] : ['-an']), file]);
  return file;
}

test('4K HDR archival source retains exact video packets and resolution, while removing audio', { timeout: 90000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-original-'));
  try {
    const input = await fixture(dir, { audio: true, hdr: true, large: true }); const root = path.join(dir, 'originals');
    const metadata = await archiveOriginal({ root, job, input });
    assert.equal(metadata.video.width, 2160); assert.equal(metadata.video.height, 3840); assert.equal(metadata.video.color_transfer, 'arib-std-b67'); assert.equal(metadata.audio_tracks, 0);
    assert.deepEqual(await verifyOriginal({ root, job }), metadata);
    const archived = path.join(root, job.job_id, metadata.file);
    const hash = file => capture('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-']);
    assert.equal(await hash(archived), await hash(input));
    assert.deepEqual(await archiveOriginal({ root, job, input }), metadata, 'retries reuse the verified source');
    await fs.writeFile(archived, 'tampered'); await assert.rejects(verifyOriginal({ root, job }), /integrity/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('silent source is archived byte-for-byte; a different source cannot replace the same job', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-original-silent-'));
  try {
    const input = await fixture(dir); const root = path.join(dir, 'originals');
    const metadata = await archiveOriginal({ root, job, input });
    assert.deepEqual(await fs.readFile(path.join(root, job.job_id, metadata.file)), await fs.readFile(input));
    await fs.appendFile(input, 'changed'); await assert.rejects(archiveOriginal({ root, job, input }), /source changed/);
    await assert.rejects(archiveOriginal({ root, job: { ...job, job_id: '../escape' }, input }), /Invalid archive/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

for (const transfer of ['arib-std-b67', 'smpte2084']) test(`${transfer} job creates silent SDR qualities and keeps a private HDR source after completion`, { timeout: 90000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-original-sdr-'));
  try {
    const input = await fixture(dir, { hdr: transfer, audio: true }); const finalDir = path.join(dir, 'final'); await fs.mkdir(finalDir);
    const session = path.join(dir, 'session'); await fs.mkdir(session); await fs.copyFile(input, path.join(session, 'part_0'));
    const queue = new JobQueue({ jobsDir: path.join(dir, 'jobs'), stagingDir: path.join(dir, 'staging'), finalDir, maxQueue: 1 }); await queue.initialize();
    const submitted = queue.reserve({ session_id: 'original-session', session_dir: session, owner_id: 'owner-a', sector: 'sector', base_name: 'sdr', original_ext: 'mp4', total_chunks: 1, declared_size: (await fs.stat(input)).size, urls: {} });
    await queue.commit(submitted); await queue.waitForIdle(); const completed = await queue.get(submitted.job_id);
    assert.equal(completed.status, 'completed', completed.error); assert.equal(completed.hdr_to_sdr, true); assert.equal(completed.hd_passthrough, false);
    const original = await verifyOriginal({ root: queue.originalsDir, job: completed }); assert.equal(original.video.color_transfer, transfer);
    for (const q of ['hd', 'sd', 'low']) {
      const info = JSON.parse(await capture('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,color_transfer,color_space,color_primaries', '-of', 'json', path.join(finalDir, 'sector', `sdr_${q}.mp4`)]));
      assert.equal(info.streams.length, 1); assert.equal(info.streams[0].codec_type, 'video'); assert.equal(info.streams[0].color_transfer, 'bt709'); assert.equal(info.streams[0].color_space, 'bt709'); assert.equal(info.streams[0].color_primaries, 'bt709');
    }
    assert.equal(await fs.stat(completed.input_path).catch(() => null), null, 'temporary source removed only after archive and publication');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('originals require an administrator and never appear in public media routes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-private-original-')); let created; let server;
  try {
    const auth = (req, res, next) => { if (!req.headers['x-test-role']) return res.sendStatus(401); req.roles = [req.headers['x-test-role']]; req.userId = 'owner-a'; next(); };
    created = await createApp({ config: { dataDir: dir, publicBaseUrl: 'http://example.invalid', maxQueueJobs: 1, maxDataBytes: 1e9, minFreeBytes: 1 }, authMiddleware: auth });
    const input = await fixture(dir, { audio: true });
    const original_archive = await archiveOriginal({ root: created.queue.originalsDir, job, input });
    await created.queue.save({ ...job, status: 'completed', original_archive, sector: 'sector', base_name: 'private' });
    server = created.app.listen(0); await new Promise(resolve => server.once('listening', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
    const url = `${base}/originals/${job.job_id}`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { 'x-test-role': 'setter' } })).status, 403);
    const response = await fetch(url, { headers: { 'x-test-role': 'admin' } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(created.queue.originalsDir, job.job_id, original_archive.file)));
    assert.equal((await fetch(`${base}/videos/${job.job_id}/${original_archive.file}`)).status, 404);
    assert.equal((await fetch(`${base}/originals/${job.job_id}/${original_archive.file}`)).status, 404);
    await fs.writeFile(path.join(created.queue.originalsDir, job.job_id, original_archive.file), 'tampered');
    assert.equal((await fetch(url, { headers: { 'x-test-role': 'admin' } })).status, 409);
    await created.queue.save({ ...job, status: 'deleted', original_archive });
    assert.equal((await fetch(url, { headers: { 'x-test-role': 'admin' } })).status, 404);
  } finally { if (server) await new Promise(resolve => server.close(resolve)); created?.close(); await fs.rm(dir, { recursive: true, force: true }); }
});

test('ready recovery rejects a missing or corrupted recorded original', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-original-recovery-'));
  try {
    const finalDir = path.join(dir, 'final'); const family = path.join(finalDir, 'sector'); await fs.mkdir(family, { recursive: true });
    const queue = new JobQueue({ jobsDir: path.join(dir, 'jobs'), stagingDir: path.join(dir, 'staging'), finalDir }); await queue.initialize();
    for (const q of ['hd', 'sd', 'low']) await fs.writeFile(path.join(family, `ready_${q}.mp4`), q);
    await fs.writeFile(path.join(family, '.ready.ready.json'), JSON.stringify({ job_id: job.job_id }));
    await assert.rejects(queue.process({ ...job, sector: 'sector', base_name: 'ready', original_archive: { version: 1 } }), /Original archive missing/);
    await fs.writeFile(queue.path(job.job_id), JSON.stringify({ ...job, job_id: '../originals' }));
    assert.equal(await queue.get(job.job_id), null, 'persisted identity cannot redirect lifecycle operations');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
