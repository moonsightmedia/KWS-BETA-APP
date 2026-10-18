type PushToken = { token: string; platform: 'android' | 'ios' | 'web' };
type PushPayload = { title: string; body: string; data?: Record<string, unknown>; action_url?: string };
type Config = { supabaseUrl: string; anonKey: string; serviceKey: string; serviceAccount: string };
type Device = PushToken & { user_id: string };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const encodeJson = (value: unknown) => encode(new TextEncoder().encode(JSON.stringify(value)));

/** Authenticate callers and check registered-device ownership before provider access. */
export function createPushHandler(config: Config, request: typeof fetch = fetch) {
  const base = config.supabaseUrl.replace(/\/$/, '');
  let cachedAccess: { value: string; expires: number } | undefined;
  const limits = new Map<string, { start: number; count: number }>();
  async function database(path: string) {
    const result = await request(base + '/rest/v1/' + path, { headers: { apikey: config.serviceKey, Authorization: 'Bearer ' + config.serviceKey }, signal: AbortSignal.timeout(10_000) });
    if (!result.ok) throw new Error('DATABASE_UNAVAILABLE');
    return result.json();
  }
  async function recordDelivery(owner: string, platform: string, status: string, code: string | null, notificationId: unknown) {
    try {
      const committed = await request(base + '/rest/v1/rpc/kws_monitoring_record_delivery', {
        method: 'POST', headers: { apikey: config.serviceKey, Authorization: 'Bearer ' + config.serviceKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_notification_id: typeof notificationId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId) ? notificationId : null, p_user_id: owner, p_platform: platform, p_status: status, p_code: code }),
        signal: AbortSignal.timeout(5000),
      });
      if (committed.ok && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(await committed.json())) return true;
    } catch {
      console.warn('PUSH_AUDIT_UNCONFIRMED');
      return false;
    }
    console.warn('PUSH_AUDIT_UNCONFIRMED');
    return false;
  }
  async function accessToken() {
    if (cachedAccess && cachedAccess.expires > Date.now() + 60_000) return cachedAccess.value;
    let raw = config.serviceAccount.trim();
    if (!raw.startsWith('{') && !raw.startsWith('"')) raw = atob(raw);
    let account = JSON.parse(raw);
    if (typeof account === 'string') account = JSON.parse(account);
    if (account.type !== 'service_account' || account.project_id !== 'kws-beta-app' || account.token_uri !== 'https://oauth2.googleapis.com/token') throw new Error('PROVIDER_NOT_CONFIGURED');
    const pem = account.private_key.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const now = Math.floor(Date.now() / 1000);
    const unsigned = encodeJson({ alg: 'RS256', typ: 'JWT' }) + '.' + encodeJson({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: account.token_uri, iat: now, exp: now + 3600 });
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
    const result = await request(account.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + encode(new Uint8Array(signature)) }), signal: AbortSignal.timeout(15_000) });
    if (!result.ok) throw new Error('PROVIDER_AUTH_FAILED');
    const token = await result.json();
    if (typeof token.access_token !== 'string') throw new Error('PROVIDER_AUTH_FAILED');
    cachedAccess = { value: token.access_token, expires: Date.now() + Number(token.expires_in || 3600) * 1000 };
    return cachedAccess.value;
  }
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return response(405, { success: false, error: 'METHOD_NOT_ALLOWED' });
    if (!base || !config.anonKey || !config.serviceKey) return response(503, { success: false, error: 'NOT_CONFIGURED' });
    try {
      const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
      if (!bearer || bearer === config.anonKey) return response(401, { success: false, error: 'AUTH_REQUIRED' });
      let caller = 'internal'; let isAdmin = bearer === config.serviceKey;
      if (!isAdmin) {
        const authenticated = await request(base + '/auth/v1/user', { headers: { apikey: config.anonKey, Authorization: 'Bearer ' + bearer }, signal: AbortSignal.timeout(10_000) });
        if (!authenticated.ok) return response(401, { success: false, error: 'INVALID_SESSION' });
        const user = await authenticated.json();
        if (typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) return response(401, { success: false, error: 'INVALID_SESSION' });
        caller = user.id;
        const roles = await database('user_roles?user_id=eq.' + encodeURIComponent(caller) + '&role=eq.admin&select=role');
        isAdmin = Array.isArray(roles) && roles.some(row => row.role === 'admin');
      }
      const now = Date.now();
      for (const [id, limit] of limits) if (now - limit.start > 60_000) limits.delete(id);
      const limit = limits.get(caller) || { start: now, count: 0 };
      if (limits.size >= 10_000 && !limits.has(caller)) return response(429, { success: false, error: 'RATE_LIMITED' });
      limit.count++; limits.set(caller, limit);
      if (limit.count > (isAdmin ? 120 : 20)) return response(429, { success: false, error: 'RATE_LIMITED' });
      if (Number(req.headers.get('content-length') || 0) > 64_000) return response(413, { success: false, error: 'PAYLOAD_TOO_LARGE' });
      const reader = req.body?.getReader();
      if (!reader) return response(400, { success: false, error: 'INVALID_PAYLOAD' });
      let size = 0; const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 64_000) { await reader.cancel(); return response(413, { success: false, error: 'PAYLOAD_TOO_LARGE' }); }
        chunks.push(value);
      }
      const body = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      let parsed: { tokens: PushToken[]; payload: PushPayload };
      try { parsed = JSON.parse(new TextDecoder().decode(body)); } catch { return response(400, { success: false, error: 'INVALID_PAYLOAD' }); }
      if (!parsed || typeof parsed !== 'object') return response(400, { success: false, error: 'INVALID_PAYLOAD' });
      const { tokens, payload } = parsed;
      if (!Array.isArray(tokens) || !tokens.length || tokens.length > 100 || tokens.some(t => !t || typeof t.token !== 'string' || !/^[A-Za-z0-9:_-]{1,4096}$/.test(t.token) || !['android', 'ios', 'web'].includes(t.platform)) ||
          !payload || typeof payload.title !== 'string' || !payload.title.trim() || payload.title.length > 200 || typeof payload.body !== 'string' || !payload.body.trim() || payload.body.length > 3000 ||
          (payload.data !== undefined && (typeof payload.data !== 'object' || payload.data === null || Array.isArray(payload.data))) ||
          (payload.action_url !== undefined && (typeof payload.action_url !== 'string' || !/^\/(?!\/)/.test(payload.action_url)))) return response(400, { success: false, error: 'INVALID_PAYLOAD' });
      const unique = [...new Map(tokens.map(t => [t.platform + ':' + t.token, t])).values()];
      const filter = encodeURIComponent('(' + unique.map(t => '"' + t.token + '"').join(',') + ')');
      const devices: Device[] = await database('push_tokens?token=in.' + filter + '&select=token,platform,user_id');
      if (!Array.isArray(devices) || unique.some(t => !devices.some(d => d.token === t.token && d.platform === t.platform && (isAdmin || d.user_id === caller)))) return response(403, { success: false, error: 'DEVICE_NOT_AUTHORIZED' });
      const owners = [...new Set(devices.map(d => d.user_id))];
      const prefs = await database('notification_preferences?user_id=in.' + encodeURIComponent('(' + owners.join(',') + ')') + '&select=user_id,push_enabled');
      const results = [];
      for (const target of unique) {
        const owner = devices.find(d => d.token === target.token && d.platform === target.platform)!.user_id;
        if (!Array.isArray(prefs) || !prefs.some(p => p.user_id === owner && p.push_enabled === true)) {
          const audited = await recordDelivery(owner,target.platform,'disabled','PUSH_DISABLED',payload.data?.notification_id);
          results.push({ token: target.token, platform: target.platform, success: false, error: 'PUSH_DISABLED', audit_status: audited ? 'confirmed' : 'unconfirmed' });
          continue;
        }
        if (target.platform !== 'android') {
          const audited = await recordDelivery(owner,target.platform,'unsupported','PLATFORM_NOT_CONFIGURED',payload.data?.notification_id);
          results.push({ token: target.token, platform: target.platform, success: false, error: 'PLATFORM_NOT_CONFIGURED', audit_status: audited ? 'confirmed' : 'unconfirmed' });
          continue;
        }
        if (!await recordDelivery(owner,target.platform,'dispatch_attempt',null,payload.data?.notification_id)) {
          results.push({ token: target.token, platform: target.platform, success: false, error: 'AUDIT_UNAVAILABLE', audit_status: 'unconfirmed' });
          continue;
        }
        let access: string;
        try {
          access = await accessToken();
        } catch {
          const audited = await recordDelivery(owner,target.platform,'failed','PROVIDER_AUTH_UNAVAILABLE',payload.data?.notification_id);
          results.push({ token: target.token, platform: target.platform, success: false, error: 'PROVIDER_AUTH_UNAVAILABLE', audit_status: audited ? 'confirmed' : 'unconfirmed' });
          continue;
        }
        try {
          const sent = await request('https://fcm.googleapis.com/v1/projects/kws-beta-app/messages:send', { method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token: target.token, notification: { title: payload.title, body: payload.body }, data: { ...Object.fromEntries(Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])), action_url: payload.action_url || '' }, android: { priority: 'high' } } }), signal: AbortSignal.timeout(15_000) });
          const provider = await sent.json().catch(() => null);
          if (sent.ok && (typeof provider?.name !== 'string' || !provider.name)) {
            const audited = await recordDelivery(owner,target.platform,'uncertain','PROVIDER_ACCEPTANCE_UNCERTAIN',payload.data?.notification_id);
            results.push({ token: target.token, platform: target.platform, success: false, error: 'PROVIDER_ACCEPTANCE_UNCERTAIN', retryable: false, audit_status: audited ? 'confirmed' : 'unconfirmed' });
            continue;
          }
          const code = provider?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode;
          const safeCode = ['UNREGISTERED', 'INVALID_ARGUMENT', 'SENDER_ID_MISMATCH', 'QUOTA_EXCEEDED', 'UNAVAILABLE'].includes(code) ? code : 'PROVIDER_REJECTED';
          const audited = await recordDelivery(owner,target.platform,sent.ok ? 'provider_accepted' : 'provider_rejected',sent.ok ? null : safeCode,payload.data?.notification_id);
          results.push({ token: target.token, platform: target.platform, success: sent.ok, audit_status: audited ? 'confirmed' : 'unconfirmed', ...(sent.ok ? {} : { error: safeCode }) });
        } catch {
          const audited = await recordDelivery(owner,target.platform,'uncertain','PROVIDER_ACCEPTANCE_UNCERTAIN',payload.data?.notification_id);
          results.push({ token: target.token, platform: target.platform, success: false, error: 'PROVIDER_ACCEPTANCE_UNCERTAIN', retryable: false, audit_status: audited ? 'confirmed' : 'unconfirmed' });
        }
      }
      return response(200, { success: results.every(r => r.success), results });
    } catch { return response(503, { success: false, error: 'PUSH_SERVICE_UNAVAILABLE' }); }
  };
}
