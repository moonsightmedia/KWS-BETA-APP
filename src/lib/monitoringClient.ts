export const MONITORING_STORAGE_KEY = 'kws_monitoring_v1';
export const MONITORING_CONSENT_KEY = 'kws_usage_consent_v2';
export const MONITORING_EVENT_PREFIX = MONITORING_STORAGE_KEY + ':event:';
export type MonitoringConsent = 'granted' | 'denied' | 'unknown';
export type MonitoringEventName = 'first_open' | 'session_start' | 'app_ready' | 'foreground' | 'background' | 'foreground_heartbeat' | 'screen_view' | 'boulder_detail_view' | 'play_requested' | 'play_started' | 'play_failed' | 'play_completed' | 'sector_open' | 'filter_applied' | 'search_used' | 'signup_attempt' | 'signup_failed' | 'login_succeeded' | 'login_failed' | 'app_error' | 'notification_opened' | 'notification_client_received';
export type MonitoringProps = Record<string, string | number | boolean>;
export interface MonitoringEvent {
  event_id: string;
  installation_id: string;
  session_id: string;
  name: MonitoringEventName;
  occurred_at: string;
  platform: 'web' | 'android' | 'ios';
  app_version: string;
  release: string;
  channel: string;
  consent: MonitoringConsent;
  boulder_id: string | null;
  props: MonitoringProps;
}
interface PendingEvent { event: MonitoringEvent; owner: string | null }
interface MonitoringState { installation: string; session: string; lastActivity: number; firstOpen: boolean; queue: PendingEvent[] }
export interface MonitoringDependencies {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  storageKeys?: () => string[];
  now: () => number;
  uuid: () => string;
  transport: (events: MonitoringEvent[], owner: string | null) => Promise<{ accepted_ids: string[]; rejected_ids: string[] }>;
  platform: MonitoringEvent['platform'];
  version: string;
  release: string;
  channel: string;
}

const MAX_EVENTS = 200;
const MAX_BYTES = 1_000_000;
const MAX_AGE = 72 * 60 * 60 * 1000;
const SESSION_IDLE = 30 * 60 * 1000;
const allowedProps = new Set(['screen', 'code', 'message', 'stack', 'component', 'severity', 'report_id', 'duration_ms', 'error_code', 'status_code', 'view_id', 'source', 'sector_id', 'filter_count', 'reason', 'notification_id']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function scrubMonitoringText(value: string, limit = 400): string {
  return value
    .replace(/https?:\/\/[^\s)]+/gi, '[url]')
    .replace(/\bBearer\s+\S+/gi, '[credential]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[credential]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/(?:password|passwd|token|secret|authorization|cookie|api[_-]?key)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '[redacted]')
    .replace(/(?:[A-Z]:\\|\/(?:Users|home|private|var)\/)[^\s)]+/gi, '[path]')
    .slice(0, limit);
}

export function safeMonitoringProps(props: MonitoringProps = {}): MonitoringProps {
  const safe: MonitoringProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (!allowedProps.has(key)) continue;
    if (typeof value === 'string') safe[key] = scrubMonitoringText(value, key === 'stack' ? 2500 : 400);
    else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) safe[key] = value;
  }
  return safe;
}

export function monitoringScreen(path: string): string {
  if (/^\/boulders?\/[^/]+$/.test(path)) return 'boulder';
  if (/^\/(?:guest|boulders)(?:\/|$)/.test(path)) return 'boulders';
  if (/^\/(?:auth|app\/(?:login|register)|reset-password)(?:\/|$)/.test(path)) return 'auth';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/statistics')) return 'statistics';
  return path === '/' || path === '/app' ? 'home' : 'other';
}

export class MonitoringClient {
  private state: MonitoringState;
  private owner: string | null = null;
  private consent: MonitoringConsent = 'unknown';
  private flushing: Promise<boolean> | null = null;
  private nextAttempt = 0;
  private failureCount = 0;
  private enabled = true;
  private acknowledgedReports = new Set<string>();
  private memoryOnly = new Set<string>();

