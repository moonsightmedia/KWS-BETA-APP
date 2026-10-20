/** Operator CLI: node src/migrate-library.js --run-id <uuid> [--execute|--rollback].
 * Add --limit 1 for a canary; omit it to finish the same run.
 * Run in the existing production container; credentials stay in its environment.
 * Default is a read-only plan. Never overwrites or removes an existing family.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { loadConfig } from './config.js';
import { JobQueue, QUALITIES, probeRendition } from './transcode.js';
import { archiveOriginal, verifyOriginal } from './original-archive.js';
import { isHdrVideo } from './video-color.js';
import { inside, assertNoSymlinkAncestors, managedBytes, readManagedJson } from './path-safety.js';

const API = 'https://beta-api.kletterwelt-sauerland.de';
const MEDIA = 'https://video.kletterwelt-sauerland.de';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MEDIA_FIELDS = ['beta_video_url', 'beta_video_urls', 'beta_video_status', 'beta_video_job_id', 'beta_video_upload_session_id'];
const SELECT = ['id', 'name', ...MEDIA_FIELDS].join(',');
export function mediaState(row) { return Object.fromEntries(MEDIA_FIELDS.map(key => [key, row[key] ?? null])); }
function same(a, b) {
  const normalize = value => value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
export function localMediaFile(finalDir, url) {
  const parsed = new URL(url);
  if (parsed.origin !== MEDIA || parsed.search || parsed.hash || !/^\/videos\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]+_(hd|sd|low)\.mp4$/.test(parsed.pathname)) throw new Error('Unexpected media URL; manual review required');
  return inside(finalDir, ...parsed.pathname.slice('/videos/'.length).split('/'));
}
export function casQuery(id, expected) {
  if (!UUID.test(id)) throw new Error('Invalid boulder identity');
  const query = new URLSearchParams({ id: `eq.${id}`, select: SELECT });
  for (const key of MEDIA_FIELDS) {
    const value = expected[key];
    query.set(key, value == null ? 'is.null' : `eq.${typeof value === 'object' ? JSON.stringify(value) : value}`);
  }
  return query;
}
export function database(config, fetchFn = fetch) {
  if (config.supabaseUrl !== API || config.publicBaseUrl !== MEDIA || !config.supabaseServiceRoleKey) throw new Error('Wrong production target or missing credentials');
  const headers = { apikey: config.supabaseServiceRoleKey, authorization: `Bearer ${config.supabaseServiceRoleKey}`, 'content-type': 'application/json' };
  const request = async (query, options = {}) => {
    const response = await fetchFn(`${API}/rest/v1/boulders?${query}`, { ...options, headers: { ...headers, ...options.headers }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    return response.json();
  };
  return {
    all: async () => { const rows = []; for (let offset = 0; ; offset += 500) { const page = await request(new URLSearchParams({ select: SELECT, order: 'id', limit: '500', offset: String(offset) })); rows.push(...page); if (page.length < 500) return rows; } },
    get: async id => (await request(new URLSearchParams({ id: `eq.${id}`, select: SELECT })))[0],
    replace: async (id, expected, next) => {
      const rows = await request(casQuery(id, expected), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(next) });
      return rows.length === 1 && same(mediaState(rows[0]), next);
    },
  };
}
function command(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true }); let out = '', error = '';
    child.stdout.on('data', data => out += data); child.stderr.on('data', data => { error = (error + data).slice(-2000); });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(out) : reject(new Error(`Media check failed (${code}): ${error.slice(-300)}`)));
  });
}
async function probe(file) { return JSON.parse(await command('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file])); }
async function writeState(file, value) {
  const temp = `${file}.partial`; await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  const handle = await fs.open(temp, 'r+'); try { await handle.sync(); } finally { await handle.close(); } await fs.rename(temp, file);
}
async function validateCandidate(queue, job, sourceDuration) {
  await verifyOriginal({ root: queue.originalsDir, job });
  const marker = await readManagedJson(queue.finalDir, inside(queue.finalDir, job.sector, `.${job.base_name}.ready.json`));
  if (marker?.job_id !== job.job_id) throw new Error('Candidate family not ready');
  for (const quality of QUALITIES) {
    const file = localMediaFile(queue.finalDir, job.urls[quality.suffix]);
    const rendition = await probeRendition(file, quality);
    if (Math.abs(rendition.duration - sourceDuration) > 0.2) throw new Error('Candidate duration changed');
    await command('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-f', 'null', '-']);
  }
}

/** One item is journaled before any file creation and before the compare-and-set. */
export async function migrateEntry({ entry, queue, db, checkpoint, config, fetchFn = fetch }) {
  const current = await db.get(entry.id);
  if (!current) { entry.status = 'conflict'; await checkpoint(); return; }
  if (entry.next && same(mediaState(current), entry.next)) {
    const job = await queue.get(entry.job_id); if (!job) throw new Error('Committed candidate job missing');
    await validateCandidate(queue, job, entry.source_duration); entry.status = 'committed'; await checkpoint(); return;
  }
  if (!same(mediaState(current), entry.before) || ['uploading', 'queued', 'processing'].includes(current.beta_video_status)) { entry.status = 'conflict'; await checkpoint(); return; }
  const variants = entry.before.beta_video_urls || {};
  const sourceUrl = variants.hd || entry.before.beta_video_url;
  const source = localMediaFile(queue.finalDir, sourceUrl); await assertNoSymlinkAncestors(queue.finalDir, source, { allowMissing: false });
  const sourceInfo = await probe(source); const sourceVideo = sourceInfo.streams.find(stream => stream.codec_type === 'video');
  const duration = Number(sourceInfo.format?.duration); if (!(duration > 0)) throw new Error('Invalid source duration');
  entry.source_duration = duration;
  let needsRenditions = isHdrVideo(sourceVideo);
  for (const url of new Set([entry.before.beta_video_url, ...Object.values(variants)].filter(Boolean))) {
    const file = localMediaFile(queue.finalDir, url); await assertNoSymlinkAncestors(queue.finalDir, file, { allowMissing: false });
    const info = await probe(file); if (info.streams.some(stream => stream.codec_type === 'audio' || isHdrVideo(stream))) needsRenditions = true;
  }
  const sourceBytes = (await fs.stat(source)).size; const stats = await fs.statfs(config.dataDir);
  if (Number(stats.bavail) * Number(stats.bsize) < config.minFreeBytes + sourceBytes * 6 || await managedBytes(config.dataDir) + sourceBytes * 6 > config.maxDataBytes) throw new Error('Insufficient migration storage headroom');
  entry.job_id ||= crypto.randomUUID(); entry.status = 'preparing'; await checkpoint();
  let job = await queue.get(entry.job_id);
  if (!job) {
    const sector = path.basename(path.dirname(source)); const baseName = `sdr-${entry.job_id}`;
    job = { job_id: entry.job_id, status: 'operator-preparing', owner_id: null, boulder_id: null, source_boulder_id: entry.id, source_provenance: 'best-available-published-hd', source_url: sourceUrl, original_ext: 'mp4', sector, base_name: baseName, urls: Object.fromEntries(QUALITIES.map(q => [q.suffix, `${MEDIA}/videos/${sector}/${baseName}_${q.suffix}.mp4`])), created_at: new Date().toISOString() };
    await queue.save(job);
  }
  if (job.status !== 'completed') {
    if (needsRenditions) {
      const stage = inside(queue.stagingDir, job.job_id); await assertNoSymlinkAncestors(queue.stagingDir, stage); await fs.mkdir(stage, { recursive: true });
      const input = inside(stage, 'source.orig.mp4'); await assertNoSymlinkAncestors(queue.stagingDir, input); await fs.copyFile(source, input);
      job.input_path = input; await queue.save(job); await queue.process(job);
    } else job.original_archive = await archiveOriginal({ root: queue.originalsDir, job, input: source });
    job.status = 'completed'; await queue.save(job);
  }
  await verifyOriginal({ root: queue.originalsDir, job });
  if (!needsRenditions) { entry.status = 'archived-existing-sdr'; await checkpoint(); return; }
  await validateCandidate(queue, job, duration);
  // Verify public routing before replacing all three database references together.
  for (const url of Object.values(job.urls)) {
    const response = await fetchFn(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('video/mp4')) throw new Error('Candidate public routing unavailable');
  }
  entry.next = { ...entry.before, beta_video_url: job.urls.hd, beta_video_urls: job.urls, beta_video_status: 'ready', beta_video_job_id: job.job_id };
  entry.status = 'ready-to-commit'; await checkpoint();
  // A network timeout can have an unknown outcome. Re-running reconciles against
  // entry.next; it never blindly patches a newly uploaded replacement.
  entry.status = await db.replace(entry.id, entry.before, entry.next) ? 'committed' : 'conflict'; await checkpoint();
}

