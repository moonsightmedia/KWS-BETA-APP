import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, Info, MessageSquare, RefreshCw, Search, Star, X } from 'lucide-react';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SetterState } from '@/components/setter/SetterControls';
import { summarizeDashboard, type SetterDashboardData } from '@/lib/setterDashboard';
import { MIN_REVIEW_VOTES, dashboardAreas, reviewDashboard, selectDashboardRows, type ReviewRow, type ReviewSort, type ReviewView } from '@/lib/setterDashboardReview';
import './setter-dashboard.css';
import { SetterDashboardAreaNavigation } from './SetterDashboardAreaNavigation';
import { cn } from '@/lib/utils';

const count = (n: number) => n.toLocaleString('de-DE');
const decimal = (n: number | null) => n === null ? '–' : n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share = (n: number, total: number) => total ? Math.round(n / total * 100) : 0;
const verdicts = [{ key: 'too_easy', label: 'Zu leicht' }, { key: 'just_right', label: 'Passt' }, { key: 'too_hard', label: 'Zu schwer' }] as const;
type Props = { data?: SetterDashboardData; loading?: boolean; refreshing?: boolean; error?: boolean; updatedAt?: number; onRefresh: () => void };
const sortOptions: { value: ReviewSort; label: string }[] = [
  { value: 'feedback', label: 'Meiste Rückmeldungen' }, { value: 'best', label: 'Beste Bewertung' },
  { value: 'grade', label: 'Grad aufsteigend' },
];

