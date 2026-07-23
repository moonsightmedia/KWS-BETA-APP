import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '@/utils/version';

const DEVICE_ID_KEY = 'kws_telemetry_device_id';
const OPEN_UPLOADS_KEY = 'kws_open_upload_sessions';
const HEARTBEAT_MS = 90_000;
const FLUSH_MS = 30_000;
const FETCH_TIMEOUT_MS = 3_000;

export type TelemetryEventName =
  | 'boulder_view'
  | 'boulder_tick'
  | 'upload_start'
  | 'upload_queued'
  | 'compress_start'
  | 'compress_done'
  | 'chunk_progress'
  | 'upload_done'
  | 'upload_fail'
  | 'app_background'
  | 'app_foreground'
  | 'suspected_oom_resume'
  | 'heartbeat';

/** Events that must hit the server immediately (survive process kill better). */
const IMMEDIATE_EVENTS = new Set<TelemetryEventName>([
  'upload_start',
  'upload_queued',
  'compress_start',
  'compress_done',
  'chunk_progress',
  'upload_done',
  'upload_fail',
  'app_background',
  'app_foreground',
  'suspected_oom_resume',
]);

type QueuedEvent = {
  name: TelemetryEventName;
  boulder_id?: string | null;
  props?: Record<string, string | number | boolean>;
  created_at: string;
};

let started = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let queue: QueuedEvent[] = [];
let currentUserId: string | null = null;
let currentRole: string | null = null;

declare global {
  interface Window {
    __KWS_NATIVE_FETCH?: typeof fetch;
    __kwsTelemetryVisibility?: () => void;
  }
}

function isTelemetryEnabled(): boolean {
  return import.meta.env.VITE_TELEMETRY_ENABLED === 'true';
}

export function getTelemetryDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `tmp-${Date.now()}`;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const nativeFetch = window.__KWS_NATIVE_FETCH ?? window.fetch.bind(window);
    return await nativeFetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getAuthHeaders(): Record<string, string> | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  let accessToken = supabaseKey;
  try {
    const authKey =
      Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) || '';
    const raw = authKey ? localStorage.getItem(authKey) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) accessToken = parsed.access_token;
    }
  } catch {
    // anon key fallback
  }

  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function upsertSession(): Promise<void> {
  if (!isTelemetryEnabled()) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();
  if (!supabaseUrl || !headers) return;

  const deviceId = getTelemetryDeviceId();
  const body = {
    device_id: deviceId,
    user_id: currentUserId,
    platform: Capacitor.getPlatform(),
    app_version: APP_VERSION,
    role: currentRole,
    last_seen_at: new Date().toISOString(),
  };

  await fetchWithTimeout(`${supabaseUrl}/rest/v1/telemetry_sessions?on_conflict=device_id`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function flushEvents(): Promise<void> {
  if (!isTelemetryEnabled() || queue.length === 0) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = getAuthHeaders();
  if (!supabaseUrl || !headers) {
    queue = [];
    return;
  }

  const batch = queue.splice(0, 50);
  const deviceId = getTelemetryDeviceId();
  const rows = batch.map((event) => ({
    device_id: deviceId,
    user_id: currentUserId,
    name: event.name,
    boulder_id: event.boulder_id ?? null,
    props: event.props ?? {},
    created_at: event.created_at,
  }));

  await fetchWithTimeout(`${supabaseUrl}/rest/v1/telemetry_events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  // Drop on failure — never retry-storm
}

export function setTelemetryUser(
  user: { id: string; role?: string | null } | null,
): void {
  currentUserId = user?.id ?? null;
  currentRole = user?.role ?? null;
  if (started && isTelemetryEnabled()) {
    void upsertSession().catch(() => undefined);
  }
}

export function trackTelemetryEvent(
  name: TelemetryEventName,
  options?: {
    boulderId?: string | null;
    props?: Record<string, string | number | boolean>;
    immediate?: boolean;
  },
): void {
  if (!isTelemetryEnabled() || !started) return;
  try {
    queue.push({
      name,
      boulder_id: options?.boulderId ?? null,
      props: options?.props,
      created_at: new Date().toISOString(),
    });

    const shouldFlushNow =
      options?.immediate === true || IMMEDIATE_EVENTS.has(name) || queue.length >= 20;

    if (shouldFlushNow) {
      void flushEvents().catch(() => undefined);
    }
  } catch {
    // fail-open
  }
}

/** Persist open upload session ids so a restart can mark suspected OOM. */
export function rememberOpenUploadSession(sessionId: string, boulderId?: string | null): void {
  try {
    const raw = localStorage.getItem(OPEN_UPLOADS_KEY);
    const map: Record<string, { boulderId?: string | null; at: string }> = raw
      ? JSON.parse(raw)
      : {};
    map[sessionId] = { boulderId: boulderId ?? null, at: new Date().toISOString() };
    localStorage.setItem(OPEN_UPLOADS_KEY, JSON.stringify(map));
  } catch {
    // fail-open
  }
}

export function forgetOpenUploadSession(sessionId: string): void {
  try {
    const raw = localStorage.getItem(OPEN_UPLOADS_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, unknown>;
    delete map[sessionId];
    localStorage.setItem(OPEN_UPLOADS_KEY, JSON.stringify(map));
  } catch {
    // fail-open
  }
}

export function getRememberedOpenUploadSessions(): Array<{
  sessionId: string;
  boulderId?: string | null;
  at: string;
}> {
  try {
    const raw = localStorage.getItem(OPEN_UPLOADS_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, { boulderId?: string | null; at: string }>;
    return Object.entries(map).map(([sessionId, value]) => ({
      sessionId,
      boulderId: value.boulderId,
      at: value.at,
    }));
  } catch {
    return [];
  }
}

export function clearRememberedOpenUploadSessions(): void {
  try {
    localStorage.removeItem(OPEN_UPLOADS_KEY);
  } catch {
    // fail-open
  }
}

export function startTelemetry(): void {
  if (started || !isTelemetryEnabled()) return;
  started = true;

  try {
    void upsertSession().catch(() => undefined);

    heartbeatTimer = setInterval(() => {
      void upsertSession().catch(() => undefined);
      trackTelemetryEvent('heartbeat');
      void flushEvents().catch(() => undefined);
    }, HEARTBEAT_MS);

    flushTimer = setInterval(() => {
      void flushEvents().catch(() => undefined);
    }, FLUSH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        trackTelemetryEvent('app_foreground', { immediate: true });
        void upsertSession().catch(() => undefined);
      } else {
        trackTelemetryEvent('app_background', { immediate: true });
        void flushEvents().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.__kwsTelemetryVisibility = onVisible;
  } catch (error) {
    console.warn('[Telemetry] start failed (ignored):', error);
    started = false;
  }
}

export function stopTelemetry(): void {
  if (!started) return;
  started = false;
  try {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (flushTimer) clearInterval(flushTimer);
    heartbeatTimer = null;
    flushTimer = null;
    const onVisible = window.__kwsTelemetryVisibility;
    if (onVisible) {
      document.removeEventListener('visibilitychange', onVisible);
      delete window.__kwsTelemetryVisibility;
    }
    void flushEvents().catch(() => undefined);
  } catch {
    // fail-open
  }
}

export async function flushTelemetryNow(): Promise<void> {
  await flushEvents().catch(() => undefined);
}
