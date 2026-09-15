import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronDown, RefreshCw, Target, Trophy, X, Zap } from 'lucide-react';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { PersonalDataState } from '@/components/PersonalDataState';
import { PersonalCollection } from '@/components/statistics/PersonalCollection';
import { Button } from '@/components/ui/button';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { KwsSurface } from '@/components/ui/kws-surface';
import { useAuth } from '@/hooks/useAuth';
import { useMyTrackedBoulders, useMyTrackingSessions } from '@/hooks/useBoulderCommunity';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { buildPersonalProgress, gradeKey, isSuccessful } from '@/lib/personalProgress';
import { cn } from '@/lib/utils';

const periods = [{ value: '7', label: '7 Tage' }, { value: '30', label: '30 Tage' }, { value: 'all', label: 'Gesamt' }];
const dateLabel = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

export default function Statistics() {
  const { loading: authLoading } = useAuth();
  const ticks = useMyTrackedBoulders();
  const sessions = useMyTrackingSessions();
  const [params, setParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [visibleDays, setVisibleDays] = useState(4);
  const swipeRef = useHorizontalRouteSwipe({ routes: ['/', '/boulders', '/statistics'] });
  const view = params.get('view') === 'collection' ? 'collection' : 'progress';
  const collection = params.get('collection') === 'saved' ? 'saved' : 'projects';
  const period = periods.some(p => p.value === params.get('period')) ? params.get('period')! : '30';
  const grade = /^[1-8?]$/.test(params.get('grade') || '') ? params.get('grade') : null;
  const updateParams = (values: Record<string, string | null>) => {
    if (values.view && values.view !== view) window.scrollTo({ top: 0, behavior: 'auto' });
    setParams(previous => {
    const next = new URLSearchParams(previous);
    Object.entries(values).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, value));
    return next;
    }, { replace: true });
  };
  const summary = useMemo(() => buildPersonalProgress(ticks.data ?? [], sessions.data ?? [], { days: period === 'all' ? null : Number(period), grade }), [ticks.data, sessions.data, period, grade]);
  const all = useMemo(() => buildPersonalProgress(ticks.data ?? [], sessions.data ?? []), [ticks.data, sessions.data]);
  const metadata = useMemo(() => new Map((ticks.data ?? []).map(e => [e.tick.boulder_id, e.boulder])), [ticks.data]);
  const loading = authLoading || ticks.isLoading || sessions.isLoading;
  const failed = ticks.error || sessions.error;
  const refresh = async () => {
    setRefreshing(true);
    try { await Promise.all([ticks.refetch(), sessions.refetch()]); }
    finally { setRefreshing(false); }
  };
  const maxGradeCount = Math.max(1, ...summary.distribution.map(row => row.tops));
  const recentDays = summary.daysByDate.slice(-visibleDays).reverse();

  return <DashboardPageLayout rightSlot={<Button variant="ghost" size="icon" aria-label="Statistik aktualisieren" disabled={refreshing} onClick={() => void refresh()}><RefreshCw className={refreshing ? 'animate-spin' : ''} /></Button>}>
    <div ref={node => { swipeRef.current = node; }} className="space-y-5">
      <KwsSegmentedControl ariaLabel="Statistikansicht" className="max-w-lg" value={view} onValueChange={value => updateParams({ view: value })} options={[{ value: 'progress', label: 'Fortschritt' }, { value: 'collection', label: 'Meine Boulder' }]} />
      {loading || failed ? <PersonalDataState loading={loading} onRetry={refresh} /> : view === 'collection' ?
        <PersonalCollection entries={ticks.data ?? []} successIds={all.successIds} collection={collection} onCollectionChange={value => updateParams({ collection: value })} /> : <>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div><h2 className="text-xl font-semibold tracking-tight">Dein Kletterfortschritt</h2><p className="mt-1 text-sm text-muted-foreground">{summary.from ? dateLabel(summary.from) + ' – ' + dateLabel(summary.today) : 'Deine gesamte Kletterhistorie'} · auch abgeschraubte Boulder</p></div>
            <KwsSegmentedControl ariaLabel="Zeitraum" className="w-full shrink-0 sm:w-80 [&_button]:whitespace-nowrap" value={period} onValueChange={value => { updateParams({ period: value }); setVisibleDays(4); }} options={periods} />
          </div>
          {grade ? <div className="flex items-center justify-between rounded-kws-control bg-secondary px-3 text-sm"><span>Ansicht gefiltert: Grad {grade}</span><Button variant="ghost" size="icon" aria-label="Gradfilter entfernen" onClick={() => updateParams({ grade: null })}><X /></Button></div> : null}
          <KwsSurface className="overflow-hidden">
            <dl className="grid grid-cols-2 xl:grid-cols-4">
              {[
                { key: 'tops', label: 'Getoppte Boulder', value: summary.tops, Icon: Trophy },
                { key: 'flashes', label: 'Davon Flashes', value: summary.flashes, Icon: Zap },
                { key: 'days', label: 'Klettertage', value: summary.days, Icon: CalendarDays },
                { key: 'highest', label: 'Höchster Grad', value: summary.highestGrade ?? '–', Icon: Target },
              ].map(({ key, label, value, Icon }) => <div key={key} className="px-4 py-5 sm:px-6"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}</dt><dd data-metric={key} className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</dd></div>)}
            </dl>
            <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 bg-secondary/60 px-4 py-3 text-xs text-muted-foreground sm:px-6"><span>{summary.attempts} protokollierte Versuche</span><span>{summary.tops ? Math.round(summary.flashes / summary.tops * 100) + ' % der Tops als Flash' : 'Noch keine Flashquote'}</span></p>
          </KwsSurface>
          {!summary.tops && !summary.days ? <div className="flex flex-wrap items-center justify-between gap-3 py-2"><p className="text-sm text-muted-foreground">Noch keine Klettereinträge in dieser Auswahl.</p><Button variant="secondary" asChild><Link to="/boulders">Boulder entdecken<ArrowRight /></Link></Button></div> : null}
          <div className="grid gap-5 xl:grid-cols-2">
            <KwsSurface className="p-4 sm:p-6">
              <h2 className="font-semibold">Tops nach Schwierigkeit</h2>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">Tippe auf einen Grad, um deine Einträge zu filtern.</p>
              <div className="space-y-1" aria-label="Tops nach Schwierigkeit">
                {summary.distribution.filter(row => row.grade !== '?' || row.tops || grade === '?').map(row => <button key={row.grade} type="button" aria-pressed={grade === row.grade} aria-label={'Grad ' + row.grade + ': ' + row.tops + ' Tops, davon ' + row.flashes + ' Flashes'} onClick={() => updateParams({ grade: grade === row.grade ? null : row.grade })}
                  className={cn('flex min-h-11 w-full items-center gap-3 rounded-kws-control px-2 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', grade === row.grade && 'bg-secondary ring-1 ring-foreground/20')}>
                  <span className="w-5 shrink-0 text-center font-semibold">{row.grade}</span><span className="h-5 flex-1 overflow-hidden rounded-kws-badge bg-secondary"><span className="block h-full rounded-kws-badge bg-primary" style={{ width: row.tops / maxGradeCount * 100 + '%' }} /></span><span className="w-6 text-right tabular-nums">{row.tops}</span>
                </button>)}
              </div>
            </KwsSurface>
            <KwsSurface className="p-4 sm:p-6">
              <h2 className="font-semibold">Deine Klettertage</h2><p className="mb-4 mt-1 text-xs text-muted-foreground">Ein Tag zählt einmal – egal, wie viele Boulder du probierst.</p>
              {recentDays.length ? <div className="space-y-2">{recentDays.map(day => <details key={day.date} className="group rounded-kws-control bg-secondary/60">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-kws-control p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" /><div className="flex-1 text-sm"><span className="font-semibold">{dateLabel(day.date)}</span><p className="text-xs text-muted-foreground">{day.entries.length} Boulder · {day.entries.filter(e => isSuccessful(e.result)).length} geschafft</p></div><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-3 px-3 pb-3">{day.entries.map(entry => {
                  const boulder = metadata.get(entry.boulder_id);
                  return <li key={entry.id} className="flex items-start justify-between gap-3 text-sm"><div className="min-w-0">{boulder ? <Link className="break-words font-medium underline-offset-4 hover:underline" to={'/boulders/' + entry.boulder_id}>{boulder.name}</Link> : <span>Boulder nicht mehr verfügbar</span>}<p className="text-xs text-muted-foreground">Grad {gradeKey(boulder?.difficulty)} · {entry.attempt_count} {entry.attempt_count === 1 ? 'Versuch' : 'Versuche'}</p></div><span className="shrink-0 text-xs">{entry.result === 'flash' ? 'Flash' : entry.result === 'top' ? 'Top' : 'Probiert'}</span></li>;
                })}</ul>
              </details>)}</div> : <p className="py-5 text-sm text-muted-foreground">Noch keine datierten Einträge in dieser Auswahl.</p>}
              {summary.days > visibleDays ? <Button variant="ghost" className="mt-3 w-full" onClick={() => setVisibleDays(value => value + 7)}>Ältere Klettertage anzeigen ({summary.days - visibleDays})</Button> : null}
            </KwsSurface>
          </div>
          <button type="button" onClick={() => updateParams({ view: 'collection', collection: 'projects' })} className="flex min-h-20 w-full items-center gap-3 rounded-kws-card bg-secondary p-4 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Target className="h-6 w-6 shrink-0" /><div className="flex-1"><p className="font-semibold">Dein nächstes Ziel</p><p className="mt-1 text-sm text-muted-foreground">Offene Projekte und gespeicherte Boulder ansehen</p></div><ArrowRight className="h-5 w-5 shrink-0" /></button>
          <details className="text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3 font-medium">So werden deine Zahlen berechnet</summary><div className="max-w-3xl space-y-2 pb-4 leading-relaxed"><p>Ein Boulder zählt im gewählten Zeitraum einmal als Top. Flashes sind darin enthalten. Der höchste Grad stammt nur aus geschafften Bouldern; unbekannte Grade zählen bei den Tops, aber nicht beim Höchstgrad.</p><p>Klettertage und Versuche stammen aus deinen datierten Einträgen. Speichern oder eine Projektmarkierung zählen nicht als Kletteraktivität. Ohne protokollierte Versuche kann die Versuchssumme unvollständig sein.</p><p>„Gesamt“ berücksichtigt zusätzlich ältere Tops ohne Tagesprotokoll. {period === 'all' && summary.legacySuccesses ? summary.legacySuccesses + ' ältere Erfolge lassen sich keinem Klettertag zuordnen.' : 'Diese lassen sich nicht zuverlässig einem Zeitraum zuordnen.'}</p></div></details>
        </>}
    </div>
  </DashboardPageLayout>;
}
