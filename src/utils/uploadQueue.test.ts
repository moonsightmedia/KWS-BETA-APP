import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  areUploadSessionsFinished,
  canStartUploadSlot,
  getProcessingCount,
  isTerminalUploadStatus,
} from './uploadQueue.ts';

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

describe('uploadQueue session completion', () => {
  it('treats completed/failed/error/cancelled/restoring as terminal', () => {
    for (const status of ['completed', 'failed', 'error', 'cancelled', 'restoring']) {
      assert.equal(isTerminalUploadStatus(status), true);
    }
    assert.equal(isTerminalUploadStatus('compressing'), false);
    assert.equal(isTerminalUploadStatus('pending'), false);
  });

  it('waits until every session id is present and terminal', () => {
    const sessions = [
      { sessionId: 'a', status: 'completed' },
      { sessionId: 'b', status: 'compressing' },
    ];
    assert.equal(areUploadSessionsFinished(sessions, ['a', 'b']), false);

    sessions[1].status = 'completed';
    assert.equal(areUploadSessionsFinished(sessions, ['a', 'b']), true);
  });

  it('is not finished when a session id is missing', () => {
    assert.equal(
      areUploadSessionsFinished([{ sessionId: 'a', status: 'completed' }], ['a', 'b']),
      false,
    );
  });
});
