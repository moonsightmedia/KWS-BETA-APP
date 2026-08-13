import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabasePublisher } from '../src/supabase-publisher.js';

function fakeQueue(job) {
  return { job, saves: 0, async get() { return this.job; }, async list() { return [this.job]; }, async save(next) { this.job = { ...next }; this.saves++; }, async withJobLock(_id, work) { return work(); } };
}

test('publisher retries durably, recovers after restart, and is idempotent', async () => {
  const job = { job_id: '11111111-1111-4111-8111-111111111111', boulder_id: '22222222-2222-4222-8222-222222222222', session_id: '55555555-5555-4555-8555-555555555555', status: 'queued', urls: { hd: 'https://video/hd' } }; const queue = fakeQueue(job); let now = 1_000; let calls = 0;
  const fetchFn = async () => { calls++; return calls === 1 ? { ok: false, status: 503 } : { ok: true }; };
  const first = new SupabasePublisher({ queue, supabaseUrl: 'https://supabase.example', serviceRoleKey: 'not-logged', fetchFn, now: () => now, retryBaseMs: 100, retryMaxMs: 100 });
  assert.equal(await first.publish(job.job_id, { force: true }), false); assert.equal(queue.job.published_attempts, 1); assert.equal(queue.job.published_error_code, 'HTTP_503');
  now += 100; const restarted = new SupabasePublisher({ queue, supabaseUrl: 'https://supabase.example', serviceRoleKey: 'not-logged', fetchFn, now: () => now }); await restarted.recover(); await new Promise((resolve) => setTimeout(resolve, 0)); assert.equal(queue.job.published_status, 'queued'); assert.equal(calls, 2); await restarted.publish(job.job_id); assert.equal(calls, 2);
});

test('publisher never publishes completed before the ready marker exists', async () => {
  const job = { job_id: '33333333-3333-4333-8333-333333333333', boulder_id: '44444444-4444-4444-8444-444444444444', session_id: '66666666-6666-4666-8666-666666666666', status: 'completed', urls: { hd: 'https://video/hd' } }; const queue = fakeQueue(job); let calls = 0;
  const publisher = new SupabasePublisher({ queue, supabaseUrl: 'https://supabase.example', serviceRoleKey: 'not-logged', fetchFn: async () => { calls++; return { ok: true }; }, readyMarkerExists: async () => false, now: () => 1_000 });
  assert.equal(await publisher.publish(job.job_id, { force: true }), false); assert.equal(calls, 0); assert.equal(queue.job.published_error_code, 'READY_MARKER_MISSING');
});

test('publisher sends the exact PostgREST RPC parameter contract', async () => {
  const job = {
    job_id: '77777777-7777-4777-8777-777777777777',
    boulder_id: '88888888-8888-4888-8888-888888888888',
    session_id: '99999999-9999-4999-8999-999999999999',
    status: 'completed',
    urls: {
      hd: 'https://video.kletterwelt-sauerland.de/videos/sector/family_hd.mp4',
      sd: 'https://video.kletterwelt-sauerland.de/videos/sector/family_sd.mp4',
      low: 'https://video.kletterwelt-sauerland.de/videos/sector/family_low.mp4',
    },
  };
  const queue = fakeQueue(job); let requestBody;
  const publisher = new SupabasePublisher({
    queue, supabaseUrl: 'https://supabase.example', serviceRoleKey: 'not-logged',
    fetchFn: async (_url, init) => { requestBody = JSON.parse(init.body); return { ok: true }; },
  });
  assert.equal(await publisher.publish(job.job_id, { force: true }), true);
  assert.deepEqual(requestBody, {
    p_boulder_id: job.boulder_id,
    p_upload_session_id: job.session_id,
    p_job_id: job.job_id,
    p_status: 'completed',
    p_hd_url: job.urls.hd,
    p_sd_url: job.urls.sd,
    p_low_url: job.urls.low,
    p_error: null,
  });
});

test('a processing transition supersedes queued publication durably', async () => {
  const job = {
    job_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    boulder_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    status: 'queued', urls: { hd: 'https://video/hd' },
  };
  const queue = fakeQueue(job); const states = [];
  const publisher = new SupabasePublisher({
    queue, supabaseUrl: 'https://supabase.example', serviceRoleKey: 'not-logged',
    fetchFn: async (_url, init) => { states.push(JSON.parse(init.body).p_status); return { ok: true }; },
  });
  await publisher.schedule(job);
  await new Promise((resolve) => setTimeout(resolve, 0));
  queue.job.status = 'processing';
  await publisher.schedule(queue.job);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(states, ['queued', 'processing']);
  assert.equal(queue.job.published_status, 'processing');
});
