import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  boulder_new: boolean;
  competition_update: boolean;
  feedback_reply: boolean;
  admin_announcement: boolean;
  schedule_reminder: boolean;
  updated_at: string;
}

export const useNotificationPreferences = () => {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['notification_preferences'],
    queryFn: async () => {
      if (!user || !session) return null;
      
      console.log('[useNotificationPreferences] Loading preferences for user:', user.id);

      // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('[useNotificationPreferences] Supabase-Konfiguration fehlt');
        return null;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/notification_preferences?user_id=eq.${user.id}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useNotificationPreferences] Error loading preferences:', errorText);
        // Don't throw - return null and let component handle it gracefully
        return null;
      }

      const dataArray = await response.json();
      const data = Array.isArray(dataArray) && dataArray.length > 0 ? dataArray[0] : null;

      // If no preferences exist, return null (component will use default values)
      if (!data) {
        console.log('[useNotificationPreferences] No preferences found, returning null');
        return null;
      }

      console.log('[useNotificationPreferences] Preferences loaded:', data);
      return data as NotificationPreferences;
    },
    enabled: !!user && !!session,
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!user) throw new Error('User not authenticated');
      if (!session) throw new Error('No active session');

      console.log('[useUpdateNotificationPreferences] Updating preferences:', preferences);

      // Use direct fetch instead of QueryBuilder to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      const payload = {
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      };

      console.log('[useUpdateNotificationPreferences] Payload:', payload);

      // Use upsert (POST with Prefer: resolution=merge-duplicates)
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/notification_preferences`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useUpdateNotificationPreferences] Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[useUpdateNotificationPreferences] Success:', data);
      
      // Return single object if array
      return (Array.isArray(data) ? data[0] : data) as NotificationPreferences;
    },
    onSuccess: (data) => {
      // Optimistically update the cache immediately
      queryClient.setQueryData(['notification_preferences'], data);
      // Also invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['notification_preferences'] });
      // Don't show toast here - let the calling component handle it
    },
    onError: (error: any) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['notification_preferences'] });
      toast.error('Fehler beim Aktualisieren der Einstellungen', {
        description: error.message,
      });
    },
  });
};

