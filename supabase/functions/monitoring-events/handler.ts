type Config = { supabaseUrl: string; anonKey: string; serviceKey: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const names = new Set(['first_open', 'session_start', 'app_ready', 'foreground', 'background', 'foreground_heartbeat', 'app_update_seen', 'screen_view', 'boulder_detail_view', 'play_requested', 'play_started', 'play_failed', 'play_completed', 'sector_open', 'filter_applied', 'search_used', 'signup_attempt', 'signup_failed', 'login_succeeded', 'login_failed', 'app_error', 'notification_opened', 'notification_client_received']);
const screens = new Set(['home', 'boulders', 'boulder', 'auth', 'profile', 'statistics', 'admin', 'other']);
const strings: Record<string, number> = { code: 80, message: 500, stack: 2000, component: 100, error_code: 80, source: 80, reason: 100 };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export function scrubMonitoringText(value: string, limit: number): string {
  return value.slice(0, 8000)
    .replace(/\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi, '[redacted]')
    .replace(/\b(?:Bearer\s+\S+|(?:password|passwd|token|secret|authorization|cookie|apikey|api_key|access_token|refresh_token)["']?\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,;&]+))/gi, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/https?:\/\/[^\s)\]>"']+/gi, '[url]')
    .replace(/[?&#][^\s)\]>"']+/g, '[query]')
    .replace(/\b[A-Z]:[\\/][^\s)\]>"']+/gi, '[local-path]')
    .replace(/\/(?:home|Users|private|var)\/[^\s)\]>"']+/g, '[local-path]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .slice(0, limit);
}

export function normalizeMonitoringEvent(value: unknown, now = Date.now()): Record<string, unknown> | null {
  if (!object(value) || !uuid.test(String(value.event_id)) || !uuid.test(String(value.installation_id)) || !uuid.test(String(value.session_id)) ||
      typeof value.name !== 'string' || !names.has(value.name) || !['web', 'android', 'ios'].includes(String(value.platform)) ||
      !['granted', 'denied'].includes(String(value.consent)) || (value.name !== 'app_error' && value.consent !== 'granted') ||
      typeof value.occurred_at !== 'string' || !Number.isFinite(Date.parse(value.occurred_at)) ||
      Date.parse(value.occurred_at) < now - 72 * 60 * 60 * 1000 || Date.parse(value.occurred_at) > now + 5 * 60 * 1000 ||
      typeof value.app_version !== 'string' || !/^[A-Za-z0-9._+-]{1,40}$/.test(value.app_version) ||
      typeof value.release !== 'string' || !/^[A-Za-z0-9@._+-]{1,120}$/.test(value.release) ||
      typeof value.channel !== 'string' || !['production', 'testflight', 'apk', 'development', 'test'].includes(value.channel) ||
      (value.boulder_id !== null && value.boulder_id !== undefined && !uuid.test(String(value.boulder_id))) ||
      (value.props !== undefined && !object(value.props))) return null;
  const props: Record<string, string | number> = {};
  for (const [key, entry] of Object.entries(value.props || {})) {
    if (key === 'screen' && typeof entry === 'string' && screens.has(entry)) props.screen = entry;
    else if (key === 'severity' && typeof entry === 'string' && ['info', 'warning', 'error', 'fatal'].includes(entry)) props.severity = entry;
    else if (['report_id', 'view_id', 'sector_id', 'notification_id'].includes(key) && typeof entry === 'string' && uuid.test(entry)) props[key] = entry;
    else if (['duration_ms', 'status_code', 'filter_count'].includes(key) && typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 && entry <= (key === 'duration_ms' ? 3_600_000 : 1000)) props[key] = Math.round(entry);
    else if (strings[key] && typeof entry === 'string' && (value.name === 'app_error' || !['message', 'stack'].includes(key))) props[key] = scrubMonitoringText(entry, strings[key]);
  }
  if (value.name === 'app_error' && !props.code && !props.message) return null;
  return { event_id: value.event_id, installation_id: value.installation_id, session_id: value.session_id, name: value.name, occurred_at: new Date(value.occurred_at).toISOString(), platform: value.platform, app_version: value.app_version, release: value.release, channel: value.channel, consent: value.consent, boulder_id: value.boulder_id || null, props };
}

export function createMonitoringHandler(config: Config, request: typeof fetch = fetch) {
  const base = config.supabaseUrl.replace(/\/$/, '');
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });
    if (!base || !config.anonKey || !config.serviceKey) return reply(503, { error: 'NOT_CONFIGURED' });
    try {
      const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
      const apiKey = req.headers.get('apikey');
      if ((!bearer && apiKey !== config.anonKey) || bearer === config.serviceKey) return reply(401, { error: 'INVALID_SESSION' });
      let userId: string | null = null;
      if (bearer && bearer !== config.anonKey) {
        const authenticated = await request(base + '/auth/v1/user', { headers: { apikey: config.anonKey, Authorization: 'Bearer ' + bearer }, signal: AbortSignal.timeout(10_000) });
        if (!authenticated.ok) return reply(401, { error: 'INVALID_SESSION' });
        const user = await authenticated.json();
        if (!object(user) || !uuid.test(String(user.id))) return reply(401, { error: 'INVALID_SESSION' });
        userId = user.id as string;
      }
      if (Number(req.headers.get('content-length') || 0) > 120_000) return reply(413, { error: 'PAYLOAD_TOO_LARGE' });
      const reader = req.body?.getReader();
      if (!reader) return reply(400, { error: 'INVALID_PAYLOAD' });
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 120_000) { await reader.cancel(); return reply(413, { error: 'PAYLOAD_TOO_LARGE' }); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let parsed: unknown;
      try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, { error: 'INVALID_PAYLOAD' }); }
      if (!object(parsed) || !Array.isArray(parsed.events) || parsed.events.length < 1 || parsed.events.length > 20) return reply(400, { error: 'INVALID_PAYLOAD' });
      const events: Record<string, unknown>[] = [];
      const rejected: string[] = [];
      for (const entry of parsed.events) {
        const event = normalizeMonitoringEvent(entry);
        if (event) events.push(event);
        else if (object(entry) && uuid.test(String(entry.event_id))) rejected.push(entry.event_id as string);
        else return reply(400, { error: 'INVALID_EVENT_ID' });
      }
      if (!events.length) return reply(200, { accepted_ids: [], rejected_ids: [...new Set(rejected)] });
      const stored = await request(base + '/rest/v1/rpc/kws_ingest_monitoring_events', { method: 'POST', headers: { apikey: config.serviceKey, Authorization: 'Bearer ' + config.serviceKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_events: events, p_user_id: userId }), signal: AbortSignal.timeout(15_000) });
      if (!stored.ok) {
        const failure = await stored.json().catch(() => ({}));
        return reply(failure?.code === 'P4290' ? 429 : 503, { error: failure?.code === 'P4290' ? 'RATE_LIMITED' : 'INGEST_UNAVAILABLE' });
      }
      const committed = await stored.json();
      if (!object(committed) || !Array.isArray(committed.accepted_ids) || !Array.isArray(committed.rejected_ids) || [...committed.accepted_ids, ...committed.rejected_ids].some(id => typeof id !== 'string' || !uuid.test(id))) return reply(503, { error: 'INGEST_UNAVAILABLE' });
      const submittedIds = new Set(events.map(event => event.event_id));
      const acceptedIds = new Set(committed.accepted_ids);
      if ([...committed.accepted_ids, ...committed.rejected_ids].some(id => !submittedIds.has(id)) || committed.rejected_ids.some(id => acceptedIds.has(id)) || rejected.some(id => acceptedIds.has(id))) return reply(503, { error: 'INGEST_UNAVAILABLE' });
      return reply(200, { accepted_ids: [...new Set(committed.accepted_ids)], rejected_ids: [...new Set([...rejected, ...committed.rejected_ids])] });
    } catch { return reply(503, { error: 'INGEST_UNAVAILABLE' }); }
  };
}
