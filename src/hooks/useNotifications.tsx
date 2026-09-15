import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { notificationRequest } from '@/lib/notificationRequest';
import { exactNotificationCount, notificationQuery, validateNotifications, type AppNotification, type NotificationCursor, type NotificationFilter } from '@/lib/notifications';
export type Notification = AppNotification;

export function useNotifications(filter: NotificationFilter = {}, active = true) {
  const { user, session, loading } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['notifications', user?.id, filter.unreadOnly ?? false, filter.topic ?? 'all'],
    enabled: active && !loading && !!user && !!session,
    initialPageParam: undefined as NotificationCursor | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await notificationRequest(notificationQuery(user!.id, filter, pageParam), session?.access_token, { signal });
      const rows = validateNotifications(data, user!.id);
      if (pageParam && rows.some(row => Date.parse(row.created_at) > Date.parse(pageParam.created_at) || (Date.parse(row.created_at) === Date.parse(pageParam.created_at) && row.id >= pageParam.id))) throw new Error('Ältere Mitteilungen konnten nicht sicher geladen werden.');
      return rows;
    },
    // The server may cap rows below our requested size; stop on an empty page.
    getNextPageParam: last => last.length ? { id: last[last.length - 1].id, created_at: last[last.length - 1].created_at } : undefined,
    staleTime: 15000, refetchInterval: 30000, retry: 1,
  });
  const data = query.data ? [...new Map(query.data.pages.flat().map(n => [n.id, n])).values()] : undefined;
  return { ...query, data };
}
export function useUnreadCount() {
  const { user, session, loading } = useAuth();
  return useQuery({
    queryKey: ['unread_count', user?.id], enabled: !loading && !!user && !!session,
    queryFn: async ({ signal }) => {
      const q = new URLSearchParams({ user_id: 'eq.' + user!.id, read: 'eq.false', select: 'id', limit: '1' });
      const { response } = await notificationRequest('/rest/v1/notifications?' + q, session?.access_token, { signal, headers: { Prefer: 'count=exact' } });
      return exactNotificationCount(response);
    }, staleTime: 15000, refetchInterval: 30000, retry: 1,
  });
}
export function useMarkAsRead() {
  const { user, session } = useAuth(); const client = useQueryClient();
  return useMutation({
    mutationKey: ['notification-read', user?.id],
    mutationFn: async (id: string) => {
      if (!user || !id) throw new Error('Bitte melde dich erneut an.');
      const q = new URLSearchParams({ id: 'eq.' + id, user_id: 'eq.' + user.id });
      const { data } = await notificationRequest('/rest/v1/notifications?' + q, session?.access_token, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ read: true, read_at: new Date().toISOString() }),
      });
      const rows = validateNotifications(data, user.id);
      if (rows.length !== 1 || rows[0].id !== id || !rows[0].read) throw new Error('Gelesen-Status konnte nicht bestätigt werden.');
      return rows[0];
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['notifications', user?.id] }), client.invalidateQueries({ queryKey: ['unread_count', user?.id] })]),
  });
}
export function useMarkAllAsRead() {
  const { user, session } = useAuth(); const client = useQueryClient();
  return useMutation({
    mutationKey: ['notification-read', user?.id],
    mutationFn: async () => {
      if (!user) throw new Error('Bitte melde dich erneut an.');
      const cutoff = new Date().toISOString();
      const q = new URLSearchParams({ user_id: 'eq.' + user.id, read: 'eq.false', created_at: 'lte.' + cutoff });
      await notificationRequest('/rest/v1/notifications?' + q, session?.access_token, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ read: true, read_at: cutoff }),
      });
      q.set('select', 'id'); q.set('limit', '1');
      const { data } = await notificationRequest('/rest/v1/notifications?' + q, session?.access_token);
      if (!Array.isArray(data) || data.length) throw new Error('Nicht alle Mitteilungen wurden bestätigt. Bitte aktualisieren.');
    },
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: ['notifications', user?.id] }), client.invalidateQueries({ queryKey: ['unread_count', user?.id] })]),
  });
}

