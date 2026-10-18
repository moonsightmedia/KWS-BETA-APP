import type { MonitoringConnection } from '@/lib/launchMonitoring';

export function subscribeLiveMonitoring(_connection: MonitoringConnection, invalidate: () => void, status: (connected: boolean) => void): () => void {
  const update = () => invalidate();
  const connection = () => status(!window.launchMonitoringQA.liveDisconnected);
  window.addEventListener('qa:live-update', update);
  window.addEventListener('qa:live-connection', connection);
  connection();
  return () => { window.removeEventListener('qa:live-update', update); window.removeEventListener('qa:live-connection', connection); };
}
