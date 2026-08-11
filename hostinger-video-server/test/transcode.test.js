import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { JobQueue, QUALITIES, probeRendition } from '../src/transcode.js';

function command(bin, args) { return new Promise((resolve, reject) => { const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let stderr = ''; child.stderr.on('data', (d) => { stderr += d; }); child.on('error', reject); child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${bin} failed: ${stderr.slice(-1000)}`))); }); }
function capture(bin, args) { return new Promise((resolve, reject) => { const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = '', stderr = ''; child.stdout.on('data', (d) => { stdout += d; }); child.stderr.on('data', (d) => { stderr += d; }); child.on('error', reject); child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${bin} failed: ${stderr.slice(-1000)}`))); }); }
async function waitForJob(queue, id) { for (let attempt = 0; attempt < 600; attempt++) { const job = await queue.get(id); if (['completed', 'failed'].includes(job?.status)) return job; await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error('job timeout'); }
async function fixture(root, name, audio) {
  const file = path.join(root, name); const args = ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=60:duration=0.6'];
  if (audio) args.push('-f', 'lavfi', '-i', 'sine=frequency=1000:duration=0.6', '-shortest');
  args.push('-metadata', 'title=must-not-survive', '-c:v', 'libx264', '-pix_fmt', 'yuv420p'); if (audio) args.push('-c:a', 'aac'); args.push(file); await command('ffmpeg', args); return file;
}
async function enqueueFixture(queue, root, source, baseName, owner = 'owner-a') {
  const session = path.join(root, `session-${baseName}`); await fs.mkdir(session); await fs.copyFile(source, path.join(session, 'part_0')); const size = (await fs.stat(source)).size;
  const urls = Object.fromEntries(QUALITIES.map((quality) => [quality.suffix, `https://example.invalid/videos/sector/${baseName}_${quality.suffix}.mp4`]));
  const job = queue.reserve({ session_id: `session-${baseName}`, session_dir: session, owner_id: owner, sector: 'sector', base_name: baseName, original_ext: 'mp4', total_chunks: 1, declared_size: size, urls }); await queue.commit(job); return job;
}

test('queue reserves capacity synchronously before any merge', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-queue-'));
  try { const queue = new JobQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir: path.join(root, 'final'), maxQueue: 1 }); await fs.mkdir(path.join(root, 'final')); await queue.initialize(); const first = queue.reserve({ owner_id: 'a' }); assert.equal(queue.depth(), 1); assert.throws(() => queue.reserve({ owner_id: 'b' }), (error) => error.code === 'QUEUE_FULL'); queue.cancel(first); assert.equal(queue.depth(), 0); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('a second durable commit-write failure retains and resumes its reserved slot', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-commit-')); const originalError = console.error; console.error = () => {};
  try {
    class FailingQueue extends JobQueue { constructor(options) { super(options); this.writes = 0; } async save(job) { this.writes++; if (this.writes === 2) throw new Error('injected second write failure'); return super.save(job); } }
    const finalDir = path.join(root, 'final'); await fs.mkdir(finalDir); const queue = new FailingQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir, maxQueue: 1 }); await queue.initialize(); const job = queue.reserve({ session_id: 'resume-session', session_dir: path.join(root, 'missing'), owner_id: 'a', sector: 'sector', base_name: 'resume', original_ext: 'mp4', total_chunks: 1, declared_size: 1, urls: {} }); await assert.rejects(queue.commit(job), /second write failure/); assert.equal(queue.depth(), 1); const resumed = await queue.findBySession('resume-session'); assert.ok(['queued', 'processing'].includes(resumed.status)); const terminal = await waitForJob(queue, job.job_id); assert.equal(terminal.status, 'failed'); await queue.waitForIdle(); assert.equal(queue.depth(), 0);
  } finally { console.error = originalError; await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 }); }
});

