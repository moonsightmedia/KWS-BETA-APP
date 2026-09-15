export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type FeedbackType = 'error' | 'bug' | 'feature' | 'general' | 'other';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackSource = 'people' | 'errors';
export type FeedbackSort = 'newest' | 'oldest' | 'priority';
export interface FeedbackSummary {
  id: string;
  type: FeedbackType;
  title: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  created_at: string;
  url: string | null;
  fingerprint?: string | null;
  release?: string | null;
}
export interface Feedback extends FeedbackSummary {
  description: string;
  user_email: string | null;
  screenshot_url: string | null;
  browser_info: Record<string, unknown> | null;
  error_details: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
  resolved_at: string | null;
}
export interface FeedbackFilters {
  source: FeedbackSource;
  search: string;
  status: FeedbackStatus | 'all';
  type: FeedbackType | 'all';
  priority: FeedbackPriority | 'all';
  period: 'all' | '7' | '30' | '90';
  sort: FeedbackSort;
}
export interface FeedbackConnection { url: string; key: string; token: string }
export const statusLabels: Record<FeedbackStatus, string> = { open: 'Offen', in_progress: 'In Arbeit', resolved: 'Gelöst', closed: 'Geschlossen' };
export const typeLabels: Record<FeedbackType, string> = { error: 'Automatischer Fehler', bug: 'Problem', feature: 'Idee', general: 'Rückmeldung', other: 'Sonstiges' };
export const priorityLabels: Record<FeedbackPriority, string> = { critical: 'Kritisch', high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };
export const sortLabels: Record<FeedbackSort, string> = { newest: 'Neueste zuerst', oldest: 'Älteste zuerst', priority: 'Priorität zuerst' };
export const priorityRank: Record<FeedbackPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
export const defaultFeedbackFilters: FeedbackFilters = { source: 'people', search: '', status: 'all', type: 'all', priority: 'all', period: 'all', sort: 'newest' };
const summaryFields = 'id,type,title,status,priority,created_at,url,fingerprint:metadata->>fingerprint,release:metadata->>release';

function quoted(value: string) { return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; }

// Quotes protect PostgREST logic delimiters; regex escaping makes the search literal,
// including *, %, commas, parentheses and quotes (no LIKE wildcard expansion).
export function feedbackQuery(filters: FeedbackFilters, snapshot: string) {
  const params = new URLSearchParams({ select: summaryFields, order: 'created_at.desc,id.desc' });
  params.set('type', filters.source === 'errors' ? 'eq.error' : filters.type === 'all' ? 'neq.error' : `eq.${filters.type}`);
  if (filters.status !== 'all') params.set('status', `eq.${filters.status}`);
  if (filters.priority !== 'all') params.set('priority', `eq.${filters.priority}`);
  params.append('created_at', `lte.${snapshot}`);
  if (filters.period !== 'all') params.append('created_at', `gte.${new Date(new Date(snapshot).getTime() - Number(filters.period) * 86400000).toISOString()}`);
  const search = filters.search.trim();
  if (search) {
    const expression = quoted(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    params.set('or', `(${['title', 'description', 'user_email'].map(field => `${field}.imatch.${expression}`).join(',')})`);
  }
  return params;
}

async function request(connection: FeedbackConnection, params: URLSearchParams, init: RequestInit = {}) {
  if (!connection.url || !connection.key || !connection.token) throw new Error('Bitte erneut anmelden.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${connection.url}/rest/v1/feedback?${params}`, {
      ...init,
      signal: controller.signal,
      headers: { apikey: connection.key, Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Keine Berechtigung. Bitte erneut anmelden.' : `Anfrage fehlgeschlagen (${response.status}). Bitte erneut versuchen.`);
    const body = init.method === 'HEAD' ? '' : await response.text();
    return { headers: response.headers, data: body ? JSON.parse(body) as unknown : [] };
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) throw new Error('Die Anfrage dauert zu lange. Bitte erneut versuchen.');
    throw error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abort);
  }
}

