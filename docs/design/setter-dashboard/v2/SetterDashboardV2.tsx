import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, Info, MessageSquare, RefreshCw, Search, Star, X } from 'lucide-react';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SetterSelect, SetterState } from '@/components/setter/SetterControls';
import { summarizeDashboard, type SetterDashboardData } from '@/lib/setterDashboard';
import { MIN_REVIEW_VOTES, dashboardAreas, reviewDashboard, selectDashboardRows, type ReviewRow, type ReviewSort, type ReviewView } from '@/lib/setterDashboardReview';
import { cn } from '@/lib/utils';

const count = (n: number) => n.toLocaleString('de-DE');
const decimal = (n: number | null) => n === null ? '–' : n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share = (n: number, total: number) => total ? Math.round(n / total * 100) : 0;
const verdicts = [{ key: 'too_easy', label: 'Zu leicht' }, { key: 'just_right', label: 'Passt' }, { key: 'too_hard', label: 'Zu schwer' }] as const;
type Props = { data?: SetterDashboardData; loading?: boolean; refreshing?: boolean; error?: boolean; updatedAt?: number; onRefresh: () => void };
const sortOptions: { value: ReviewSort; label: string }[] = [
  { value: 'feedback', label: 'Meiste Rückmeldungen' }, { value: 'best', label: 'Beste Bewertung · ab 5' },
  { value: 'grade', label: 'Grad aufsteigend' }, { value: 'oldest', label: 'Älteste zuerst' },
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

export function SetterDashboardV2({ data, loading, refreshing, error, updatedAt, onRefresh }: Props) {
  const [area, setArea] = useState('all');
  const [chart, setChart] = useState<'grades' | 'areas'>('grades');
  const [grade, setGrade] = useState<number | null | 'all'>('all');
  const [view, setView] = useState<ReviewView>('all');
  const [sort, setSort] = useState<ReviewSort>('feedback');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(8);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const summary = useMemo(() => data ? reviewDashboard(summarizeDashboard(data, area), updatedAt || Date.now()) : null, [data, area, updatedAt]);
  const areas = useMemo(() => dashboardAreas(data), [data]);
  const areaRows = useMemo(() => data ? areas.map(name => ({ name, ...summarizeDashboard(data, name) })) : [], [areas, data]);
  const rows = useMemo(() => summary ? selectDashboardRows(summary.rows, { view, grade, search, sort }) : [], [summary, view, grade, search, sort]);
  const selected = summary?.rows.find(row => row.id === detailId);
  const comments = useMemo(() => (data?.comments ?? []).filter(c => c.boulder_id === detailId && c.comment)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')), [data, detailId]);
  const maxGrade = Math.max(1, ...summary?.distribution.filter(d => d.grade !== null).map(d => d.count) ?? []);

  function changeArea(value: string) { setArea(value); setGrade('all'); setView('all'); setSearch(''); setVisible(8); }
  function openBoulder(row: ReviewRow, trigger: HTMLButtonElement) { openerRef.current = trigger; setShowAllComments(false); setDetailId(row.id); }
  function jumpToList() { requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })); }
  function resetList() { setGrade('all'); setView('all'); setSearch(''); setSort('feedback'); setVisible(8); }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 sm:max-w-64"><SetterSelect label="Hallenbereich" value={area} onChange={changeArea} disabled={!data}
        options={[{ value: 'all', label: 'Ganze Halle' }, ...areas.map(name => ({ value: name, label: name }))]} /></div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="mr-1 hidden text-xs text-muted-foreground sm:block">{updatedAt ? `Stand ${new Date(updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : 'Aktueller Bestand'}</span>
        <Button variant="secondary" size="icon" aria-label="Dashboard aktualisieren" disabled={refreshing} onClick={onRefresh}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin motion-reduce:animate-none')} /></Button>
        <Button ref={infoRef} variant="ghost" size="icon" aria-label="Datengrundlage und Hinweisregeln" onClick={() => setInfo(true)}><Info className="h-4 w-4" /></Button>
      </div>
    </div>
    {error && <KwsSurface role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><p>{data ? 'Aktualisierung fehlgeschlagen. Du siehst weiterhin den letzten erfolgreichen Stand.' : 'Die Hallendaten konnten nicht vollständig geladen werden.'}</p><Button variant="secondary" disabled={refreshing} onClick={onRefresh}>Erneut versuchen</Button></KwsSurface>}
    {loading && !data && <div role="status" aria-label="Dashboard wird geladen" className="space-y-5"><div className="h-28 rounded-kws-card bg-secondary motion-safe:animate-pulse" /><div className="h-80 rounded-kws-card bg-secondary motion-safe:animate-pulse" /><span className="sr-only">Dashboard wird geladen …</span></div>}
    {summary && <>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground"><p>Aktuell hängende Boulder · {area === 'all' ? 'Ganze Halle' : area}</p><p>Rückmeldungen aus der gesamten Laufzeit</p></div>
      <KwsSurface aria-label="Hallenkennzahlen" className="grid grid-cols-2 gap-x-5 gap-y-5 p-4 sm:p-5 lg:grid-cols-4">
        {[
          { label: 'Boulder an der Wand', value: count(summary.rows.length), detail: `${summary.newCount} in den letzten 7 Tagen angelegt` },
          { label: 'Rückmeldungen', value: count(summary.totalFeedback), detail: `${count(summary.ratingCount)} Sterne · ${count(summary.gradeCount)} Einstufungen · ${count(summary.comments)} Kommentare` },
          { label: 'Ø Sternebewertung', value: decimal(summary.average), detail: `${count(summary.ratingCount)} Bewertungen · von 5 Sternen` },
          { label: 'Feedback-Abdeckung', value: summary.rows.length ? `${share(summary.covered, summary.rows.length)} %` : '–', detail: `${count(summary.covered)} von ${count(summary.rows.length)} Bouldern mit Rückmeldung` },
        ].map(metric => <div key={metric.label} className="min-w-0"><p className="min-h-8 text-xs font-medium text-muted-foreground">{metric.label}</p><p className="text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums">{metric.value}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{metric.detail}</p></div>)}
      </KwsSurface>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <KwsSurface className="order-2 min-w-0 p-4 sm:p-5 xl:order-1" aria-labelledby="v2-distribution-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="v2-distribution-title" className="font-sans text-base font-semibold">Hallenbestand</h2>
            <KwsSegmentedControl<'grades' | 'areas'> value={chart} onValueChange={setChart} ariaLabel="Bestand aufschlüsseln" className="w-48 [&_button]:min-h-10 [&_button]:px-2 [&_button]:text-xs" options={[{ value: 'grades', label: 'Grade' }, { value: 'areas', label: 'Bereiche' }]} /></div>
          {chart === 'grades' ? <>
            <p className="mt-2 text-xs text-muted-foreground">Anzahl je Grad · Auswahl filtert die Boulderliste</p>
            <div className="mt-5 grid grid-cols-8 gap-1" role="group" aria-label="Boulder nach Grad">
              {summary.distribution.filter(d => d.grade !== null).map(d => <button key={d.grade} aria-label={`Grad ${d.grade}: ${d.count} Boulder`} aria-pressed={grade === d.grade}
                onClick={() => { setGrade(grade === d.grade ? 'all' : d.grade); setVisible(8); jumpToList(); }}
                className={cn('flex min-w-0 flex-col items-center rounded-kws-control px-0.5 py-2 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', grade === d.grade && 'bg-secondary')}>
                <span className="flex h-32 w-full flex-col justify-end"><strong className="mb-2 text-xs font-semibold tabular-nums">{d.count}</strong><span className={cn('mx-auto w-full max-w-10 rounded-t-kws-badge', grade === 'all' || grade === d.grade ? 'bg-primary' : 'bg-brand-muted')} style={{ height: `${d.count / maxGrade * 92}px` }} /></span>
                <span className="mt-2 flex items-center gap-0.5 text-sm font-semibold">{d.grade}{grade === d.grade && <Check className="h-3 w-3" />}</span>
                <span className="mt-1 text-[11px] text-muted-foreground tabular-nums">{share(d.count, summary.rows.length)} %</span>
              </button>)}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/60 pt-2 text-xs text-muted-foreground"><span>{count(summary.rows.length)} Boulder in dieser Auswahl</span><Button variant="ghost" className="h-11 gap-1 px-1 text-xs" onClick={() => { setGrade(null); setVisible(8); jumpToList(); }}>{summary.distribution.find(d => d.grade === null)?.count ?? 0} ohne Grad<ArrowRight className="h-3 w-3" /></Button></div>
          </> : <div className="mt-4 space-y-1">
            {areaRows.map(a => <button key={a.name} onClick={() => changeArea(a.name)} aria-label={`${a.name} auswählen`} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-kws-control px-2 py-2 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0 flex-1 text-sm">{a.name}</span><span className="text-right text-xs"><strong className="font-semibold tabular-nums">{a.rows.length} Boulder</strong><span className="mt-0.5 block text-muted-foreground">{a.rows.length ? `${share(a.covered, a.rows.length)} % mit Feedback` : 'Noch keine Boulder'}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>)}
            <p className="pt-2 text-xs leading-relaxed text-muted-foreground">Gesamte Halle zum Vergleich. Boulder mit zwei Bereichen zählen in beiden; die Bereichszahlen sind nicht addierbar.</p>
          </div>}
        </KwsSurface>

        <KwsSurface className="order-1 min-w-0 overflow-hidden xl:order-2" aria-labelledby="v2-attention-title">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5"><h2 id="v2-attention-title" className="font-sans text-base font-semibold">Zum Prüfen</h2><span className="rounded-kws-badge bg-secondary px-2 py-1 text-xs font-semibold tabular-nums">{summary.attention.length} Boulder</span></div>
          <p className="px-4 pb-2 pt-1 text-xs text-muted-foreground sm:px-5">Einstufung oder Bewertung näher ansehen</p>
          {summary.attention.length ? <div className="divide-y divide-border/60">{summary.attention.slice(0, 3).map(row => <button key={row.id} onClick={event => openBoulder(row, event.currentTarget)} aria-label={`${row.name}: ${row.signals[0].label}`}
            className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
            <GradeBadge grade={row.difficulty} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.name}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{row.signals[0].evidence}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>)}</div> : <p className="px-4 py-5 text-sm text-muted-foreground sm:px-5">{summary.rows.length ? 'Keine Hinweise nach den aktuellen Regeln. Eine kleine Stimmenbasis bleibt bei den Bouldern sichtbar.' : 'Sobald Boulder und Rückmeldungen vorhanden sind, erscheinen hier Hinweise.'}</p>}
          <div className="border-t border-border/60 px-4 py-2 sm:px-5"><Button variant="ghost" className="w-full justify-between px-0 text-xs" onClick={() => { setView('review'); setGrade('all'); setSearch(''); setSort('feedback'); setVisible(8); jumpToList(); }}>Alle Hinweise ansehen<ArrowRight className="h-4 w-4" /></Button>
            <Button variant="ghost" className="h-auto min-h-11 w-full justify-between gap-2 whitespace-normal px-0 py-2 text-left text-xs text-muted-foreground" aria-label={`${summary.withoutFeedback} Boulder ohne Feedback ansehen`} onClick={() => { setView('none'); setGrade('all'); setSearch(''); setSort('oldest'); setVisible(8); jumpToList(); }}><span>{summary.withoutFeedback} Boulder ohne Feedback<span className="mt-0.5 block text-[11px]">{summary.missingFeedback} davon seit mindestens 7 Tagen angelegt</span></span><ArrowRight className="h-4 w-4 shrink-0" /></Button></div>
        </KwsSurface>
      </div>

      <KwsSurface className="grid gap-6 p-4 sm:p-5 xl:grid-cols-2 xl:gap-10" aria-label="Rückmeldungen im Überblick">
        <div className="min-w-0"><div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-sans text-base font-semibold">Sternebewertungen</h2><span className="text-xs text-muted-foreground">{count(summary.ratingCount)} Stimmen</span></div>
          <div className="space-y-2">{[5, 4, 3, 2, 1].map(star => <div key={star} className="flex items-center gap-2 text-xs"><span className="w-3 tabular-nums">{star}</span><Star className="h-3 w-3 text-muted-foreground" aria-hidden="true" /><div className="h-1.5 flex-1 overflow-hidden rounded-kws-badge bg-secondary"><div className="h-full rounded-kws-badge bg-primary" style={{ width: `${share(summary.stars[star - 1], summary.ratingCount)}%` }} /></div><span className="w-8 text-right tabular-nums">{summary.stars[star - 1]}</span></div>)}</div>
        </div>
        <div className="min-w-0"><div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-sans text-base font-semibold">Schwierigkeitseinschätzung</h2><span className="text-xs text-muted-foreground">{count(summary.gradeCount)} Stimmen</span></div>
          <div className="space-y-3">{verdicts.map(v => <VoteBar key={v.key} label={v.label} value={summary.gradeCounts[v.key]} total={summary.gradeCount} primary={v.key === 'just_right'} />)}</div>
        </div>
      </KwsSurface>

      <section ref={listRef} className="scroll-mt-28 space-y-3" aria-labelledby="v2-boulders-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="v2-boulders-title" className="font-sans text-base font-semibold">Boulder auswerten</h2><span aria-live="polite" className="text-xs text-muted-foreground">{rows.length} Treffer{grade !== 'all' ? ` · Grad ${grade ?? '?'}` : ''}</span></div>
        <KwsSegmentedControl value={view} onValueChange={value => { setView(value); setVisible(8); setSort(value === 'none' ? 'oldest' : 'feedback'); }} ariaLabel="Boulderauswahl" className="sm:max-w-lg [&_button]:px-2 [&_button]:text-xs"
          options={[{ value: 'all', label: `Alle (${summary.rows.length})` }, { value: 'review', label: `Zum Prüfen (${summary.attention.length})` }, { value: 'none', label: `Ohne Feedback (${summary.withoutFeedback})` }]} />
        <div className="flex flex-wrap gap-2"><div className="relative min-w-0 basis-full sm:flex-1 sm:basis-0"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Boulder oder Bereich suchen" placeholder="Boulder oder Bereich suchen" value={search} onChange={event => { setSearch(event.target.value); setVisible(8); }} className="bg-card pl-10 pr-10" />{search && <Button variant="ghost" size="icon" aria-label="Suche leeren" className="absolute right-0 top-0" onClick={() => setSearch('')}><X className="h-4 w-4" /></Button>}</div>
          <div className="w-full sm:w-52"><DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Boulder sortieren" className="w-full justify-between gap-2 bg-card px-3 font-normal"><span className="min-w-0 truncate">{sortOptions.find(option => option.value === sort)?.label}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-60"><DropdownMenuRadioGroup value={sort} onValueChange={value => { setSort(value as ReviewSort); setVisible(8); }}>{sortOptions.map(option => <DropdownMenuRadioItem key={option.value} value={option.value} className="min-h-11 rounded-kws-control">{option.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>
        </div>
        {(grade !== 'all' || search || view !== 'all' || sort === 'best') && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{sort === 'best' ? 'Ranking berücksichtigt nur Boulder mit mindestens 5 Sternebewertungen.' : 'Die Auswahl betrifft nur die Boulderliste.'}</span><Button variant="ghost" className="gap-1 px-1 text-xs" onClick={resetList}><X className="h-3 w-3" />Auswahl zurücksetzen</Button></div>}
        {rows.length ? <KwsSurface className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_95px_120px_90px_118px] gap-4 border-b border-border/60 px-5 py-3 text-xs font-medium text-muted-foreground xl:grid"><span>Boulder / Grad</span><span>Bewertung</span><span>Schwierigkeit passt</span><span>Kommentare</span><span>Einordnung</span></div>
          <div className="divide-y divide-border/60">{rows.slice(0, visible).map(row => <button key={row.id} aria-label={`${row.name}, Grad ${row.difficulty ?? '?'}, Auswertung öffnen`} onClick={event => openBoulder(row, event.currentTarget)}
            className="grid min-h-24 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring xl:grid-cols-[minmax(0,1fr)_95px_120px_90px_118px] xl:gap-4 xl:px-5">
            <span className="flex min-w-0 items-center gap-3"><GradeBadge grade={row.difficulty} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{row.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{row.sector}</span></span></span>
            <span className="text-right xl:text-left"><span className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums xl:justify-start"><Star className="h-3.5 w-3.5 text-primary-ink" aria-hidden="true" />{decimal(row.average)}</span><span className="mt-1 block text-xs text-muted-foreground">{row.ratingCount} {row.ratingCount === 1 ? 'Stimme' : 'Stimmen'}</span></span>
            <span className="hidden text-sm tabular-nums xl:block">{row.gradeCount ? `${share(row.votes.just_right, row.gradeCount)} %` : '–'}<span className="mt-1 block text-xs text-muted-foreground">{row.gradeCount} Stimmen</span></span>
            <span className="hidden text-sm tabular-nums xl:block">{row.commentCount}</span>
            <span className="col-span-2 flex flex-wrap items-center justify-between gap-2 text-xs xl:col-span-1"><span className={cn('rounded-kws-badge px-2 py-1', row.signals.length ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground')}>
              {row.signals[0]?.label ?? ((row.ratingCount > 0 && row.ratingCount < MIN_REVIEW_VOTES) || (row.gradeCount > 0 && row.gradeCount < MIN_REVIEW_VOTES) ? 'Wenige Stimmen' : row.feedbackCount ? 'Kein Hinweis' : 'Noch ohne Feedback')}
            </span><span className="text-muted-foreground xl:hidden">{row.gradeCount} Einstufungen · {row.commentCount} {row.commentCount === 1 ? 'Kommentar' : 'Kommentare'}</span></span>
          </button>)}</div>
        </KwsSurface> : <SetterState title={summary.rows.length ? 'Keine passenden Boulder' : 'Noch keine hängenden Boulder'} description="Du kannst die Auswahl zurücksetzen oder einen anderen Bereich wählen." />}
        {rows.length > visible && <Button variant="secondary" className="w-full" onClick={() => setVisible(n => n + 12)}>Weitere {Math.min(12, rows.length - visible)} Boulder anzeigen ({rows.length - visible} weitere)</Button>}
      </section>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Feedback stammt aus der App und bildet nicht alle Hallenbesucher ab. Hinweise sind Anlässe zur Prüfung, keine automatischen Umstufungen.</p>
    </>}

    <ReadDialog open={!!selected} onOpenChange={open => { if (!open) setDetailId(null); }} title={selected?.name ?? 'Boulderauswertung'} description={`Grad ${selected?.difficulty ?? '?'} · ${selected?.sector ?? ''}`} onReturn={() => openerRef.current?.focus()}>
      {selected && <>
        {selected.signals.length > 0 && <div className="space-y-2 rounded-kws-control bg-secondary p-3">{selected.signals.map(signal => <p key={signal.kind} className="text-sm"><strong className="font-semibold">{signal.label}:</strong> {signal.evidence}</p>)}</div>}
        <div className="grid grid-cols-3 gap-3 border-b border-border/60 pb-4 text-center"><div><p className="text-xl font-semibold tabular-nums">{decimal(selected.average)}</p><p className="mt-1 text-xs text-muted-foreground">{selected.ratingCount} Sternebewertungen</p></div><div><p className="text-xl font-semibold tabular-nums">{selected.gradeCount}</p><p className="mt-1 text-xs text-muted-foreground">Einstufungen</p></div><div><p className="text-xl font-semibold tabular-nums">{selected.commentCount}</p><p className="mt-1 text-xs text-muted-foreground">Kommentare</p></div></div>
        {(selected.ratingCount < MIN_REVIEW_VOTES || selected.gradeCount < MIN_REVIEW_VOTES) && <p className="text-xs leading-relaxed text-muted-foreground">Weniger als 5 Stimmen in einer Kategorie sind eine erste Tendenz. Hinweise zur Bewertung und zum Grad entstehen erst ab jeweils 5 Stimmen.</p>}
        <div><h3 className="mb-4 font-sans text-sm font-semibold">Wie wird der Grad eingeschätzt?</h3><div className="space-y-3">{verdicts.map(v => <VoteBar key={v.key} label={v.label} value={selected.votes[v.key]} total={selected.gradeCount} primary={v.key === 'just_right'} />)}</div></div>
        <div><h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold"><MessageSquare className="h-4 w-4" aria-hidden="true" />Freigegebene Kommentare</h3>
          {comments.length ? <div className="divide-y divide-border/60">{comments.slice(0, showAllComments ? undefined : 3).map(comment => <div key={comment.id} className="py-3 first:pt-0"><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.comment}</p>{comment.created_at && <p className="mt-2 text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>}</div>)}{comments.length > 3 && !showAllComments && <Button variant="secondary" onClick={() => setShowAllComments(true)}>Alle {comments.length} Kommentare anzeigen</Button>}</div> : <p className="text-sm text-muted-foreground">Noch keine freigegebenen Kommentare.</p>}
        </div>
        <p className="text-xs text-muted-foreground">{selected.ageDays !== null ? `Vor ${selected.ageDays} Tagen angelegt. ` : ''}Das Anlagedatum ist kein Nachweis der ununterbrochenen Hängedauer.</p>
      </>}
    </ReadDialog>
    <ReadDialog open={info} onOpenChange={setInfo} title="Datengrundlage & Hinweisregeln" description="Transparente Einordnung für das Schraubteam" onReturn={() => infoRef.current?.focus()}>
      <div className="space-y-4 text-sm leading-relaxed"><p><strong>Bestand:</strong> Aktuell hängende Boulder, in der gesamten Halle einmal gezählt. Zwei Bereichszuordnungen zählen nur im jeweiligen Bereichsvergleich doppelt.</p><p><strong>Rückmeldungen:</strong> Sternebewertungen, Schwierigkeitseinstufungen und freigegebene Kommentare. Das ist keine Personenzahl. Private Trackingdaten werden nicht verwendet.</p><p><strong>Ø Bewertung:</strong> Jede einzelne Sternebewertung zählt gleich. Unbewertete Boulder sind kein Wert 0. Das Ranking „Beste Bewertung“ berücksichtigt mindestens 5 Sternebewertungen.</p><p><strong>Grad prüfen:</strong> Mindestens 5 Einstufungen, davon mindestens 60 % in dieselbe abweichende Richtung. Keine automatische Gradänderung.</p><p><strong>Bewertung ansehen:</strong> Mindestens 5 Sternebewertungen bei einem Durchschnitt von höchstens 2,5.</p><p><strong>Feedback fehlt:</strong> Seit mindestens 7 Tagen angelegt und bisher keine Rückmeldung. Das ist ein Hinweis auf fehlende Daten, kein Qualitätsurteil.</p><p><strong>Entwurfsregeln:</strong> Die Schwellen dienen zunächst der Orientierung. Sie sind noch keine bestätigten Hallenstandards oder statistischen Signifikanztests.</p><p><strong>Zeitraum:</strong> Alle gespeicherten Rückmeldungen zu den aktuell hängenden Bouldern. „Neu angelegt“ bezieht sich auf die letzten 7 × 24 Stunden. Bestandsänderungen und wiederholtes Aufhängen sind damit nicht historisch messbar.</p></div>
    </ReadDialog>
  </div>;
}
