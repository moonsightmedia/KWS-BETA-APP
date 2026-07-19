import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canStartUploadSlot, getProcessingCount } from './uploadQueue.ts';

describe('uploadQueue concurrency gate', () => {
  it('allows a start when nothing is processing', () => {
    assert.equal(canStartUploadSlot(0, 1), true);
  });

  it('blocks a second start while one slot is occupied (max 1)', () => {
    assert.equal(canStartUploadSlot(1, 1), false);
  });

  it('counts queued/compressing jobs via processing set size', () => {
    const processing = new Set(['video-a', 'thumb-b']);
    assert.equal(getProcessingCount(processing), 2);
    assert.equal(canStartUploadSlot(getProcessingCount(processing), 1), false);
  });

  it('allows the next job after the processing set is cleared', () => {
    const processing = new Set(['video-a']);
    processing.delete('video-a');
    assert.equal(getProcessingCount(processing), 0);
    assert.equal(canStartUploadSlot(getProcessingCount(processing), 1), true);
  });
});
