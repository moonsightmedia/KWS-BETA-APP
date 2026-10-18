export type MonitoringConnection = { url: string; key: string; token: string };
export type LaunchFilters = { days: 1 | 7 | 30; platform: 'all' | 'android' | 'ios' | 'web'; release: string };
export const defaultLaunchFilters: LaunchFilters = { days: 1, platform: 'all', release: 'all' };
export type MonitoringSource = { state: 'ready' | 'empty' | 'unconfigured' | 'stale' | 'error'; last_updated_at: string | null; detail: string };
export type LaunchIssue = {
  fingerprint: string; title: string; severity: string; first_seen_at: string; last_seen_at: string;
  occurrences: number; affected_devices: number; release: string | null; platform: string | null;
  status: string; regression: boolean; source: 'app' | 'sentry'; permalink: string | null; fixed_release: string | null;
};
export type LaunchIssueEvent = {
  event_id: string; occurred_at: string; received_at: string; platform: string; release: string;
  installation_ref: string | null; user_ref: string | null; session_ref: string | null; props: Record<string, unknown>;
};
export type LaunchDelivery = { id: string; notification_id: string | null; recipient_ref: string | null; platform: string | null; status: string; code: string | null; created_at: string };
export type LaunchStoreMetric = {
  source: string; metric: string; definition: string; source_period_start: string; source_period_end: string;
  source_timezone: string; metric_date: string; value: number; app_identifier: string; channel: string; imported_at: string;
};
const summaryKeys = ['first_opens', 'new_accounts', 'confirmed_accounts', 'active_devices', 'active_accounts', 'sessions', 'affected_sessions', 'errors', 'activation_eligible', 'activated', 'boulder_views', 'video_started', 'video_failed'] as const;
export type LaunchDashboard = {
  schema_version: 1; generated_at: string; measurement_started_at: string; latest_event_at: string | null;
  summary: Record<(typeof summaryKeys)[number], number | null> & { web_first_opens: number | null };
  daily: Array<{ date: string; first_opens: number; sessions: number; affected_sessions: number; boulder_views: number }>;
  releases: string[]; issues: LaunchIssue[];
  activity: Array<{ installation_ref: string; user_ref: string | null; platform: string; release: string; last_seen_at: string; screen: string | null; boulder_id: string | null }>;
  top_boulders: Array<{ id: string; name: string | null; views: number }>;
  deliveries: LaunchDelivery[]; store_metrics: LaunchStoreMetric[];
  sources: Record<'collector' | 'issues' | 'notifications' | 'stores', MonitoringSource>;
};

export class LaunchMonitoringError extends Error {
  constructor(public kind: 'unconfigured' | 'permission' | 'timeout' | 'network' | 'invalid', message: string) {
    super(message);
    this.name = 'LaunchMonitoringError';
  }
}

