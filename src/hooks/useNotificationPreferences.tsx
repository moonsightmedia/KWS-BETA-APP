import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { notificationRequest } from '@/lib/notificationRequest';

export const preferenceKeys = ['in_app_enabled', 'push_enabled', 'boulder_new', 'competition_update', 'feedback_reply', 'admin_announcement', 'schedule_reminder'] as const;
export type PreferenceKey = typeof preferenceKeys[number];
export type NotificationPreferences = Record<PreferenceKey, boolean> & { user_id: string; updated_at: string };
export const defaultNotificationPreferences = { in_app_enabled: true, push_enabled: false, boulder_new: true, competition_update: true, feedback_reply: true, admin_announcement: true, schedule_reminder: true };
function validate(value: unknown, owner: string): NotificationPreferences {
  const row = Array.isArray(value) && value.length === 1 ? value[0] : null;
  if (!row || row.user_id !== owner || preferenceKeys.some(key => typeof row[key] !== 'boolean')) throw new Error('Einstellungen konnten nicht bestätigt werden.');
  return row;
}
export function useNotificationPreferences() {
  const { user, session, loading } = useAuth();
  return useQuery({
    queryKey: ['notification_preferences', user?.id], enabled: !loading && !!user && !!session,
    queryFn: async ({ signal }) => {
      const { data } = await notificationRequest('/rest/v1/notification_preferences?user_id=eq.' + encodeURIComponent(user!.id) + '&select=*', session?.access_token, { signal });
      // Missing preferences require explicit setup. Do not display defaults as saved.
      if (Array.isArray(data) && data.length === 0) return { ...defaultNotificationPreferences, user_id: user!.id, updated_at: '' };
      return validate(data, user!.id);
    }, staleTime: 15000, retry: 1,
  });
}
export function useUpdateNotificationPreferences() {
  const { user, session } = useAuth(); const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: Partial<Record<PreferenceKey, boolean>>) => {
      if (!user || !Object.keys(change).length || Object.entries(change).some(([key, value]) => !preferenceKeys.includes(key as PreferenceKey) || typeof value !== 'boolean')) throw new Error('Ungültige Einstellung.');
      const { data } = await notificationRequest('/rest/v1/notification_preferences?on_conflict=user_id', session?.access_token, {
        method: 'POST', headers: { Prefer: 'return=representation,resolution=merge-duplicates' }, body: JSON.stringify({ ...change, user_id: user.id }),
      });
      const result = validate(data, user.id);
      if (Object.entries(change).some(([key, value]) => result[key as PreferenceKey] !== value)) throw new Error('Die Änderung wurde nicht bestätigt.');
      return result;
    },
    onSuccess: data => { client.setQueryData(['notification_preferences', data.user_id], data); },
  });
}

