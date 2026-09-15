import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, ArrowRight, Bug, Check, ChevronRight, Filter, Inbox, Layers, Lightbulb, Loader2, MessageSquare, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { KwsSurface } from '@/components/ui/kws-surface';
import { AdminViewBar } from './AdminViewBar';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FeedbackDetailDialog } from './FeedbackDetailDialog';
import { countFeedback, defaultFeedbackFilters, FeedbackWriteError, groupFeedback, loadFeedbackIndex, priorityLabels, sortLabels, statusLabels, typeLabels, writeFeedbackBatch, type FeedbackConnection, type FeedbackFilters, type FeedbackSort, type FeedbackSource, type FeedbackStatus, type FeedbackSummary } from '@/lib/adminFeedback';

const sources = [{ value: 'people', label: 'Rückmeldungen' }, { value: 'errors', label: 'Automatische Fehler' }] as const;
const dateLabel = (value: string) => new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const periodLabels = { all: 'Jederzeit', '7': 'Letzte 7 Tage', '30': 'Letzte 30 Tage', '90': 'Letzte 90 Tage' };
const shortTitle = (title: string) => title.replace(/^Fehler:\s*/, '').replace(/^Cannot read properties of (?:undefined|null) \(reading '(.+)'\)$/, 'Fehlender Wert: $1');

