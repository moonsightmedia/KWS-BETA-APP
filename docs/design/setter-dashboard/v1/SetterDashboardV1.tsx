import { useMemo, useRef, useState } from 'react';
import { BarChart3, Check, ChevronRight, Info, MessageSquare, RefreshCw, Star, X } from 'lucide-react';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Button } from '@/components/ui/button';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SetterSelect, SetterState } from '@/components/setter/SetterControls';
import { summarizeDashboard, type SetterDashboardData } from '@/lib/setterDashboard';
import type { BoulderGradeFeedback } from '@/types/community';
import { cn } from '@/lib/utils';

const number = (value: number) => value.toLocaleString('de-DE');
const decimal = (value: number | null) => value === null ? '–' : value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = (value: number, total: number) => total ? Math.round(value / total * 100) : 0;
const verdicts: { key: BoulderGradeFeedback; label: string }[] = [
  { key: 'too_easy', label: 'Zu leicht' }, { key: 'just_right', label: 'Passt' }, { key: 'too_hard', label: 'Zu schwer' },
];
type Summary = ReturnType<typeof summarizeDashboard>;
type Row = Summary['rows'][number];
type Props = { data?: SetterDashboardData; loading?: boolean; refreshing?: boolean; error?: boolean; updatedAt?: number; onRefresh: () => void };

function GradeFeedback({ counts }: { counts: Summary['gradeCounts'] }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return <div className="space-y-4">{verdicts.map(({ key, label }) => <div key={key}>
    <div className="mb-2 flex justify-between gap-2 text-xs"><span>{label}</span><span className="tabular-nums"><strong className="font-semibold">{number(counts[key])}</strong><span className="ml-2 text-muted-foreground">{percent(counts[key], total)} %</span></span></div>
    <div className="h-2 overflow-hidden rounded-kws-badge bg-secondary"><div className={cn('h-full rounded-kws-badge', key === 'just_right' ? 'bg-primary' : 'bg-brand-muted')} style={{ width: `${percent(counts[key], total)}%` }} /></div>
  </div>)}</div>;
}

