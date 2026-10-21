import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyThumbnailServices } from '../scripts/verify-thumbnail-service.mjs';

const ready = environment => ({ ok: true, local_only: false, environment, provider: 'CPUExecutionProvider', model_revision: 'e4668c026bd3743c6011cc5453dbe32d4d67cadf', version: 'sam-number-cards-3.2' });
test('native release requires both exact backend identities without redirects', async () => {
  const calls = [];
  await verifyThumbnailServices(async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'error');
    return Response.json(ready(url.includes('review-api') ? 'review' : 'production'));
  });
  assert.deepEqual(calls, ['https://beta-api.kletterwelt-sauerland.de/thumbnail-focus/api/health', 'https://review-api.kletterwelt-sauerland.de/thumbnail-focus/api/health']);
});
test('an unavailable review service stops the release', async () => {
  await assert.rejects(verifyThumbnailServices(async url => url.includes('review-api') ? new Response('', { status: 503 }) : Response.json(ready('production'))));
});
test('wrong environment, local bypass, provider and model never enable a release', async () => {
  for (const mismatch of [{ environment: 'review' }, { local_only: true }, { provider: 'CUDAExecutionProvider' }, { model_revision: 'different' }, { version: 'different' }]) {
    await assert.rejects(verifyThumbnailServices(async () => Response.json({ ...ready('production'), ...mismatch })));
  }
});
