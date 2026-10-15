import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { readAdminRows } from '@/lib/adminRead';
import { readDisplayProfiles } from '@/lib/displayProfiles';
import { AdminViewBar } from './AdminViewBar';
import { AdminSearchField } from './AdminSearchField';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';

const BATCH_GAP_MINUTES = 30;
const FIELD_LABELS: Record<string, string> = { name: 'Name', difficulty: 'Schwierigkeit', color: 'Farbe', secondary_color: 'Zweite Farbe', status: 'Status', note: 'Notiz', sector_id: 'Sektor-ID', created_at: 'Erstellt', updated_at: 'Aktualisiert' };
const displayValue = (value: unknown) => value == null || value === '' ? '–' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const OPERATIONS = [{ value: 'all', label: 'Alle' }, { value: 'create', label: 'Erstellt' }, { value: 'update', label: 'Bearbeitet' }, { value: 'delete', label: 'Gelöscht' }] as const;
const ICONS = { create: Plus, update: Pencil, delete: Trash2 };
interface BoulderOperationLog {
  id: string;
  boulder_id: string | null;
  operation_type: 'create' | 'update' | 'delete';
  user_id: string | null;
  boulder_name: string | null;
  boulder_data: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  user_email?: string;
  user_display_name?: string | null;
}

interface LogBatch {
  key: string;
  user_id: string | null;
  user_display_name: string;
  operation_type: 'create' | 'update' | 'delete';
  logs: BoulderOperationLog[];
  createdAtMin: Date;
  createdAtMax: Date;
}