export function SetterDashboardV1({ data, loading, refreshing, error, updatedAt, onRefresh }: Props) {
  const [area, setArea] = useState('all');
  const [grade, setGrade] = useState<number | null | 'all'>('all');
  const [view, setView] = useState<'feedback' | 'rating' | 'none'>('feedback');
  const [visible, setVisible] = useState(6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const infoTriggerRef = useRef<HTMLButtonElement>(null);
  const summary = useMemo(() => data ? summarizeDashboard(data, area) : null, [data, area]);
  const areas = useMemo(() => [...new Set(data?.boulders.flatMap(row => row.areas) ?? [])].sort((a, b) => a.localeCompare(b, 'de')), [data]);
  const selected = summary?.rows.find(row => row.id === selectedId);
  const rows = useMemo(() => (summary?.rows ?? []).filter(row => (grade === 'all' || row.difficulty === grade) && (view !== 'none' || row.feedbackCount === 0))
    .sort((a, b) => (view === 'rating' ? (b.average ?? -1) - (a.average ?? -1) || b.ratingCount - a.ratingCount : b.feedbackCount - a.feedbackCount) || a.name.localeCompare(b.name, 'de')), [summary, grade, view]);
  const maximum = Math.max(1, ...(summary?.distribution.map(row => row.count) ?? []));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="w-full sm:w-60"><SetterSelect label="Hallenbereich" value={area} onChange={value => { setArea(value); setGrade('all'); setVisible(6); }} options={[{ value: 'all', label: 'Ganze Halle' }, ...areas.map(name => ({ value: name, label: name }))]} disabled={!data} /></div>
      <div className="flex items-center gap-2"><span className="mr-1 text-xs text-muted-foreground">Aktuell an der Wand</span><Button variant="secondary" size="icon" aria-label="Dashboard aktualisieren" disabled={refreshing} onClick={onRefresh}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin motion-reduce:animate-none')} /></Button><Button variant="ghost" size="icon" ref={infoTriggerRef} aria-label="Datengrundlage erklären" onClick={() => setInfo(true)}><Info className="h-4 w-4" /></Button></div>
    </div>
    {error && <KwsSurface role="alert" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><p>{data ? 'Aktualisierung fehlgeschlagen. Der letzte geladene Stand bleibt sichtbar.' : 'Das Dashboard konnte nicht vollständig geladen werden.'}</p><Button variant="secondary" disabled={refreshing} onClick={onRefresh}>{refreshing ? 'Wird geladen …' : 'Erneut versuchen'}</Button></KwsSurface>}
    {loading && !data && <div role="status" aria-label="Dashboard wird geladen" className="space-y-5"><div className="h-28 rounded-kws-card bg-secondary motion-safe:animate-pulse" /><div className="h-72 rounded-kws-card bg-secondary motion-safe:animate-pulse" /><span className="sr-only">Dashboard wird geladen …</span></div>}
    {summary && <>
      <KwsSurface className="grid grid-cols-2 gap-x-4 gap-y-5 p-4 sm:gap-6 sm:p-5 lg:grid-cols-4" aria-label="Hallenkennzahlen">
        {[
          { label: 'Boulder an der Wand', value: number(summary.rows.length), detail: area === 'all' ? 'Gesamter Hallenbestand' : area },
          { label: 'Mit Feedback', value: `${percent(summary.covered, summary.rows.length)} %`, detail: `${number(summary.covered)} von ${number(summary.rows.length)} Bouldern` },
          { label: 'Sternebewertungen', value: number(summary.ratingCount), detail: `${number(summary.comments)} freigegebene Kommentare` },
          { label: 'Ø Bewertung', value: decimal(summary.average), detail: summary.ratingCount ? 'von 5 Sternen' : 'Noch keine Sternebewertungen' },
        ].map(item => <div key={item.label} className="min-w-0"><p className="min-h-10 text-xs font-medium text-muted-foreground sm:min-h-8">{item.label}</p><p className="text-[1.75rem] font-semibold leading-none tracking-tight text-brand-ink tabular-nums">{item.value}</p><p className="mt-2 break-words text-xs text-muted-foreground">{item.detail}</p></div>)}
      </KwsSurface>
      <KwsSurface className="p-4 sm:p-5" aria-labelledby="grade-distribution-title">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 id="grade-distribution-title" className="font-sans text-base font-semibold">Schwierigkeitsverteilung</h2><p className="mt-1 text-xs text-muted-foreground">So verteilen sich die {number(summary.rows.length)} hängenden Boulder.</p></div><span className="text-xs text-muted-foreground">Grad antippen → Boulder ansehen</span></div>
        <div className="mt-5 grid grid-cols-9 gap-1 sm:gap-3" role="group" aria-label="Boulder nach Schwierigkeitsgrad">
          {summary.distribution.map(item => <button key={item.grade ?? '?'} aria-pressed={grade === item.grade} aria-label={`Grad ${item.grade ?? 'unbekannt'}: ${item.count} Boulder`} onClick={() => { setGrade(grade === item.grade ? 'all' : item.grade); setVisible(6); requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })); }} className={cn('group flex min-w-0 flex-col items-center rounded-kws-control px-0.5 py-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', grade === item.grade && 'bg-secondary')}>
            <span className="flex h-36 w-full flex-col justify-end sm:h-40"><span className="mb-2 text-xs font-semibold tabular-nums">{item.count}</span><span className={cn('mx-auto block w-full max-w-14 rounded-t-kws-badge bg-primary transition-colors group-hover:bg-primary/80', grade !== 'all' && grade !== item.grade && 'bg-secondary')} style={{ height: `${Math.max(item.count ? 5 : 0, item.count / maximum * 105)}px` }} /></span>
            <span className="mt-2 flex h-7 items-center gap-1 text-sm font-semibold">{item.grade ?? '?'}{grade === item.grade && <Check className="h-3 w-3" />}</span>
          </button>)}
        </div>
      </KwsSurface>
      <div className="grid gap-5 lg:grid-cols-2">
        <KwsSurface className="p-4 sm:p-5"><h2 className="font-sans text-base font-semibold">Wie kommen die Boulder an?</h2><p className="mt-1 text-xs text-muted-foreground">{number(summary.ratingCount)} Sternebewertungen · alle gespeicherten Stimmen</p><div className="mt-5 flex gap-5"><div className="w-20 shrink-0 pt-3"><p className="text-4xl font-semibold tracking-tight tabular-nums">{decimal(summary.average)}</p><Star aria-hidden="true" className="mt-2 h-5 w-5 fill-primary text-primary-ink" /><p className="mt-2 text-xs text-muted-foreground">von 5 Sternen</p></div><div className="flex-1 space-y-2">{[5, 4, 3, 2, 1].map(star => <div key={star} className="flex items-center gap-2 text-xs"><span className="w-3 tabular-nums">{star}</span><Star aria-hidden="true" className="h-3 w-3 text-muted-foreground" /><div className="h-2 flex-1 overflow-hidden rounded-kws-badge bg-secondary"><div className="h-full rounded-kws-badge bg-primary" style={{ width: `${percent(summary.stars[star - 1], summary.ratingCount)}%` }} /></div><span className="w-8 text-right tabular-nums">{number(summary.stars[star - 1])}</span></div>)}</div></div></KwsSurface>
        <KwsSurface className="p-4 sm:p-5"><h2 className="font-sans text-base font-semibold">Passt die Schwierigkeit?</h2><p className="mb-5 mt-1 text-xs text-muted-foreground">{number(summary.gradeCount)} Rückmeldungen zur Einstufung</p><GradeFeedback counts={summary.gradeCounts} /></KwsSurface>
      </div>
      <section ref={listRef} className="scroll-mt-28 space-y-3" aria-labelledby="boulder-feedback-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="boulder-feedback-title" className="font-sans text-base font-semibold">Boulder im Blick</h2><span className="text-xs text-muted-foreground">{number(rows.length)} {grade === 'all' ? 'Boulder' : `Boulder · Grad ${grade ?? '?'}`}</span></div>
        <KwsSegmentedControl value={view} onValueChange={value => { setView(value); setVisible(6); }} ariaLabel="Boulderliste sortieren" options={[{ value: 'feedback', label: 'Meistes Feedback' }, { value: 'rating', label: 'Bestbewertet' }, { value: 'none', label: 'Ohne Feedback' }]} className="[&_button]:px-2 [&_button]:text-xs sm:max-w-lg" />
        {grade !== 'all' && <Button variant="secondary" onClick={() => setGrade('all')} className="gap-2">Grad {grade ?? '?'}<X className="h-4 w-4" /><span className="sr-only">Gradfilter entfernen</span></Button>}
        {rows.length ? <KwsSurface className="overflow-hidden divide-y divide-border/60">{rows.slice(0, visible).map(row => <button key={row.id} onClick={event => { detailTriggerRef.current = event.currentTarget; setSelectedId(row.id); }} className="flex min-h-24 w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5" aria-label={`${row.name}, Grad ${row.difficulty ?? '?'}, Feedback ansehen`}>
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-kws-control bg-secondary">{row.thumbnailUrl ? <img src={row.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} /> : null}<span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-kws-badge bg-card text-xs font-semibold shadow-sm">{row.difficulty ?? '?'}</span></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{row.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{row.sector}</p><p className="mt-1 text-xs text-muted-foreground xl:hidden">{row.feedbackCount} Beiträge · {row.commentCount} {row.commentCount === 1 ? 'Kommentar' : 'Kommentare'}</p></div>
          <div className="hidden text-right text-xs xl:block"><p className="font-semibold">{number(row.feedbackCount)} Beiträge</p><p className="mt-1 text-muted-foreground">{row.gradeCount} zur Schwierigkeit · {row.commentCount} {row.commentCount === 1 ? 'Kommentar' : 'Kommentare'}</p></div>
          <div className="w-14 shrink-0 text-right"><p className="flex items-center justify-end gap-1 text-sm font-semibold"><Star aria-hidden="true" className="h-3.5 w-3.5 text-primary-ink" />{decimal(row.average)}</p><p className="mt-1 text-xs text-muted-foreground">{row.ratingCount} {row.ratingCount === 1 ? 'Stimme' : 'Stimmen'}</p></div><ChevronRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-muted-foreground xl:block" />
        </button>)}</KwsSurface> : <SetterState title={summary.rows.length ? 'Keine passenden Boulder' : 'Noch keine hängenden Boulder'} description={view === 'none' && summary.rows.length ? 'Alle Boulder dieser Auswahl haben bereits Feedback.' : 'Sobald passende Boulder vorhanden sind, erscheinen sie hier.'} />}
        {rows.length > visible && <Button variant="secondary" className="w-full" onClick={() => setVisible(count => count + 12)}>Weitere Boulder anzeigen ({rows.length - visible})</Button>}
      </section>
      <p className="text-xs leading-relaxed text-muted-foreground">Nur aktuell hängende Boulder · Sterne, Schwierigkeit und freigegebene Kommentare · {updatedAt ? `Stand ${new Date(updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : 'Alle gespeicherten Rückmeldungen'}</p>
    </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelectedId(null); }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); detailTriggerRef.current?.focus(); }} data-compact="true" scrollLayout="contained" className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:!max-w-lg"><div className="flex shrink-0 items-start justify-between gap-3 p-4"><DialogHeader className="min-w-0 text-left"><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>Grad {selected?.difficulty ?? '?'} · {selected?.sector}</DialogDescription></DialogHeader><DialogClose asChild><Button variant="secondary" size="icon" aria-label="Boulderdetails schließen"><X className="h-4 w-4" /></Button></DialogClose></div><div className="min-h-0 overflow-y-auto p-4 pt-0">{selected && <BoulderSummary row={selected} />}</div></DialogContent></Dialog>
    <Dialog open={info} onOpenChange={setInfo}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); infoTriggerRef.current?.focus(); }} data-compact="true" scrollLayout="contained" className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:!max-w-lg"><div className="flex shrink-0 items-start justify-between gap-3 p-4"><DialogHeader className="min-w-0 text-left"><DialogTitle>Was wird gezählt?</DialogTitle><DialogDescription>Die Zahlen beziehen sich auf aktuell hängende Boulder in deiner Bereichsauswahl.</DialogDescription></DialogHeader><DialogClose asChild><Button variant="secondary" size="icon" aria-label="Datengrundlage schließen"><X className="h-4 w-4" /></Button></DialogClose></div><div className="min-h-0 overflow-y-auto space-y-4 p-4 pt-0 text-sm leading-relaxed"><p><strong>Feedback-Abdeckung:</strong> Ein Boulder zählt, sobald mindestens eine Sternebewertung, eine Rückmeldung zur Schwierigkeit oder ein freigegebener Kommentar vorliegt.</p><p><strong>Beiträge:</strong> Die Summe dieser drei Arten von Rückmeldungen. Eine Person kann mehrere Beiträge abgeben. Die Zahl ist keine Personenzahl.</p><p><strong>Bewertung:</strong> Durchschnitt aller einzelnen Sternebewertungen, von 1 bis 5. Unbewertete Boulder gehen nicht als 0 ein.</p><p><strong>Bestand:</strong> Ein Boulder mit zwei Sektoren zählt in der gesamten Halle einmal. Abgeschraubte Boulder und private Trackingdaten sind nicht enthalten.</p><p><strong>Zeitraum:</strong> Alle aktuell gespeicherten Rückmeldungen zu diesen Bouldern, ohne zeitliche Einschränkung oder historische Trendberechnung.</p></div></DialogContent></Dialog>
  </div>;
}

function BoulderSummary({ row }: { row: Row }) {
  return <div className="space-y-5"><div className="grid grid-cols-3 gap-3 rounded-kws-control bg-secondary p-4 text-center">{[
    { icon: Star, value: decimal(row.average), label: `${row.ratingCount} Bewertungen` },
    { icon: BarChart3, value: row.gradeCount, label: 'Einstufungen' },
    { icon: MessageSquare, value: row.commentCount, label: 'Kommentare' },
  ].map(({ icon: Icon, value, label }) => <div key={label}><Icon aria-hidden="true" className="mx-auto mb-2 h-4 w-4 text-primary-ink" /><p className="text-lg font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div><h3 className="font-sans text-base font-semibold">Rückmeldung zur Schwierigkeit</h3><GradeFeedback counts={row.votes} />{!row.feedbackCount && <p className="text-sm text-muted-foreground">Zu diesem Boulder gibt es noch kein Feedback.</p>}</div>;
}
