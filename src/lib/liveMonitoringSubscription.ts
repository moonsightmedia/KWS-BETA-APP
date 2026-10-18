import { createClient } from '@supabase/supabase-js';
import type { MonitoringConnection } from './launchMonitoring';

export function subscribeLiveMonitoring(connection: MonitoringConnection, invalidate: () => void, status: (connected: boolean) => void): () => void {
  const client = createClient(connection.url, connection.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    accessToken: async () => connection.token,
  });
  const channel = client.channel('admin-monitoring-live')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'monitoring_live_revision' }, invalidate)
    .subscribe(state => { status(state === 'SUBSCRIBED'); if (state === 'SUBSCRIBED') invalidate(); });
  return () => { void client.removeChannel(channel); client.realtime.disconnect(); };
}
