import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs, createReadStream, constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { assertNoSymlinkAncestors, inside, readManagedJson } from './path-safety.js';

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true }); let stdout = '', stderr = '';
    child.stdout.on('data', data => stdout += data); child.stderr.on('data', data => { stderr = (stderr + data).slice(-2000); });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`Archive processing failed (${code}): ${stderr.slice(-300)}`)));
  });
}
async function digest(file) { const hash = crypto.createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex'); }
async function inspect(file, ffprobe) {
  return JSON.parse(await run(ffprobe, ['-v', 'error', '-show_entries', 'format=format_name,duration:stream=codec_type,codec_name,width,height,r_frame_rate,color_transfer,color_space,color_primaries', '-of', 'json', file]));
}
function oneVideo(info) { const streams = info.streams?.filter(stream => stream.codec_type === 'video'); if (streams?.length !== 1) throw new Error('Archive requires one video stream'); return streams[0]; }
async function videoHash(file, ffmpeg) { return (await run(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-'])).trim(); }
async function durableRename(partial, target) {
  const handle = await fs.open(partial, 'r+'); try { await handle.sync(); } finally { await handle.close(); }
  await fs.rename(partial, target); await fs.chmod(target, 0o600);
}

/** Private video-only source. No resizing, tone mapping or lossy encoding. */
export async function archiveOriginal({ root, job, input, ffmpeg = 'ffmpeg', ffprobe = 'ffprobe' }) {
  if (!JOB_ID.test(job.job_id)) throw new Error('Invalid archive job ID');
  const dir = inside(root, job.job_id); await assertNoSymlinkAncestors(root, dir);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 }); await fs.chmod(dir, 0o700);
  const metadataPath = inside(dir, 'original.json');
  const existing = await readManagedJson(root, metadataPath);
  if (existing) {
    if (existing.input_sha256 !== await digest(input)) throw new Error('Original source changed for existing job');
    return verifyOriginal({ root, job, ffprobe });
  }
  const info = await inspect(input, ffprobe); const video = oneVideo(info);
  const audio = info.streams.some(stream => stream.codec_type === 'audio');
  const format = String(info.format?.format_name || '');
  const originalExt = /^[a-z0-9]{1,12}$/i.test(job.original_ext || '') ? job.original_ext.toLowerCase() : 'mp4';
  const ext = audio ? (['h264', 'hevc', 'av1', 'vp9'].includes(video.codec_name) ? 'mp4' : 'mkv') : originalExt;
  const fileName = `source.${ext}`; const target = inside(dir, fileName); const partial = inside(dir, `.${fileName}.partial`);
  await assertNoSymlinkAncestors(root, target); await assertNoSymlinkAncestors(root, partial);
  if (await fs.lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) {
    // A crash after the source rename but before metadata must not change it.
    const prior = await inspect(target, ffprobe); const priorVideo = oneVideo(prior);
    if (prior.streams.some(s => s.codec_type === 'audio') || priorVideo.width !== video.width || priorVideo.height !== video.height || await videoHash(target, ffmpeg) !== await videoHash(input, ffmpeg)) throw new Error('Incomplete archive differs from original');
  } else {
    await fs.unlink(partial).catch(error => { if (error.code !== 'ENOENT') throw error; });
    if (!audio) await fs.copyFile(input, partial, constants.COPYFILE_EXCL);
    else await run(ffmpeg, ['-y', '-i', input, '-map', '0:v:0', '-c:v', 'copy', '-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1', ...(ext === 'mp4' ? ['-movflags', '+faststart'] : []), '-f', ext === 'mkv' ? 'matroska' : 'mp4', partial]);
    const archived = await inspect(partial, ffprobe); const archivedVideo = oneVideo(archived);
    if (archived.streams.some(s => s.codec_type === 'audio') || archivedVideo.codec_name !== video.codec_name || archivedVideo.width !== video.width || archivedVideo.height !== video.height || archivedVideo.color_transfer !== video.color_transfer) throw new Error('Archive changed source video properties');
    if (audio && await videoHash(partial, ffmpeg) !== await videoHash(input, ffmpeg)) throw new Error('Audio removal changed video packets');
    await durableRename(partial, target);
  }
  const stat = await fs.stat(target);
  const metadata = { version: 1, job_id: job.job_id, boulder_id: job.boulder_id || job.source_boulder_id || null, owner_id: job.owner_id || null, file: fileName, input_sha256: await digest(input), bytes: stat.size, sha256: await digest(target), audio_tracks: 0, video, source_format: format, provenance: job.source_provenance || 'upload', source_url: job.source_url || null, archived_at: new Date().toISOString() };
  const tempMeta = inside(dir, '.original.json.partial'); await assertNoSymlinkAncestors(root, tempMeta);
  await fs.writeFile(tempMeta, JSON.stringify(metadata, null, 2) + '\n', { mode: 0o600 }); await durableRename(tempMeta, metadataPath);
  return metadata;
}

export async function verifyOriginal({ root, job, ffprobe = 'ffprobe' }) {
  if (!JOB_ID.test(job.job_id)) throw new Error('Invalid archive job ID');
  const dir = inside(root, job.job_id); const metadata = await readManagedJson(root, inside(dir, 'original.json'));
  if (!metadata || metadata.job_id !== job.job_id || !/^source\.[a-z0-9]{1,12}$/.test(metadata.file || '')) throw new Error('Original archive missing or invalid');
  const file = inside(dir, metadata.file); await assertNoSymlinkAncestors(root, file, { allowMissing: false });
  const stat = await fs.lstat(file); if (!stat.isFile() || stat.size !== metadata.bytes || await digest(file) !== metadata.sha256) throw new Error('Original archive integrity check failed');
  const info = await inspect(file, ffprobe); oneVideo(info); if (info.streams.some(s => s.codec_type === 'audio')) throw new Error('Original archive contains audio');
  return metadata;
}

export async function originalFile({ root, job, ffprobe }) {
  const metadata = await verifyOriginal({ root, job, ffprobe }); return inside(root, job.job_id, metadata.file);
}
