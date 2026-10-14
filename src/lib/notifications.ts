export type NotificationType = 'boulder_new' | 'competition_update' | 'feedback_reply' | 'admin_announcement' | 'schedule_reminder' | 'competition_result' | 'competition_leaderboard_change';
export interface AppNotification {
  id: string; user_id: string; type: NotificationType; title: string; message: string;
  data: Record<string, unknown>; read: boolean; read_at: string | null; created_at: string; action_url: string | null;
  dismissed_at?: string | null;
}
export interface NotificationFilter { unreadOnly?: boolean; topic?: string }
export type NotificationCursor = Pick<AppNotification, 'id' | 'created_at'>;
export const notificationTopics = [
  { value: 'all', label: 'Alle Themen' }, { value: 'boulder_new', label: 'Boulder' },
  { value: 'schedule_reminder', label: 'Termine' }, { value: 'feedback_reply', label: 'Feedback' },
  { value: 'admin_announcement', label: 'Hallennews' }, { value: 'competition', label: 'Wettkämpfe' },
];
const validId = /^[a-zA-Z0-9-]+$/;
export function notificationQuery(owner: string, filter: NotificationFilter = {}, cursor?: NotificationCursor) {
  if (!validId.test(owner)) throw new Error('Ungültiges Konto.');
  const query = new URLSearchParams({ user_id: `eq.${owner}`, select: '*', order: 'created_at.desc,id.desc', limit: '30' });
  query.set('dismissed_at', 'is.null');
  if (filter.unreadOnly) query.set('read', 'eq.false');
  if (filter.topic === 'competition') query.set('type', 'in.(competition_update,competition_result,competition_leaderboard_change)');
  else if (filter.topic && filter.topic !== 'all') {
    if (!notificationTopics.some(t => t.value === filter.topic)) throw new Error('Ungültiges Thema.');
    query.set('type', `eq.${filter.topic}`);
  }
  if (cursor) {
    if (!validId.test(cursor.id) || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.created_at) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Ungültige Seitenmarkierung.');
    query.set('or', `(created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}))`);
  }
  return `/rest/v1/notifications?${query}`;
}
export function validateNotifications(value: unknown, owner: string): AppNotification[] {
  if (!Array.isArray(value) || value.some(n => !n || n.user_id !== owner || typeof n.id !== 'string' || !validId.test(n.id) || typeof n.read !== 'boolean' || typeof n.title !== 'string' || typeof n.message !== 'string' || !Number.isFinite(Date.parse(n.created_at)))) throw new Error('Mitteilungen konnten nicht sicher zugeordnet werden.');
  return value;
}
export function notificationDestination(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.includes('\\') || [...url].some(char => char.charCodeAt(0) <= 32)) return null;
  try {
    const parsed = new URL(url, 'https://kws.invalid');
    if (parsed.origin !== 'https://kws.invalid') return null;
    const path = decodeURIComponent(parsed.pathname);
    if (path !== parsed.pathname || !/^(?:\/|\/guest|\/boulders(?:\/[a-zA-Z0-9-]+)?|\/statistics|\/sectors|\/profile(?:\/notifications)?|\/setter(?:\/schedule)?|\/competition)$/.test(path)) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return null; }
}
/** Keep batch links short: resolve the owned notification rather than putting
 * hundreds of Boulder IDs into a URL or a native push payload. */
export function notificationTarget(notification: { id?: unknown; type?: unknown; action_url?: unknown }): string | null {
  if (notification.type === 'boulder_new' && typeof notification.id === 'string' && validId.test(notification.id)) {
    return '/boulders?' + new URLSearchParams({ notification: notification.id });
  }
  return notificationDestination(notification.action_url);
}

export function boulderNotificationQuery(owner: string, id: string) {
  if (!validId.test(owner) || !validId.test(id)) throw new Error('Ungültige Mitteilung.');
  return '/rest/v1/notifications?' + new URLSearchParams({ user_id: 'eq.' + owner, id: 'eq.' + id, select: '*', limit: '1' });
}

export function boulderNotificationSelection(value: unknown) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const ids = (many: unknown, single: unknown) => [...new Set([
    ...(Array.isArray(many) ? many : []), single,
  ].filter((id): id is string => typeof id === 'string' && validId.test(id)))];
  const boulderIds = ids(data.boulder_ids, data.boulder_id);
  const sectorIds = ids(data.sector_ids, data.sector_id);
  // latest_* is a sample from a batch, never a replacement for its full list.
  if (!boulderIds.length && !sectorIds.length) throw new Error('Die Boulder dieser Mitteilung sind nicht mehr zugeordnet.');
  return { boulderIds, sectorIds };
}
export function notificationDay(value: string, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Ältere Mitteilungen';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (date >= today) return 'Heute';
  if (date >= yesterday) return 'Gestern';
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}
export function exactNotificationCount(response: Response) {
  const total = response.headers.get('content-range')?.split('/')[1];
  if (!total || !/^\d+$/.test(total)) throw new Error('Anzahl derzeit nicht verfügbar.');
  return Number(total);
}
