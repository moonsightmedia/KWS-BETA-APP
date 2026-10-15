import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/boulderPublication.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { publishBoulderWithoutVideo } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const options = { url: 'https://fixture.invalid', publicKey: 'fixture', accessToken: 'fixture', boulderId: 'b-1' };
test('publish only thumbnail-complete pending row without a video or job', async () => {
  let calls = 0;
  await publishBoulderWithoutVideo({ ...options, fetch: async (url, init) => {
    calls++;
    const params = new URL(url).searchParams;
    assert.equal(params.get('id'), 'eq.b-1');
    for (const field of ['beta_video_url', 'beta_video_urls', 'beta_video_job_id', 'beta_video_upload_session_id']) assert.equal(params.get(field), 'is.null');
    assert.equal(params.get('thumbnail_url'), 'not.is.null');
    assert.equal(params.get('beta_video_status'), 'in.(uploading,failed)');
    assert.equal(init.method, 'PATCH');
    assert.deepEqual(JSON.parse(init.body), { beta_video_status: 'none' });
    assert.equal(init.headers.Prefer, 'return=representation');
    return new Response(JSON.stringify([{ id: 'b-1', thumbnail_url: '/photo.png', beta_video_status: 'none' }]));
  } });
  assert.equal(calls, 1);
});
for (const [name, rows] of [
  ['unconfirmed write', []],
  ['wrong row', [{ id: 'b-2', thumbnail_url: '/photo.png', beta_video_status: 'none' }]],
  ['missing photo', [{ id: 'b-1', beta_video_status: 'none' }]],
  ['processing video', [{ id: 'b-1', thumbnail_url: '/photo.png', beta_video_status: 'processing' }]],
  ['real video', [{ id: 'b-1', thumbnail_url: '/photo.png', beta_video_status: 'none', beta_video_url: '/video.mp4' }]],
  ['real rendition', [{ id: 'b-1', thumbnail_url: '/photo.png', beta_video_status: 'none', beta_video_urls: { hd: '/video.mp4' } }]],
  ['processing job', [{ id: 'b-1', thumbnail_url: '/photo.png', beta_video_status: 'none', beta_video_job_id: 'job-1' }]],
  ['active session', [{ id: 'b-1', thumbnail_url: '/photo.png', beta_video_status: 'none', beta_video_upload_session_id: 'session-1' }]],
]) test(name, async () => {
  await assert.rejects(publishBoulderWithoutVideo({ ...options, fetch: async () => new Response(JSON.stringify(rows)) }), /nicht bestätigt/);
});
test('HTTP failure is never retried', async () => {
  let calls = 0;
  await assert.rejects(publishBoulderWithoutVideo({ ...options, fetch: async () => { calls++; return new Response('', { status: 403 }); } }), /nicht veröffentlicht/);
  assert.equal(calls, 1);
});
