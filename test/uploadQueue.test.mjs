import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/uploadQueue.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
const queue = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('a completed thumbnail remains successful after UI pruning while video is still running', () => {
  const thumbnailSession = 'thumbnail-session';
  const videoSession = 'video-session';
  const visibleQueueAfterThumbnailPrune = [{ sessionId: videoSession, status: 'uploading' }];
  const rememberedTerminalStatuses = [{ sessionId: thumbnailSession, status: 'completed' }];

  // UploadContext merges remembered terminal state with the visible queue.
  assert.deepEqual(
    queue.getUploadSessionsWaitResult(
      [...visibleQueueAfterThumbnailPrune, ...rememberedTerminalStatuses],
      [thumbnailSession, videoSession],
    ),
    { state: 'pending' },
  );

  assert.deepEqual(
    queue.getUploadSessionsWaitResult(
      [
        ...visibleQueueAfterThumbnailPrune.map((session) => ({ ...session, status: 'completed' })),
        ...rememberedTerminalStatuses,
      ],
      [thumbnailSession, videoSession],
    ),
    { state: 'completed' },
  );
});

test('a terminal non-success session fails the batch wait', () => {
  assert.deepEqual(
    queue.getUploadSessionsWaitResult(
      [{ sessionId: 'video-session', status: 'failed' }],
      ['video-session'],
    ),
    { state: 'failed', sessionId: 'video-session', status: 'failed' },
  );
});

test('concurrent waiters defer TTL cleanup until the final waiter exits', () => {
  let now = 0;
  const registry = new queue.TerminalUploadRegistry(100, () => now);
  registry.record('shared-session', 'completed');
  registry.startWaiting(['shared-session']);
  registry.startWaiting(['shared-session']);

  now = 100;
  assert.deepEqual(registry.pruneExpired(), []);
  assert.equal(registry.has('shared-session'), true);

  registry.stopWaiting(['shared-session']);
  assert.deepEqual(registry.pruneExpired(), []);
  assert.equal(registry.has('shared-session'), true);

  registry.stopWaiting(['shared-session']);
  assert.deepEqual(registry.pruneExpired(), ['shared-session']);
  assert.equal(registry.has('shared-session'), false);
});

test('an unwatched terminal outcome expires after its retention TTL', () => {
  let now = 0;
  const registry = new queue.TerminalUploadRegistry(100, () => now);
  registry.record('cancelled-session', 'cancelled');

  now = 100;
  assert.deepEqual(registry.pruneExpired(), ['cancelled-session']);
  assert.equal(registry.has('cancelled-session'), false);
});
