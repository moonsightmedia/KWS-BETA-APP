import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireSupabaseUser, canAccessOwner, canManageBoulderMedia } from './auth.js';
import { loadConfig } from './config.js';
import { JobQueue, QUALITIES } from './transcode.js';
import { assertNoSymlinkAncestors, inside, managedBytes, readManagedJson } from './path-safety.js';
import { mergeFiles } from './file-merge.js';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const SESSION_ID = /^[A-Za-z0-9_-]{8,128}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;

class KeyedLock {
  constructor() { this.tails = new Map(); }
  async run(key, work) {
    const previous = this.tails.get(key) || Promise.resolve(); let release;
    const gate = new Promise((resolve) => { release = resolve; }); const tail = previous.then(() => gate); this.tails.set(key, tail);
    await previous;
    try { return await work(); }
    finally { release(); if (this.tails.get(key) === tail) this.tails.delete(key); }
  }
}

function splitName(fileName) {
  const base = path.basename(String(fileName || 'upload')).slice(0, 255); const ext = path.extname(base).slice(1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const stem = base.slice(0, base.length - (path.extname(base).length || 0)).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || 'upload';
  return { stem, ext };
}
async function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`; await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  try { await fs.rename(tmp, file); } catch (error) { if (process.platform !== 'win32' || !['EEXIST', 'EPERM'].includes(error.code)) throw error; await fs.unlink(file).catch((unlinkError) => { if (unlinkError.code !== 'ENOENT') throw unlinkError; }); await fs.rename(tmp, file); }
}
async function sha256File(file) {
  const hash = crypto.createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex');
}

export async function createApp({ config = loadConfig(), authMiddleware = requireSupabaseUser, queue: suppliedQueue } = {}) {
  const tempDir = inside(config.dataDir, 'temp'); const finalDir = inside(config.dataDir, 'final'); const jobsDir = inside(config.dataDir, 'jobs'); const stagingDir = inside(config.dataDir, 'staging');
  await Promise.all([tempDir, finalDir, jobsDir, stagingDir].map(async (dir) => { await assertNoSymlinkAncestors(config.dataDir, dir); await fs.mkdir(dir, { recursive: true }); }));
  const diskReservations = new Map();
  const queue = suppliedQueue || new JobQueue({ jobsDir, stagingDir, finalDir, tempDir, maxQueue: config.maxQueueJobs, onAccepted: (job) => { if (job.declared_size) diskReservations.set(job.job_id, job.declared_size * 4); }, onTerminal: (job) => { diskReservations.delete(job.job_id); } }); await queue.initialize();
  const sessionLocks = new KeyedLock(); const userLocks = new KeyedLock(); const diskLock = new KeyedLock(); let multipartActive = 0;
  const publicUrl = (...segments) => `${config.publicBaseUrl}/videos/${segments.map(encodeURIComponent).join('/')}`;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxChunkBytes } });

  async function sessionDir(sessionId) { const dir = inside(tempDir, sessionId); await assertNoSymlinkAncestors(tempDir, dir); return dir; }
  async function loadManifest(sessionId) { const dir = await sessionDir(sessionId); try { return await readManagedJson(tempDir, inside(dir, 'manifest.json')); } catch { return null; } }
  async function listChunks(dir) { return (await fs.readdir(dir).catch(() => [])).filter((name) => /^part_\d+$/.test(name)).map((name) => Number(name.slice(5))).sort((a, b) => a - b); }
  async function countUserSessions(userId) {
    let count = 0; for (const entry of await fs.readdir(tempDir, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isDirectory() || !SESSION_ID.test(entry.name)) continue; const manifest = await loadManifest(entry.name); if (manifest?.owner_id === userId && !manifest.response) count++;
    } return count;
  }
  async function ensureDiskCapacity(additionalBytes) {
    const reserved = [...diskReservations.values()].reduce((sum, bytes) => sum + bytes, 0); const used = await managedBytes(config.dataDir); if (used + reserved + additionalBytes > config.maxDataBytes) { const error = new Error('managed disk quota exceeded'); error.code = 'DISK_QUOTA'; throw error; }
    const stats = await fs.statfs(config.dataDir); const available = Number(stats.bavail) * Number(stats.bsize); if (available - reserved - additionalBytes < config.minFreeBytes) { const error = new Error('disk headroom exhausted'); error.code = 'DISK_QUOTA'; throw error; }
  }
  function acquireMultipart(req, res, next) {
    if (multipartActive >= config.maxMultipartConcurrency) return res.status(429).json({ error: 'Too many concurrent multipart requests' });
    multipartActive++; let released = false; const release = () => { if (!released) { released = true; multipartActive--; } }; res.once('finish', release); res.once('close', release); next();
  }

  const app = express(); app.disable('x-powered-by'); app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Auth, X-File-Name, X-File-Size, X-File-Type, X-Chunk-Number, X-Total-Chunks, X-Upload-Session-Id, X-Sector-Id', 'Access-Control-Max-Age': '86400' });
    if (req.method === 'OPTIONS') return res.sendStatus(200); next();
  });

  app.post('/upload.php', authMiddleware, acquireMultipart, upload.single('chunk'), async (req, res) => {
    const sessionId = String(req.headers['x-upload-session-id'] || '');
    if (!SESSION_ID.test(sessionId)) return res.status(400).json({ error: 'Invalid upload session id' });
    try {
      await userLocks.run(req.userId, () => sessionLocks.run(sessionId, async () => {
        const chunkIndex = Number(req.headers['x-chunk-number']); const totalChunks = Number(req.headers['x-total-chunks']); const declaredSize = Number(req.headers['x-file-size']);
        const fileName = String(req.headers['x-file-name'] || 'upload'); const fileType = String(req.headers['x-file-type'] || '').slice(0, 128); const sector = String(req.headers['x-sector-id'] || 'unsorted');
        if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > config.maxTotalChunks || chunkIndex >= totalChunks) return res.status(400).json({ error: 'Invalid chunk headers' });
        if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0 || declaredSize > config.maxUploadBytes || !req.file?.buffer) return res.status(413).json({ error: 'Invalid upload size' });
        if (!SAFE_SEGMENT.test(sector) || sector === '.' || sector === '..') return res.status(400).json({ error: 'Invalid sector id' });
        const dir = await sessionDir(sessionId); let manifest = await loadManifest(sessionId); const immutable = { total_chunks: totalChunks, declared_size: declaredSize, file_name: fileName.slice(0, 255), file_type: fileType, sector };
        if (manifest && !canAccessOwner(req, manifest.owner_id)) return res.status(403).json({ error: 'Session belongs to another user' });
        if (manifest && JSON.stringify(manifest.immutable) !== JSON.stringify(immutable)) return res.status(409).json({ error: 'Upload manifest mismatch' });
        if (manifest?.response) { const incomingHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex'); const prior = manifest.chunks[String(chunkIndex)]; if (!prior || prior.sha256 !== incomingHash || prior.bytes !== req.file.size) return res.status(409).json({ error: 'Completed chunk retry mismatch' }); const job = manifest.job_id ? await queue.get(manifest.job_id) : null; if (job && !canAccessOwner(req, job.owner_id)) return res.status(403).json({ error: 'Job belongs to another user' }); return res.json(job ? { ...manifest.response, status: job.status, error: job.status === 'failed' ? job.error : undefined } : manifest.response); }
        if (!manifest) {
          if (await countUserSessions(req.userId) >= config.maxActiveSessionsPerUser) return res.status(429).json({ error: 'Too many active upload sessions' });
          await fs.mkdir(dir, { recursive: false }); manifest = { session_id: sessionId, owner_id: req.userId, immutable, chunks: {}, created_at: new Date().toISOString() };
        }
        const incomingHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex'); const prior = manifest.chunks[String(chunkIndex)]; const chunkPath = inside(dir, `part_${chunkIndex}`);
        if (prior) {
          try { await assertNoSymlinkAncestors(dir, chunkPath, { allowMissing: false }); } catch { return res.status(409).json({ error: 'Unsafe chunk path' }); } const diskHash = await sha256File(chunkPath).catch(() => null); if (prior.sha256 !== incomingHash || diskHash !== incomingHash || prior.bytes !== req.file.size) return res.status(409).json({ error: 'Chunk integrity mismatch' });
        } else {
          await diskLock.run('disk', async () => { await ensureDiskCapacity(req.file.size); await fs.writeFile(chunkPath, req.file.buffer, { flag: 'wx', mode: 0o600 }); });
          manifest.chunks[String(chunkIndex)] = { bytes: req.file.size, sha256: incomingHash };
        }
        manifest.updated_at = new Date().toISOString(); await writeJsonAtomic(inside(dir, 'manifest.json'), manifest);
        const indices = await listChunks(dir); const complete = indices.length === totalChunks && indices.every((value, index) => value === index);
        if (!complete) return res.json({ status: 'chunk_received', job_id: null, url: null, urls: null, chunk: chunkIndex, received: indices.length, total: totalChunks });
        const totalBytes = Object.values(manifest.chunks).reduce((sum, chunk) => sum + chunk.bytes, 0); if (totalBytes !== declaredSize) return res.status(409).json({ error: 'Upload size integrity check failed' });
        const existingJob = manifest.job_id ? await queue.get(manifest.job_id) : await queue.findBySession(sessionId);
        if (existingJob) { if (!canAccessOwner(req, existingJob.owner_id)) return res.status(403).json({ error: 'Job belongs to another user' }); manifest.job_id = existingJob.job_id; manifest.response ||= { status: existingJob.status, job_id: existingJob.job_id, url: existingJob.urls?.hd, urls: existingJob.urls }; await writeJsonAtomic(inside(dir, 'manifest.json'), manifest); return res.json({ ...manifest.response, status: existingJob.status }); }
        const { stem, ext } = splitName(fileName); const baseName = `${stem}-${crypto.randomUUID()}`; const isImage = IMAGE_EXTENSIONS.has(ext) || fileType.startsWith('image/');
        if (isImage) {
          const outputDir = inside(finalDir, sector); await assertNoSymlinkAncestors(finalDir, outputDir); await fs.mkdir(outputDir, { recursive: true }); const targetName = `${baseName}.${ext}`; const target = inside(outputDir, targetName); const partial = `${target}.partial`;
          if (await fs.lstat(target).then(() => true).catch(() => false)) throw new Error('image asset collision'); const parts = []; for (let index = 0; index < totalChunks; index++) { const part = inside(dir, `part_${index}`); await assertNoSymlinkAncestors(dir, part, { allowMissing: false }); parts.push(part); } try { await mergeFiles(parts, partial); } catch (error) { await fs.unlink(partial).catch(() => {}); throw error; } await fs.rename(partial, target);
          await writeJsonAtomic(inside(outputDir, `.${targetName}.owner.json`), { owner_id: req.userId }); const url = publicUrl(sector, targetName); manifest.response = { status: 'completed', job_id: null, url, urls: { original: url } }; for (let index = 0; index < totalChunks; index++) await fs.unlink(inside(dir, `part_${index}`)); await writeJsonAtomic(inside(dir, 'manifest.json'), manifest); return res.json(manifest.response);
        }
        const urls = Object.fromEntries(QUALITIES.map((quality) => [quality.suffix, publicUrl(sector, `${baseName}_${quality.suffix}.mp4`)]));
        const job = queue.reserve({ session_id: sessionId, session_dir: dir, owner_id: req.userId, sector, base_name: baseName, original_ext: ext, total_chunks: totalChunks, declared_size: declaredSize, urls });
        try { await diskLock.run('disk', async () => { const reservedBytes = declaredSize * 4; await ensureDiskCapacity(reservedBytes); diskReservations.set(job.job_id, reservedBytes); }); await queue.commit(job); }
        catch (error) { if (!await queue.get(job.job_id)) { queue.cancel(job); diskReservations.delete(job.job_id); } throw error; }
        manifest.job_id = job.job_id; manifest.response = { status: 'queued', job_id: job.job_id, url: urls.hd, urls }; await writeJsonAtomic(inside(dir, 'manifest.json'), manifest); return res.json(manifest.response);
      }));
    } catch (error) {
      console.error('[upload] error:', error.message); const status = error.code === 'QUEUE_FULL' ? 429 : error.code === 'DISK_QUOTA' ? 507 : 500; if (!res.headersSent) { if (status === 429) res.set('Retry-After', '5'); res.status(status).json({ error: status < 500 || status === 507 ? error.message : 'Upload failed' }); }
    }
  });

  app.get('/upload-status.php', authMiddleware, async (req, res) => {
    const sessionId = String(req.query.session_id || ''); if (!SESSION_ID.test(sessionId)) return res.status(400).json({ error: 'Invalid session_id' });
    res.set('Cache-Control', 'no-store'); await sessionLocks.run(sessionId, async () => { const manifest = await loadManifest(sessionId); if (!manifest) return res.status(404).json({ error: 'Session not found' }); if (!canAccessOwner(req, manifest.owner_id)) return res.status(403).json({ error: 'Session belongs to another user' }); const job = manifest.job_id ? await queue.get(manifest.job_id) : null; res.json({ session_id: sessionId, uploaded_chunks: await listChunks(await sessionDir(sessionId)), ...(manifest.response || {}), ...(job ? { status: job.status, job_id: job.job_id, error: job.status === 'failed' ? job.error : undefined } : {}) }); });
  });
  app.get('/jobs/:jobId', authMiddleware, async (req, res) => { res.set('Cache-Control', 'no-store'); const job = await queue.get(req.params.jobId); if (!job) return res.status(404).json({ error: 'Job not found' }); if (!canAccessOwner(req, job.owner_id)) return res.status(403).json({ error: 'Job belongs to another user' }); res.json({ job_id: job.job_id, status: job.status, url: job.urls?.hd, urls: job.urls, outputs: job.outputs, error: job.status === 'failed' ? job.error : undefined }); });

  function resolveVideoPath(url) {
    try { const pathname = decodeURIComponent(new URL(String(url), config.publicBaseUrl).pathname); if (!pathname.startsWith('/videos/')) return null; const parts = pathname.slice(8).split('/'); if (parts.length !== 2 || !SAFE_SEGMENT.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1]) || parts[1].startsWith('.')) return null; return inside(finalDir, ...parts); } catch { return null; }
  }
  app.post('/delete.php', authMiddleware, async (req, res) => {
    const target = resolveVideoPath(req.body?.url); if (!target) return res.status(400).json({ error: 'Invalid or missing file URL' });
    try { await assertNoSymlinkAncestors(finalDir, target, { allowMissing: false }); } catch { return res.status(400).json({ error: 'Unsafe video path' }); }
    const dir = path.dirname(target); const name = path.basename(target); const match = name.match(/^(.*)_(hd|sd|low)\.mp4$/); const deleted = [];
    let legacy = false;
    if (match) {
      const marker = inside(dir, `.${match[1]}.ready.json`); const metadata = await readManagedJson(finalDir, marker); const pending = metadata ? null : await queue.findByFamily(path.basename(dir), match[1]); if (pending && !['deleted', 'failed'].includes(pending.status)) return res.status(409).json({ error: 'Video is still processing' }); if (!canManageBoulderMedia(req)) return res.status(403).json({ error: 'Setter or admin role required' });
      if (metadata) return queue.withJobLock(metadata.job_id, async () => {
        const currentMetadata = await readManagedJson(finalDir, marker); const job = await queue.get(metadata.job_id);
        if (!currentMetadata || currentMetadata.job_id !== metadata.job_id || !job || job.owner_id !== currentMetadata.owner_id) return res.status(409).json({ error: 'Video lifecycle changed; retry' });
        if (!canManageBoulderMedia(req)) return res.status(403).json({ error: 'Setter or admin role required' });
        if (job.status !== 'completed') return res.status(409).json({ error: 'Video is still processing' });
        for (const quality of QUALITIES) { const file = inside(dir, `${match[1]}_${quality.suffix}.mp4`); if ((await fs.lstat(file).catch(() => null))?.isFile()) { await fs.unlink(file); deleted.push(path.basename(file)); } }
        await fs.unlink(marker); await fs.unlink(inside(dir, `.${match[1]}.claim.json`)).catch(() => {});
        job.status = 'deleted'; job.deleted_at = new Date().toISOString(); await queue.save(job);
        return res.json({ status: 'deleted', files: deleted, legacy: false });
      });
      legacy = true;
      for (const quality of QUALITIES) { const file = inside(dir, `${match[1]}_${quality.suffix}.mp4`); if ((await fs.lstat(file).catch(() => null))?.isFile()) { await fs.unlink(file); deleted.push(path.basename(file)); } }
      if (!metadata) for (const entry of await fs.readdir(dir)) if (entry.startsWith(`${match[1]}.orig.`)) { const file = inside(dir, entry); if ((await fs.lstat(file)).isFile()) { await fs.unlink(file); deleted.push(entry); } }
    } else {
      const metadataFile = inside(dir, `.${name}.owner.json`); const metadata = await readManagedJson(finalDir, metadataFile); if (!canManageBoulderMedia(req)) return res.status(403).json({ error: 'Setter or admin role required' }); legacy = !metadata; await fs.unlink(target); await fs.unlink(metadataFile).catch(() => {}); deleted.push(name);
    }
    res.json({ status: 'deleted', files: deleted, legacy });
  });

  app.get('/list-videos.php', async (_req, res) => {
    const urls = []; for (const sector of await fs.readdir(finalDir, { withFileTypes: true }).catch(() => [])) { if (!sector.isDirectory() || sector.isSymbolicLink() || !SAFE_SEGMENT.test(sector.name)) continue; const dir = inside(finalDir, sector.name); for (const entry of await fs.readdir(dir, { withFileTypes: true })) { if (!entry.isFile() || entry.isSymbolicLink() || !/\.(mp4|mov|webm|jpg|jpeg|png|webp|gif)$/i.test(entry.name) || /\.orig\.|\.tmp\.|\.partial$/i.test(entry.name) || entry.name.startsWith('.')) continue; const rendition = entry.name.match(/^(.*)_(hd|sd|low)\.mp4$/); if (rendition && !await fs.stat(inside(dir, `.${rendition[1]}.ready.json`)).then(() => true).catch(() => false) && await queue.findByFamily(sector.name, rendition[1])) continue; urls.push(publicUrl(sector.name, entry.name)); } } res.json(urls);
  });
  app.get('/videos/*', async (req, res) => {
    const relative = String(req.params[0] || ''); const parts = relative.split('/'); if (parts.length !== 2 || !SAFE_SEGMENT.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1]) || parts[1].startsWith('.') || /\.orig\.|\.tmp\.|\.partial$/i.test(parts[1])) return res.sendStatus(404);
    const file = inside(finalDir, ...parts); try { await assertNoSymlinkAncestors(finalDir, file, { allowMissing: false }); } catch { return res.sendStatus(404); }
    const match = parts[1].match(/^(.*)_(hd|sd|low)\.mp4$/); let immutable = false;
    if (match) { const dir = path.dirname(file); let marker; try { marker = await readManagedJson(finalDir, inside(dir, `.${match[1]}.ready.json`)); } catch { return res.sendStatus(404); } if (marker) immutable = (await Promise.all(QUALITIES.map((quality) => fs.lstat(inside(dir, `${match[1]}_${quality.suffix}.mp4`)).then((s) => s.isFile() && !s.isSymbolicLink()).catch(() => false)))).every(Boolean); else if (await queue.findByFamily(parts[0], match[1])) { res.set('Cache-Control', 'no-store'); return res.sendStatus(404); } if (marker && !immutable) { res.set('Cache-Control', 'no-store'); return res.sendStatus(404); } }
    res.set('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-store'); res.set('Access-Control-Allow-Origin', '*'); res.sendFile(file);
  });
  app.get('/health', async (_req, res) => { const stats = await fs.statfs(config.dataDir); const queueDepth = queue.depth(); const queueCapacity = queue.capacity(); res.json({ ok: true, queue: queueDepth, queue_capacity: queueCapacity, queue_details: { depth: queueDepth, capacity: queueCapacity }, uploads: { multipart_active: multipartActive, multipart_capacity: config.maxMultipartConcurrency, sessions_per_user_capacity: config.maxActiveSessionsPerUser }, storage: { managed_bytes: await managedBytes(config.dataDir), quota_bytes: config.maxDataBytes, available_bytes: Number(stats.bavail) * Number(stats.bsize), required_headroom_bytes: config.minFreeBytes, max_upload_bytes: config.maxUploadBytes } }); });
  app.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Chunk exceeds maximum size' });
    next(error);
  });

  async function cleanup() { const cutoff = Date.now() - config.tempSessionMaxAgeMs; for (const entry of await fs.readdir(tempDir, { withFileTypes: true }).catch(() => [])) { if (!entry.isDirectory() || entry.isSymbolicLink() || !SESSION_ID.test(entry.name)) continue; await sessionLocks.run(entry.name, async () => { const dir = inside(tempDir, entry.name); const manifest = await loadManifest(entry.name); const activeJob = manifest?.job_id ? await queue.get(manifest.job_id) : await queue.findBySession(entry.name, { schedule: false }); if (activeJob && ['reserved', 'queued', 'processing'].includes(activeJob.status)) return; if ((await fs.stat(dir)).mtimeMs < cutoff) await fs.rm(dir, { recursive: true, force: true }); }); } }
  for (const job of await queue.list()) if (['reserved', 'queued', 'processing'].includes(job.status) && job.declared_size) diskReservations.set(job.job_id, job.declared_size * 4);
  await queue.recover(); await cleanup(); const timer = setInterval(cleanup, 6 * 60 * 60 * 1000); timer.unref();
  return { app, queue, config, close: () => clearInterval(timer) };
}

async function main() { const { app, config } = await createApp(); app.listen(config.port, () => console.log(`[server] listening on :${config.port}`)); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error('Fatal startup error:', error); process.exit(1); });