export function FeedbackManagement() {
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedbackFilters>(defaultFeedbackFilters);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [visible, setVisible] = useState(30);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<FeedbackStatus>('resolved');
  const [confirmation, setConfirmation] = useState<{ ids: string[]; action: 'delete' | FeedbackStatus } | null>(null);
  const [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [writeError, setWriteError] = useState('');
  const writeLock = useRef(false);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const filterTrigger = useRef<HTMLButtonElement | null>(null);
  const restoreDetailFocus = () => { if (detailTrigger.current?.isConnected) detailTrigger.current.focus(); else searchInput.current?.focus(); };
  const ready = !authLoading && !!user && !!session;
  const connection: FeedbackConnection = { url: import.meta.env.VITE_SUPABASE_URL || '', key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '', token: session?.access_token || '' };
  useEffect(() => {
    const timer = setTimeout(() => setFilters(current => ({ ...current, search })), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const index = useQuery({ queryKey: ['admin-feedback', user?.id, 'index', filters], queryFn: ({ signal }) => loadFeedbackIndex(connection, filters, signal), enabled: ready, retry: false, staleTime: 30000, refetchOnWindowFocus: false });
  const counts = useQuery({ queryKey: ['admin-feedback', user?.id, 'counts'], queryFn: async ({ signal }) => {
    const [people, errors] = await Promise.all([countFeedback(connection, 'people', signal), countFeedback(connection, 'errors', signal)]);
    return { people, errors };
  }, enabled: ready, retry: false, staleTime: 30000, refetchOnWindowFocus: false });
  const rows = useMemo(() => index.data || [], [index.data]);
  const groups = useMemo(() => groupFeedback(filters.source === 'errors' ? rows : [], filters.sort), [rows, filters.source, filters.sort]);
  const activeGroup = groups.find(group => group.key === selectedGroup);
  const groupView = filters.source === 'errors' && !activeGroup;
  const displayRows = (activeGroup?.rows || rows).slice(0, visible);
  const displayGroups = groups.slice(0, visible);
  const visibleIds = groupView ? displayGroups.flatMap(group => group.rows.map(row => row.id)) : displayRows.map(row => row.id);
  const totalVisible = groupView ? groups.length : (activeGroup?.rows || rows).length;
  const selectedSet = new Set(selected);
  const selectedVisibleIds = visibleIds.filter(id => selectedSet.has(id));
  const allSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;
  const pending = writing || index.isFetching || search !== filters.search;
  const filterCount = [filters.status !== 'all', filters.type !== 'all' && filters.source === 'people', filters.priority !== 'all', filters.period !== 'all'].filter(Boolean).length;
  const resetScope = () => { setSelected([]); setVisible(30); setSelectedGroup(null); };
  const changeFilters = (patch: Partial<FeedbackFilters>) => { resetScope(); setFilters(current => ({ ...current, ...patch })); };
  const resetFilters = () => { setSearch(''); resetScope(); setFilters({ ...defaultFeedbackFilters, source: filters.source }); };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-feedback', user?.id] });
  const toggleIds = (ids: string[]) => setSelected(current => ids.every(id => current.includes(id)) ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  const ask = (ids: string[], action: 'delete' | FeedbackStatus) => { setProgress(0); setWriteError(''); setConfirmation({ ids: [...ids], action }); };
  const perform = async () => {
    if (!confirmation || !user || writeLock.current) return;
    writeLock.current = true; setWriting(true); setWriteError('');
    try {
      const done = await writeFeedbackBatch(connection, confirmation.ids, confirmation.action, user.id, setProgress);
      setSelected([]); setConfirmation(null);
      toast.success(confirmation.action === 'delete' ? `${done.length} Einträge gelöscht` : `${done.length} Einträge aktualisiert`);
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : 'Änderung fehlgeschlagen.');
      const confirmed = error instanceof FeedbackWriteError ? new Set(error.confirmed) : new Set<string>();
      setSelected(current => current.filter(id => !confirmed.has(id)));
      setConfirmation(current => current ? { ...current, ids: current.ids.filter(id => !confirmed.has(id)) } : null);
    } finally { await invalidate(); writeLock.current = false; setWriting(false); }
  };
  useEffect(() => { if (index.data && !index.isFetching) { const ids = new Set(index.data.map(row => row.id)); setSelected(current => current.filter(id => ids.has(id))); } }, [index.data, index.isFetching]);

  const renderRow = (row: FeedbackSummary) => {
    const Icon = row.type === 'feature' ? Lightbulb : row.type === 'bug' || row.type === 'error' ? Bug : MessageSquare;
    return <article key={row.id} className="flex items-center gap-1 px-3 sm:px-4">
      <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><Checkbox checked={selectedSet.has(row.id)} disabled={pending} onCheckedChange={() => toggleIds([row.id])} aria-label={`${row.title} auswählen`} /></label>
      <button type="button" onClick={event => { detailTrigger.current = event.currentTarget; setDetailId(row.id); }} disabled={writing} className="group flex min-h-[88px] min-w-0 flex-1 items-center gap-3 rounded-kws-control py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-secondary text-muted-foreground sm:flex"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold leading-snug text-foreground group-hover:text-primary-ink">{shortTitle(row.title)}</h3><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{typeLabels[row.type]}</span><span>{row.type === 'error' ? new Date(row.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : dateLabel(row.created_at)}</span><span className="sm:hidden">{statusLabels[row.status]}</span>{row.priority !== 'medium' && <span className={cn('font-medium', (row.priority === 'critical' || row.priority === 'high') && 'text-destructive')}>{priorityLabels[row.priority]}</span>}</div></div>
        <span className={cn('hidden shrink-0 rounded-kws-badge px-2 py-1 text-xs font-medium sm:block', row.status === 'resolved' ? 'bg-primary/10 text-primary-ink' : 'bg-secondary text-foreground')}>{statusLabels[row.status]}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </article>;
  };

  return <div className="min-w-0 space-y-5">
    <AdminViewBar refreshing={pending} disabled={writing} onRefresh={() => invalidate()}>
      <KwsSegmentedControl value={filters.source} options={sources} ariaLabel="Feedbackansicht" onValueChange={(source: FeedbackSource) => { if (!writing) { setSearch(''); changeFilters({ ...defaultFeedbackFilters, source }); } }} className="w-full" />
    </AdminViewBar>
    <div className="space-y-3">
      <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={searchInput} aria-label="Feedback suchen" placeholder="Suchen …" value={search} disabled={writing} maxLength={200} onChange={event => { setSearch(event.target.value); resetScope(); }} className="border-0 bg-card pl-10 pr-11 shadow-soft" />{search && <Button variant="ghost" size="icon" aria-label="Suche löschen" className="absolute right-0 top-0" onClick={() => { setSearch(''); resetScope(); }} disabled={writing}><X className="h-4 w-4" /></Button>}</div><Button ref={filterTrigger} variant="secondary" disabled={writing} onClick={() => { setDraft(filters); setFilterOpen(true); }} aria-label={`Filter${filterCount ? `, ${filterCount} aktiv` : ''}`}><Filter className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Filter</span>{filterCount > 0 && <span className="ml-2">{filterCount}</span>}</Button></div>
      <div className="flex flex-wrap items-center gap-2"><div role="group" aria-label="Schnellfilter Status" className="flex flex-wrap gap-1">{(['all', 'open', 'in_progress'] as const).map(status => <Button key={status} variant="ghost" disabled={writing} aria-pressed={filters.status === status} className={cn('px-3 text-xs', filters.status === status && 'bg-primary/10 text-foreground')} onClick={() => changeFilters({ status })}>{filters.status === status && <Check className="mr-1.5 h-3 w-3" />}{status === 'all' ? 'Alle' : statusLabels[status]}</Button>)}</div>{(filterCount > 0 || search) && <Button variant="ghost" disabled={writing} onClick={resetFilters} className="ml-auto text-xs text-muted-foreground"><X className="mr-1 h-3 w-3" />Zurücksetzen</Button>}</div>
      {(filters.priority !== 'all' || filters.period !== 'all' || filters.type !== 'all' || ['resolved', 'closed'].includes(filters.status)) && <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{filters.status !== 'all' && <span>Status: {statusLabels[filters.status]}</span>}{filters.priority !== 'all' && <span>· {priorityLabels[filters.priority]}</span>}{filters.period !== 'all' && <span>· {periodLabels[filters.period]}</span>}{filters.type !== 'all' && filters.source === 'people' && <span>· {typeLabels[filters.type]}</span>}</div>}
    </div>
    {activeGroup && <div className="space-y-2"><Button variant="ghost" onClick={() => { setSelectedGroup(null); setSelected([]); setVisible(30); }} disabled={writing} className="-ml-3"><ArrowLeft className="mr-2 h-4 w-4" />Alle Fehlergruppen</Button><h2 className="break-words text-base font-semibold">{shortTitle(activeGroup.title)}</h2><p className="break-words text-xs text-muted-foreground">{activeGroup.location} · {activeGroup.rows.length} Meldungen · {dateLabel(activeGroup.first)}–{dateLabel(activeGroup.last)}</p></div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div role="status" aria-live="polite" className="text-xs text-muted-foreground">{!ready ? 'Anmeldung wird geprüft …' : index.isFetching ? 'Einträge werden vollständig geladen …' : index.isError ? 'Nicht geladen' : activeGroup ? `${activeGroup.rows.length} Meldungen in dieser Gruppe` : <><strong className="font-semibold text-foreground">{rows.length}</strong> {filters.source === 'errors' ? rows.length === 1 ? 'Fehlermeldung' : 'Fehlermeldungen' : 'Treffer'}{counts.data?.[filters.source] != null && <> von {counts.data[filters.source]} insgesamt</>}{groupView && <> · {groups.length} {groups.length === 1 ? 'Gruppe' : 'Gruppen'}</>}</>}{counts.isError && <span className="block">Gesamtzahl nicht verfügbar</span>}</div><Select value={filters.sort} onValueChange={value => changeFilters({ sort: value as FeedbackSort })} disabled={writing}><SelectTrigger aria-label="Sortierung" className="w-[180px] border-0 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(sortLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    {selectedVisibleIds.length > 0 && <KwsSurface className="space-y-3 bg-secondary p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{selectedVisibleIds.length} Meldungen ausgewählt</p><Button variant="ghost" size="icon" aria-label="Auswahl aufheben" onClick={() => setSelected([])} disabled={writing}><X className="h-4 w-4" /></Button></div><div className="flex flex-wrap gap-2"><Select value={bulkStatus} onValueChange={value => setBulkStatus(value as FeedbackStatus)} disabled={pending}><SelectTrigger aria-label="Status für Auswahl" className="w-full bg-card sm:w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button disabled={pending} onClick={() => ask(selectedVisibleIds, bulkStatus)} className="flex-1 sm:flex-none">Status setzen</Button><Button variant="ghost" disabled={pending} onClick={() => ask(selectedVisibleIds, 'delete')} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Löschen</Button></div></KwsSurface>}
    {!ready || index.isPending || index.isFetching ? <KwsSurface className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /><p>{ready ? 'Rückmeldungen werden geladen' : 'Anmeldung wird geprüft'}</p></KwsSurface> : index.isError ? <KwsSurface className="space-y-3 p-6 text-center"><AlertCircle className="mx-auto h-6 w-6 text-destructive" /><p role="alert" className="text-sm">{index.error.message}</p><Button variant="secondary" onClick={() => index.refetch()}>Erneut laden</Button></KwsSurface> : rows.length === 0 ? <KwsSurface className="flex min-h-52 flex-col items-center justify-center gap-3 p-6 text-center"><Inbox className="h-7 w-7 text-muted-foreground" /><h2 className="text-base font-semibold">{filterCount || search ? 'Keine passenden Einträge' : filters.source === 'people' ? 'Noch keine Rückmeldungen' : 'Keine automatischen Fehler'}</h2><p className="max-w-sm text-sm text-muted-foreground">{filterCount || search ? 'Versuche eine andere Suche oder setze die Filter zurück.' : filters.source === 'people' ? 'Ideen und gemeldete Probleme erscheinen hier.' : 'Neue automatische Meldungen erscheinen hier als Gruppen.'}</p>{(filterCount > 0 || search) && <Button variant="secondary" onClick={resetFilters}>Filter zurücksetzen</Button>}</KwsSurface> : <>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><label className="flex min-h-11 cursor-pointer items-center gap-2"><span className="flex h-11 w-11 items-center justify-center"><Checkbox checked={allSelected ? true : selectedVisibleIds.length ? 'indeterminate' : false} disabled={pending} onCheckedChange={() => toggleIds(visibleIds)} aria-label={groupView ? 'Sichtbare Gruppen auswählen' : 'Sichtbare Einträge auswählen'} /></span>{groupView ? 'Sichtbare Gruppen auswählen' : 'Sichtbare Einträge auswählen'}</label><span>{Math.min(visible, totalVisible)} von {totalVisible}{groupView ? ' Gruppen' : ''}</span></div>
      <KwsSurface className="divide-y divide-border/60 overflow-hidden">{groupView ? displayGroups.map(group => {
        const ids = group.rows.map(row => row.id); const checked = ids.every(id => selectedSet.has(id));
        return <article key={group.key} className="flex items-center gap-1 px-3 sm:px-4"><label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><Checkbox disabled={pending} checked={checked ? true : ids.some(id => selectedSet.has(id)) ? 'indeterminate' : false} onCheckedChange={() => toggleIds(ids)} aria-label={`${group.rows.length} Meldungen zu ${group.title} auswählen`} /></label><button type="button" disabled={writing} className="group flex min-h-[106px] min-w-0 flex-1 items-center gap-3 rounded-kws-control py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setSelectedGroup(group.key); setSelected([]); setVisible(30); }}><span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-secondary sm:flex"><Layers className="h-4 w-4 text-muted-foreground" /></span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold group-hover:text-primary-ink">{shortTitle(group.title)}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{group.location}{group.release && ` · ${group.release}`}</p><p className="mt-2 text-xs text-muted-foreground">{group.open} offen · Zuletzt {dateLabel(group.last)}</p></div><span className="shrink-0 rounded-kws-badge bg-secondary px-2 py-1 text-sm font-semibold tabular-nums">{group.rows.length}<span className="sr-only"> Meldungen</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></article>;
      }) : displayRows.map(renderRow)}</KwsSurface>
      {visible < totalVisible && <Button variant="secondary" className="w-full" onClick={() => setVisible(current => current + 30)}>Weitere {groupView ? 'Gruppen' : 'Einträge'} anzeigen<ArrowRight className="ml-2 h-4 w-4" /></Button>}
      {groupView && <p className="text-xs text-muted-foreground">Gleiche Meldung und Seite werden zusammengefasst. Die einzelnen Berichte bleiben erhalten.</p>}
    </>}
    <Dialog open={filterOpen} onOpenChange={setFilterOpen}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); filterTrigger.current?.focus(); }} scrollLayout="contained" className="flex max-h-[min(90vh,740px)] max-w-[540px] flex-col gap-0 overflow-hidden p-0"><DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><DialogTitle>Feedback filtern</DialogTitle><DialogDescription className="text-xs">Suche gezielt nach relevanten Meldungen.</DialogDescription></div><Button variant="ghost" size="icon" onClick={() => setFilterOpen(false)} aria-label="Filter schließen"><X className="h-4 w-4" /></Button></div></DialogHeader><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">{(['status', 'priority', 'period', ...(filters.source === 'people' ? ['type'] : [])] as Array<'status' | 'priority' | 'period' | 'type'>).map(field => { const label = field === 'status' ? 'Status' : field === 'priority' ? 'Priorität' : field === 'period' ? 'Zeitraum' : 'Kategorie'; const options = field === 'status' ? { all: 'Alle Status', ...statusLabels } : field === 'priority' ? { all: 'Alle Prioritäten', ...priorityLabels } : field === 'period' ? periodLabels : { all: 'Alle Kategorien', ...Object.fromEntries(Object.entries(typeLabels).filter(([key]) => key !== 'error')) }; return <div key={field} className="space-y-2"><Label htmlFor={`filter-${field}`}>{label}</Label><Select value={draft[field]} onValueChange={value => setDraft(current => ({ ...current, [field]: value }))}><SelectTrigger id={`filter-${field}`} aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options).map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>; })}</div><DialogFooter className="shrink-0 flex-row gap-2 border-t border-border p-4 sm:space-x-0"><Button variant="secondary" className="flex-1" onClick={() => setDraft({ ...defaultFeedbackFilters, source: filters.source, search: filters.search, sort: filters.sort })}>Zurücksetzen</Button><Button className="flex-1" onClick={() => { changeFilters(draft); setFilterOpen(false); }}>Anwenden</Button></DialogFooter></DialogContent></Dialog>
    {detailId && user && <FeedbackDetailDialog restoreFocus={restoreDetailFocus} id={detailId} connection={connection} userId={user.id} onClose={() => setDetailId(null)} onSaved={() => { invalidate(); toast.success('Rückmeldung gespeichert'); }} onDelete={id => { setDetailId(null); ask([id], 'delete'); }} />}
    <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !writing) setConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmation?.action === 'delete' ? `${confirmation.ids.length} Einträge löschen?` : `${confirmation?.ids.length} Einträge aktualisieren?`}</AlertDialogTitle><AlertDialogDescription>{confirmation?.action === 'delete' ? 'Diese Meldungen werden unwiderruflich gelöscht. Die Aktion kann nicht rückgängig gemacht werden.' : `Der Status der ausgewählten Meldungen wird auf „${confirmation ? statusLabels[confirmation.action as FeedbackStatus] : ''}“ gesetzt.`}</AlertDialogDescription></AlertDialogHeader>{writeError && <p role="alert" className="break-words text-sm text-destructive">{writeError}</p>}{writing && <p role="status" className="text-sm">{progress} bestätigt · Bitte warten …</p>}<AlertDialogFooter><AlertDialogCancel disabled={writing}>Abbrechen</AlertDialogCancel><Button variant={confirmation?.action === 'delete' ? 'destructive' : 'default'} disabled={writing || !confirmation?.ids.length} onClick={perform}>{writing ? 'Wird ausgeführt …' : confirmation?.action === 'delete' ? 'Endgültig löschen' : 'Status bestätigen'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