async function main() {
  const args = process.argv.slice(2); const runId = args[args.indexOf('--run-id') + 1];
  const limitValue = args.includes('--limit') ? args[args.indexOf('--limit') + 1] : null;
  const limit = limitValue === null ? Infinity : Number(limitValue);
  if (!args.includes('--run-id') || !UUID.test(runId || '') || args.some(arg => !['--run-id', runId, '--execute', '--rollback', '--limit', limitValue].includes(arg)) || (args.includes('--execute') && args.includes('--rollback')) || (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1))) throw new Error('Use --run-id <uuid> and optionally --execute OR --rollback, --limit <positive integer>');
  const config = loadConfig(); if (config.dataDir !== '/data') throw new Error('Run only inside the production container');
  const db = database(config); const rows = (await db.all()).filter(row => row.beta_video_url || Object.values(row.beta_video_urls || {}).some(value => typeof value === 'string' && value));
  if (!args.includes('--execute') && !args.includes('--rollback')) { console.log(JSON.stringify({ plan: true, run_id: runId, video_boulders: rows.length, boulder_ids: rows.map(row => row.id) }, null, 2)); return; }
  const root = inside(config.dataDir, 'maintenance'); await assertNoSymlinkAncestors(config.dataDir, root); await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const lock = inside(root, 'sdr-library.lock'); await assertNoSymlinkAncestors(root, lock); const lockHandle = await fs.open(lock, 'wx', 0o600);
  try {
    await lockHandle.writeFile(JSON.stringify({ run_id: runId, pid: process.pid, started_at: new Date().toISOString() }));
    const statePath = inside(root, `sdr-${runId}.json`); let state = await readManagedJson(root, statePath);
    if (!state) {
      if (args.includes('--rollback')) throw new Error('No migration manifest to roll back');
      state = { version: 1, run_id: runId, target: API, started_at: new Date().toISOString(), entries: rows.map(row => ({ id: row.id, name: row.name, before: mediaState(row), status: 'planned' })) }; await writeState(statePath, state);
    }
    if (state.run_id !== runId || state.target !== API) throw new Error('Wrong migration manifest');
    const checkpoint = () => writeState(statePath, state);
    const queue = new JobQueue({ jobsDir: inside(config.dataDir, 'jobs'), stagingDir: inside(config.dataDir, 'staging'), finalDir: inside(config.dataDir, 'final') }); await queue.initialize();
    let processed = 0;
    for (const entry of state.entries) {
      if (processed >= limit) break;
      if (!args.includes('--rollback') && ['committed', 'archived-existing-sdr'].includes(entry.status)) continue;
      if (args.includes('--rollback')) {
        if (!entry.next) continue;
        const current = await db.get(entry.id);
        entry.status = current && same(mediaState(current), entry.before) ? 'rolled-back' : await db.replace(entry.id, entry.next, entry.before) ? 'rolled-back' : 'rollback-conflict'; await checkpoint();
      } else {
        try { await migrateEntry({ entry, queue, db, checkpoint, config }); }
        catch (error) { entry.error = String(error.message).slice(0, 500); await checkpoint(); throw error; }
      }
      processed++;
      console.log(JSON.stringify({ id: entry.id, status: entry.status, done: state.entries.filter(item => ['committed', 'archived-existing-sdr', 'rolled-back'].includes(item.status)).length, total: state.entries.length }));
    }
    if (!state.entries.some(entry => ['planned', 'preparing', 'ready-to-commit'].includes(entry.status))) state.finished_at = new Date().toISOString(); await checkpoint();
    if (state.entries.some(entry => /conflict/.test(entry.status))) throw new Error('Concurrent media changes require a fresh inventory');
  } finally { await lockHandle.close(); await fs.unlink(lock); }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => { console.error(error.message); process.exitCode = 1; });
