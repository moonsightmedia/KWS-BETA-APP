import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function verifyThumbnailServices(fetcher = fetch) {
  for (const [environment, origin] of [['production', 'https://beta-api.kletterwelt-sauerland.de'], ['review', 'https://review-api.kletterwelt-sauerland.de']]) {
    const response = await fetcher(`${origin}/thumbnail-focus/api/health`, { redirect: 'error', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${environment} thumbnail service is unavailable`);
    const ready = await response.json();
    assert(ready.ok === true && ready.local_only === false && ready.environment === environment, `${environment} thumbnail identity mismatch`);
    assert(ready.provider === 'CPUExecutionProvider' && ready.model_revision === 'e4668c026bd3743c6011cc5453dbe32d4d67cadf' && ready.version === 'sam-number-cards-3.2', `${environment} thumbnail model mismatch`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await verifyThumbnailServices();
  console.log('THUMBNAIL_PRODUCTION_AND_REVIEW_READY');
}
