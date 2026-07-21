import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '@/utils/version';

const DEVICE_ID_KEY = 'kws_telemetry_device_id';
const HEARTBEAT_MS = 90_000;
const FLUSH_MS = 30_000;
const FETCH_TIMEOUT_MS = 3_000;

type TelemetryEventName =
  | 'boulder_view'
  | 'boulder_tick'
  | 'upload_start'
  | 'upload_fail'
  | 'heartbeat';

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

function isTelemetryEnabled(): boolean {
  return import.meta.env.VITE_TELEMETRY_ENABLED === 'true';
}

function getOrCreateDeviceId(): string {
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
    const raw = localStorage.getItem(
      Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) || '',
    );
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

  const deviceId = getOrCreateDeviceId();
  const body = {
    device_id: deviceId,
    user_id: currentUserId,
    platform: Capacitor.getPlatform(),
    app_version: APP_VERSION,
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
  const deviceId = getOrCreateDeviceId();
  const rows = batch.map((event) => ({
    device_id: deviceId,
    user_id: currentUserId,
    name: event.name,
    boulder_id: event.boulder_id ?? null,
    props: event.props ?? {},
    created_at: event.created_at,
  }));

  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/telemetry_events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });

  // Drop on failure — never retry-storm
  if (!response?.ok) {
    return;
  }
}

export function setTelemetryUser(user: { id: string } | null): void {
  currentUserId = user?.id ?? null;
  if (started && isTelemetryEnabled()) {
    void upsertSession().catch(() => undefined);
  }
}

export function trackTelemetryEvent(
  name: TelemetryEventName,
  options?: { boulderId?: string | null; props?: Record<string, string | number | boolean> },
): void {
  if (!isTelemetryEnabled() || !started) return;
  try {
    queue.push({
      name,
      boulder_id: options?.boulderId ?? null,
      props: options?.props,
      created_at: new Date().toISOString(),
    });
    if (queue.length >= 20) {
      void flushEvents().catch(() => undefined);
    }
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
        void upsertSession().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // Store cleanup reference for stopTelemetry
    (window as unknown as { __kwsTelemetryVisibility?: () => void }).__kwsTelemetryVisibility = onVisible;
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
    const onVisible = (window as unknown as { __kwsTelemetryVisibility?: () => void }).__kwsTelemetryVisibility;
    if (onVisible) {
      document.removeEventListener('visibilitychange', onVisible);
      delete (window as unknown as { __kwsTelemetryVisibility?: () => void }).__kwsTelemetryVisibility;
    }
    void flushEvents().catch(() => undefined);
  } catch {
    // fail-open
  }
}