// Walk a stable, lightweight index instead of select=* or assuming the API cap is
// the total. Keyset pagination also works when the server returns fewer than 500.
// Only the visible 30 rows/groups are rendered; large detail fields are lazy loaded.
export async function loadFeedbackIndex(connection: FeedbackConnection, filters: FeedbackFilters, signal?: AbortSignal): Promise<FeedbackSummary[]> {
  const snapshot = new Date().toISOString();
  const base = feedbackQuery(filters, snapshot);
  const rows = new Map<string, FeedbackSummary>();
  let cursor: FeedbackSummary | undefined;
  for (let page = 0; page < 10000; page++) {
    const params = new URLSearchParams(base);
    params.set('limit', '500');
    if (cursor) params.set('and', `(or(created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${quoted(cursor.id)})))`);
    const response = await request(connection, params, { signal });
    const batch = response.data as FeedbackSummary[];
    if (!Array.isArray(batch)) throw new Error('Ungültige Antwort beim Laden.');
    if (!batch.length) return sortFeedback([...rows.values()], filters.sort);
    const before = rows.size;
    batch.forEach(row => rows.set(row.id, row));
    if (rows.size === before) throw new Error('Weitere Einträge konnten nicht sicher geladen werden. Bitte erneut versuchen.');
    cursor = batch[batch.length - 1];
  }
  throw new Error('Zu viele Einträge. Bitte den Zeitraum eingrenzen.');
}

export async function countFeedback(connection: FeedbackConnection, source: FeedbackSource, signal?: AbortSignal) {
  const params = new URLSearchParams({ select: 'id', type: source === 'errors' ? 'eq.error' : 'neq.error' });
  const response = await request(connection, params, { method: 'HEAD', signal, headers: { Prefer: 'count=exact' } });
  const total = response.headers.get('content-range')?.split('/')[1];
  return total && /^\d+$/.test(total) ? Number(total) : null;
}

export async function loadFeedbackDetail(connection: FeedbackConnection, id: string, signal?: AbortSignal) {
  const response = await request(connection, new URLSearchParams({ select: '*', id: `eq.${id}` }), { signal });
  const rows = response.data as Feedback[];
  if (!Array.isArray(rows) || !rows[0]) throw new Error('Dieser Eintrag ist nicht mehr verfügbar.');
  return rows[0];
}

export function sortFeedback<T extends FeedbackSummary>(rows: T[], sort: FeedbackSort): T[] {
  return [...rows].sort((a, b) => (sort === 'priority' ? priorityRank[a.priority] - priorityRank[b.priority] : 0)
    || (sort === 'oldest' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)) || a.id.localeCompare(b.id));
}
export function safeFeedbackUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export function feedbackLocation(value: string | null): string {
  const safe = safeFeedbackUrl(value);
  if (!safe) return 'Unbekannte Seite';
  const url = new URL(safe);
  return `${url.host}${url.pathname}`;
}
export function feedbackGroupKey(row: FeedbackSummary) {
  // Older reports have no fingerprint. Label these as same-message groups, not
  // proven root causes. Separate site/path/release so dev and production do not mix.
  return JSON.stringify([row.fingerprint || row.title, feedbackLocation(row.url), row.release || '']);
}
export interface FeedbackGroup { key: string; title: string; rows: FeedbackSummary[]; first: string; last: string; open: number; priority: FeedbackPriority; location: string; release: string | null }
export function groupFeedback(rows: FeedbackSummary[], sort: FeedbackSort): FeedbackGroup[] {
  const grouped = new Map<string, FeedbackSummary[]>();
  for (const row of rows) { const key = feedbackGroupKey(row); const group = grouped.get(key) || []; group.push(row); grouped.set(key, group); }
  return [...grouped.entries()].map(([key, values]) => {
    const sorted = sortFeedback(values, 'newest');
    return { key, title: sorted[0].title.replace(/^Fehler:\s*/, ''), rows: sortFeedback(sorted, sort), first: sorted[sorted.length - 1].created_at, last: sorted[0].created_at,
      open: sorted.filter(row => row.status === 'open' || row.status === 'in_progress').length, priority: sortFeedback(sorted, 'priority')[0].priority, location: feedbackLocation(sorted[0].url), release: sorted[0].release || null };
  }).sort((a, b) => (sort === 'priority' ? priorityRank[a.priority] - priorityRank[b.priority] : 0) || (sort === 'oldest' ? a.first.localeCompare(b.first) : b.last.localeCompare(a.last)) || a.key.localeCompare(b.key));
}