test('real FFmpeg produces validated audio and video-only whole sets', { timeout: 60_000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-ffmpeg-'));
  try {
    const finalDir = path.join(root, 'final'); await fs.mkdir(finalDir); const queue = new JobQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir, maxQueue: 2 }); await queue.initialize();
    for (const [name, hasAudio] of [['audio', true], ['silent', false]]) {
      const input = await fixture(root, `${name}.mp4`, hasAudio); const submitted = await enqueueFixture(queue, root, input, name); const job = await waitForJob(queue, submitted.job_id); assert.equal(job.status, 'completed', job.error);
      const marker = JSON.parse(await fs.readFile(path.join(finalDir, 'sector', `.${name}.ready.json`), 'utf8')); assert.equal(marker.job_id, job.job_id);
      for (const quality of QUALITIES) { const output = path.join(finalDir, 'sector', `${name}_${quality.suffix}.mp4`); const info = await probeRendition(output, quality); assert.ok(info.fps <= 30.01); assert.ok(Math.max(info.width, info.height) <= quality.box); assert.ok(info.video_bitrate <= ({ hd: 4_000_000, sd: 2_000_000, low: 600_000 }[quality.suffix] * 1.15)); assert.equal(info.audio, hasAudio ? 'aac' : null); if (hasAudio) assert.ok(info.audio_bitrate <= ({ hd: 128_000, sd: 96_000, low: 64_000 }[quality.suffix] * 1.15)); assert.equal([info.width, info.height].sort((a, b) => b - a)[0], 320, 'small sources must not be upscaled'); const metadata = JSON.parse(await capture('ffprobe', ['-v', 'error', '-show_entries', 'format_tags:stream_tags', '-of', 'json', output])); assert.equal(metadata.format?.tags?.title, undefined); assert.ok(!(metadata.streams || []).some((stream) => stream.tags?.title)); }
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('failed source never creates a ready marker or public renditions', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-failure-')); const originalError = console.error; console.error = () => {};
  try { const finalDir = path.join(root, 'final'); await fs.mkdir(finalDir); const queue = new JobQueue({ jobsDir: path.join(root, 'jobs'), stagingDir: path.join(root, 'staging'), finalDir, maxQueue: 1 }); await queue.initialize(); const bad = path.join(root, 'bad.mp4'); await fs.writeFile(bad, 'not-video'); const job = await enqueueFixture(queue, root, bad, 'broken'); const failed = await waitForJob(queue, job.job_id); assert.equal(failed.status, 'failed'); assert.equal(await fs.stat(path.join(finalDir, 'sector', '.broken.ready.json')).then(() => true).catch(() => false), false); for (const quality of QUALITIES) assert.equal(await fs.stat(path.join(finalDir, 'sector', `broken_${quality.suffix}.mp4`)).then(() => true).catch(() => false), false); }
  finally { console.error = originalError; await fs.rm(root, { recursive: true, force: true }); }
});

test('restart recovery finalizes a ready-marked whole set without re-encoding it', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-recover-'));
  try {
    const jobsDir = path.join(root, 'jobs'); const stagingDir = path.join(root, 'staging'); const finalDir = path.join(root, 'final'); const sectorDir = path.join(finalDir, 'sector'); await Promise.all([jobsDir, stagingDir, sectorDir].map((dir) => fs.mkdir(dir, { recursive: true })));
    const id = '10000000-0000-4000-8000-000000000001'; const contents = {};
    for (const quality of QUALITIES) { contents[quality.suffix] = `stable-${quality.suffix}`; await fs.writeFile(path.join(sectorDir, `recover_${quality.suffix}.mp4`), contents[quality.suffix]); }
    await fs.writeFile(path.join(sectorDir, '.recover.ready.json'), JSON.stringify({ job_id: id, owner_id: 'owner-a', outputs: { recovered: true } }));
    await fs.writeFile(path.join(jobsDir, `${id}.json`), JSON.stringify({ job_id: id, status: 'processing', owner_id: 'owner-a', sector: 'sector', base_name: 'recover', urls: {} }));
    const queue = new JobQueue({ jobsDir, stagingDir, finalDir, maxQueue: 1 }); await queue.initialize(); await queue.recover(); const recovered = await waitForJob(queue, id); assert.equal(recovered.status, 'completed'); assert.deepEqual(recovered.outputs, { recovered: true });
    for (const quality of QUALITIES) assert.equal(await fs.readFile(path.join(sectorDir, `recover_${quality.suffix}.mp4`), 'utf8'), contents[quality.suffix]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('ready recovery cannot unlink an input outside managed roots', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-root-')); const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'kws-canary-')); const originalError = console.error; console.error = () => {};
  try {
    const jobsDir = path.join(root, 'jobs'); const stagingDir = path.join(root, 'staging'); const finalDir = path.join(root, 'final'); const sectorDir = path.join(finalDir, 'sector'); await Promise.all([jobsDir, stagingDir, sectorDir].map((dir) => fs.mkdir(dir, { recursive: true }))); const canary = path.join(outside, 'canary.txt'); await fs.writeFile(canary, 'keep');
    const id = '20000000-0000-4000-8000-000000000001'; for (const quality of QUALITIES) await fs.writeFile(path.join(sectorDir, `guard_${quality.suffix}.mp4`), 'ready'); await fs.writeFile(path.join(sectorDir, '.guard.ready.json'), JSON.stringify({ job_id: id, owner_id: 'a' })); await fs.writeFile(path.join(jobsDir, `${id}.json`), JSON.stringify({ job_id: id, status: 'processing', owner_id: 'a', sector: 'sector', base_name: 'guard', input_path: canary, urls: {} }));
    const queue = new JobQueue({ jobsDir, stagingDir, finalDir, tempDir: path.join(root, 'temp'), maxQueue: 1 }); await queue.initialize(); await queue.recover(); assert.equal((await waitForJob(queue, id)).status, 'failed'); assert.equal(await fs.readFile(canary, 'utf8'), 'keep');
  } finally { console.error = originalError; await fs.rm(root, { recursive: true, force: true }); await fs.rm(outside, { recursive: true, force: true }); }
});
