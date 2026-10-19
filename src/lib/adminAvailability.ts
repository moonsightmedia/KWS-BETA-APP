import { LaunchMonitoringError, requestMonitoringRpc, type MonitoringConnection } from './launchMonitoring';

export const availabilityServices = { app: 'App', api: 'API', video: 'Videos' } as const;
export type AvailabilityService = keyof typeof availabilityServices;
export type AvailabilityState = 'operational' | 'outage' | 'checking' | 'unknown';
export type AvailabilitySnapshot = {
  generated_at: string;
  services: Array<{ id: AvailabilityService; state: AvailabilityState; checked_at: string | null; latency_ms: number | null; alert_mode: 'live' | 'shadow' | 'silent' }>;
  incidents: Array<{ service: AvailabilityService; state: 'open' | 'resolved'; started_at: string; ended_at: string | null; cause: string }>;
};
export type AdminAvailability = { schema_version: 1; server_time: string; state: 'ready' | 'stale' | 'unconfigured'; snapshot: AvailabilitySnapshot | null };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const service = (value: unknown): value is AvailabilityService => typeof value === 'string' && Object.prototype.hasOwnProperty.call(availabilityServices, value);
const nullableTime = (value: unknown) => value === null || timestamp(value);

export function parseAdminAvailability(value: unknown): AdminAvailability {
  const invalid = () => { throw new LaunchMonitoringError('invalid', 'Der Systemstatus konnte nicht bestätigt werden.'); };
  if (!record(value) || value.schema_version !== 1 || !timestamp(value.server_time) || !['ready', 'stale', 'unconfigured'].includes(String(value.state))) return invalid();
  if (value.snapshot === null) { if (value.state !== 'unconfigured') return invalid(); return value as AdminAvailability; }
  const snapshot = value.snapshot;
  if (value.state === 'unconfigured' || !record(snapshot) || snapshot.schema_version !== 1 || !timestamp(snapshot.generated_at) || !Array.isArray(snapshot.services) || snapshot.services.length !== 3 || !Array.isArray(snapshot.incidents) || snapshot.incidents.length > 12) return invalid();
  const seen = new Set<string>();
  for (const row of snapshot.services) {
    if (!record(row) || !service(row.id) || seen.has(row.id) || !['operational', 'outage', 'checking', 'unknown'].includes(String(row.state)) || !nullableTime(row.checked_at) || !['live', 'shadow', 'silent'].includes(String(row.alert_mode)) || !(row.latency_ms === null || typeof row.latency_ms === 'number' && Number.isSafeInteger(row.latency_ms) && row.latency_ms >= 0 && row.latency_ms <= 300000)) return invalid();
    seen.add(row.id);
  }
  for (const row of snapshot.incidents) if (!record(row) || !service(row.service) || !['open', 'resolved'].includes(String(row.state)) || !timestamp(row.started_at) || !nullableTime(row.ended_at) || typeof row.cause !== 'string' || !['http_status', 'redirect', 'timeout', 'dns', 'tls', 'connection', 'destination_policy', 'other'].includes(row.cause)) return invalid();
  return value as AdminAvailability;
}

export function availabilityState(data: AdminAvailability | undefined, checkedAt: string | null, state: AvailabilityState, elapsedMs: number, failed: boolean): AvailabilityState {
  if (!data || data.state !== 'ready' || !data.snapshot || failed || !checkedAt) return 'unknown';
  const current = Date.parse(data.server_time) + Math.max(0, elapsedMs);
  if (current - Date.parse(data.snapshot.generated_at) >= 180000 || current - Date.parse(checkedAt) >= 180000 || Date.parse(checkedAt) > current + 30000 || Date.parse(data.snapshot.generated_at) > current + 30000) return 'unknown';
  return state;
}

export async function loadAdminAvailability(connection: MonitoringConnection, signal?: AbortSignal): Promise<AdminAvailability> {
  return parseAdminAvailability(await requestMonitoringRpc(connection, 'kws_admin_availability', {}, signal));
}
