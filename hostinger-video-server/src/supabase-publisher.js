const BOULDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLISHABLE_STATES = new Set(['queued', 'processing', 'completed', 'failed']);

function errorCode(error) {
  const status = Number(error?.status);
  if (Number.isInteger(status)) return `HTTP_${status}`;
  if (error?.name === 'AbortError') return 'TIMEOUT';
  return 'NETWORK_ERROR';
}

/** Durable, deliberately narrow Supabase RPC publisher for async boulder videos. */
export class SupabasePublisher {
  constructor({ queue, supabaseUrl, serviceRoleKey, readyMarkerExists = async () => true, fetchFn = globalThis.fetch, now = () => Date.now(), retryBaseMs = 1_000, retryMaxMs = 60_000, retryIntervalMs = 5_000, requestTimeoutMs = 10_000 } = {}) {
    this.queue = queue; this.supabaseUrl = String(supabaseUrl || '').replace(/\/+$/, ''); this.serviceRoleKey = serviceRoleKey;
    this.readyMarkerExists = readyMarkerExists; this.fetch = fetchFn; this.now = now; this.retryBaseMs = retryBaseMs; this.retryMaxMs = retryMaxMs; this.retryIntervalMs = retryIntervalMs; this.requestTimeoutMs = requestTimeoutMs; this.timer = null;
  }
  get enabled() { return Boolean(this.supabaseUrl && this.serviceRoleKey && this.fetch); }
  isAsyncJob(job) { return Boolean(job?.boulder_id && BOULDER_ID.test(job.boulder_id) && job.session_id && PUBLISHABLE_STATES.has(job.status)); }
  async start() { if (!this.enabled || this.timer) return; await this.recover(); this.timer = setInterval(() => { void this.recover(); }, this.retryIntervalMs); this.timer.unref?.(); }
  close() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  async schedule(job) {
    if (!this.enabled || !this.isAsyncJob(job)) return;
    await this.queue.withJobLock(job.job_id, async () => {
      const fresh = await this.queue.get(job.job_id); if (!fresh || !this.isAsyncJob(fresh)) return;
      fresh.published_target_status = job.status;
      if (!fresh.published_next_retry_at) fresh.published_next_retry_at = new Date(this.now()).toISOString();
      fresh.published_attempts ||= 0; await this.queue.save(fresh);
    });
    void this.publish(job.job_id, { force: true, targetStatus: job.status }).catch(() => undefined);
  }
  async recover() { if (!this.enabled) return; for (const job of await this.queue.list()) if (this.isAsyncJob(job)) void this.publish(job.job_id).catch(() => undefined); }
  async publish(jobId, { force = false, targetStatus = null } = {}) {
    if (!this.enabled) return false;
    return this.queue.withJobLock(jobId, async () => {
      const job = await this.queue.get(jobId);
      const requestedTarget = targetStatus || job?.published_target_status || job?.status;
      const target = requestedTarget === 'queued' && job?.status !== 'queued' ? job.status : requestedTarget;
      if (!this.isAsyncJob(job) || !PUBLISHABLE_STATES.has(target) || job.published_status === target) return true;
      const next = Date.parse(job.published_next_retry_at || ''); if (!force && Number.isFinite(next) && next > this.now()) return false;
      if (target === 'completed' && !await this.readyMarkerExists(job)) {
        await this.recordFailure(job, 'READY_MARKER_MISSING'); return false;
      }
      const body = {
        p_boulder_id: job.boulder_id,
        p_upload_session_id: job.session_id,
        p_job_id: job.job_id,
        p_status: target,
        p_hd_url: target === 'completed' ? job.urls?.hd || null : null,
        p_sd_url: target === 'completed' ? job.urls?.sd || null : null,
        p_low_url: target === 'completed' ? job.urls?.low || null : null,
        p_error: target === 'failed' ? String(job.error || 'TRANSCODE_FAILED').slice(0, 120) : null,
      };
      const requestController = new AbortController();
      const requestTimeout = setTimeout(() => requestController.abort(), this.requestTimeoutMs);
      try {
        const response = await this.fetch(`${this.supabaseUrl}/rest/v1/rpc/sync_boulder_video_job`, { method: 'POST', headers: { apikey: this.serviceRoleKey, authorization: `Bearer ${this.serviceRoleKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: requestController.signal });
        if (!response?.ok) { const error = new Error('Supabase RPC failed'); error.status = response?.status; throw error; }
        job.published_status = target; job.published_target_status = job.status === target ? null : job.status; job.published_attempts = 0; job.published_next_retry_at = null; job.published_error_code = null; await this.queue.save(job); return true;
      } catch (error) { await this.recordFailure(job, errorCode(error)); return false; }
      finally { clearTimeout(requestTimeout); }
    });
  }
  async recordFailure(job, code) {
    const attempts = Number(job.published_attempts || 0) + 1; const delay = Math.min(this.retryMaxMs, this.retryBaseMs * (2 ** Math.min(attempts - 1, 16)));
    job.published_attempts = attempts; job.published_error_code = code; job.published_next_retry_at = new Date(this.now() + delay).toISOString(); await this.queue.save(job);
  }
}
