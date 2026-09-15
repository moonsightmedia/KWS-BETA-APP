import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useMarkAsRead } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { notificationDestination } from '@/lib/notifications';
import { initializePushNotifications, stopPushListeners } from '@/utils/pushNotifications';

/** Mount once in Root, not once per inbox/query consumer. Receiving never sends. */
export function useNotificationRuntime() {
  const { user, session, loading } = useAuth(); const client = useQueryClient(); const navigate = useNavigate();
  const preferences = useNotificationPreferences(); const prefsRef = useRef(preferences.data); prefsRef.current = preferences.data;
  const sessionRef = useRef(session); sessionRef.current = session;
  const navigateRef = useRef(navigate); navigateRef.current = navigate;
  const mark = useMarkAsRead(); const markRef = useRef(mark.mutateAsync); markRef.current = mark.mutateAsync;
  const owner = user?.id;
  useEffect(() => {
    if (loading || !owner) return;
    let active = true; const seen = new Set<string>();
    const openTarget = (target: string, id?: string) => {
      if (!active) return;
      navigateRef.current(target);
      if (id) void markRef.current(id).catch(() => { if (active) toast.error('Gelesen-Status nicht gespeichert. Die Mitteilung bleibt ungelesen.'); });
    };
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ['notifications', owner] });
      void client.invalidateQueries({ queryKey: ['unread_count', owner] });
    };
    const channel = supabase.channel('notification-inbox-' + owner)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + owner }, payload => {
        if (!active) return;
        refresh();
        const n = payload.new as { id?: string; user_id?: string; title?: string; message?: string; action_url?: string; type?: string };
        const prefs = prefsRef.current;
        const topic = n.type?.startsWith('competition_') ? 'competition_update' : n.type;
        if (payload.eventType !== 'INSERT' || n.user_id !== owner || !n.id || seen.has(n.id) || !prefs?.in_app_enabled || (topic && topic in prefs && !prefs[topic as keyof typeof prefs])) return;
        seen.add(n.id); if (seen.size > 200) seen.delete(seen.values().next().value!);
        const target = notificationDestination(n.action_url);
        toast.info(n.title || 'Neue Mitteilung', { id: 'notification-' + n.id, description: n.message, action: target ? { label: 'Ansehen', onClick: () => openTarget(target, n.id) } : undefined });
      }).subscribe(status => { if (status === 'SUBSCRIBED' && active) refresh(); });
    const open = (event: Event) => { refresh(); const detail = (event as CustomEvent<{ target?: string; id?: string }>).detail; const target = notificationDestination(detail?.target); openTarget(target || '/', detail?.id); };
    window.addEventListener('kws:notification-received', refresh);
    window.addEventListener('kws:notification-open', open);
    return () => { active = false; seen.forEach(id => toast.dismiss('notification-' + id)); void supabase.removeChannel(channel); window.removeEventListener('kws:notification-received', refresh); window.removeEventListener('kws:notification-open', open); };
  }, [owner, loading, client]);
  useEffect(() => {
    if (!owner || loading || !preferences.data?.push_enabled) return;
    const timer = setTimeout(() => { if (sessionRef.current) void initializePushNotifications(sessionRef.current).catch(() => { /* The settings page provides retry and truthful device status. */ }); }, 1000);
    return () => clearTimeout(timer);
  }, [owner, loading, preferences.data?.push_enabled]);
  useEffect(() => () => { void stopPushListeners(); }, [owner]);
}
