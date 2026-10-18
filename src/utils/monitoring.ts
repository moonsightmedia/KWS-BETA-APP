import { Capacitor } from '@capacitor/core';
import { MonitoringClient, monitoringScreen, type MonitoringConsent, type MonitoringEventName, type MonitoringProps } from '@/lib/monitoringClient';
import { APP_VERSION } from '@/utils/version';
import { captureSentryException } from '@/utils/sentry';

let client: MonitoringClient | null = null;
let currentUser: { id: string; token: string } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let heartbeatAt = 0;
let screen = 'other';
let boulder: string | null = null;
let cleanup: (() => void) | null = null;
const reported = new WeakMap<object, { id: string; at: number }>();
const operationFailures = new Map<string, number>();

export function isMonitoringEnabled(): boolean { return import.meta.env.VITE_MONITORING_ENABLED === 'true'; }

function getClient(): MonitoringClient | null {
  if (!isMonitoringEnabled()) return null;
  if (client) return client;
  try {
    const platform = Capacitor.getPlatform();
    client = new MonitoringClient({
      storage: {
        getItem: key => { try { return window.localStorage.getItem(key); } catch { return null; } },
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: key => { try { window.localStorage.removeItem(key); } catch { return; } },
      }, storageKeys: () => { try { return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)!).filter(Boolean); } catch { return []; } }, now: () => Date.now(), uuid: () => crypto.randomUUID(),
      platform: platform === 'ios' || platform === 'android' ? platform : 'web', version: APP_VERSION,
      release: `kws-beta-app@${APP_VERSION}${import.meta.env.VITE_RELEASE_REVISION ? '+' + import.meta.env.VITE_RELEASE_REVISION.slice(0, 12) : ''}`,
      channel: import.meta.env.VITE_MONITORING_CHANNEL || (import.meta.env.DEV ? 'development' : platform === 'ios' ? 'testflight' : platform === 'android' ? 'apk' : 'production'),
      transport: async (events, owner) => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        try {
          const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const token = owner && currentUser?.id === owner ? currentUser.token : key;
          if (!key || !import.meta.env.VITE_SUPABASE_URL || (owner && currentUser?.id !== owner)) throw new Error('Monitoring session unavailable');
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitoring-events`, {
            method: 'POST', signal: controller.signal, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
          });
          if (!response.ok) throw new Error('Monitoring was not acknowledged');
          return await response.json();
        } finally { window.clearTimeout(timeout); }
      },
    });
  } catch { return null; }
  return client;
}

export function getUsageConsent(): MonitoringConsent { return getClient()?.getConsent() ?? 'unknown'; }

export function setUsageConsent(consent: MonitoringConsent): void {
  getClient()?.setConsent(consent);
  window.dispatchEvent(new Event('kws:monitoring-consent'));
  if (consent === 'granted') {
    trackMonitoring('screen_view', { screen }, boulder);
    trackMonitoring('app_ready', { screen });
    void getClient()?.flush(true);
  }
}

export function setMonitoringUser(user: { id: string; token: string } | null): void {
  currentUser = user;
  getClient()?.setOwner(user?.id ?? null);
}

export function trackMonitoring(name: MonitoringEventName, props: MonitoringProps = {}, boulderId: string | null = null): string | null {
  return getClient()?.record(name, { screen, ...props }, boulderId) ?? null;
}

export function setMonitoringScreen(path: string, boulderId: string | null = null): void {
  const next = monitoringScreen(path);
  if (screen === next && boulder === boulderId) return;
  screen = next;
  boulder = boulderId;
  trackMonitoring('screen_view', { screen }, boulder);
}

export function reportMonitoringError(error: unknown, component = 'app', severity: 'error' | 'fatal' = 'error'): string | null {
  if (error && typeof error === 'object') {
    const previous = reported.get(error);
    if (previous && Date.now() - previous.at < 5000) return previous.id;
  }
  const details = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unbekannter Appfehler');
  const reportId = crypto.randomUUID();
  const eventId = trackMonitoring('app_error', { report_id: reportId, code: details.name, message: details.message, stack: details.stack || '', component, severity }, boulder);
  if (!eventId) return null;
  if (error && typeof error === 'object') reported.set(error, { id: reportId, at: Date.now() });
  captureSentryException(details, { tags: { source: component, report_id: reportId } });
  void getClient()?.flush();
  return reportId;
}

export function flushMonitoring(): Promise<boolean> { return getClient()?.flush(true) ?? Promise.resolve(false); }

export function trackAuthenticationFailure(kind: 'login_failed' | 'signup_failed', error: unknown): void {
  const details = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown } : {};
  const status = typeof details.status === 'number' ? details.status : 0;
  const code = typeof details.code === 'string' && /^[a-z_]{1,60}$/i.test(details.code) ? details.code : error instanceof TypeError ? 'network_unavailable' : 'validation_or_unknown';
  trackMonitoring(kind, { error_code: code, status_code: status });
  if (status >= 500 || code === 'network_unavailable') {
    const failure = new Error('Anmeldedienst nicht verfügbar: ' + code);
    failure.name = 'AuthenticationServiceError';
    reportMonitoringError(failure, 'authentication');
  }
}

export function reportMonitoringOperationError(operation: 'query' | 'mutation', error: unknown): void {
  if (!isMonitoringEnabled()) return;
  const detail = error && typeof error === 'object' ? error as { name?: unknown; message?: unknown; status?: unknown } : {};
  const message = typeof detail.message === 'string' ? detail.message : '';
  if (detail.name === 'AbortError' || /aborterror|signal is aborted|cancelled/i.test(message)) return;
  const matchedStatus = message.match(/(?:HTTP|REST fetch failed:)\s*(\d{3})/i);
  const status = typeof detail.status === 'number' ? detail.status : matchedStatus ? Number(matchedStatus[1]) : 0;
  if (status >= 400 && status < 500) return;
  const reason = status >= 500 ? 'Server' + status : /timeout|timed out/i.test(message) ? 'Timeout' : detail.name === 'TypeError' || /failed to fetch|network|fetch failed/i.test(message) ? 'Network' : 'Unavailable';
  const key = operation + reason;
  if (Date.now() - (operationFailures.get(key) || 0) < 30_000) return;
  operationFailures.set(key, Date.now());
  const diagnostic = new Error(operation === 'query' ? 'App-Daten konnten nicht geladen werden' : 'Änderung konnte nicht gespeichert werden');
  diagnostic.name = (operation === 'query' ? 'Query' : 'Mutation') + reason;
  reportMonitoringError(diagnostic, operation);
}

export async function confirmMonitoringReport(reportId: string): Promise<boolean> {
  const collector = getClient();
  if (!collector) return false;
  for (let attempt = 0; attempt < 2 && !collector.isReportAcknowledged(reportId); attempt++) {
    if (!await collector.flush()) break;
  }
  return collector.isReportAcknowledged(reportId);
}

export function startMonitoring(): void {
  const collector = getClient();
  if (!collector || timer) return;
  collector.startSession();
  const visible = () => {
    trackMonitoring(document.visibilityState === 'visible' ? 'foreground' : 'background', { screen: document.visibilityState === 'visible' ? screen : 'other' }, document.visibilityState === 'visible' ? boulder : null);
    void collector.flush(true);
  };
  const online = () => { void collector.flush(true); };
  const storage = (event: StorageEvent) => {
    if (event.key === 'kws_usage_consent_v1') {
      collector.setConsent(event.newValue === 'granted' ? 'granted' : event.newValue === 'denied' ? 'denied' : 'unknown');
      window.dispatchEvent(new Event('kws:monitoring-consent'));
    }
  };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('online', online);
  window.addEventListener('storage', storage);
  timer = setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - heartbeatAt >= 60_000) {
      heartbeatAt = Date.now();
      trackMonitoring('foreground_heartbeat', { screen }, boulder);
    }
    void collector.flush();
  }, 10_000);
  cleanup = () => { document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', online); window.removeEventListener('storage', storage); };
  void collector.flush();
}

export function stopMonitoring(): void {
  if (timer) clearInterval(timer);
  timer = null;
  cleanup?.();
  cleanup = null;
}
