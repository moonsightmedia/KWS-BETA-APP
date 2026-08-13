import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { assertNoSymlinkAncestors, inside, readManagedJson } from './path-safety.js';
import { mergeFiles } from './file-merge.js';

export const QUALITIES = [
  { suffix: 'hd', box: 1920, crf: 23, maxrate: '4M', bufsize: '8M', audioBitrate: '128k' },
  { suffix: 'sd', box: 1280, crf: 24, maxrate: '2M', bufsize: '4M', audioBitrate: '96k' },
  { suffix: 'low', box: 640, crf: 27, maxrate: '600k', bufsize: '1200k', audioBitrate: '64k' },
];
const H264_PROFILES = new Set(['Constrained Baseline', 'Baseline', 'Main', 'High']);
const MP4_FORMATS = new Set(['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2']);

async function writeAtomic(file, value) {
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  try { await fs.rename(tmp, file); }
  catch (error) {
    // POSIX rename is the production atomic replace. Windows cannot replace a
    // destination held open by a concurrent test reader, so use its best safe fallback.
    if (process.platform !== 'win32' || !['EEXIST', 'EPERM'].includes(error.code)) throw error;
    await fs.unlink(file).catch((unlinkError) => { if (unlinkError.code !== 'ENOENT') throw unlinkError; }); await fs.rename(tmp, file);
  }
}
function parseRate(value) {
  const [numerator, denominator = '1'] = String(value || '').split('/').map(Number);
  return denominator ? numerator / denominator : 0;
}
function bitrateLimit(value) { const match = String(value).match(/^(\d+(?:\.\d+)?)([kM])?$/); if (!match) return 0; return Number(match[1]) * (match[2] === 'M' ? 1_000_000 : match[2] === 'k' ? 1_000 : 1); }
const HD_PASSTHROUGH_VIDEO_MAX = bitrateLimit(QUALITIES[0].maxrate) * 1.15;
const HD_PASSTHROUGH_AUDIO_MAX = bitrateLimit(QUALITIES[0].audioBitrate) * 1.15;
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; }); child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-12000); });
    child.on('error', reject); child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} exited ${code}: ${stderr.slice(-700)}`)));
  });
}

export async function probeRendition(file, quality, ffprobe = 'ffprobe') {
  const raw = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,bit_rate', '-of', 'json', file]);
  const info = JSON.parse(raw); const video = info.streams?.find((s) => s.codec_type === 'video'); const audio = info.streams?.find((s) => s.codec_type === 'audio');
  const duration = Number(info.format?.duration); const fps = parseRate(video?.r_frame_rate);
  if (video?.codec_name !== 'h264' || video?.pix_fmt !== 'yuv420p' || !video.width || !video.height || Math.max(video.width, video.height) > quality.box || !Number.isFinite(duration) || duration <= 0 || !fps || fps > 30.01) throw new Error(`ffprobe rejected ${quality.suffix} video`);
  const videoBitrate = Number(video?.bit_rate); const audioBitrate = Number(audio?.bit_rate);
  if (!Number.isFinite(videoBitrate) || videoBitrate <= 0 || videoBitrate > bitrateLimit(quality.maxrate) * 1.15) throw new Error(`ffprobe rejected ${quality.suffix} video bitrate`);
  if (audio && (audio.codec_name !== 'aac' || !Number.isFinite(audioBitrate) || audioBitrate <= 0 || audioBitrate > bitrateLimit(quality.audioBitrate) * 1.15)) throw new Error(`ffprobe rejected ${quality.suffix} audio`);
  const stat = await fs.stat(file); if (stat.size <= 0) throw new Error('encoder produced an empty file');
  return { bytes: stat.size, duration, width: video.width, height: video.height, fps, video_bitrate: videoBitrate, audio: audio?.codec_name || null, audio_bitrate: audio ? audioBitrate : null };
}

// This checks decoded container metadata, never a filename. It is deliberately
// stricter than the rendition check because stream-copying keeps source codecs.
export async function probeHdPassthroughSource(file, ffprobe = 'ffprobe') {
  const raw = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=format_name,duration,bit_rate:stream=codec_type,codec_name,profile,width,height,r_frame_rate,pix_fmt,bit_rate', '-of', 'json', file]);
  const info = JSON.parse(raw); const videos = (info.streams || []).filter((stream) => stream.codec_type === 'video'); const audios = (info.streams || []).filter((stream) => stream.codec_type === 'audio');
  const video = videos[0]; const duration = Number(info.format?.duration); const fps = parseRate(video?.r_frame_rate); const videoBitrate = Number(video?.bit_rate); const audio = audios[0]; const audioBitrate = Number(audio?.bit_rate);
  const formats = String(info.format?.format_name || '').split(','); const containerOK = formats.some((format) => MP4_FORMATS.has(format));
  const stat = await fs.stat(file);
  if (!containerOK || videos.length !== 1 || audios.length > 1 || video?.codec_name !== 'h264' || !H264_PROFILES.has(video?.profile) || video?.pix_fmt !== 'yuv420p' || !Number.isInteger(video?.width) || !Number.isInteger(video?.height) || Math.max(video.width, video.height) > 1920 || !Number.isFinite(duration) || duration <= 0 || !fps || fps > 30.01 || !Number.isFinite(videoBitrate) || videoBitrate <= 0 || videoBitrate > HD_PASSTHROUGH_VIDEO_MAX || stat.size <= 0) return null;
  if (audio && (audio.codec_name !== 'aac' || !Number.isFinite(audioBitrate) || audioBitrate <= 0 || audioBitrate > HD_PASSTHROUGH_AUDIO_MAX)) return null;
  return { bytes: stat.size, duration, width: video.width, height: video.height, fps, video_bitrate: videoBitrate, audio: audio?.codec_name || null, audio_bitrate: audio ? audioBitrate : null, profile: video.profile };
}

export class JobQueue {
  constructor({ jobsDir, stagingDir, finalDir, tempDir = null, maxQueue = 8, ffmpeg = 'ffmpeg', ffprobe = 'ffprobe', onAccepted = () => {}, onTerminal = () => {} }) {
    this.jobsDir = jobsDir; this.stagingDir = stagingDir; this.finalDir = finalDir; this.tempDir = tempDir; this.maxQueue = maxQueue; this.ffmpeg = ffmpeg; this.ffprobe = ffprobe;
    this.queue = []; this.running = null; this.maintenance = false; this.reservations = new Map(); this.jobLocks = new Map(); this.onAccepted = onAccepted; this.onTerminal = onTerminal;
  }
  addTerminalListener(listener) {
    const previous = this.onTerminal;
    this.onTerminal = async (job) => { await previous(job); await listener(job); };
  }
  addAcceptedListener(listener) {
    const previous = this.onAccepted;
    this.onAccepted = async (job) => { await previous(job); await listener(job); };
  }
  async initialize() { await Promise.all([fs.mkdir(this.jobsDir, { recursive: true }), fs.mkdir(this.stagingDir, { recursive: true })]); }
  depth() { return this.queue.length + (this.running ? 1 : 0) + this.reservations.size; }
  capacity() { return this.maxQueue; }
  async waitForIdle() { while (this.running || this.queue.length || this.reservations.size || this.maintenance) await new Promise((resolve) => setTimeout(resolve, 10)); }
  async withJobLock(jobId, work) {
    const previous = this.jobLocks.get(jobId) || Promise.resolve(); let release;
    const gate = new Promise((resolve) => { release = resolve; }); const tail = previous.then(() => gate); this.jobLocks.set(jobId, tail);
    await previous;
    try { return await work(); }
    finally { release(); if (this.jobLocks.get(jobId) === tail) this.jobLocks.delete(jobId); }
  }
  path(id) { return inside(this.jobsDir, `${id}.json`); }
  async save(job) { job.updated_at = new Date().toISOString(); await writeAtomic(this.path(job.job_id), job); }
  async get(id) { if (!/^[a-f0-9-]{36}$/i.test(String(id || ''))) return null; try { return await readManagedJson(this.jobsDir, this.path(id)); } catch { return null; } }
  async list() { const jobs = []; for (const entry of await fs.readdir(this.jobsDir, { withFileTypes: true }).catch(() => [])) { if (!entry.isFile() || !entry.name.endsWith('.json')) continue; const job = await this.get(entry.name.slice(0, -5)); if (job) jobs.push(job); } return jobs; }
  async markDeleted(id) { const job = await this.get(id); if (!job) return null; job.status = 'deleted'; job.deleted_at = new Date().toISOString(); await this.save(job); return job; }
  async findBySession(sessionId, { schedule = true } = {}) {
    for (const entry of await fs.readdir(this.jobsDir, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const job = await this.get(entry.name.slice(0, -5));
      if (job?.session_id === sessionId) {
        if (schedule && ['reserved', 'queued'].includes(job.status) && this.running?.job_id !== job.job_id && !this.queue.some((queued) => queued.job_id === job.job_id)) {
          this.reservations.delete(job.job_id); job.status = 'queued'; await this.save(job); await this.onAccepted(job); this.queue.push(job); this.start();
        }
        return job;
      }
    }
    return null;
  }
  async findByFamily(sector, baseName) {
    for (const entry of await fs.readdir(this.jobsDir, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const job = await this.get(entry.name.slice(0, -5)); if (job?.sector === sector && job?.base_name === baseName) return job;
    }
    return null;
  }

  reserve(spec) {
    if (this.depth() >= this.maxQueue) { const error = new Error('transcode queue is full'); error.code = 'QUEUE_FULL'; throw error; }
    const job = { ...spec, job_id: crypto.randomUUID(), status: 'reserved', created_at: new Date().toISOString(), qualities: QUALITIES.map((q) => q.suffix) };
    this.reservations.set(job.job_id, job); return job;
  }
  async commit(job) {
    if (this.reservations.get(job.job_id) !== job) throw new Error('unknown queue reservation');
    try { await this.save(job); } catch (error) { this.reservations.delete(job.job_id); throw error; }
    try { job.status = 'queued'; await this.save(job); this.reservations.delete(job.job_id); await this.onAccepted(job); this.queue.push(job); this.start(); return job; }
    catch (error) { job.status = 'reserved'; await this.save(job).catch(() => {}); throw error; }
  }
  cancel(job) { this.reservations.delete(job?.job_id); }
  start() { if (!this.running) void this.runNext(); }
  async runNext() {
    if (this.running) return;
    const job = this.queue.shift(); if (!job) return;
    this.running = job;
    let failure = null;
    try {
      await this.withJobLock(job.job_id, async () => {
        try {
          job.status = 'processing'; await this.save(job); await this.process(job);
          const persisted = await this.get(job.job_id); if (persisted?.status === 'deleted') { Object.assign(job, persisted); return; }
          job.status = 'completed'; job.error = undefined; await this.save(job);
        } catch (error) {
          failure = error; const persisted = await this.get(job.job_id);
          if (persisted?.status === 'deleted') Object.assign(job, persisted);
          else { job.status = 'failed'; job.error = String(error.message || error).slice(0, 500); await this.save(job).catch(() => {}); }
        }
      });
      if (failure && job.status !== 'deleted') console.error(`[transcode] ${job.job_id} failed:`, job.error);
    }
    finally { this.maintenance = true; this.running = null; try { await this.onTerminal(job); } catch (error) { console.error('[transcode] terminal hook failed:', error.message); } await this.recoverLegacyOrigins().catch((error) => console.error('[transcode] legacy rescan failed:', error.message)); this.maintenance = false; void this.runNext(); }
  }

  async validatedInput(job, stage) {
    const resolved = path.resolve(job.input_path);
    if (job.legacy) {
      const legacyDir = inside(this.finalDir, job.sector); const expectedPrefix = `${job.base_name}.orig.`;
      if (path.dirname(resolved) !== legacyDir || !path.basename(resolved).startsWith(expectedPrefix)) throw new Error('legacy input is not the exact managed original');
      await assertNoSymlinkAncestors(this.finalDir, resolved); return resolved;
    }
    if (!/^[a-z0-9]{1,12}$/i.test(job.original_ext || '')) throw new Error('invalid original extension');
    const expected = inside(stage, `source.orig.${job.original_ext}`); if (resolved !== expected) throw new Error('job input is not its exact staging original');
    await assertNoSymlinkAncestors(this.stagingDir, resolved); return resolved;
  }

  async materializeOriginal(job, stage) {
    if (job.input_path) {
      const resolved = await this.validatedInput(job, stage);
      if (await fs.stat(resolved).then((s) => s.isFile() && s.size > 0).catch(() => false)) return resolved;
    }
    if (!job.session_dir) throw new Error('job has neither original nor resumable session');
    if (this.tempDir) { inside(this.tempDir, path.relative(this.tempDir, path.resolve(job.session_dir))); await assertNoSymlinkAncestors(this.tempDir, job.session_dir); }
    else await assertNoSymlinkAncestors(path.dirname(job.session_dir), job.session_dir);
    const original = inside(stage, `source.orig.${job.original_ext}`); const partial = `${original}.partial`;
    if (await fs.stat(original).then((stat) => stat.isFile() && stat.size === job.declared_size).catch(() => false)) {
      job.input_path = original; await this.save(job); for (let index = 0; index < job.total_chunks; index++) await fs.unlink(inside(job.session_dir, `part_${index}`)).catch(() => {}); return original;
    }
    await fs.unlink(partial).catch(() => {});
    const parts = [];
    try { for (let index = 0; index < job.total_chunks; index++) { const part = inside(job.session_dir, `part_${index}`); await assertNoSymlinkAncestors(job.session_dir, part, { allowMissing: false }); parts.push(part); } await mergeFiles(parts, partial); }
    catch (error) { await fs.unlink(partial).catch(() => {}); throw error; }
    const stat = await fs.stat(partial); if (stat.size !== job.declared_size || stat.size <= 0) { await fs.unlink(partial).catch(() => {}); throw new Error('merged original size mismatch'); }
    await fs.rename(partial, original); job.input_path = original; await this.save(job);
    for (let index = 0; index < job.total_chunks; index++) await fs.unlink(inside(job.session_dir, `part_${index}`)).catch(() => {});
    return original;
  }

  async process(job) {
    const stage = inside(this.stagingDir, job.job_id); await assertNoSymlinkAncestors(this.stagingDir, stage); await fs.mkdir(stage, { recursive: true });
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(job.sector) || !/^[A-Za-z0-9_-]{1,128}$/.test(job.base_name)) throw new Error('unsafe persisted job path');
    const outputDir = inside(this.finalDir, job.sector); await assertNoSymlinkAncestors(this.finalDir, outputDir); await fs.mkdir(outputDir, { recursive: true });
    const marker = inside(outputDir, `.${job.base_name}.ready.json`);
    const claim = inside(outputDir, `.${job.base_name}.claim.json`);
    let ownership = await readManagedJson(this.finalDir, claim).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
    if (!ownership) { await fs.writeFile(claim, `${JSON.stringify({ job_id: job.job_id, owner_id: job.owner_id })}\n`, { flag: 'wx', mode: 0o600 }).catch(async (error) => { if (error.code !== 'EEXIST') throw error; ownership = await readManagedJson(this.finalDir, claim); }); ownership ||= { job_id: job.job_id, owner_id: job.owner_id }; }
    if (ownership.job_id !== job.job_id) throw new Error('asset family collision');
    const ready = await readManagedJson(this.finalDir, marker);
    if (ready && ready.job_id !== job.job_id) throw new Error('immutable marker belongs to another job');
    if (ready?.job_id === job.job_id && (await Promise.all(QUALITIES.map((quality) => fs.lstat(inside(outputDir, `${job.base_name}_${quality.suffix}.mp4`)).then((stat) => stat.isFile() && !stat.isSymbolicLink()).catch(() => false)))).every(Boolean)) {
      job.outputs = ready.outputs || job.outputs;
      if (job.input_path) await fs.unlink(await this.validatedInput(job, stage)).catch(() => {});
      await fs.rm(stage, { recursive: true, force: true }).catch(() => {}); return;
    }
    const input = await this.materializeOriginal(job, stage); const outputs = {};
    const hd = QUALITIES[0]; const hdTmp = inside(stage, `${hd.suffix}.tmp.mp4`); const hdStaged = inside(stage, `${hd.suffix}.mp4`);
    // A remux retains the eligible streams but enforces the output MP4's
    // faststart and metadata policy. It remains staged until every rendition
    // is valid, so no partial family becomes public.
    if (await probeHdPassthroughSource(input, this.ffprobe)) {
      await fs.unlink(hdTmp).catch(() => {});
      await run(this.ffmpeg, ['-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_chapters', '-1', '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', '-f', 'mp4', hdTmp]);
      outputs[hd.suffix] = await probeRendition(hdTmp, hd, this.ffprobe); await fs.rename(hdTmp, hdStaged);
      job.hd_passthrough = true; await this.save(job);
    } else {
      job.hd_passthrough = false; await this.save(job);
    }
    for (const quality of QUALITIES) {
      if (quality.suffix === 'hd' && outputs.hd) continue;
      const staged = inside(stage, `${quality.suffix}.mp4`); const tmp = inside(stage, `${quality.suffix}.tmp.mp4`);
      await fs.unlink(tmp).catch(() => {});
      const scale = `scale=w='min(iw,${quality.box})':h='min(ih,${quality.box})':force_original_aspect_ratio=decrease:force_divisible_by=2`;
      await run(this.ffmpeg, ['-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_chapters', '-1', '-vf', scale, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-fpsmax', '30', '-preset', 'veryfast', '-crf', String(quality.crf), '-maxrate', quality.maxrate, '-bufsize', quality.bufsize, '-c:a', 'aac', '-b:a', quality.audioBitrate, '-movflags', '+faststart', '-f', 'mp4', tmp]);
      outputs[quality.suffix] = await probeRendition(tmp, quality, this.ffprobe); await fs.rename(tmp, staged);
    }
    await fs.unlink(marker).catch(() => {});
    for (const quality of QUALITIES) { const target = inside(outputDir, `${job.base_name}_${quality.suffix}.mp4`); const targetStat = await fs.lstat(target).catch(() => null); if (targetStat?.isSymbolicLink()) throw new Error('rendition target is a symlink'); await fs.rename(inside(stage, `${quality.suffix}.mp4`), target); }
    job.outputs = outputs; await writeAtomic(marker, { job_id: job.job_id, owner_id: job.owner_id, urls: job.urls, outputs, completed_at: new Date().toISOString() });
    await fs.unlink(input).catch(() => {}); await fs.rmdir(stage).catch(() => {});
  }

  async recover() {
    const entries = await fs.readdir(this.jobsDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const job = await this.get(entry.name.slice(0, -5));
      if (!job || !['reserved', 'queued', 'processing'].includes(job.status)) continue;
      job.status = 'queued'; await this.save(job); await this.onAccepted(job); this.queue.push(job);
    }
    await this.recoverLegacyOrigins(); this.start();
  }
  async recoverLegacyOrigins() {
    const knownInputs = new Set((await this.list()).map((job) => job.input_path).filter(Boolean).map((file) => path.resolve(file)));
    async function walk(queue, dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name); if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) await walk(queue, full);
        else if (/\.orig\.[a-z0-9]+$/i.test(entry.name)) {
          const base = entry.name.replace(/\.orig\.[a-z0-9]+$/i, ''); if (knownInputs.has(path.resolve(full))) continue;
          const sector = path.relative(queue.finalDir, dir); const urls = Object.fromEntries(QUALITIES.map((q) => [q.suffix, `${base}_${q.suffix}.mp4`]));
          const job = { job_id: crypto.randomUUID(), status: 'queued', created_at: new Date().toISOString(), owner_id: null, legacy: true, input_path: full, declared_size: (await fs.stat(full)).size, sector, base_name: base, urls, qualities: QUALITIES.map((q) => q.suffix) };
          if (queue.depth() >= queue.maxQueue) return;
          await queue.save(job); queue.onAccepted(job); knownInputs.add(path.resolve(full)); queue.queue.push(job);
        }
      }
    }
    await walk(this, this.finalDir);
  }
}
