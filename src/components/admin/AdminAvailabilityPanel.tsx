import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleHelp, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { availabilityServices, availabilityState, loadAdminAvailability } from '@/lib/adminAvailability';
import { LaunchMonitoringError, type MonitoringConnection } from '@/lib/launchMonitoring';

const labels = { operational: 'In Ordnung', outage: 'Störung', checking: 'Prüfung auffällig', unknown: 'Nicht bestätigt' };
const causes: Record<string, string> = { timeout: 'Zeitüberschreitung', http_status: 'Fehlerhafte Serverantwort', dns: 'Adresse nicht auflösbar', tls: 'Verschlüsselte Verbindung fehlgeschlagen', connection: 'Verbindung fehlgeschlagen', redirect: 'Unerwartete Weiterleitung', destination_policy: 'Prüfung blockiert', other: 'Erreichbarkeit gestört' };
const dateTime = (value: string) => new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function AdminAvailabilityPanel({ connection, accountId }: { connection: MonitoringConnection; accountId: string }) {
  const [now, setNow] = useState(Date.now);
  const { data, error, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin-availability', connection.url, accountId], queryFn: ({ signal }) => loadAdminAvailability(connection, signal),
    enabled: Boolean(connection.token && accountId), retry: false, staleTime: 15000, gcTime: 0, refetchInterval: 30000, refetchIntervalInBackground: false,
  });
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const denied = !connection.token || !accountId || error instanceof LaunchMonitoringError && error.kind === 'permission';
  const snapshot = denied ? undefined : data?.snapshot;
  const services = Object.entries(availabilityServices).map(([id, name]) => {
    const value = snapshot?.services.find(row => row.id === id);
    return { id, name, value, state: availabilityState(denied ? undefined : data, value?.checked_at || null, value?.state || 'unknown', now - dataUpdatedAt, Boolean(error)) };
  });
  const confirmed = services.every(row => row.state !== 'unknown');
  const headline = services.some(row => row.state === 'outage') ? 'Störung erkannt' : !confirmed ? 'Status nicht bestätigt' : services.some(row => row.state === 'checking') ? 'Eine Prüfung ist auffällig' : 'Alle Dienste erreichbar';
  return <section aria-label="Systemstatus" data-testid="admin-availability"><KwsSurface className="overflow-hidden">
    <div className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><h2 className="flex items-center gap-2 text-base font-semibold"><Server className="h-4 w-4 shrink-0" aria-hidden="true" />Systemstatus</h2><p role="status" className="mt-1 text-sm">{isFetching && !data ? 'Externe Prüfungen werden geladen …' : headline}</p></div><Button variant="ghost" size="icon" aria-label="Systemstatus aktualisieren" disabled={isFetching || denied} onClick={() => void refetch()}><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" /></Button></div>
    <ul className="grid divide-y divide-border/50 border-t border-border/50 md:grid-cols-3 md:divide-x md:divide-y-0">{services.map(row => {
      const Icon = row.state === 'operational' ? CheckCircle2 : row.state === 'unknown' ? CircleHelp : AlertTriangle;
      return <li key={row.id} className="min-w-0 p-4"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${row.state === 'operational' ? 'text-primary-ink' : row.state === 'outage' ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden="true" /><h3 className="text-sm font-semibold">{row.name}</h3><span className="ml-auto rounded-kws-badge bg-secondary px-2 py-1 text-xs font-medium">{labels[row.state]}</span></div><p className="mt-2 text-xs text-muted-foreground">{row.value?.checked_at ? `Letzte Prüfung ${dateTime(row.value.checked_at)}` : 'Noch keine Messung bestätigt.'}</p>{row.value && <p className="mt-1 text-xs text-muted-foreground">{row.value.alert_mode === 'live' ? 'Telegram-Alarme aktiv' : row.value.alert_mode === 'shadow' ? 'Nur Beobachtung · keine Alarme' : 'Alarme pausiert'}{row.state === 'unknown' ? ' · letzter gemeldeter Stand' : ''}</p>}</li>;
    })}</ul>
    {(error || !confirmed && !isFetching) && <p role="alert" className="border-t border-border/50 px-4 py-3 text-sm text-muted-foreground">{denied ? 'Bitte erneut als Administrator anmelden.' : data?.state === 'unconfigured' || error instanceof LaunchMonitoringError && error.kind === 'unconfigured' ? 'Die externe Statusübertragung ist noch nicht eingerichtet.' : 'Messwerte fehlen, sind veraltet oder konnten nicht aktualisiert werden. Kein bestätigter Ausfall – aber auch keine Entwarnung.'}</p>}
    {Boolean(snapshot?.incidents.length) && <details className="border-t border-border/50 px-4"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Letzte Störungen ({snapshot!.incidents.length})</summary><ul className="divide-y divide-border/50 pb-2">{snapshot!.incidents.map((entry, index) => <li key={`${entry.service}-${entry.started_at}-${index}`} className="space-y-1 py-3 text-xs"><p className="font-semibold">{availabilityServices[entry.service]} · {entry.state === 'open' ? 'Offen im letzten Prüfstand' : 'Behoben'}</p><p className="text-muted-foreground">{causes[entry.cause]} · Beginn {dateTime(entry.started_at)}{entry.ended_at ? ` · Entwarnung ${dateTime(entry.ended_at)}` : ''}</p></li>)}</ul></details>}
    <p className="border-t border-border/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">Extern jede Minute geprüft · Anzeige alle 30 Sekunden aktualisiert. API und Videos: Gesundheitsprüfung, kein vollständiger Funktionstest. Bei einem Totalausfall dieser App bleiben die externen Telegram-Alarme aktiv.</p>
  </KwsSurface></section>;
}
