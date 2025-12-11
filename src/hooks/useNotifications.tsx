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
        const notifications = (data || []) as Notification[];
        console.log(`[useNotifications] ✅ Loaded ${notifications.length} notifications from database`);
        if (notifications.length > 0) {
          console.log('[useNotifications] 📋 Latest notification:', notifications[0]);
        }
        return notifications;
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
    if (!user || !session) {
      console.log('[useNotifications] No user or session, skipping Realtime subscription');
      return; // Don't subscribe if no user or session
    }
    
    let channel: any = null;

    console.log('[useNotifications] Setting up Realtime subscription for user:', user.id);

    channel = supabase
      .channel(`notifications_for_user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[useNotifications] 🔔🔔🔔 NEW NOTIFICATION RECEIVED VIA REALTIME:', payload.new);
          console.log('[useNotifications] 🔔 Payload details:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          });
          
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread_count'] });
          
          // Show toast for new notification
          const notification = payload.new as Notification;
          console.log('[useNotifications] 📨 Notification details:', {
            id: notification.id,
            user_id: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
          });
          
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
          });

          // CRITICAL: Skip automatic push notifications for boulder_new events
          // Push notifications are now sent manually by BatchUpload component after batch upload completes
          // This ensures reliable batching and prevents duplicate notifications
          const boulderCount = notification.data?.boulder_count || 1;
          
          if (notification.type === 'boulder_new') {
            if (boulderCount > 1) {
              console.log('[useNotifications] ⏭️ Skipping push notification for batch notification (boulder_count:', boulderCount, ') - BatchUpload will send push notification manually');
            } else {
              console.log('[useNotifications] ⏭️ Skipping push notification for single boulder notification - notifications are now handled manually by BatchUpload component');
            }
            return;
          }
          
          // For other notification types, send push notification normally
          setTimeout(async () => {
            try {
              const { sendPushNotificationForNotification } = await import('@/services/pushNotifications');
              await sendPushNotificationForNotification(notification.id, session);
              console.log('[useNotifications] ✅ Push notification sent successfully for notification:', notification.id);
            } catch (error) {
              console.error('[useNotifications] ❌ Error sending push notification:', error);
              // Don't throw - push notifications are optional
            }
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[useNotifications] Notification updated, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread_count'] });
        }
      )
      .subscribe((status) => {
        console.log('[useNotifications] 🔔 Realtime subscription status:', status);
        console.log('[useNotifications] 🔔 Channel details:', {
          status,
          user_id: user.id,
          channel_name: `notifications_for_user_${user.id}`,
        });
        if (status === 'SUBSCRIBED') {
          console.log('[useNotifications] ✅✅✅ Successfully subscribed to Realtime channel - ready to receive notifications!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useNotifications] ❌ Realtime channel error');
        } else if (status === 'TIMED_OUT') {
          console.error('[useNotifications] ❌ Realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('[useNotifications] ⚠️ Realtime subscription closed');
        } else {
          console.log('[useNotifications] 🔄 Realtime subscription status:', status);
        }
      });

    return () => {
      if (channel) {
        console.log('[useNotifications] Cleaning up Realtime subscription for user:', user.id);
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [queryClient, user, session]); // Include session in dependencies

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
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('[useMarkAsRead] 🔵 Marking notification as read:', notificationId);
      
      // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
      // supabase.auth.getSession() hangs on localhost after reload
      let currentSession = session;
      
      if (!currentSession?.access_token) {
        // Try to get session with timeout as fallback
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
        );
        
        try {
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session: fetchedSession } } = sessionResult as any;
          if (!fetchedSession?.access_token) {
            throw new Error('Nicht angemeldet. Bitte melde dich an.');
          }
          currentSession = fetchedSession;
        } catch (timeoutError) {
          console.error('[useMarkAsRead] ❌ Session timeout:', timeoutError);
          throw new Error('Session timeout - bitte Seite neu laden');
        }
      }
      
      if (!currentSession?.access_token) {
        throw new Error('Nicht angemeldet. Bitte melde dich an.');
      }
      
      console.log('[useMarkAsRead] ✅ Session obtained');

      // Use direct fetch instead of RPC to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      // Use direct PATCH to update the notification
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            read: true,
            read_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useMarkAsRead] ❌ Error marking as read:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log('[useMarkAsRead] ✅ Notification marked as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
    },
    onError: (error) => {
      console.error('[useMarkAsRead] ❌ Error:', error);
      toast.error('Fehler beim Markieren als gelesen: ' + error.message);
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { session, user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      console.log('[useMarkAllAsRead] 🔵 Marking all notifications as read');
      
      // CRITICAL: Use session from useAuth hook instead of supabase.auth.getSession()
      // supabase.auth.getSession() hangs on localhost after reload
      let currentSession = session;
      
      if (!currentSession?.access_token || !user) {
        // Try to get session with timeout as fallback
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
        );
        
        try {
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data: { session: fetchedSession } } = sessionResult as any;
          if (!fetchedSession?.access_token) {
            throw new Error('Nicht angemeldet. Bitte melde dich an.');
          }
          currentSession = fetchedSession;
        } catch (timeoutError) {
          console.error('[useMarkAllAsRead] ❌ Session timeout:', timeoutError);
          throw new Error('Session timeout - bitte Seite neu laden');
        }
      }
      
      if (!currentSession?.access_token || !user) {
        throw new Error('Nicht angemeldet. Bitte melde dich an.');
      }
      
      console.log('[useMarkAllAsRead] ✅ Session obtained');

      // Use direct fetch instead of RPC to avoid hanging issues after reload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      // Use direct PATCH to update all notifications for the user
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&read=eq.false`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            read: true,
            read_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useMarkAllAsRead] ❌ Error marking all as read:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log('[useMarkAllAsRead] ✅ All notifications marked as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
      toast.success('Alle Benachrichtigungen als gelesen markiert');
    },
    onError: (error) => {
      console.error('[useMarkAllAsRead] ❌ Error:', error);
      toast.error('Fehler beim Markieren aller als gelesen: ' + error.message);
    },
  });
};