function ReadDialog({ open, onOpenChange, title, description, onReturn, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; onReturn: () => void; children: ReactNode;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-compact="true" scrollLayout="contained" className="flex max-h-[88dvh] flex-col gap-0 p-0 sm:!max-w-xl"
      onCloseAutoFocus={event => { event.preventDefault(); onReturn(); }}>
      <div className="flex shrink-0 items-start justify-between gap-3 p-4 sm:p-5">
        <DialogHeader className="min-w-0 text-left"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <DialogClose asChild><Button variant="secondary" size="icon" aria-label="Fenster schließen"><X className="h-4 w-4" /></Button></DialogClose>
      </div>
      <div className="min-h-0 space-y-5 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </DialogContent>
  </Dialog>;
}

function GradeBadge({ grade }: { grade: number | null }) {
  return <span aria-label={`Grad ${grade ?? 'unbekannt'}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-kws-badge bg-secondary text-sm font-semibold tabular-nums">{grade ?? '?'}</span>;
}

function VoteBar({ label, value, total, primary = false }: { label: string; value: number; total: number; primary?: boolean }) {
  return <div className="space-y-1.5">
    <div className="flex justify-between gap-3 text-xs"><span>{label}</span><span className="tabular-nums"><strong className="font-semibold">{count(value)}</strong><span className="ml-2 text-muted-foreground">{share(value, total)} %</span></span></div>
    <div className="h-1.5 overflow-hidden rounded-kws-badge bg-secondary"><div className={cn('h-full rounded-kws-badge', primary ? 'bg-primary' : 'bg-brand-muted')} style={{ width: `${share(value, total)}%` }} /></div>
  </div>;
}

export function SetterDashboard({ data, loading, refreshing, error, updatedAt, onRefresh }: Props) {
  const [area, setArea] = useState('all');
  const [chart, setChart] = useState<'grades' | 'areas'>('grades');
  const [grade, setGrade] = useState<number | null | 'all'>('all');
  const [view, setView] = useState<ReviewView>('all');
  const [sort, setSort] = useState<ReviewSort>('feedback');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(8);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const allAreas = useMemo(() => dashboardAreas(data), [data]);
  const selectedArea = area === 'all' || allAreas.includes(area) ? area : 'all';
  const summary = useMemo(() => data ? reviewDashboard(summarizeDashboard(data, selectedArea), updatedAt || Date.now()) : null, [data, selectedArea, updatedAt]);
  const areas = allAreas;
  const areaRows = useMemo(() => data ? areas.map(name => ({ name, ...summarizeDashboard(data, name) })) : [], [areas, data]);
  const areaOptions = useMemo(() => [{ id: 'all', name: 'Ganze Halle' }, ...allAreas.map(name => ({ id: name, name }))], [allAreas]);
  const rows = useMemo(() => summary ? selectDashboardRows(summary.rows, { view, grade, search, sort }) : [], [summary, view, grade, search, sort]);
  const selected = summary?.rows.find(row => row.id === detailId);
  const comments = useMemo(() => (data?.comments ?? []).filter(c => c.boulder_id === detailId && c.comment)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')), [data, detailId]);
  const maxGrade = Math.max(1, ...summary?.distribution.filter(d => d.grade !== null).map(d => d.count) ?? []);

  function changeArea(value: string) { setDetailId(null); setArea(value); setGrade('all'); setView('all'); setSearch(''); setVisible(8); }
  function openBoulder(row: ReviewRow, trigger: HTMLButtonElement) { openerRef.current = trigger; setShowAllComments(false); setDetailId(row.id); }
  function jumpToList() { requestAnimationFrame(() => { listRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); listRef.current?.focus({ preventScroll: true }); }); }
  function resetList() { setGrade('all'); setView('all'); setSearch(''); setSort('feedback'); setVisible(8); }

  return <div className="setter-dashboard space-y-4">
    <div className="sd-topline"><span>{updatedAt ? `Stand ${new Date(updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : error ? 'Kein Datenstand' : 'Wird geladen …'}</span><div><Button variant="ghost" size="icon" aria-label="Dashboard aktualisieren" disabled={refreshing} onClick={onRefresh}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin motion-reduce:animate-none')} /></Button><Button ref={infoRef} variant="ghost" size="icon" aria-label="Datengrundlage und Hinweisregeln" onClick={() => setInfo(true)}><Info className="h-4 w-4" /></Button></div></div>
    <SetterDashboardAreaNavigation options={areaOptions} value={selectedArea} onChange={changeArea} disabled={!data} />
    {error && <KwsSurface role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><p>{data ? 'Aktualisierung fehlgeschlagen. Du siehst weiterhin den letzten erfolgreichen Stand.' : 'Die Hallendaten konnten nicht vollständig geladen werden.'}</p><Button variant="secondary" disabled={refreshing} onClick={onRefresh}>Erneut versuchen</Button></KwsSurface>}
    {loading && !data && <div role="status" aria-label="Dashboard wird geladen" className="space-y-5"><div className="h-28 rounded-kws-card bg-secondary motion-safe:animate-pulse" /><div className="h-80 rounded-kws-card bg-secondary motion-safe:animate-pulse" /><span className="sr-only">Dashboard wird geladen …</span></div>}
    {summary && <>
      {summary.rows.length > 0 && <KwsSurface aria-label="Hallenübersicht" className="sd-overview overflow-hidden">
        <div className="sd-metrics" aria-label="Hallenkennzahlen">
          {[
            { label: 'Boulder an der Wand', value: count(summary.rows.length), detail: '' },
            { label: 'Rückmeldungen', value: count(summary.totalFeedback), detail: `${count(summary.ratingCount)} Sterne · ${count(summary.gradeCount)} Einstufungen · ${count(summary.comments)} Kommentare` },
            { label: 'Ø Bewertung', value: decimal(summary.average), detail: `${count(summary.ratingCount)} Sternebewertungen` },
            { label: 'Mit Feedback', value: summary.rows.length ? `${share(summary.covered, summary.rows.length)} %` : '–', detail: `${summary.covered} von ${summary.rows.length} Bouldern` },
          ].map(metric => <div key={metric.label} className="sd-metric"><p className="sd-label">{metric.label}</p><p className="sd-value">{metric.value}</p>{metric.detail && <p className="sd-meta">{metric.detail}</p>}</div>)}
        </div>
        <div className="sd-analysis" hidden={!summary.rows.length}>
          <section className="sd-inventory" aria-labelledby="sd-distribution-title">
            <div className="sd-section-head"><div><h2 id="sd-distribution-title">{chart === 'grades' ? 'Schwierigkeiten' : 'Bereichsvergleich'}</h2></div>
              <KwsSegmentedControl<'grades' | 'areas'> value={chart} onValueChange={setChart} ariaLabel="Bestand aufschlüsseln" className="w-44 [&_button]:px-2 [&_button]:text-xs" options={[{ value: 'grades', label: 'Grade' }, { value: 'areas', label: 'Bereiche' }]} />
            </div>
            {chart === 'grades' ? <>
              <div className="sd-grade-chart" role="group" aria-label="Boulder nach Grad">
                {summary.distribution.filter(d => d.grade !== null).map(d => <button key={d.grade} aria-label={`Grad ${d.grade}: ${d.count} Boulder`} aria-pressed={grade === d.grade}
                  onClick={() => { setGrade(grade === d.grade ? 'all' : d.grade); setVisible(8); jumpToList(); }} className={cn('sd-grade', grade === d.grade && 'is-selected')}>
                  <span className="sd-bar-space"><strong>{d.count}</strong><span className={cn('sd-bar', grade !== 'all' && grade !== d.grade && 'is-muted')} style={{ height: `${d.count / maxGrade * 112}px` }} /></span>
                  <span className="sd-grade-label">{d.grade}{grade === d.grade && <Check className="h-3 w-3" />}</span>
                </button>)}
              </div>
              <div className="sd-chart-foot"><span>{grade !== 'all' ? `Grad ${grade ?? '?'}` : ''}</span>{(summary.distribution.find(d => d.grade === null)?.count ?? 0) > 0 && <Button variant="ghost" className="gap-1 px-1 text-xs" onClick={() => { setGrade(null); setVisible(8); jumpToList(); }}>{summary.distribution.find(d => d.grade === null)?.count ?? 0} ohne Grad<ChevronRight className="h-3 w-3" /></Button>}</div>
            </> : <div className="sd-areas">
              {areaRows.map(a => <button key={a.name} onClick={() => changeArea(a.name)} aria-label={`${a.name} auswählen`} className="sd-area"><span>{a.name}</span><strong>{a.rows.length}</strong><span className="sd-meta">{a.rows.length ? `${share(a.covered, a.rows.length)} % mit Feedback` : 'Noch keine Boulder'}</span><ChevronRight className="h-3.5 w-3.5" /></button>)}
            </div>}
          </section>
          <section className="sd-feedback" aria-label="Rückmeldungen im Überblick">
            <Button variant="ghost" className="sd-feedback-toggle" aria-expanded={feedbackExpanded} aria-controls="sd-feedback-content" onClick={() => setFeedbackExpanded(value => !value)}><span>Bewertungen im Detail</span><ChevronDown className={cn('h-4 w-4 transition-transform', feedbackExpanded && 'rotate-180')} /></Button>
            <div id="sd-feedback-content" className={cn('sd-feedback-content', feedbackExpanded && 'is-expanded')}>
            <div className="sd-section-head"><h2>Sternebewertungen</h2><span className="sd-meta">{count(summary.ratingCount)} Stimmen</span></div>
            {summary.ratingCount ? <div className="sd-stars">{[5, 4, 3, 2, 1].map(star => <div key={star} className="sd-star-row"><span>{star}</span><Star className="h-3 w-3 text-muted-foreground" aria-hidden="true" /><div className="sd-track"><div style={{ width: `${share(summary.stars[star - 1], summary.ratingCount)}%` }} /></div><span>{summary.stars[star - 1]}</span></div>)}</div> : <p className="sd-quiet-empty">Noch keine Sternebewertungen.</p>}
            <div className="sd-section-head sd-grade-feedback-head"><h2>Gradeinschätzung</h2><span className="sd-meta">{count(summary.gradeCount)} Stimmen</span></div>
            {summary.gradeCount ? <>
            <div className="sd-verdict-bar" aria-hidden="true">{verdicts.map(v => <span key={v.key} className={`sd-verdict-${v.key}`} style={{ width: `${share(summary.gradeCounts[v.key], summary.gradeCount)}%` }} />)}</div>
            <div className="sd-verdicts">{verdicts.map(v => <div key={v.key}><span className="sd-meta">{v.label}</span><strong>{share(summary.gradeCounts[v.key], summary.gradeCount)} %<span className="sr-only"> · {summary.gradeCounts[v.key]} Stimmen</span></strong></div>)}</div>
            </> : <p className="sd-quiet-empty">Noch keine Einstufungen.</p>}
          </div></section>
        </div>

      </KwsSurface>}

      {summary.attention.length > 0 && <KwsSurface className="sd-attention" aria-labelledby="sd-attention-title">
        <div className="sd-attention-heading"><h2 id="sd-attention-title">Zum Prüfen <span>{summary.attention.length}</span></h2>{summary.attention.length > 2 && <Button variant="ghost" className="gap-1 px-0 text-xs" onClick={() => { setView('review'); setGrade('all'); setSearch(''); setVisible(8); jumpToList(); }}>Alle ansehen<ArrowRight className="h-3.5 w-3.5" /></Button>}</div>
        <div className="sd-attention-items">{summary.attention.slice(0, 2).map(row => <button key={row.id} onClick={event => openBoulder(row, event.currentTarget)} aria-label={`${row.name}: ${row.signals[0].label}`} className="sd-attention-row"><GradeBadge grade={row.difficulty} /><span><strong>{row.name}</strong><span className="sd-meta">{row.signals[0].evidence}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>)}</div>

      </KwsSurface>}

      <section ref={listRef} tabIndex={-1} className="sd-workspace scroll-mt-28 space-y-3" aria-labelledby={summary.rows.length ? 'sd-boulders-title' : undefined} aria-label={!summary.rows.length ? 'Boulder' : undefined}>
        {summary.rows.length > 0 && <>
        <div className="sd-list-heading flex flex-wrap items-center justify-between gap-2"><h2 id="sd-boulders-title" className="font-sans text-base font-semibold">Boulder</h2><span aria-live="polite" className="text-xs text-muted-foreground">{rows.length} {grade !== 'all' || search || view !== 'all' || sort === 'best' ? 'Treffer' : 'insgesamt'}</span></div>
        <KwsSegmentedControl value={view} onValueChange={value => { setView(value); setVisible(8); setSort('feedback'); }} ariaLabel="Boulderauswahl" className="sm:max-w-lg [&_button]:px-2 [&_button]:text-xs"
          options={[{ value: 'all', label: `Alle (${summary.rows.length})` }, { value: 'review', label: `Zum Prüfen (${summary.attention.length})` }, { value: 'none', label: `Ohne Feedback (${summary.withoutFeedback})` }]} />
        <div className="sd-list-tools flex flex-wrap gap-2"><div className="relative min-w-0 basis-full sm:flex-1 sm:basis-0"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Boulder oder Bereich suchen" placeholder="Boulder suchen" value={search} onChange={event => { setSearch(event.target.value); setVisible(8); }} className={cn('bg-card pl-10', search ? 'pr-10' : 'pr-3')} />{search && <Button variant="ghost" size="icon" aria-label="Suche leeren" className="absolute right-0 top-0" onClick={() => setSearch('')}><X className="h-4 w-4" /></Button>}</div>
          <div className="w-full sm:w-52"><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Boulder sortieren" className="w-full justify-between gap-2 bg-card px-3 font-normal"><span className="min-w-0 truncate">{sortOptions.find(option => option.value === sort)?.label}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-60"><DropdownMenuRadioGroup value={sort} onValueChange={value => { setSort(value as ReviewSort); setVisible(8); }}>{sortOptions.map(option => <DropdownMenuRadioItem key={option.value} value={option.value} className="min-h-11 rounded-kws-control">{option.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>
        </div>
        {rows.length > 0 && (grade !== 'all' || search || view !== 'all' || sort === 'best') && <div className="sd-list-reset flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{grade !== 'all' ? `Grad ${grade ?? '?'}` : search ? `Suche: ${search}` : ''}</span><Button variant="ghost" className="gap-1 px-1 text-xs" onClick={resetList}><X className="h-3 w-3" />Auswahl zurücksetzen</Button></div>}
        </>}
        {rows.length ? <KwsSurface className="sd-list-surface overflow-hidden">
          <div className="sd-table-head hidden grid-cols-[minmax(0,1fr)_95px_120px_90px] gap-4 border-b border-border/60 px-5 py-3 text-xs font-medium text-muted-foreground lg:grid"><span>Boulder / Grad</span><span>Bewertung</span><span>Schwierigkeit passt</span><span>Kommentare</span></div>
          <div className="divide-y divide-border/60">{rows.slice(0, visible).map(row => <button key={row.id} aria-label={`${row.name}, Grad ${row.difficulty ?? '?'}, Auswertung öffnen`} onClick={event => openBoulder(row, event.currentTarget)}
            className="sd-list-row grid min-h-20 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[minmax(0,1fr)_95px_120px_90px] lg:gap-4 lg:px-5">
            <span className="flex min-w-0 items-center gap-3"><GradeBadge grade={row.difficulty} /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{row.name}</span>{row.signals.filter(signal => signal.kind !== 'missing').map(signal => <span key={signal.kind} className="sd-row-signal">{signal.label}</span>)}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{row.sector}</span></span></span>
            <span className="text-right lg:text-left"><span className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums lg:justify-start"><Star className="h-3.5 w-3.5 text-primary-ink" aria-hidden="true" />{decimal(row.average)}</span><span className="mt-1 block text-xs text-muted-foreground">{row.ratingCount} {row.ratingCount === 1 ? 'Stimme' : 'Stimmen'}{row.ratingCount > 0 && row.ratingCount < MIN_REVIEW_VOTES ? ' · Tendenz' : ''}</span></span>
            <span className="hidden text-sm tabular-nums lg:block">{row.gradeCount ? `${share(row.votes.just_right, row.gradeCount)} %` : '–'}<span className="mt-1 block text-xs text-muted-foreground">{row.gradeCount} Stimmen{row.gradeCount > 0 && row.gradeCount < MIN_REVIEW_VOTES ? ' · Tendenz' : ''}</span></span>
            <span className="hidden text-sm tabular-nums lg:block">{row.commentCount}</span>
            <span className="sd-mobile-meta col-span-2 text-xs text-muted-foreground lg:hidden">{row.gradeCount} Einstufungen · {row.commentCount} {row.commentCount === 1 ? 'Kommentar' : 'Kommentare'}</span>
          </button>)}</div>
        </KwsSurface> : <SetterState title={summary.rows.length ? 'Keine passenden Boulder' : 'Noch keine hängenden Boulder'} action={summary.rows.length ? <Button variant="secondary" onClick={resetList}>Auswahl zurücksetzen</Button> : selectedArea !== 'all' ? <Button variant="secondary" onClick={() => changeArea('all')}>Ganze Halle ansehen</Button> : undefined} />}
        {rows.length > visible && <Button variant="secondary" className="sd-list-more w-full" onClick={() => setVisible(n => n + 12)}>{Math.min(12, rows.length - visible)} weitere Boulder anzeigen</Button>}
      </section>

    </>}


    <ReadDialog open={!!selected} onOpenChange={open => { if (!open) setDetailId(null); }} title={selected?.name ?? 'Boulderauswertung'} description={`Grad ${selected?.difficulty ?? '?'} · ${selected?.sector ?? ''}`} onReturn={() => { if (openerRef.current?.isConnected) openerRef.current.focus(); else listRef.current?.querySelector('input')?.focus(); }}>
      {selected && <>
        {selected.signals.some(signal => signal.kind !== 'missing') && <div className="space-y-2 rounded-kws-control bg-secondary p-3">{selected.signals.filter(signal => signal.kind !== 'missing').map(signal => <p key={signal.kind} className="text-sm"><strong className="font-semibold">{signal.label}:</strong> {signal.evidence}</p>)}</div>}
        <div className="grid grid-cols-3 gap-3 border-b border-border/60 pb-4 text-center"><div><p className="text-xl font-semibold tabular-nums">{decimal(selected.average)}</p><p className="mt-1 text-xs text-muted-foreground">{selected.ratingCount} Sternebewertungen</p></div><div><p className="text-xl font-semibold tabular-nums">{selected.gradeCount}</p><p className="mt-1 text-xs text-muted-foreground">Einstufungen</p></div><div><p className="text-xl font-semibold tabular-nums">{selected.commentCount}</p><p className="mt-1 text-xs text-muted-foreground">Kommentare</p></div></div>

        <div><h3 className="mb-4 font-sans text-sm font-semibold">Gradeinschätzung</h3>{selected.gradeCount ? <div className="space-y-3">{verdicts.map(v => <VoteBar key={v.key} label={v.label} value={selected.votes[v.key]} total={selected.gradeCount} primary={v.key === 'just_right'} />)}</div> : <p className="text-sm text-muted-foreground">Noch keine Einstufungen.</p>}</div>
        <div><h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold"><MessageSquare className="h-4 w-4" aria-hidden="true" />Freigegebene Kommentare</h3>
          {comments.length ? <div className="divide-y divide-border/60">{comments.slice(0, showAllComments ? undefined : 3).map(comment => <div key={comment.id} className="py-3 first:pt-0"><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.comment}</p>{comment.created_at && <p className="mt-2 text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>}</div>)}{comments.length > 3 && !showAllComments && <Button variant="secondary" onClick={() => setShowAllComments(true)}>Alle {comments.length} Kommentare anzeigen</Button>}</div> : <p className="text-sm text-muted-foreground">Noch keine freigegebenen Kommentare.</p>}
        </div>

      </>}
    </ReadDialog>
    <ReadDialog open={info} onOpenChange={setInfo} title="Datengrundlage" description="Zählweise und Prüfhinweise" onReturn={() => infoRef.current?.focus()}>
      <dl className="space-y-4 text-sm leading-relaxed">
        <div><dt className="font-semibold">Bestand</dt><dd>Aktuell hängende Boulder. Zweitbereiche zählen mit; in der ganzen Halle wird jeder Boulder einmal gezählt.</dd></div>
        <div><dt className="font-semibold">Rückmeldungen</dt><dd>Sternebewertungen, Gradeinschätzungen und freigegebene Kommentare aus dem gesamten bisherigen Verlauf.</dd></div>
        <div><dt className="font-semibold">Bewertung und Abdeckung</dt><dd>Jede Sternebewertung zählt gleich. Unbewertete Boulder zählen nicht als 0. „Mit Feedback“ zählt Boulder mit mindestens einer Rückmeldung.</dd></div>
        <div><dt className="font-semibold">Prüfhinweise</dt><dd>Ab jeweils 5 Stimmen: mindestens 60 % finden den Grad in dieselbe Richtung abweichend, oder die Sternebewertung liegt bei höchstens 2,5. Ein Hinweis ändert keinen Boulder.</dd></div>
        <div><dt className="font-semibold">Beste Bewertung</dt><dd>Das Ranking berücksichtigt mindestens 5 Sternebewertungen je Boulder.</dd></div>
      </dl>
    </ReadDialog>
  </div>;
}