  constructor(private readonly dependencies: MonitoringDependencies) {
    const now = dependencies.now();
    this.state = { installation: dependencies.uuid(), session: dependencies.uuid(), lastActivity: now, firstOpen: false, queue: [] };
    try {
      const preference = dependencies.storage.getItem(MONITORING_CONSENT_KEY);
      if (preference === 'granted' || preference === 'denied') this.consent = preference;
      const stored = JSON.parse(dependencies.storage.getItem(MONITORING_STORAGE_KEY) || 'null');
      if (stored && uuidPattern.test(stored.installation) && uuidPattern.test(stored.session)) {
        this.state = {
          installation: stored.installation,
          session: now - Number(stored.lastActivity) < SESSION_IDLE ? stored.session : dependencies.uuid(),
          lastActivity: Number(stored.lastActivity) || now,
          firstOpen: stored.firstOpen === true,
          queue: Array.isArray(stored.queue) ? stored.queue.filter((item: PendingEvent) => this.validPending(item, now)).map((item: PendingEvent) => ({ owner: item.owner, event: { ...item.event, props: safeMonitoringProps(item.event.props) } })).slice(-MAX_EVENTS) : [],
        };
      }
    } catch { this.state.queue = []; }
    if (dependencies.storageKeys) {
      for (const item of this.state.queue) this.storePending(item);
      this.refreshQueue();
    }
    if (this.consent !== 'granted') this.removePending(this.state.queue.filter(item => item.event.name !== 'app_error').map(item => item.event.event_id));
    this.persist();
  }

  private storePending(item: PendingEvent): void {
    if (!this.dependencies.storageKeys) return;
    try { this.dependencies.storage.setItem(MONITORING_EVENT_PREFIX + item.event.event_id, JSON.stringify(item)); }
    catch { this.memoryOnly.add(item.event.event_id); }
  }

  private refreshQueue(): void {
    if (!this.dependencies.storageKeys) return;
    try {
      const events = new Map<string, PendingEvent>();
      for (const key of this.dependencies.storageKeys().filter(key => key.startsWith(MONITORING_EVENT_PREFIX))) {
        try {
          const item = JSON.parse(this.dependencies.storage.getItem(key) || 'null') as PendingEvent;
          if (!this.validPending(item, this.dependencies.now()) || key !== MONITORING_EVENT_PREFIX + item.event.event_id) { this.dependencies.storage.removeItem(key); continue; }
          if (this.consent !== 'granted' && item.event.name !== 'app_error') { this.dependencies.storage.removeItem(key); continue; }
          events.set(item.event.event_id, { owner: item.owner, event: { ...item.event, props: safeMonitoringProps(item.event.props) } });
        } catch { this.dependencies.storage.removeItem(key); }
      }
      for (const item of this.state.queue) if (this.memoryOnly.has(item.event.event_id)) events.set(item.event.event_id, item);
      this.state.queue = [...events.values()].sort((first, second) => first.event.occurred_at.localeCompare(second.event.occurred_at));
    } catch { return; }
  }

  private removePending(ids: string[]): void {
    const removed = new Set(ids);
    if (this.dependencies.storageKeys) for (const id of removed) {
      try { this.dependencies.storage.removeItem(MONITORING_EVENT_PREFIX + id); } catch { this.memoryOnly.delete(id); }
      this.memoryOnly.delete(id);
    }
    this.state.queue = this.state.queue.filter(item => !removed.has(item.event.event_id));
  }

  private validPending(item: PendingEvent, now: number): boolean {
    return Boolean(item && item.event && uuidPattern.test(item.event.event_id) && uuidPattern.test(item.event.installation_id)
      && uuidPattern.test(item.event.session_id) && (item.owner === null || uuidPattern.test(item.owner))
      && Number.isFinite(Date.parse(item.event.occurred_at)) && now - Date.parse(item.event.occurred_at) < MAX_AGE
      && Date.parse(item.event.occurred_at) <= now + 60_000 && typeof item.event.name === 'string' && item.event.props && typeof item.event.props === 'object');
  }

