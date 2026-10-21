import { backendConfig, isReviewEnvironment } from '@/lib/backendConfig';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LivePresenceClient } from '@/lib/livePresenceClient';
import { MONITORING_CONSENT_KEY, MonitoringClient, monitoringScreen, type MonitoringConsent, type MonitoringEventName, type MonitoringProps } from '@/lib/monitoringClient';
import { APP_VERSION } from '@/utils/version';
import { captureSentryException } from '@/utils/sentry';
import { createMonitoringTransport } from '@/lib/monitoringTransport';

let client: MonitoringClient | null = null;
let currentUser: { id: string; token: string } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let heartbeatAt = 0;
let screen = 'other';
let boulder: string | null = null;
let cleanup: (() => void) | null = null;
let presence: LivePresenceClient | null = null;
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let nativeForeground = !Capacitor.isNativePlatform();
let loadedBoulder: string | null = null;
let loadedBoulderOwner: symbol | null = null;
const reported = new WeakMap<object, { id: string; at: number }>();
const operationFailures = new Map<string, number>();
let sessionLossReported = false;
let rejectedPresenceToken: string | null = null;

export function isMonitoringEnabled(): boolean { return !isReviewEnvironment && import.meta.env.VITE_MONITORING_ENABLED === 'true'; }

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
      transport: createMonitoringTransport({ url: backendConfig.supabaseUrl, publicKey: backendConfig.publicKey, identity: () => currentUser }),
    });
  } catch { return null; }
  return client;
}

export function getUsageConsent(): MonitoringConsent { return getClient()?.getConsent() ?? 'unknown'; }

function updatePresence(foreground = document.visibilityState === 'visible' && nativeForeground): void {
  presence?.update({ allowed: getUsageConsent() === 'granted', foreground, online: navigator.onLine,
    owner: currentUser?.id ?? null, screen, boulderId: screen === 'boulder' && loadedBoulder === boulder ? loadedBoulder : null });
}

export function setUsageConsent(consent: MonitoringConsent): void {
  getClient()?.setConsent(consent);
  updatePresence();
  window.dispatchEvent(new Event('kws:monitoring-consent'));
  if (consent === 'granted') {
    trackMonitoring('screen_view', { screen }, boulder);
    trackMonitoring('app_ready', { screen });
    void getClient()?.flush(true);
  }
}

export function setMonitoringUser(user: { id: string; token: string } | null): void {
  if (user?.token !== currentUser?.token || user?.id !== currentUser?.id) { sessionLossReported = false; rejectedPresenceToken = null; }
  currentUser = user;
  getClient()?.setOwner(user?.id ?? null);
  updatePresence();
}

export function reportSessionLoss(): void {
  if (sessionLossReported) return;
  sessionLossReported = true;
  const failure = new Error('Die Sitzung ist abgelaufen. Erneute Anmeldung erforderlich.');
  failure.name = 'AuthenticationSessionLost';
  reportMonitoringError(failure, 'authentication');
}

export function trackMonitoring(name: MonitoringEventName, props: MonitoringProps = {}, boulderId: string | null = null): string | null {
  return getClient()?.record(name, { screen, ...props }, boulderId) ?? null;
}

export function setMonitoringLoadedBoulder(boulderId: string): () => void {
  const owner = Symbol();
  loadedBoulderOwner = owner;
  loadedBoulder = boulderId;
  updatePresence();
  return () => {
    if (loadedBoulderOwner !== owner) return;
    loadedBoulderOwner = null;
    loadedBoulder = null;
    updatePresence();
  };
}

export function setMonitoringScreen(path: string, boulderId: string | null = null): void {
  const next = monitoringScreen(path);
  if (screen === next && boulder === boulderId) return;
  screen = next;
  boulder = boulderId;
  if (loadedBoulder !== boulderId) { loadedBoulder = null; loadedBoulderOwner = null; }
  trackMonitoring('screen_view', { screen }, boulder);
  updatePresence();
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
  const details = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown; name?: unknown } : {};
  const status = typeof details.status === 'number' ? details.status : 0;
  const code = typeof details.code === 'string' && /^[a-z_]{1,60}$/i.test(details.code) ? details.code : error instanceof TypeError || details.name === 'AuthRetryableFetchError' ? 'network_unavailable' : 'validation_or_unknown';
  trackMonitoring(kind, { error_code: code, status_code: status });
  if (status >= 500 || code === 'network_unavailable' || ['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt', 'unexpected_failure'].includes(code)) {
    const failure = new Error('Anmeldedienst nicht verfügbar: ' + code);
    failure.name = 'AuthenticationServiceError';
    reportMonitoringError(failure, 'authentication');
  }
}

