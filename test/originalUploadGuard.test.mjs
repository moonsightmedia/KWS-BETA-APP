import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

let source = await readFile(new URL('../src/utils/resumableUpload.ts', import.meta.url), 'utf8');
source = source.replace(/^import .* from .*;\r?\n/gm, '');
source = `const Filesystem = {}; const Capacitor = { getPlatform: () => 'web' }; class SessionAccountChangedError extends Error {} class SessionRequiredError extends Error {}\n` + source;
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { resumableUpload } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const file = new File(['fixture'], 'source.mp4', { type: 'video/mp4' });
const options = { sessionId: 'fixture-session', sourceProvenance: 'selected-video-lossless' };

test('original uploads fail before sending bytes if the server cannot guarantee archival and SDR playback', async () => {
  for (const capabilities of [{}, { private_silent_originals: true }, { sdr_playback: true }]) {
    let requests = 0;
    await assert.rejects(resumableUpload(file, 'https://fixture.invalid', { ...options, fetch: async url => {
      requests++; assert.ok(url.endsWith('/health')); return Response.json({ capabilities, storage: { max_upload_bytes: 1e6 } });
    } }), /Videosicherung/);
    assert.equal(requests, 1);
  }
});
test('oversized originals are rejected before chunks rather than being silently compressed', async () => {
  await assert.rejects(resumableUpload(file, 'https://fixture.invalid', { ...options, fetch: async () => Response.json({ capabilities: { private_silent_originals: true, sdr_playback: true }, storage: { max_upload_bytes: 1 } }) }), /zu groß/);
});
