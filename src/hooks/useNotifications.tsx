import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: 'boulder_new' | 'competition_update' | 'feedback_reply' | 'admin_announcement' | 'schedule_reminder' | 'competition_result' | 'competition_leaderboard_change';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  read_at: string | null;
  created_at: string;
  action_url: string | null;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Use getSession instead of useAuth to ensure we have the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useNotifications] Error loading notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    },
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    let channel: any = null;
    
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('[useNotifications] New notification received:', payload.new);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread_count'] });
            
            // Show toast for new notification
            const notification = payload.new as Notification;
            toast.info(notification.title, {
              description: notification.message,
              duration: 5000,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread_count'] });
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return query;
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['unread_count'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return 0;
      
      const { data, error } = await supabase.rpc('get_unread_count');

      if (error) {
        console.error('[useUnreadCount] Error getting unread count:', error);
        return 0;
      }

      return data || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
      toast.success('Alle Benachrichtigungen als gelesen markiert');
    },
  });
};