export const BoulderOperationLogs = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [operationFilter, setOperationFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [person, setPerson] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<BoulderOperationLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const filterTrigger = useRef<HTMLButtonElement | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['boulder-operation-logs', user?.id, isAdmin, operationFilter, period],
    enabled: !authLoading && !!session?.access_token,
    retry: false,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ select: '*', order: 'created_at.desc,id.desc', limit: '300' });
      if (operationFilter !== 'all') params.set('operation_type', 'eq.' + operationFilter);
      if (period !== 'all') params.set('created_at', 'gte.' + new Date(Date.now() - Number(period) * 86_400_000).toISOString());
      const rows = await readAdminRows<BoulderOperationLog>('boulder_operation_logs?' + params, session!.access_token, signal);
      const ids = [...new Set(rows.flatMap(row => row.user_id ? [row.user_id] : []))];
      type Profile = { id: string; email?: string; first_name?: string; full_name: string | null };
      let profiles: Profile[] = [];
      let profilesUnavailable = false;
      if (ids.length) {
        try {
          if (isAdmin) {
            const query = new URLSearchParams({ select: 'id,email,first_name,full_name', id: 'in.(' + ids.map(id => JSON.stringify(id)).join(',') + ')' });
            profiles = await readAdminRows<Profile>('profiles?' + query, session!.access_token, signal);
          } else {
            profiles = await readDisplayProfiles(ids, session!.access_token, signal);
          }
        } catch { profilesUnavailable = true; }
      }
      const byId = new Map(profiles.map(profile => [profile.id, profile]));
      return { profilesUnavailable, rows: rows.map(row => {
        const profile = row.user_id ? byId.get(row.user_id) : undefined;
        return { ...row, user_display_name: profile?.full_name || profile?.first_name || profile?.email || (row.user_id ? 'Benutzer ' + row.user_id.slice(0, 8) : 'Unbekannte Person'), user_email: profile?.email };
      }) };
    },
  });
  const people = [...new Map((data?.rows ?? []).filter(row => row.user_id).map(row => [row.user_id!, row.user_display_name])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'de'));
  const logs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de');
    return (data?.rows ?? []).filter(row => (person === 'all' || row.user_id === person) && (!query || [row.boulder_name, row.boulder_id, row.user_display_name, row.user_email].join(' ').toLocaleLowerCase('de').includes(query)));
  }, [data?.rows, search, person]);
  const filtersActive = period !== 'all' || person !== 'all';
  const reset = () => { setSearch(''); setOperationFilter('all'); setPeriod('all'); setPerson('all'); setExpandedGroupKey(null); };
  const showLog = (log: BoulderOperationLog) => { detailTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSelectedLog(log); setDialogOpen(true); };

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'create':
        return 'Erstellt';
      case 'update':
        return 'Bearbeitet';
      case 'delete':
        return 'Gelöscht';
      default:
        return type;
    }
  };

  // Group logs "am Stück": same user + operation_type, split by time gap > BATCH_GAP_MINUTES
  const batches = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    const sorted = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const gapMs = BATCH_GAP_MINUTES * 60 * 1000;
    const byGroup = new Map<string, BoulderOperationLog[]>();
    for (const log of sorted) {
      const uid = log.user_id ?? 'unknown';
      const key = `${uid}|${log.operation_type}`;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(log);
    }
    const result: LogBatch[] = [];
    for (const [, groupLogs] of byGroup) {
      let batch: BoulderOperationLog[] = [];
      let batchStart: Date | null = null;
      let prevAt = 0;
      for (const log of groupLogs) {
        const at = new Date(log.created_at).getTime();
        if (batch.length === 0 || at - prevAt > gapMs) {
          if (batch.length > 0 && batchStart !== null) {
            const createdAtMin = new Date(batch[0].created_at);
            const createdAtMax = new Date(batch[batch.length - 1].created_at);
            const firstLog = batch[0];
            result.push({
              key: `${firstLog.user_id ?? 'unknown'}|${firstLog.operation_type}|${createdAtMin.getTime()}`,
              user_id: firstLog.user_id,
              user_display_name: firstLog.user_display_name ?? firstLog.user_email ?? 'Unbekannt',
              operation_type: firstLog.operation_type,
              logs: [...batch],
              createdAtMin,
              createdAtMax,
            });
          }
          batch = [log];
          batchStart = new Date(log.created_at);
        } else {
          batch.push(log);
        }
        prevAt = at;
      }
      if (batch.length > 0 && batchStart !== null) {
        const firstLog = batch[0];
        result.push({
          key: `${firstLog.user_id ?? 'unknown'}|${firstLog.operation_type}|${batchStart.getTime()}`,
          user_id: firstLog.user_id,
          user_display_name: firstLog.user_display_name ?? firstLog.user_email ?? 'Unbekannt',
          operation_type: firstLog.operation_type,
          logs: [...batch],
          createdAtMin: new Date(batch[0].created_at),
          createdAtMax: new Date(batch[batch.length - 1].created_at),
        });
      }
    }
    result.sort((a, b) => b.createdAtMax.getTime() - a.createdAtMax.getTime());
    return result;
  }, [logs]);

  const formatBatchTimeRange = (min: Date, max: Date) => {
    const sameDay = min.toDateString() === max.toDateString();
    if (sameDay && min.getTime() === max.getTime()) {
      return formatDate(min, 'dd.MM.yyyy HH:mm', { locale: de });
    }
    if (sameDay) {
      return `${formatDate(min, 'dd.MM.yyyy HH:mm', { locale: de })} – ${formatDate(max, 'HH:mm', { locale: de })}`;
    }
    return `${formatDate(min, 'dd.MM.yyyy HH:mm', { locale: de })} – ${formatDate(max, 'dd.MM.yyyy HH:mm', { locale: de })}`;
  };

  return (
    <div className="space-y-4">
      <AdminViewBar refreshing={isFetching} onRefresh={() => void refetch()} disabled={authLoading}>
        <KwsSegmentedControl value={operationFilter} onValueChange={value => { setOperationFilter(value); setPerson('all'); setExpandedGroupKey(null); }} options={OPERATIONS} ariaLabel="Protokoll nach Aktion filtern" />
      </AdminViewBar>
      <div className="flex gap-2">
        <AdminSearchField value={search} onChange={setSearch} label="Protokoll durchsuchen" placeholder="Protokoll suchen …" />
        <Button ref={filterTrigger} variant={filtersActive ? 'default' : 'secondary'} className="h-12 shrink-0" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filter{filtersActive ? ' · ' + (Number(period !== 'all') + Number(person !== 'all')) : ''}</Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p role="status">{isLoading || authLoading ? 'Protokoll wird geladen …' : error ? 'Protokoll nicht verfügbar' : logs.length + (logs.length === 1 ? ' Einzeloperation · ' : ' Einzeloperationen · ') + batches.length + (batches.length === 1 ? ' Gruppe' : ' Gruppen')}</p>
        <span>Letzte 300 Einträge{period !== 'all' ? ' · ' + (period === '1' ? '24 Stunden' : period + ' Tage') : ''}</span>
      </div>
      {data?.profilesUnavailable && <p role="alert" className="text-xs text-muted-foreground">Personennamen konnten nicht geladen werden. Angezeigt werden die Benutzer-IDs.</p>}
      {isLoading || authLoading ? <KwsSurface className="space-y-3 p-4" aria-hidden="true">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-kws-control" />)}</KwsSurface> : error ? <KwsSurface className="space-y-3 p-5" role="alert"><p className="text-sm">Protokoll konnte nicht geladen werden.</p><Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>Erneut laden</Button></KwsSurface> : batches.length ? <KwsSurface className="overflow-hidden divide-y divide-border/50">
        {batches.map(batch => {
          const isExpanded = expandedGroupKey === batch.key;
          const Icon = ICONS[batch.operation_type] || Pencil;
          return <article key={batch.key}>
            <button type="button" aria-expanded={isExpanded} aria-controls={'log-group-' + batch.logs[0].id} onClick={() => setExpandedGroupKey(isExpanded ? null : batch.key)} className={cn('flex w-full items-center gap-3 p-4 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', isExpanded && 'bg-secondary/50')}>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-secondary', batch.operation_type === 'delete' && 'bg-destructive/10 text-destructive', batch.operation_type === 'create' && 'bg-primary/10 text-primary-ink')}><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{batch.user_display_name}</span><span className="mt-1 block text-xs text-muted-foreground">{batch.logs.length} Boulder · {getOperationLabel(batch.operation_type)}<span className="mx-2 hidden sm:inline">·</span><span className="mt-1 block sm:mt-0 sm:inline">{formatBatchTimeRange(batch.createdAtMin, batch.createdAtMax)}</span></span></span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', isExpanded && 'rotate-180')} aria-hidden="true" />
            </button>
            {isExpanded && <div id={'log-group-' + batch.logs[0].id} className="bg-secondary/25 px-4 py-2 sm:pl-[72px]">{[...batch.logs].reverse().map(log => <button key={log.id} type="button" onClick={() => showLog(log)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-kws-control px-2 py-3 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0"><span className="block break-words text-sm font-medium">{log.boulder_name || log.boulder_id || 'Unbekannter Boulder'}</span><span className="text-xs text-muted-foreground">{formatDate(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button>)}</div>}
          </article>;
        })}
      </KwsSurface> : <KwsSurface className="space-y-3 p-8 text-center"><p className="text-sm text-muted-foreground">{search || filtersActive || operationFilter !== 'all' ? 'Keine passenden Einträge.' : 'Noch keine Boulder-Operationen protokolliert.'}</p>{(search || filtersActive || operationFilter !== 'all') && <Button variant="ghost" onClick={reset}>Filter zurücksetzen</Button>}</KwsSurface>}
      <details className="text-xs text-muted-foreground"><summary className="w-fit cursor-pointer rounded-kws-control py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Wie wird gruppiert?</summary><p className="max-w-prose pb-2">Gleiche Person und Aktion, höchstens 30 Minuten Pause. Suche und Filter beziehen sich auf die zuletzt geladenen 300 Einträge der gewählten Aktion und des Zeitraums.</p></details>
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent scrollLayout="contained" className="flex flex-col gap-0 p-0 md:max-w-md" onCloseAutoFocus={event => { event.preventDefault(); filterTrigger.current?.focus(); }}>
          <DialogHeader className="shrink-0 p-5 pr-12"><DialogTitle>Protokoll filtern</DialogTitle><DialogDescription>Zeitraum und Person eingrenzen.</DialogDescription></DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pt-0">
            <div className="space-y-2"><Label htmlFor="log-period">Zeitraum</Label><Select value={period} onValueChange={value => { setPeriod(value); setPerson('all'); }}><SelectTrigger id="log-period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Gesamter Zeitraum</SelectItem><SelectItem value="1">Letzte 24 Stunden</SelectItem><SelectItem value="7">Letzte 7 Tage</SelectItem><SelectItem value="30">Letzte 30 Tage</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="log-person">Person</Label><Select value={person} onValueChange={setPerson}><SelectTrigger id="log-person"><SelectValue placeholder="Alle Personen" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Personen</SelectItem>{people.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/50 p-4"><Button variant="ghost" onClick={() => { setPeriod('all'); setPerson('all'); }}>Zurücksetzen</Button><Button onClick={() => setFiltersOpen(false)}>Fertig</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedLog && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent scrollLayout="contained" className="flex min-h-0 flex-col gap-0 overflow-hidden p-0 md:max-w-[560px]" onCloseAutoFocus={event => { event.preventDefault(); detailTrigger.current?.focus(); }}>
          <DialogHeader className="shrink-0 p-5">
            <DialogTitle>Log-Details</DialogTitle>
            <DialogDescription className="break-words">{selectedLog.boulder_name || 'Unbekannter Boulder'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            <dl className="grid grid-cols-2 gap-4 rounded-kws-control bg-secondary/60 p-4 text-xs">
              <div><dt className="text-muted-foreground">Aktion</dt><dd className="mt-1 font-medium">{getOperationLabel(selectedLog.operation_type)}</dd></div>
              <div><dt className="text-muted-foreground">Zeitpunkt</dt><dd className="mt-1">{formatDate(new Date(selectedLog.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Person</dt><dd className="mt-1 break-words font-medium">{selectedLog.user_display_name || 'Unbekannt'}</dd>{selectedLog.user_email && <dd className="mt-1 break-all text-muted-foreground">{selectedLog.user_email}</dd>}</div>
            </dl>
            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && <section>
              <h3 className="mb-3 text-sm font-semibold">Geänderte Felder</h3>
              <dl className="space-y-3">{Object.entries(selectedLog.changes).map(([field, value]) => <div key={field} className="rounded-kws-control bg-secondary/50 p-3 text-sm">
                <dt className="mb-1 text-xs text-muted-foreground">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</dt>
                <dd className="break-words">{value && typeof value === 'object' && 'old' in value && 'new' in value ? <><span className="text-muted-foreground line-through">{displayValue(value.old)}</span><span aria-label="geändert in"> → </span><span className="font-medium">{displayValue(value.new)}</span></> : displayValue(value)}</dd>
              </div>)}</dl>
            </section>}
            {selectedLog.boulder_data && <section>
              <h3 className="mb-3 text-sm font-semibold">Boulder-Daten</h3>
              <dl className="space-y-3 text-sm">{Object.entries(selectedLog.boulder_data).filter(([key]) => key in FIELD_LABELS).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3"><dt className="text-muted-foreground">{FIELD_LABELS[key]}</dt><dd className="break-words">{displayValue(value)}</dd></div>)}</dl>
              <details className="mt-3"><summary className="cursor-pointer rounded-kws-control py-3 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Rohdaten (JSON)</summary><pre className="whitespace-pre-wrap break-all rounded-kws-control bg-secondary p-3 text-xs">{JSON.stringify(selectedLog.boulder_data, null, 2)}</pre></details>
            </section>}
            <details><summary className="cursor-pointer rounded-kws-control py-3 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Technische IDs</summary><dl className="space-y-3 text-xs text-muted-foreground">{[['Eintrag', selectedLog.id], ['Boulder', selectedLog.boulder_id], ['Benutzer', selectedLog.user_id]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mt-1 break-all font-mono">{value || 'Nicht hinterlegt'}</dd></div>)}</dl></details>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/50 p-4"><Button onClick={() => setDialogOpen(false)}>Schließen</Button></DialogFooter>
        </DialogContent>
      </Dialog>}
    </div>
  );
};