export interface FeedbackDraft { title: string; description: string; type: FeedbackType; status: FeedbackStatus; priority: FeedbackPriority }
export function feedbackDraft(row: Feedback): FeedbackDraft { return { title: row.title, description: row.description, type: row.type, status: row.status, priority: row.priority }; }
export async function saveFeedback(connection: FeedbackConnection, row: Feedback, draft: FeedbackDraft, userId: string) {
  if (!draft.title.trim()) throw new Error('Bitte einen Titel eingeben.');
  const patch = { ...draft, title: draft.title.trim(), description: draft.description.trim(), updated_at: new Date().toISOString(), resolved_at: draft.status === 'resolved' ? row.resolved_at || new Date().toISOString() : null, resolved_by: draft.status === 'resolved' ? userId : null };
  // Optimistic concurrency: an outdated editor must not overwrite another admin.
  const response = await request(connection, new URLSearchParams({ id: `eq.${row.id}`, updated_at: `eq.${row.updated_at}` }), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
  const rows = response.data as Feedback[];
  if (!Array.isArray(rows) || !rows.some(result => result.id === row.id && result.title === patch.title && result.description === patch.description && result.status === patch.status && result.priority === patch.priority && result.type === patch.type)) throw new Error('Speichern nicht bestätigt. Der Eintrag wurde möglicherweise inzwischen geändert. Entwurf bleibt erhalten.');
}

export class FeedbackWriteError extends Error {
  constructor(message: string, public confirmed: string[]) { super(message); }
}
export async function writeFeedbackBatch(connection: FeedbackConnection, ids: string[], action: 'delete' | FeedbackStatus, userId: string, progress?: (done: number) => void) {
  const unique = [...new Set(ids)];
  const confirmed: string[] = [];
  for (let start = 0; start < unique.length; start += 50) {
    const chunk = unique.slice(start, start + 50);
    try {
      const response = await request(connection, new URLSearchParams({ id: `in.(${chunk.map(quoted).join(',')})` }), {
        method: action === 'delete' ? 'DELETE' : 'PATCH', headers: { Prefer: 'return=representation' },
        ...(action === 'delete' ? {} : { body: JSON.stringify({ status: action, updated_at: new Date().toISOString(), resolved_at: action === 'resolved' ? new Date().toISOString() : null, resolved_by: action === 'resolved' ? userId : null }) }),
      });
      const rows = response.data as Array<{ id: string; status?: FeedbackStatus }>;
      if (!Array.isArray(rows)) throw new Error('Ungültige Bestätigung.');
      const matches = chunk.filter(id => rows.some(row => row.id === id && (action === 'delete' || row.status === action)));
      confirmed.push(...matches);
      progress?.(confirmed.length);
      if (matches.length !== chunk.length) throw new Error('Nicht alle Einträge wurden bestätigt.');
    } catch (error) {
      throw new FeedbackWriteError(`${confirmed.length} von ${unique.length} bestätigt. ${error instanceof Error ? error.message : 'Anfrage fehlgeschlagen.'} Bestand wird neu geladen.`, confirmed);
    }
  }
  return confirmed;
}
