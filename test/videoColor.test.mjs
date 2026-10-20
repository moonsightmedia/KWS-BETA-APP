import test from 'node:test';
import assert from 'node:assert/strict';
import { hdrToSdrFilter, isHdrVideo } from '../hostinger-video-server/src/video-color.js';

test('ordinary and untagged SDR are not mistaken for HDR', () => {
  for (const stream of [{}, { color_transfer: 'bt709' }, { color_transfer: 'iec61966-2-1' }]) {
    assert.equal(isHdrVideo(stream), false);
    assert.equal(hdrToSdrFilter(stream), null);
  }
});

test('both common HDR transfer functions require pixel conversion', () => {
  for (const color_transfer of ['smpte2084', 'arib-std-b67']) {
    const stream = { color_transfer, color_space: 'bt2020nc', color_primaries: 'bt2020', color_range: 'tv' };
    assert.equal(isHdrVideo(stream), true);
    assert.ok(hdrToSdrFilter(stream));
  }
});

test('Dolby Vision with no compatible HDR base layer fails instead of being mislabeled SDR', () => {
  const side_data_list = [{ side_data_type: 'DOVI configuration record', dv_profile: 5 }];
  assert.equal(isHdrVideo({ side_data_list }), true);
  assert.throws(() => hdrToSdrFilter({ side_data_list }), /Unsupported HDR/);
  assert.throws(() => hdrToSdrFilter({ color_transfer: 'smpte2084', side_data_list }), /Unsupported HDR/);
  assert.ok(hdrToSdrFilter({ color_transfer: 'arib-std-b67', side_data_list: [{ side_data_type: 'DOVI configuration record', dv_profile: 8 }] }));
});

test('ambiguous HDR mastering metadata cannot enter the unmodified SDR path', () => {
  const stream = { side_data_list: [{ side_data_type: 'Mastering display metadata' }] };
  assert.equal(isHdrVideo(stream), true);
  assert.throws(() => hdrToSdrFilter(stream), /Unsupported HDR/);
});