  private persist(): void {
    this.refreshQueue();
    const cutoff = this.dependencies.now() - MAX_AGE;
    this.removePending(this.state.queue.filter(item => Date.parse(item.event.occurred_at) < cutoff).map(item => item.event.event_id));
    while (this.state.queue.length > MAX_EVENTS || new TextEncoder().encode(JSON.stringify(this.state)).length > MAX_BYTES) {
      const disposable = this.state.queue.findIndex(item => item.event.name !== 'app_error');
      this.removePending([this.state.queue[disposable < 0 ? 0 : disposable].event.event_id]);
    }
    try { this.dependencies.storage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(this.dependencies.storageKeys ? { ...this.state, queue: [] } : this.state)); } catch { return; }
  }

  getConsent(): MonitoringConsent { return this.consent; }
  getPendingCount(): number { return this.state.queue.length; }
  getInstallationId(): string { return this.state.installation; }
  isReportAcknowledged(reportId: string): boolean { return this.acknowledgedReports.has(reportId); }

  setEnabled(enabled: boolean): void { this.enabled = enabled; }

  setConsent(consent: MonitoringConsent): void {
    this.consent = consent;
    try { this.dependencies.storage.setItem(MONITORING_CONSENT_KEY, consent); } catch { this.consent = consent; }
    this.refreshQueue();
    if (consent !== 'granted') this.removePending(this.state.queue.filter(item => item.event.name !== 'app_error').map(item => item.event.event_id));
    this.persist();
    if (consent === 'granted') this.startSession();
  }

  setOwner(owner: string | null): void {
    if (this.owner === owner) return;
    this.owner = owner;
    this.refreshQueue();
    this.removePending(this.state.queue.filter(item => item.owner !== null && item.owner !== owner).map(item => item.event.event_id));
    this.state.session = this.dependencies.uuid();
    this.persist();
    if (this.consent === 'granted') this.record('session_start');
  }

  startSession(): void {
    if (this.consent !== 'granted' || !this.enabled) return;
    if (!this.state.firstOpen) {
      if (this.record('first_open')) this.state.firstOpen = true;
    }
    this.record('session_start');
    this.persist();
  }

  record(name: MonitoringEventName, props: MonitoringProps = {}, boulderId: string | null = null): string | null {
    if (!this.enabled || (name !== 'app_error' && this.consent !== 'granted')) return null;
    const now = this.dependencies.now();
    if (now - this.state.lastActivity >= SESSION_IDLE) {
      this.state.session = this.dependencies.uuid();
      this.state.lastActivity = now;
      if (name !== 'session_start' && this.consent === 'granted') this.record('session_start');
    }
    this.state.lastActivity = now;
    const event: MonitoringEvent = {
      event_id: this.dependencies.uuid(), installation_id: this.state.installation, session_id: this.state.session,
      name, occurred_at: new Date(now).toISOString(), platform: this.dependencies.platform,
      app_version: this.dependencies.version, release: this.dependencies.release, channel: this.dependencies.channel,
      consent: this.consent === 'unknown' ? 'denied' : this.consent, boulder_id: boulderId && uuidPattern.test(boulderId) ? boulderId : null, props: safeMonitoringProps(props),
    };
    const pending = { event, owner: this.owner };
    this.state.queue.push(pending);
    this.storePending(pending);
    this.persist();
    return event.event_id;
  }

  flush(force = false): Promise<boolean> {
    if (this.flushing) return this.flushing;
    if (!this.enabled || (!force && this.dependencies.now() < this.nextAttempt)) return Promise.resolve(false);
    this.persist();
    if (!this.state.queue.length) return Promise.resolve(true);
    this.flushing = this.sendBatch().finally(() => { this.flushing = null; });
    return this.flushing;
  }

  private async sendBatch(): Promise<boolean> {
    const eligible = this.state.queue.filter(item => item.owner === null || item.owner === this.owner);
    if (!eligible.length) return false;
    const owner = (eligible.find(item => item.event.name === 'app_error') ?? eligible[0]).owner;
    const pending = eligible.filter(item => item.owner === owner).sort((first, second) => Number(second.event.name === 'app_error') - Number(first.event.name === 'app_error')).slice(0, 20);
    const eventIds = new Set(pending.map(item => item.event.event_id));
    try {
      const result = await this.dependencies.transport(pending.map(item => item.event), owner);
      if (!Array.isArray(result.accepted_ids) || !Array.isArray(result.rejected_ids)
        || [...result.accepted_ids, ...result.rejected_ids].some(id => !eventIds.has(id))
        || new Set([...result.accepted_ids, ...result.rejected_ids]).size !== result.accepted_ids.length + result.rejected_ids.length) throw new Error('Invalid monitoring acknowledgement');
      const settled = new Set([...result.accepted_ids, ...result.rejected_ids]);
      if (!settled.size) throw new Error('No monitoring acknowledgement');
      const accepted = new Set(result.accepted_ids);
      for (const item of pending) {
        if (accepted.has(item.event.event_id) && typeof item.event.props.report_id === 'string') this.acknowledgedReports.add(item.event.props.report_id);
      }
      if (this.acknowledgedReports.size > 200) this.acknowledgedReports = new Set([...this.acknowledgedReports].slice(-200));
      this.removePending([...settled]);
      this.failureCount = 0;
      this.nextAttempt = 0;
      this.persist();
      return true;
    } catch {
      this.failureCount = Math.min(this.failureCount + 1, 8);
      this.nextAttempt = this.dependencies.now() + Math.min(300_000, 2000 * 2 ** this.failureCount);
      this.persist();
      return false;
    }
  }
}