function invalid(): never { throw new LaunchMonitoringError('invalid', 'Die Monitoring-Antwort hat ein unbekanntes Format. Bitte Einrichtung prüfen.'); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function string(value: unknown, max = 4096): string { if (typeof value !== 'string' || value.length > max) invalid(); return value; }
function nullableString(value: unknown, max = 4096): string | null { return value === null ? null : string(value, max); }
function count(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid(); return value; }
function nullableCount(value: unknown): number | null { return value === null ? null : count(value); }
function timestamp(value: unknown): string { const parsed = string(value, 80); if (!Number.isFinite(Date.parse(parsed))) invalid(); return parsed; }
function nullableTimestamp(value: unknown): string | null { return value === null ? null : timestamp(value); }
function rows<T>(value: unknown, parse: (row: Record<string, unknown>) => T, maximum = 1000): T[] { if (!Array.isArray(value) || value.length > maximum) invalid(); return value.map(row => parse(object(row))); }
function day(value: unknown): string { const parsed = string(value, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || !Number.isFinite(Date.parse(parsed))) invalid(); return parsed; }

function parseIssue(row: Record<string, unknown>): LaunchIssue {
  const source = row.source ?? 'app';
  if (source !== 'app' && source !== 'sentry') invalid();
  if (row.regression !== undefined && typeof row.regression !== 'boolean') invalid();
  return { fingerprint: string(row.fingerprint, 256), title: string(row.title), severity: string(row.severity, 40), first_seen_at: timestamp(row.first_seen_at), last_seen_at: timestamp(row.last_seen_at), occurrences: count(row.occurrences), affected_devices: count(row.affected_devices), release: nullableString(row.release, 160), platform: nullableString(row.platform, 40), status: string(row.status, 40), regression: row.regression === true, source, permalink: nullableString(row.permalink ?? null), fixed_release: nullableString(row.fixed_release ?? null, 160) };
}

export function parseLaunchDashboard(value: unknown): LaunchDashboard {
  const root = object(value);
  if (root.schema_version !== 1) invalid();
  const rawSummary = object(root.summary);
  const summary = Object.fromEntries(summaryKeys.map(key => [key, nullableCount(rawSummary[key])])) as LaunchDashboard['summary'];
  summary.web_first_opens = nullableCount(rawSummary.web_first_opens ?? null);
  const rawSources = object(root.sources);
  const sources = Object.fromEntries(['collector', 'issues', 'notifications', 'stores'].map(key => {
    const source = object(rawSources[key]);
    if (!['ready', 'empty', 'unconfigured', 'stale', 'error'].includes(String(source.state))) invalid();
    return [key, { state: source.state, last_updated_at: nullableTimestamp(source.last_updated_at), detail: string(source.detail) }];
  })) as LaunchDashboard['sources'];
  if (!Array.isArray(root.releases) || root.releases.length > 500) invalid();
  return {
    schema_version: 1, generated_at: timestamp(root.generated_at), measurement_started_at: timestamp(root.measurement_started_at), latest_event_at: nullableTimestamp(root.latest_event_at), summary, sources,
    releases: root.releases.map(release => string(release, 160)),
    daily: rows(root.daily, row => ({ date: day(row.date), first_opens: count(row.first_opens), sessions: count(row.sessions), affected_sessions: count(row.affected_sessions), boulder_views: count(row.boulder_views) }), 31),
    issues: rows(root.issues, parseIssue, 200),
    activity: rows(root.activity, row => ({ installation_ref: string(row.installation_ref, 160), user_ref: nullableString(row.user_ref, 160), platform: string(row.platform, 40), release: string(row.release, 160), last_seen_at: timestamp(row.last_seen_at), screen: nullableString(row.screen, 160), boulder_id: nullableString(row.boulder_id, 160) }), 100),
    top_boulders: rows(root.top_boulders, row => ({ id: string(row.id, 160), name: nullableString(row.name), views: count(row.views) }), 100),
    deliveries: rows(root.deliveries, row => ({ id: string(row.id, 160), notification_id: nullableString(row.notification_id, 160), recipient_ref: nullableString(row.recipient_ref, 160), platform: nullableString(row.platform, 40), status: string(row.status, 80), code: nullableString(row.code, 160), created_at: timestamp(row.created_at) }), 200),
    store_metrics: rows(root.store_metrics, row => ({ source: string(row.source, 80), metric: string(row.metric, 160), definition: string(row.definition), source_period_start: timestamp(row.source_period_start), source_period_end: timestamp(row.source_period_end), source_timezone: string(row.source_timezone, 100), metric_date: day(row.metric_date), value: count(row.value), app_identifier: string(row.app_identifier, 200), channel: string(row.channel, 80), imported_at: timestamp(row.imported_at) }), 1000),
  };
}

export function launchFilterPayload(filters: LaunchFilters) {
  if (![1, 7, 30].includes(filters.days) || !['all', 'android', 'ios', 'web'].includes(filters.platform) || !filters.release.trim() || filters.release.length > 120) invalid();
  return { p_days: filters.days, p_platform: filters.platform, p_release: filters.release };
}

async function rpc(connection: MonitoringConnection, name: string, payload: Record<string, unknown>, signal?: AbortSignal, timeoutMs = 15_000): Promise<unknown> {
  if (!connection.url || !connection.key) throw new LaunchMonitoringError('unconfigured', 'Die Monitoring-Verbindung ist noch nicht eingerichtet.');
  if (!connection.token) throw new LaunchMonitoringError('permission', 'Bitte erneut als Administrator anmelden.');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(`${connection.url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, { method: 'POST', signal: controller.signal, headers: { apikey: connection.key, Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      if ([404, 501].includes(response.status)) throw new LaunchMonitoringError('unconfigured', 'Das Launch-Monitoring ist auf diesem Server noch nicht eingerichtet.');
      if ([401, 403].includes(response.status)) throw new LaunchMonitoringError('permission', 'Für diese Ansicht ist eine gültige Admin-Anmeldung erforderlich.');
      throw new LaunchMonitoringError('network', `Die Monitoring-Abfrage ist fehlgeschlagen (${response.status}). Bitte erneut versuchen.`);
    }
    try { return await response.json(); } catch { invalid(); }
  } catch (error) {
    if (timedOut) throw new LaunchMonitoringError('timeout', 'Die Monitoring-Abfrage dauert zu lange. Bitte erneut versuchen.');
    if (error instanceof LaunchMonitoringError || signal?.aborted) throw error;
    throw new LaunchMonitoringError('network', 'Die Monitoring-Verbindung ist fehlgeschlagen. Bitte erneut versuchen.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function loadLaunchDashboard(connection: MonitoringConnection, filters: LaunchFilters, signal?: AbortSignal) {
  return parseLaunchDashboard(await rpc(connection, 'kws_monitoring_dashboard', launchFilterPayload(filters), signal));
}

export type LiveMonitoring = {
  schema_version: 1; generated_at: string; expires_at: string;
  online: number; accounts: number; guests: number; devices: number; viewing_boulders: number;
  boulders: Array<{ id: string; name: string | null; viewers: number }>;
};

export function parseLiveMonitoring(value: unknown): LiveMonitoring {
  const root = object(value);
  if (root.schema_version !== 1) invalid();
  const result = {
    schema_version: 1 as const, generated_at: timestamp(root.generated_at), expires_at: timestamp(root.expires_at),
    online: count(root.online), accounts: count(root.accounts), guests: count(root.guests), devices: count(root.devices), viewing_boulders: count(root.viewing_boulders),
    boulders: rows(root.boulders, row => ({ id: string(row.id, 36), name: nullableString(row.name), viewers: count(row.viewers) }), 10000),
  };
  if (result.online !== result.accounts + result.guests || result.viewing_boulders > result.online || Date.parse(result.expires_at) <= Date.parse(result.generated_at)) invalid();
  return result;
}

export async function loadLiveMonitoring(connection: MonitoringConnection, filters: LaunchFilters, signal?: AbortSignal): Promise<LiveMonitoring> {
  const { p_platform, p_release } = launchFilterPayload(filters);
  return parseLiveMonitoring(await rpc(connection, 'kws_monitoring_live', { p_platform, p_release }, signal));
}

export async function loadLaunchIssueEvents(connection: MonitoringConnection, fingerprint: string, signal?: AbortSignal): Promise<LaunchIssueEvent[]> {
  return rows(await rpc(connection, 'kws_monitoring_issue_events', { p_fingerprint: string(fingerprint, 256) }, signal), row => ({ event_id: string(row.event_id, 160), occurred_at: timestamp(row.occurred_at), received_at: timestamp(row.received_at), platform: string(row.platform, 40), release: string(row.release, 160), installation_ref: nullableString(row.installation_ref, 160), user_ref: nullableString(row.user_ref, 160), session_ref: nullableString(row.session_ref, 160), props: object(row.props) }), 50);
}

export async function updateLaunchIssueStatus(connection: MonitoringConnection, fingerprint: string, status: string, fixedRelease: string | null) {
  if (!['open', 'acknowledged', 'resolved'].includes(status) || (status === 'resolved' && !fixedRelease?.trim())) invalid();
  const response = object(await rpc(connection, 'kws_monitoring_issue_status', { p_fingerprint: string(fingerprint, 256), p_status: status, p_fixed_release: fixedRelease?.trim() || null }));
  if (response.fingerprint !== fingerprint || response.status !== status || (response.fixed_release ?? null) !== (fixedRelease?.trim() || null)) throw new LaunchMonitoringError('invalid', 'Der neue Fehlerstatus wurde nicht bestätigt. Bitte neu laden.');
  return response;
}

export function safeMonitoringLink(value: string | null): string | undefined {
  if (!value) return undefined;
  try { const parsed = new URL(value); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : undefined; } catch { return undefined; }
}

export function visibleLaunchActivity(rows: LaunchDashboard['activity'], now = Date.now()) {
  return rows.filter(row => { const age = now - Date.parse(row.last_seen_at); return age >= -60_000 && age <= 3 * 60_000; });
}
