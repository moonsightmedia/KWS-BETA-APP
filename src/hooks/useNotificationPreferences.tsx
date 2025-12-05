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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification_preferences'],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useNotificationPreferences] Error loading preferences:', error);
        // Don't throw - return null and let component handle it gracefully
        return null;
      }

      // If no preferences exist, return default values (don't create automatically)
      if (!data) {
        return null; // Component will use default values
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_preferences'] });
      toast.success('Benachrichtigungseinstellungen aktualisiert');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Aktualisieren der Einstellungen', {
        description: error.message,
      });
    },
  });
};

