import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { mediaState, localMediaFile, casQuery, database, migrateEntry } from '../src/migrate-library.js';
import { JobQueue } from '../src/transcode.js';
import { verifyOriginal } from '../src/original-archive.js';

const id = '41000000-0000-4000-8000-000000000002';
const origin = 'https://video.kletterwelt-sauerland.de';
const variants = Object.fromEntries(['hd', 'sd', 'low'].map(q => [q, `${origin}/videos/sector/old_${q}.mp4`]));
const row = { id, name: 'Fixture', beta_video_url: variants.hd, beta_video_urls: variants, beta_video_status: 'ready', beta_video_job_id: null, beta_video_upload_session_id: null };
function command(args) { return new Promise((resolve, reject) => { const child = spawn('ffmpeg', args); let error = ''; child.stderr.on('data', data => error += data); child.on('error', reject); child.on('close', code => code ? reject(new Error(error)) : resolve()); }); }

test('migration guards exact media origin and includes every media field in its conditional write', () => {
  assert.throws(() => localMediaFile('/data/final', 'https://example.invalid/videos/sector/old_hd.mp4'));
  assert.throws(() => localMediaFile('/data/final', `${origin}/videos/sector/old_hd.mp4?other=1`));
  assert.throws(() => localMediaFile('/data/final', `${origin}/videos/sector/../old_hd.mp4`));
  const query = casQuery(id, mediaState(row));
  assert.equal(query.get('beta_video_job_id'), 'is.null');
  assert.equal(query.get('beta_video_urls'), `eq.${JSON.stringify(variants)}`);
  assert.equal(query.get('beta_video_upload_session_id'), 'is.null');
  assert.equal(query.get('beta_video_status'), 'eq.ready');
  assert.throws(() => database({ supabaseUrl: 'https://old-project.supabase.co', publicBaseUrl: origin, supabaseServiceRoleKey: 'fixture' }));
});

test('migration preserves old files, archives silent HDR, rejects concurrent edits and resumes an uncertain commit', { timeout: 90000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-migration-'));
  try {
    const finalDir = path.join(root, 'final'); const dir = path.join(finalDir, 'sector'); await fs.mkdir(dir, { recursive: true });
    const source = path.join(dir, 'old_hd.mp4');
    await command(['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x240:rate=12', '-f', 'lavfi', '-i', 'sine=duration=0.5', '-t', '0.5', '-vf', 'setparams=color_primaries=bt2020:color_trc=arib-std-b67:colorspace=bt2020nc', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', source]);
    for (const q of ['sd', 'low']) await fs.copyFile(source, path.join(dir, `old_${q}.mp4`));
    const originalBytes = await fs.readFile(source);
    const queue = new JobQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir }); await queue.initialize();
    let current = structuredClone(row); let allowCommit = false; let updates = 0; let crashAfterCommit = false;
    const db = { get: async () => structuredClone(current), replace: async (_id, expected, next) => {
      assert.deepEqual(mediaState(current), expected); updates++;
      if (!allowCommit) return false;
      current = { ...current, ...next }; if (crashAfterCommit) throw new Error('timeout after server commit'); return true;
    } };
    const entry = { id, before: mediaState(row) }; const checkpoint = async () => {};
    const options = { entry, queue, db, checkpoint, config: { dataDir: root, minFreeBytes: 1, maxDataBytes: 1e9 }, fetchFn: async () => new Response(null, { headers: { 'content-type': 'video/mp4' } }) };
    await migrateEntry(options); assert.equal(entry.status, 'conflict'); assert.equal(updates, 1);
    assert.deepEqual(await fs.readFile(source), originalBytes, 'original public family is never overwritten or deleted');
    const job = await queue.get(entry.job_id); const archive = await verifyOriginal({ root: queue.originalsDir, job });
    assert.equal(archive.audio_tracks, 0); assert.equal(archive.video.color_transfer, 'arib-std-b67'); assert.equal(archive.boulder_id, id);
    assert.equal(job.boulder_id, null, 'operator candidate cannot be published by the asynchronous upload publisher');
    allowCommit = true; crashAfterCommit = true;
    await assert.rejects(migrateEntry(options), /timeout after server commit/);
    assert.equal(entry.status, 'ready-to-commit'); assert.deepEqual(mediaState(current), entry.next);
    await migrateEntry(options); assert.equal(entry.status, 'committed'); assert.equal(updates, 2, 'reconciliation does not repeat the uncertain write');
    current.beta_video_upload_session_id = 'another-upload';
    await migrateEntry(options); assert.equal(entry.status, 'conflict'); assert.equal(updates, 2);
    assert.deepEqual(await fs.readFile(source), originalBytes);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
