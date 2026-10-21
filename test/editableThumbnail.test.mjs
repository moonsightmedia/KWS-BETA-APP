import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveEditableThumbnail } from '../src/lib/editableThumbnailTransport.mjs';
const input = { boulderId: 'synthetic', expectedUrl: 'old', originalHash: 'a'.repeat(64), selection: { selected: ['hold'] }, color: 'Grün', color2: null, volumeOnly: false, sameFile: false };
function fixture() {
  const calls = [], receipt = {};
  const effects = { uploadOriginal: async () => { calls.push('original'); return 'original.jpg'; }, uploadThumbnail: async () => { calls.push('variant'); return 'variant.png'; }, commit: async body => { calls.push(body); } };
  return { calls, receipt, effects };
}
test('archive original before publishing; one transaction receives original, selection, color and expected variant', async () => {
  const f = fixture(); await saveEditableThumbnail(input, f.receipt, f.effects);
  assert.deepEqual(f.calls.slice(0, 2), ['original', 'variant']);
  assert.deepEqual(f.calls[2], { p_boulder_id: 'synthetic', p_expected_url: 'old', p_thumbnail_url: 'variant.png', p_original_url: 'original.jpg', p_original_sha256: input.originalHash, p_selection: input.selection, p_color: 'Grün', p_color_2: null, p_volume_only: false });
});
test('existing verified original needs only a new variant; original mode needs no variant upload', async () => {
  const a = fixture(); await saveEditableThumbnail({ ...input, sourceUrl: 'verified-original.jpg' }, a.receipt, a.effects);
  assert.equal(a.calls[0], 'variant'); assert.equal(a.calls[1].p_original_url, 'verified-original.jpg');
  const b = fixture(); await saveEditableThumbnail({ ...input, sameFile: true, selection: null }, b.receipt, b.effects);
  assert.equal(b.calls.length, 2); assert.equal(b.calls[1].p_thumbnail_url, 'original.jpg');
});
test('archive failure never publishes and variant failure retains the original receipt for retry', async () => {
  const a = fixture(); a.effects.uploadOriginal = async () => { throw Error('offline'); };
  await assert.rejects(saveEditableThumbnail(input, a.receipt, a.effects)); assert.deepEqual(a.calls, []);
  const b = fixture(); const upload = b.effects.uploadThumbnail; b.effects.uploadThumbnail = async () => { throw Error('offline'); };
  await assert.rejects(saveEditableThumbnail(input, b.receipt, b.effects)); b.effects.uploadThumbnail = upload;
  await saveEditableThumbnail(input, b.receipt, b.effects); assert.equal(b.calls.filter(c => c === 'original').length, 1);
});
test('lost commit response and conflict preserve the exact immutable upload receipt', async () => {
  const f = fixture(), commit = f.effects.commit;
  f.effects.commit = async () => { throw Error('response lost'); };
  await assert.rejects(saveEditableThumbnail(input, f.receipt, f.effects));
  f.effects.commit = commit; await saveEditableThumbnail(input, f.receipt, f.effects);
  assert.equal(f.calls.filter(c => c === 'original').length, 1); assert.equal(f.calls.filter(c => c === 'variant').length, 1);
  assert.equal(f.calls.at(-1).p_expected_url, 'old');
});
test('missing upload URLs never commit an empty image', async () => {
  const f = fixture(); f.effects.uploadOriginal = async () => undefined;
  await assert.rejects(saveEditableThumbnail(input, f.receipt, f.effects)); assert.deepEqual(f.calls, []);
});
