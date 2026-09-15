import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ExternalLink, Smartphone, UploadCloud, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { KwsSurface } from '@/components/ui/kws-surface';
import { AdminViewBar } from './AdminViewBar';
import { AdminSearchField } from './AdminSearchField';
import { useAuth } from '@/hooks/useAuth';
import { loadMonitoring, type UploadLogRow } from '@/lib/adminMonitoring';
import { cn } from '@/lib/utils';

async function adminFetch<T>(path: string, accessToken: string, signal: AbortSignal): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Monitoring nicht konfiguriert');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(abort, 15_000);
  try {
    const response = await window.fetch(`${supabaseUrl}${path}`, {
      signal: controller.signal,
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Monitoring-Abfrage fehlgeschlagen (${response.status})`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

function SourceUnavailable({ label }: { label: string }) {
  return <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /><span>{label} nicht verfügbar. Bitte erneut laden.</span></p>;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: typeof Activity;
}) {
  return (
    <KwsSurface className="flex min-w-0 flex-col p-4">
      <div className="flex items-start gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      {value === null ? <p className="mt-auto pt-2 text-sm font-medium text-muted-foreground">Nicht verfügbar</p> : <p className="mt-auto pt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>}
    </KwsSurface>
  );
}


const VIEWS = [{ value: 'overview', label: 'Übersicht' }, { value: 'uploads', label: 'Uploads' }, { value: 'activity', label: 'Aktivität' }] as const;
const STATUS: Record<string, string> = { completed: 'Abgeschlossen', failed: 'Fehlgeschlagen', aborted_suspected_oom: 'Speicherabbruch vermutet', compressing: 'Komprimierung läuft', uploading: 'Lädt hoch', pending: 'Wartet', cancelled: 'Abgebrochen', cancelled_by_user: 'Abgebrochen', aborted: 'Abgebrochen' };
const EVENTS: Record<string, string> = { upload_start: 'Upload gestartet', compress_start: 'Komprimierung gestartet', compress_done: 'Komprimierung abgeschlossen', chunk_progress: 'Upload-Fortschritt', upload_done: 'Upload abgeschlossen', upload_fail: 'Upload fehlgeschlagen', suspected_oom_resume: 'Neustart nach möglichem Speicherabbruch' };
const isFailed = (row: UploadLogRow) => row.status === 'failed' || row.status === 'aborted_suspected_oom';
const dateTime = (value: string | number) => new Date(value).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const progress = (row: UploadLogRow) => typeof row.progress === 'number' && Number.isFinite(row.progress) ? Math.min(100, Math.max(0, row.progress)) : null;

function UploadList({ rows, onSelect }: { rows: UploadLogRow[]; onSelect: (row: UploadLogRow) => void }) {
  return <ul className="divide-y divide-border/50">{rows.map(row => <li key={row.id}>
    <button type="button" onClick={() => onSelect(row)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-secondary', isFailed(row) && 'bg-destructive/10 text-destructive', row.status === 'completed' && 'bg-primary/10 text-primary-ink')}>{isFailed(row) ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : row.status === 'completed' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}</span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><span className="text-sm font-semibold">{STATUS[row.status] || row.status}{progress(row) !== null && row.status !== 'completed' && !isFailed(row) ? ' · ' + progress(row) + '%' : ''}</span><span className="text-xs text-muted-foreground">{dateTime(row.updated_at)}</span></span><span className="mt-1 block break-all text-xs text-muted-foreground">{row.file_type?.startsWith('video') ? 'Video' : row.file_type || 'Datei'} · Session {row.session_id.slice(0, 12)}{row.session_id.length > 12 ? '…' : ''}</span>{row.error && <span className="mt-2 block line-clamp-2 break-words text-xs text-destructive">{row.error}</span>}</span>
      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  </li>)}</ul>;
}

export function MonitoringDashboard() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const configuredSentry = import.meta.env.VITE_SENTRY_ORG_URL as string | undefined;
  const sentryUrl = configuredSentry?.startsWith('https://') ? configuredSentry : undefined;
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('overview');
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selected, setSelected] = useState<UploadLogRow | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['admin-monitoring', session?.user.id],
    enabled: Boolean(accessToken), staleTime: 30_000, refetchInterval: autoRefresh ? 60_000 : false, retry: false,
    queryFn: ({ signal }) => {
      if (!accessToken) throw new Error('Nicht angemeldet');
      return loadMonitoring(<T,>(path: string) => adminFetch<T>(path, accessToken, signal));
    },
  });
  const q = filter.trim().toLowerCase();
  const filteredUploads = (data?.recentUploads ?? []).filter(row =>
    (status === 'all' || (status === 'failed' ? isFailed(row) : status === 'completed' ? row.status === 'completed' : ['pending', 'compressing', 'uploading'].includes(row.status)))
    && (!q || [row.session_id, row.boulder_id, row.status, STATUS[row.status], row.file_type, row.error, row.user_id].join(' ').toLowerCase().includes(q)));
  const showUpload = (row: UploadLogRow) => { detailTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSelected(row); };
  const unavailableUploads = !data || data.unavailable.includes('recentUploads');
  return <div className="space-y-4">
    <AdminViewBar refreshing={isFetching} onRefresh={() => void refetch()} disabled={!accessToken}>
      <KwsSegmentedControl<(typeof VIEWS)[number]['value']> value={view} onValueChange={setView} options={VIEWS} ariaLabel="Monitoringansicht" />
    </AdminViewBar>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-xs text-muted-foreground" role="status">{isLoading ? 'Monitoring wird geladen …' : isFetching ? 'Daten werden erneut geprüft …' : dataUpdatedAt ? 'Letzte Abfrage: ' + dateTime(dataUpdatedAt) + ' · 24 Stunden' : 'Noch keine Abfrage'}</p>
      <div className="flex min-h-11 items-center gap-2"><Label htmlFor="monitor-auto" className="text-xs text-muted-foreground">Live · jede Minute</Label><Switch id="monitor-auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} /></div>
    </div>
    {isLoading ? <KwsSurface className="p-5" role="status"><p className="text-sm text-muted-foreground">Datenquellen werden geprüft.</p></KwsSurface> : error || !data ? <KwsSurface className="space-y-3 p-5" role="alert"><h2 className="text-base font-semibold">Monitoring nicht verfügbar</h2><p className="text-sm text-muted-foreground">Bitte lade die Daten erneut.</p><Button variant="secondary" onClick={() => void refetch()} disabled={isFetching || !accessToken}>Erneut laden</Button></KwsSurface> : <>
      {data.unavailable.length > 0 && <div role="alert" className="flex items-start gap-3 rounded-kws-card bg-destructive/10 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" /><div className="min-w-0"><h2 className="text-sm font-semibold">{data.unavailable.length === 8 ? 'Monitoring derzeit nicht verfügbar' : 'Daten nur teilweise verfügbar'}</h2><p className="mt-1 text-sm">{data.unavailable.length} von 8 Abfragen fehlgeschlagen. Fehlende Werte werden nicht als 0 gewertet.</p><Button variant="secondary" className="mt-3" disabled={isFetching} onClick={() => void refetch()}>Erneut laden</Button></div></div>}
      {view === 'overview' && <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5 [&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1">
          <StatCard label="Aktiv (5 Min)" value={data.activeDevices} icon={Smartphone} />
          <StatCard label="Geräte · 24 h" value={data.sessionsToday} icon={Activity} />
          <StatCard label="Feedback-Fehler · 24 h" value={data.feedbackErrors} icon={AlertTriangle} />
          <StatCard label="Uploadfehler · 24 h" value={data.uploadFails} icon={UploadCloud} />
          <StatCard label="Vermutete Speicherabbrüche · 24 h" value={data.uploadOom} icon={AlertTriangle} />
        </div>
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Letzte Uploads</h2><Button variant="ghost" onClick={() => setView('uploads')}>Alle ansehen<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button></div>
          <KwsSurface className="overflow-hidden">{unavailableUploads ? <div className="p-4"><SourceUnavailable label="Upload-Sessions" /></div> : data.recentUploads.length ? <UploadList rows={data.recentUploads.slice(0, 4)} onSelect={showUpload} /> : <p className="p-5 text-sm text-muted-foreground">Keine Upload-Logs in den letzten 24 Stunden.</p>}</KwsSurface>
        </section>
      </>}
      {view === 'uploads' && <>
        <div className="flex flex-col gap-2 sm:flex-row">
          <AdminSearchField value={filter} onChange={setFilter} placeholder="Session, Boulder oder Fehler suchen" label="Upload-Sessions filtern" disabled={unavailableUploads} />
          <Select value={status} onValueChange={setStatus} disabled={unavailableUploads}><SelectTrigger aria-label="Uploadstatus" className="h-12 w-full border-0 bg-card shadow-soft sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alle Status</SelectItem><SelectItem value="active">In Arbeit</SelectItem><SelectItem value="completed">Abgeschlossen</SelectItem><SelectItem value="failed">Fehler / Abbruch</SelectItem></SelectContent></Select>
        </div>
        <p role="status" className="text-xs text-muted-foreground">{unavailableUploads ? 'Uploads nicht verfügbar' : filteredUploads.length + ' von ' + data.recentUploads.length + ' Uploads'} · letzte 40 Einträge in 24 Stunden</p>
        <KwsSurface className="overflow-hidden">{unavailableUploads ? <div className="p-4"><SourceUnavailable label="Upload-Sessions" /></div> : filteredUploads.length ? <UploadList rows={filteredUploads} onSelect={showUpload} /> : <div className="space-y-2 p-6 text-center text-sm text-muted-foreground"><p>{q || status !== 'all' ? 'Keine Treffer für diesen Filter.' : 'Keine Upload-Logs in den letzten 24 Stunden.'}</p>{(q || status !== 'all') && <Button variant="ghost" onClick={() => { setFilter(''); setStatus('all'); }}>Filter zurücksetzen</Button>}</div>}</KwsSurface>
      </>}
      {view === 'activity' && <div className="grid items-start gap-4 xl:grid-cols-2">
        <KwsSurface className="min-w-0 p-4"><h2 className="text-base font-semibold">Upload-Ereignisse</h2><p className="mt-1 text-xs text-muted-foreground">Letzte 50 Ereignisse · 24 Stunden</p>{data.unavailable.includes('recentUploadEvents') ? <SourceUnavailable label="Upload-Ereignisse" /> : data.recentUploadEvents.length ? <ul className="mt-3 divide-y divide-border/50">{data.recentUploadEvents.map((event, index) => <li key={event.name + event.created_at + index}><details className="py-1"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{EVENTS[event.name] || event.name}<span className="ml-2 text-xs text-muted-foreground">{dateTime(event.created_at)}</span></summary><dl className="space-y-2 px-3 pb-3 text-xs text-muted-foreground"><div><dt>Ereignis</dt><dd className="break-all">{event.name}</dd></div><div><dt>Boulder-ID</dt><dd className="break-all">{event.boulder_id || '–'}</dd></div><div><dt>Session-ID</dt><dd className="break-all">{String(event.props?.session_id || '–')}</dd></div></dl></details></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Noch keine Upload-Events.</p>}</KwsSurface>
        <div className="min-w-0 space-y-4">
          <KwsSurface className="p-4"><h2 className="text-base font-semibold">Aktive Geräte</h2><p className="mt-1 text-xs text-muted-foreground">Letzte 5 Minuten · bis zu 20 Geräte</p>{data.unavailable.includes('activeSessions') ? <SourceUnavailable label="Aktive Geräte" /> : data.activeSessions.length ? <ul className="mt-3 divide-y divide-border/50">{data.activeSessions.map(device => <li key={device.device_id} className="flex items-start gap-3 py-3"><Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><p className="text-sm font-medium">{device.platform || 'Unbekannte Plattform'} · {device.app_version || 'Version unbekannt'}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{device.device_id}</p></div></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Keine aktiven Geräte in den letzten 5 Minuten.</p>}</KwsSurface>
          <KwsSurface className="p-4"><h2 className="text-base font-semibold">Häufig angesehene Boulder</h2><p className="mt-1 text-xs text-muted-foreground">Top 10 · letzte 24 Stunden</p>{data.unavailable.includes('boulderViews') ? <SourceUnavailable label="Boulder-Aufrufe" /> : data.topBoulders.length ? <ol className="mt-3 space-y-3">{data.topBoulders.map((row, index) => <li key={row.boulderId} className="flex items-start gap-3 text-xs"><span className="text-muted-foreground">{index + 1}.</span><span className="min-w-0 flex-1 break-all font-mono">{row.boulderId}</span><span className="shrink-0 font-semibold tabular-nums">{row.views} {row.views === 1 ? 'Aufruf' : 'Aufrufe'}</span></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">Noch keine View-Events.</p>}</KwsSurface>
        </div>
      </div>}
    </>}
    {sentryUrl && <Button asChild variant="ghost"><a href={sentryUrl} target="_blank" rel="noreferrer">In Sentry öffnen<ExternalLink className="h-4 w-4" aria-hidden="true" /></a></Button>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent scrollLayout="contained" className="flex flex-col gap-0 p-0 md:max-w-xl" onCloseAutoFocus={event => { event.preventDefault(); detailTrigger.current?.focus(); }}>
        <DialogHeader className="shrink-0 p-5"><DialogTitle>Upload-Details</DialogTitle><DialogDescription>{selected ? STATUS[selected.status] || selected.status : ''}</DialogDescription></DialogHeader>
        {selected && <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          <dl className="grid grid-cols-2 gap-4 rounded-kws-control bg-secondary/60 p-4 text-xs"><div><dt className="text-muted-foreground">Dateityp</dt><dd className="mt-1 break-words">{selected.file_type || 'Unbekannt'}</dd></div><div><dt className="text-muted-foreground">Fortschritt</dt><dd className="mt-1">{progress(selected) === null ? 'Nicht gemeldet' : progress(selected) + '%'}</dd></div><div><dt className="text-muted-foreground">Gestartet</dt><dd className="mt-1">{selected.created_at ? dateTime(selected.created_at) : 'Nicht gemeldet'}</dd></div><div><dt className="text-muted-foreground">Zuletzt aktualisiert</dt><dd className="mt-1">{dateTime(selected.updated_at)}</dd></div></dl>
          {selected.error && <section className="rounded-kws-control bg-destructive/10 p-4"><h3 className="text-sm font-semibold">Fehlermeldung</h3><p className="mt-2 whitespace-pre-wrap break-all text-sm">{selected.error}</p></section>}
          <dl className="space-y-3 text-xs">{[['Session-ID', selected.session_id], ['Boulder-ID', selected.boulder_id], ['Benutzer-ID', selected.user_id], ['Technischer Status', selected.status]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-mono">{value || 'Nicht gemeldet'}</dd></div>)}</dl>
        </div>}
        <DialogFooter className="shrink-0 border-t border-border/50 p-4"><Button onClick={() => setSelected(null)}>Schließen</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
