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
  const { user, session, loading: authLoading } = useAuth();

  const enabled = !authLoading && !!user && !!session;

  const query = useQuery({
    queryKey: ['notifications'],
    enabled: enabled, // Only run query if auth is complete AND user is logged in AND session exists
    queryFn: async () => {
      const startTime = Date.now();
      
      try {
        // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
        // supabase.auth.getSession() hangs on localhost after reload
        if (!session?.user) {
          return [];
        }
      
      // CRITICAL: Use window.fetch directly instead of QueryBuilder
      // QueryBuilder doesn't work reliably on localhost after reload
      // IMPORTANT: RLS uses auth.uid(), so we need the session access token, not just the API key
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }
      
      // Get the access token from the session for RLS
      const accessToken = session.access_token;
      if (!accessToken) {
        console.warn('[useNotifications] No access token in session');
        return [];
      }
      
      const queryUrl = `${SUPABASE_URL}/rest/v1/notifications?select=*&order=created_at.desc&limit=50`;
      
      const response = await window.fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${accessToken}`, // Use session token for RLS
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useNotifications] Error loading notifications:', response.status, errorText);
        throw new Error(`Failed to load notifications: ${response.status} ${errorText}`);
      }
      
        const data = await response.json();
        return (data || []) as Notification[];
      } catch (error: any) {
        console.error('[useNotifications] Error loading notifications:', error);
        throw error;
      }
    },
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
  const { user, session, loading: authLoading } = useAuth();
  
  const enabled = !authLoading && !!user && !!session;
  
  return useQuery({
    queryKey: ['unread_count'],
    enabled: enabled, // Only run query if auth is complete AND user is logged in AND session exists
    queryFn: async () => {
      const startTime = Date.now();
      
      try {
        // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
        // supabase.auth.getSession() hangs on localhost after reload
        if (!session?.user) {
          return 0;
        }
      
      // CRITICAL: Use window.fetch directly instead of RPC
      // RPC might not work reliably on localhost after reload
      // IMPORTANT: RPC uses auth.uid(), so we need the session access token, not just the API key
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Supabase URL or API key not found');
      }
      
      // Get the access token from the session for RPC calls
      const accessToken = session.access_token;
      if (!accessToken) {
        console.warn('[useUnreadCount] No access token in session');
        return 0;
      }
      
      const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_unread_count`;
      
      const response = await window.fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${accessToken}`, // Use session token for RPC that uses auth.uid()
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
        return data || 0;
      } catch (error: any) {
        console.error('[useUnreadCount] Error getting unread count:', error);
        return 0; // Return 0 on error instead of throwing
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase.rpc as any)('mark_notification_read', {
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
      const { error } = await (supabase.rpc as any)('mark_all_notifications_read');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
      toast.success('Alle Benachrichtigungen als gelesen markiert');
    },
  });
};

