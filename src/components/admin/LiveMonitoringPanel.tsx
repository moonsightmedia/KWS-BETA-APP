import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { loadLiveMonitoring, type LaunchFilters, type MonitoringConnection } from '@/lib/launchMonitoring';
import { subscribeLiveMonitoring } from '@/lib/liveMonitoringSubscription';

export function LiveMonitoringPanel({ connection, filters, accountId, compact = false, onShowAll }: { connection: MonitoringConnection; filters: LaunchFilters; accountId: string; compact?: boolean; onShowAll?: () => void }) {
  const { url, key, token } = connection;
  const [connected, setConnected] = useState(false);
  const [visible, setVisible] = useState(document.visibilityState === 'visible');
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const { data, dataUpdatedAt, error, isFetching, refetch } = useQuery({
    queryKey: ['monitoring-live', accountId, filters.platform, filters.release],
    queryFn: ({ signal }) => loadLiveMonitoring(connection, filters, signal),
    enabled: Boolean(connection.token) && visible, retry: false, staleTime: 0,
    refetchInterval: query => connected && !query.state.error ? false : 15_000, refetchIntervalInBackground: false,
  });
  useEffect(() => {
    const visibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { document.removeEventListener('visibilitychange', visibility); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    setConnected(false);
    if (!token || !visible) return;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const invalidate = () => {
      if (debounce) return;
      debounce = setTimeout(() => { debounce = undefined; if (active) void refetch(); }, 250);
    };
    const unsubscribe = subscribeLiveMonitoring({ url, key, token }, invalidate, value => { if (active) setConnected(value); });
    return () => { active = false; clearTimeout(debounce); unsubscribe(); };
  }, [url, key, token, visible, refetch]);
  const lifetime = data ? Math.min(45_000, Date.parse(data.expires_at) - Date.parse(data.generated_at)) : 0;
  const expired = !data || now - dataUpdatedAt >= lifetime;
  useEffect(() => {
    if (!data || !visible) return;
    const timer = setTimeout(() => void refetch(), Math.max(250, dataUpdatedAt + lifetime - Date.now() + 100));
    return () => clearTimeout(timer);
  }, [data, dataUpdatedAt, lifetime, visible, refetch]);
  const usable = data && !expired && visible && !error;
  const state = usable && connected ? 'Live verbunden' : isFetching && !data ? 'Verbindung wird aufgebaut' : !visible ? 'Live-Ansicht pausiert' : error || expired ? 'Live-Daten nicht bestätigt' : 'Verzögert · Ersatzabfrage alle 15 Sekunden';
  const count = (value: number | undefined) => usable ? value?.toLocaleString('de-DE') : '–';
  const boulders = usable ? data.boulders : [];
  if (compact) return <section aria-label="Live-Nutzung" data-testid="live-monitoring"><KwsSurface className="p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary-ink" aria-hidden="true" />Jetzt in der App</h2><span role="status" className="text-xs text-muted-foreground">{state}</span></div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Gezählt werden nur Nutzer, die der Nutzungsstatistik zugestimmt haben – nicht alle App-Nutzer.</p>
    <dl className="mt-3 grid grid-cols-2 gap-4"><div><dt className="text-xs text-muted-foreground">Online mit Zustimmung</dt><dd className="mt-1 text-2xl font-semibold tabular-nums" data-testid="live-online">{count(data?.online)}</dd></div><div><dt className="text-xs text-muted-foreground">Schauen Boulder an</dt><dd className="mt-1 text-2xl font-semibold tabular-nums" data-testid="live-viewers">{count(data?.viewing_boulders)}</dd></div></dl>
    <div className="mt-2 divide-y divide-border/50">{boulders.slice(0, 2).map(boulder => <a key={boulder.id} href={`/boulder/${boulder.id}`} className="flex min-h-11 items-center gap-3 rounded-kws-control text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0 flex-1 truncate">{boulder.name || 'Boulder ohne Namen'}</span><span className="shrink-0 text-xs font-semibold">{boulder.viewers} Nutzer</span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></a>)}</div>
    {!boulders.length && <p className="mt-3 text-xs text-muted-foreground">{usable ? 'Gerade ist kein Boulder geöffnet.' : 'Aktuelle Boulderansichten sind noch nicht bestätigt.'}</p>}
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Ohne Namen</p><Button variant="ghost" size="sm" onClick={onShowAll}>Live-Details<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Button></div>
  </KwsSurface></section>;
  return <section aria-label="Live-Nutzung" className="space-y-3" data-testid="live-monitoring">
    <KwsSurface className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Activity className="h-4 w-4 text-primary-ink" aria-hidden="true" />Jetzt in der App</h2>
        <span className="text-xs text-muted-foreground" role="status">{state}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Gezählt werden nur Nutzer, die der Nutzungsstatistik zugestimmt haben – nicht alle App-Nutzer.</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Online mit Zustimmung</dt><dd className="mt-1 text-3xl font-semibold tabular-nums" data-testid="live-online">{count(data?.online)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Schauen Boulder an</dt><dd className="mt-1 text-3xl font-semibold tabular-nums" data-testid="live-viewers">{count(data?.viewing_boulders)}</dd></div>
        <div className="col-span-2 flex items-center gap-2 self-end text-xs text-muted-foreground sm:col-span-1 sm:block"><Users className="h-4 w-4 shrink-0 sm:mb-2" aria-hidden="true" /><span>{count(data?.accounts)} angemeldet · {count(data?.guests)} Gäste<br className="hidden sm:block" /> · {count(data?.devices)} Geräte</span></div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Nur bei aktiver App. Konten zählen geräteübergreifend einmal, Gäste pro Installation. Verbindungsabbrüche laufen spätestens nach 45 Sekunden ohne neues Signal aus.</p>
      {(!usable || !connected) && <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{error ? 'Die Verbindung ist gestört. Unbestätigte Werte werden nicht als null angezeigt.' : 'Ohne bestätigte Live-Verbindung werden Werte nicht als Echtzeit ausgegeben.'}</p><Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}><RefreshCw className="h-4 w-4" aria-hidden="true" />Erneut prüfen</Button></div>}
    </KwsSurface>
    <KwsSurface>
      <div className="flex items-center justify-between gap-3 p-4"><h3 className="text-sm font-semibold">Gerade angesehene Boulder</h3><span className="text-xs text-muted-foreground">{usable ? boulders.length : '–'} Boulder</span></div>
      {boulders.length ? <ul className="divide-y divide-border/50">{boulders.slice(0, expanded ? undefined : 8).map(boulder => <li key={boulder.id}><a href={`/boulder/${boulder.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="min-w-0 flex-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{boulder.name || 'Boulder ohne Namen'}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{boulder.viewers} Nutzer</span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></a></li>)}</ul> : <p className="px-4 pb-4 text-sm text-muted-foreground">{usable ? 'Gerade ist kein Boulder geöffnet.' : 'Aktuelle Boulderansichten sind noch nicht bestätigt.'}</p>}
      {boulders.length > 8 && <div className="px-4 pb-3"><Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Weniger anzeigen' : `Alle ${boulders.length} Boulder anzeigen`}</Button></div>}
      <p className="border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">Keine Namen oder einzelnen Nutzerverläufe. Wer mehrere Boulder auf mehreren Geräten öffnet, kann in mehreren Boulderzahlen enthalten sein. Der Zeitraumfilter gilt nur für die Statistiken, nicht für „Jetzt“.</p>
    </KwsSurface>
  </section>;
}
