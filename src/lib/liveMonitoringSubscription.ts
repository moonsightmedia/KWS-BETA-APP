import { createClient } from '@supabase/supabase-js';
import type { MonitoringConnection } from './launchMonitoring';

export function subscribeLiveMonitoring(connection: MonitoringConnection, invalidate: () => void, status: (connected: boolean) => void): () => void {
  const client = createClient(connection.url, connection.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    accessToken: async () => connection.token,
  });
  let closed = false;
  let channel: ReturnType<typeof client.channel> | null = null;
  void client.realtime.setAuth(connection.token).then(() => {
    if (closed) return;
    channel = client.channel('admin-monitoring-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'monitoring_live_revision' }, payload => {
        if (closed) return;
        if (payload.errors?.length) { status(false); return; }
        if (typeof payload.new.revision === 'string') invalidate();
      })
      .subscribe(state => { if (closed) return; status(state === 'SUBSCRIBED'); if (state === 'SUBSCRIBED') invalidate(); });
  }).catch(() => { if (!closed) status(false); });
  return () => { closed = true; if (channel) void client.removeChannel(channel); client.realtime.disconnect(); };
}
