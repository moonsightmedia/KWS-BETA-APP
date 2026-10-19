import { LaunchMonitoringError, requestMonitoringRpc, type MonitoringConnection } from '@/lib/launchMonitoring';

export type AdminOverviewSource = {
  state: 'ready' | 'empty' | 'unconfigured' | 'stale' | 'error';
  status: string;
  last_updated_at: string | null;
  last_success_at: string | null;
};

export type AdminOverviewData = {
  schema_version: 1;
  generated_at: string;
  period_start: string;
  period_end: string;
  users: { total: number; new_24h: number; admins: number; setters: number; deletions_pending: number; deletions_overdue: number };
  hall: { boulders_hanging: number; boulders_removed: number; areas_active: number; sectors_active: number; scheduled_resets: number };
  moderation: { comments_pending: number; reports_open: number };
  feedback: { people_active: number; legacy_errors_active: number };
  monitoring: { app_active: number; sentry_active: number | null };
  uploads: { failed_24h: number; processing_now: number; video_failed_now: number };
  notifications: { created_24h: number; provider_accepted_24h: number; provider_rejected_24h: number; failed_24h: number; opened_24h: number };
  sources: Record<'collector' | 'sentry' | 'alerts' | 'stores', AdminOverviewSource>;
};

function invalid(): never {
  throw new LaunchMonitoringError('invalid', 'Die Admin-Übersicht hat ein unbekanntes Datenformat. Bitte Einrichtung prüfen.');
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}

function timestamp(value: unknown): string {
  if (typeof value !== 'string' || value.length > 80 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) invalid();
  return value;
}

function nullableTimestamp(value: unknown): string | null {
  return value === null ? null : timestamp(value);
}

function counts<Key extends string>(value: unknown, keys: readonly Key[]): Record<Key, number> {
  const row = object(value);
  return Object.fromEntries(keys.map(key => [key, count(row[key])])) as Record<Key, number>;
}

function source(value: unknown): AdminOverviewSource {
  const row = object(value);
  if (!['ready', 'empty', 'unconfigured', 'stale', 'error'].includes(String(row.state))) invalid();
  if (typeof row.status !== 'string' || !row.status.trim() || row.status.length > 160) invalid();
  return {
    state: row.state as AdminOverviewSource['state'], status: row.status,
    last_updated_at: nullableTimestamp(row.last_updated_at), last_success_at: nullableTimestamp(row.last_success_at),
  };
}

export function parseAdminOverview(value: unknown): AdminOverviewData {
  const root = object(value);
  if (root.schema_version !== 1) invalid();
  const generatedAt = timestamp(root.generated_at);
  const periodStart = timestamp(root.period_start);
  const periodEnd = timestamp(root.period_end);
  if (Date.parse(periodStart) >= Date.parse(periodEnd) || Date.parse(periodEnd) > Date.parse(generatedAt)) invalid();
  const rawSources = object(root.sources);
  const sources = {
    collector: source(rawSources.collector), sentry: source(rawSources.sentry), alerts: source(rawSources.alerts), stores: source(rawSources.stores),
  };
  const monitoring = object(root.monitoring);
  const sentryActive = monitoring.sentry_active === null ? null : count(monitoring.sentry_active);
  if ((sources.sentry.state === 'ready') !== (sentryActive !== null)) invalid();
  return {
    schema_version: 1, generated_at: generatedAt, period_start: periodStart, period_end: periodEnd,
    users: counts(root.users, ['total', 'new_24h', 'admins', 'setters', 'deletions_pending', 'deletions_overdue']),
    hall: counts(root.hall, ['boulders_hanging', 'boulders_removed', 'areas_active', 'sectors_active', 'scheduled_resets']),
    moderation: counts(root.moderation, ['comments_pending', 'reports_open']),
    feedback: counts(root.feedback, ['people_active', 'legacy_errors_active']),
    monitoring: { app_active: count(monitoring.app_active), sentry_active: sentryActive },
    uploads: counts(root.uploads, ['failed_24h', 'processing_now', 'video_failed_now']),
    notifications: counts(root.notifications, ['created_24h', 'provider_accepted_24h', 'provider_rejected_24h', 'failed_24h', 'opened_24h']),
    sources,
  };
}

export async function loadAdminOverview(connection: MonitoringConnection, signal?: AbortSignal): Promise<AdminOverviewData> {
  return parseAdminOverview(await requestMonitoringRpc(connection, 'kws_admin_overview', {}, signal));
}
