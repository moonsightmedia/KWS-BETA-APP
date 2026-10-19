import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

let platform = 'ios';
let encode, strip, compress;
let deleted = [];
globalThis.__silentNative = {
  Capacitor: { isNativePlatform: () => true, getPlatform: () => platform },
  UploadMasterEncoder: { encode: o => encode(o), stripAudio: o => strip(o), cancel: async () => {}, deleteFile: async o => deleted.push(o.path) },
  SilentVideo: { stripAudio: o => strip(o) },
  VideoCompressor: { compressVideo: o => compress(o), deleteFile: async o => deleted.push(o.path) },
  warn: () => {},
};
let source = await readFile(new URL('../src/utils/nativeVideoUpload.ts', import.meta.url), 'utf8');
source = source.replace(/^import .* from .*;\r?\n/gm, '')
  .replaceAll("import.meta.env", '({})').replaceAll('console.warn', 'globalThis.__silentNative.warn');
source = "const backendConfig = {}; const { Capacitor, UploadMasterEncoder, SilentVideo, VideoCompressor } = globalThis.__silentNative; const isNativeVideoUploadFile = f => f.kind === 'native-video';\n" + source;
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { prepareVideoFileForChunkedUpload } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const input = { kind: 'native-video', path: '/gallery/source.mov', name: 'source.mov', size: 10_000_000, mimeType: 'video/quicktime', cached: false };
const silent = { path: '/cache/silent.mp4', fileSize: 9_000_000, audioTrackCount: 0, skipped: false };
function reset(p) { platform = p; deleted = []; encode = async () => { throw new Error('encoder unavailable'); }; compress = async () => { throw new Error('compressor unavailable'); }; strip = async () => silent; }

for (const p of ['ios', 'android']) {
  test(`${p}: failed compression remuxes the original without uploading its audio`, async () => {
    reset(p);
    const result = await prepareVideoFileForChunkedUpload(input);
    assert.equal(result.path, '/cache/silent.mp4'); assert.equal(result.fileSize, 9_000_000);
    assert.equal(result.fileName, 'source.mp4'); assert.equal(result.mimeType, 'video/mp4');
    await result.cleanup(); assert.deepEqual(deleted, ['/cache/silent.mp4']);
  });
  test(`${p}: failed silence validation rejects instead of returning the original`, async () => {
    reset(p); strip = async () => ({ ...silent, audioTrackCount: 1 });
    await assert.rejects(prepareVideoFileForChunkedUpload(input), /validation failed/);
    assert.deepEqual(deleted, ['/cache/silent.mp4']);
  });
}
test('iOS skips only a verified silent source', async () => {
  reset('ios'); encode = async () => ({ skipped: true, audioTrackCount: 1 });
  let remuxes = 0; strip = async () => { remuxes++; return silent; };
  const result = await prepareVideoFileForChunkedUpload(input);
  assert.equal(result.path, '/cache/silent.mp4'); assert.equal(remuxes, 1);
});
test('Android compressed output is stripped before it can be returned', async () => {
  reset('android'); compress = async () => ({ outputPath: '/cache/encoded.mp4', compressedSize: 5_000_000 });
  strip = async o => { assert.equal(o.inputPath, '/cache/encoded.mp4'); return silent; };
  const result = await prepareVideoFileForChunkedUpload(input);
  assert.equal(result.path, silent.path); assert.deepEqual(deleted, ['/cache/encoded.mp4']);
});
test('aborting after silent preparation cleans temporary files but never gallery media', async () => {
  reset('android'); const controller = new AbortController();
  compress = async () => ({ outputPath: '/cache/encoded.mp4', compressedSize: 5_000_000 });
  strip = async () => { controller.abort(); return silent; };
  await assert.rejects(prepareVideoFileForChunkedUpload(input, undefined, controller.signal), e => e.name === 'AbortError');
  assert.deepEqual(deleted.sort(), ['/cache/encoded.mp4', '/cache/silent.mp4']);
});
