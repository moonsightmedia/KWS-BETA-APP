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
  const { user } = useAuth();

  console.log('[useNotifications] Hook called with user:', !!user, 'userId:', user?.id);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Use getSession instead of useAuth to ensure we have the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('[useNotifications] No session found');
        return [];
      }
      
      console.log('[useNotifications] Fetching notifications for user:', session.user.id);
      
      // CRITICAL: Use window.fetch directly instead of QueryBuilder
      // QueryBuilder doesn't work reliably on localhost after reload
      const { getSupabase } = await import('@/integrations/supabase/client');
      const currentSupabase = getSupabase();
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase API key not found');
      }
      
      const queryUrl = `${currentSupabase.supabaseUrl}/rest/v1/notifications?select=*&user_id=eq.${session.user.id}&order=created_at.desc&limit=50`;
      console.log('[useNotifications] 🔵 Query URL:', queryUrl);
      
      const response = await window.fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useNotifications] Error loading notifications:', response.status, errorText);
        throw new Error(`Failed to load notifications: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[useNotifications] ✅ Loaded notifications:', data?.length || 0);
      return (data || []) as Notification[];
    },
    enabled: !!user, // Only run query if user is logged in
    retry: 2,
    retryDelay: 1000,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return; // Don't subscribe if no user
    
    let channel: any = null;
    
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('[useNotifications] No session for Realtime subscription');
        return;
      }

      console.log('[useNotifications] Setting up Realtime subscription for user:', session.user.id);

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
            console.log('[useNotifications] Notification updated, invalidating queries');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread_count'] });
          }
        )
        .subscribe((status) => {
          console.log('[useNotifications] Realtime subscription status:', status);
        });
    })();

    return () => {
      if (channel) {
        console.log('[useNotifications] Cleaning up Realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient, user]);

  return query;
};

export const useUnreadCount = () => {
  const { user } = useAuth();
  
  console.log('[useUnreadCount] Hook called with user:', !!user, 'userId:', user?.id);
  
  return useQuery({
    queryKey: ['unread_count'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('[useUnreadCount] No session found');
        return 0;
      }
      
      console.log('[useUnreadCount] Fetching unread count for user:', session.user.id);
      
      // CRITICAL: Use window.fetch directly instead of RPC
      // RPC might not work reliably on localhost after reload
      const { getSupabase } = await import('@/integrations/supabase/client');
      const currentSupabase = getSupabase();
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase API key not found');
      }
      
      const rpcUrl = `${currentSupabase.supabaseUrl}/rest/v1/rpc/get_unread_count`;
      console.log('[useUnreadCount] 🔵 RPC URL:', rpcUrl);
      
      const response = await window.fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useUnreadCount] Error getting unread count:', response.status, errorText);
        return 0;
      }
      
      const data = await response.json();
      console.log('[useUnreadCount] ✅ Unread count:', data || 0);
      return data || 0;
    },
    enabled: !!user, // Only run query if user is logged in
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
    retryDelay: 1000,
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