export function reportMonitoringOperationError(operation: 'query' | 'mutation', error: unknown): void {
  if (!isMonitoringEnabled()) return;
  const detail = error && typeof error === 'object' ? error as { name?: unknown; message?: unknown; status?: unknown } : {};
  const message = typeof detail.message === 'string' ? detail.message : '';
  if (detail.name === 'SessionRequiredError') { reportSessionLoss(); return; }
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
  const platform = Capacitor.getPlatform();
  presence = new LivePresenceClient({
    uuid: () => crypto.randomUUID(), installationId: collector.getInstallationId(),
    platform: platform === 'ios' || platform === 'android' ? platform : 'web',
    release: `kws-beta-app@${APP_VERSION}${import.meta.env.VITE_RELEASE_REVISION ? '+' + import.meta.env.VITE_RELEASE_REVISION.slice(0, 12) : ''}`,
    channel: import.meta.env.VITE_MONITORING_CHANNEL || (import.meta.env.DEV ? 'development' : platform === 'ios' ? 'testflight' : platform === 'android' ? 'apk' : 'production'),
    transport: async (message, owner) => {
      const key = backendConfig.publicKey;
      if (!key || !backendConfig.supabaseUrl) return;
      const token = owner && currentUser?.id === owner ? currentUser.token : key;
      if ((owner && currentUser?.id !== owner) || token === rejectedPresenceToken) return;
      const response = await fetch(`${backendConfig.supabaseUrl}/functions/v1/monitoring-events`, {
        method: 'POST', keepalive: true, signal: AbortSignal.timeout(8000),
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ presence: message }),
      });
      if (response.status === 401) { rejectedPresenceToken = token; return; }
      if (!response.ok) throw new Error('Presence unavailable');
    },
  });
  collector.startSession();
  const visible = () => {
    updatePresence();
    trackMonitoring(document.visibilityState === 'visible' ? 'foreground' : 'background', { screen: document.visibilityState === 'visible' ? screen : 'other' }, document.visibilityState === 'visible' ? boulder : null);
    void collector.flush(true);
  };
  const online = () => { updatePresence(); void collector.flush(true); };
  const offline = () => updatePresence(false);
  const pageHide = () => updatePresence(false);
  const storage = (event: StorageEvent) => {
    if (event.key === MONITORING_CONSENT_KEY) {
      collector.setConsent(event.newValue === 'granted' ? 'granted' : event.newValue === 'denied' ? 'denied' : 'unknown');
      updatePresence();
      window.dispatchEvent(new Event('kws:monitoring-consent'));
    }
  };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', visible);
  window.addEventListener('storage', storage);
  timer = setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - heartbeatAt >= 60_000) {
      heartbeatAt = Date.now();
      trackMonitoring('foreground_heartbeat', { screen }, boulder);
    }
    void collector.flush();
  }, 10_000);
  let stopped = false;
  let removeNativeListener: (() => Promise<void>) | undefined;
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', state => { nativeForeground = state.isActive; updatePresence(); })
      .then(handle => { if (stopped) void handle.remove(); else removeNativeListener = () => handle.remove(); }).catch(() => undefined);
    void App.getState().then(state => { if (!stopped) { nativeForeground = state.isActive; updatePresence(); } }).catch(() => undefined);
  }
  presenceTimer = setInterval(() => updatePresence(), 12_000);
  updatePresence();
  cleanup = () => {
    stopped = true;
    void removeNativeListener?.();
    document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', online); window.removeEventListener('offline', offline);
    window.removeEventListener('pagehide', pageHide); window.removeEventListener('pageshow', visible); window.removeEventListener('storage', storage);
  };
  void collector.flush();
}

export function stopMonitoring(): void {
  updatePresence(false);
  presence = null;
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
  if (timer) clearInterval(timer);
  timer = null;
  cleanup?.();
  cleanup = null;
}
