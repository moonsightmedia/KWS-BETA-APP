import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const output = path.resolve(process.argv[2] || 'output/media-inventory');
const ffprobe = process.env.FFPROBE || 'ffprobe';
const base = 'https://beta-api.kletterwelt-sauerland.de';
const videoOrigin = 'https://video.kletterwelt-sauerland.de';
const config = Object.fromEntries((process.env.TASK_KWS_CONFIG || '').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]+)=(.*)$/); return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]] : [];
}));
delete process.env.TASK_KWS_CONFIG;
if (config.SUPABASE_PUBLIC_URL?.replace(/\/$/, '') !== base) throw new Error('Wrong production target');
const headers = { apikey: config.SERVICE_ROLE_KEY, Authorization: `Bearer ${config.SERVICE_ROLE_KEY}` };
await mkdir(output, { recursive: true });
const boulders = [];
for (let offset = 0; ; offset += 500) {
  const response = await fetch(`${base}/rest/v1/boulders?select=id,name,status,sector_id,beta_video_url,beta_video_urls,beta_video_status,beta_video_job_id,beta_video_upload_session_id&order=id&limit=500&offset=${offset}`, { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  const rows = await response.json(); boulders.push(...rows); if (rows.length < 500) break;
}
const urls = new Map();
for (const boulder of boulders) {
  const variants = typeof boulder.beta_video_urls === 'string' ? JSON.parse(boulder.beta_video_urls) : boulder.beta_video_urls || {};
  for (const [quality, url] of Object.entries({ legacy: boulder.beta_video_url, ...variants })) {
    if (typeof url !== 'string' || !url) continue;
    const refs = urls.get(url) || []; refs.push({ boulderId: boulder.id, quality }); urls.set(url, refs);
  }
}
const manifest = { checkedAt: new Date().toISOString(), target: base, boulders, media: [] };
await writeFile(path.join(output, 'catalog-before.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
function probe(url) {
  return new Promise(resolve => {
    const child = spawn(ffprobe, ['-v', 'error', '-rw_timeout', '15000000', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,r_frame_rate,bit_rate:stream_side_data:format=duration,size', '-of', 'json', url], { windowsHide: true });
    let stdout = ''; let stderr = ''; const timer = setTimeout(() => child.kill(), 25000);
    child.stdout.on('data', data => stdout += data); child.stderr.on('data', data => stderr += data);
    child.on('error', () => { clearTimeout(timer); resolve({ error: 'probe-start-failed' }); });
    child.on('close', code => { clearTimeout(timer); if (code !== 0) return resolve({ error: 'probe-failed' }); try { resolve(JSON.parse(stdout)); } catch { resolve({ error: 'probe-invalid-json' }); } });
  });
}
const pending = [...urls.entries()]; let completed = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (pending.length) {
    const [url, references] = pending.shift(); let data;
    const parsed = new URL(url);
    if (parsed.origin !== videoOrigin || !parsed.pathname.startsWith('/videos/')) data = { error: 'external-media-review-required' };
    else data = await probe(url);
    const video = data.streams?.find(stream => stream.codec_type === 'video');
    const hdr = Boolean(video && (['smpte2084', 'arib-std-b67'].includes(video.color_transfer) || video.side_data_list?.some(item => /DOVI|Dolby Vision|Mastering display|Content light/i.test(item.side_data_type || ''))));
    manifest.media.push({ url, references, hdr, audioTracks: data.streams?.filter(stream => stream.codec_type === 'audio').length ?? null, ...data });
    completed++; if (completed % 30 === 0) console.log(JSON.stringify({ probed: completed, total: urls.size }));
  }
}));
manifest.media.sort((a, b) => a.url.localeCompare(b.url));
manifest.summary = { boulders: boulders.length, bouldersWithVideo: boulders.filter(b => b.beta_video_url || Object.keys(b.beta_video_urls || {}).length).length, videoUrls: urls.size, hdrUrls: manifest.media.filter(m => m.hdr).length, hdrBoulders: new Set(manifest.media.filter(m => m.hdr).flatMap(m => m.references.map(r => r.boulderId))).size, audioUrls: manifest.media.filter(m => m.audioTracks > 0).length, unresolvedUrls: manifest.media.filter(m => m.error).length };
await writeFile(path.join(output, 'inventory.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest.summary, null, 2));
