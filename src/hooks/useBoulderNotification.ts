import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { notificationRequest } from '@/lib/notificationRequest';
import { boulderNotificationQuery, boulderNotificationSelection, validateNotifications } from '@/lib/notifications';

/** Resolve cold push opens and old inbox entries with the same owner-scoped read. */
export function useBoulderNotification(id: string | null) {
  const { user, session, loading } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: ['boulder-notification', user?.id, id],
    enabled: id !== null && !loading && !!user && !!session,
    queryFn: async ({ signal }) => {
      const { data } = await notificationRequest(boulderNotificationQuery(user!.id, id!), session?.access_token, { signal });
      const rows = validateNotifications(data, user!.id);
      if (rows.length !== 1 || rows[0].id !== id || rows[0].type !== 'boulder_new') {
        throw new Error('Diese Mitteilung ist nicht mehr verfügbar.');
      }
      const selection = boulderNotificationSelection(rows[0].data);
      // The push can arrive while Home still has fresh pre-upload catalog data.
      await Promise.all([
        client.invalidateQueries({ queryKey: ['boulders'] }, { throwOnError: true }),
        client.invalidateQueries({ queryKey: ['sectors'] }, { throwOnError: true }),
      ]);
      return selection;
    },
    staleTime: 60_000,
    retry: 1,
  });
}
