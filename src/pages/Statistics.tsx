import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, CircleDot, Flame, Mountain, TrendingUp, Trophy, Zap } from 'lucide-react';

import { DashboardHeader } from '@/components/DashboardHeader';
import { useSidebar } from '@/components/SidebarContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useMyTrackedBoulders, useMyTrackingSessions } from '@/hooks/useBoulderCommunity';
import { DIFFICULTY_VALUES, formatDifficulty } from '@/lib/difficulty';
import { cn } from '@/lib/utils';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';

const statisticsRangeOptions = [
  { value: 'hanging', label: 'Hängend' },
  { value: 'allTime', label: 'Alltime' },
] as const;

const StatisticsLoadingState = () => (
  <>
    <div className="mb-4 mt-3 px-4 md:mt-0 md:px-0">
      <div className="flex items-center justify-between rounded-kws-card bg-white px-3.5 py-3 shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-9 w-36 rounded-kws-control" />
      </div>
    </div>

    <div className="mb-5 px-4 md:px-0">
      <div className="rounded-kws-card bg-white p-4 shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
        <div className="flex items-center gap-5">
          <Skeleton className="h-[88px] w-[88px] rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="mb-5 px-4 md:px-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-kws-control bg-white p-3 shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
            <Skeleton className="mx-auto mb-2 h-7 w-7 rounded-kws-control" />
            <Skeleton className="mx-auto h-5 w-8" />
            <Skeleton className="mx-auto mt-2 h-3 w-12" />
          </div>
        ))}
      </div>
    </div>

    <div className="mb-5 px-4 md:px-0">
          <div className="overflow-hidden rounded-kws-card bg-white p-4 shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 text-center">
              <Skeleton className="mx-auto h-4 w-4 rounded-full" />
              <Skeleton className="mx-auto h-5 w-10" />
              <Skeleton className="mx-auto h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="mb-5 px-4 md:px-0">
          <div className="rounded-kws-card bg-white p-4 shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-3 w-36" />
        <div className="mt-4 flex h-32 items-end gap-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <Skeleton className="h-3 w-4" />
              <Skeleton className="w-full rounded-t-sm" style={{ height: `${35 + (index % 4) * 12}%`, minHeight: '18px' }} />
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="mb-5 px-4 md:px-0">
          <div className="overflow-hidden rounded-kws-card bg-white shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
        <div className="p-4 pb-2">
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-kws-control" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

const Statistics = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isExpanded } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const swipeRef = useHorizontalRouteSwipe({ routes: ['/', '/boulders', '/statistics'] });
  const [showAllTime, setShowAllTime] = useState(false);
  const queriesEnabled = !authLoading && !!user;
  const bouldersQuery = useBouldersWithSectors(queriesEnabled);
  const trackedBouldersQuery = useMyTrackedBoulders(null);
  const trackingSessionsQuery = useMyTrackingSessions();
  const { data: boulders } = bouldersQuery;
  const { data: trackedBoulders } = trackedBouldersQuery;
  const { data: trackingSessions } = trackingSessionsQuery;
  const selectedGradeParam = searchParams.get('grade');
  const activeGrade = useMemo(
    () => (selectedGradeParam && DIFFICULTY_VALUES.some((grade) => String(grade) === selectedGradeParam) ? selectedGradeParam : null),
    [selectedGradeParam],
  );
  const isStatisticsLoading =
    authLoading ||
    (queriesEnabled &&
      [bouldersQuery, trackedBouldersQuery, trackingSessionsQuery].some(
        (query) => query.isLoading || (!query.error && query.data === undefined),
      ));

  const setGradeFilter = (grade: string | null) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (grade) {
      nextSearchParams.set('grade', grade);
    } else {
      nextSearchParams.delete('grade');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const statSummary = useMemo(() => {
    const allBoulders = boulders ?? [];
    const visibleBoulders = showAllTime
      ? allBoulders
      : allBoulders.filter((boulder) => boulder.status !== 'abgeschraubt');
    const activeBoulderIds = new Set(visibleBoulders.map((boulder) => boulder.id));
    const matchesActiveGrade = (difficulty: number | null | undefined) =>
      !activeGrade || formatDifficulty(difficulty ?? null) === activeGrade;
    const entries = (trackedBoulders ?? []).filter((entry) => (
      showAllTime || (entry.boulder?.id ? activeBoulderIds.has(entry.boulder.id) : false)
    ));
    const scopedEntries = entries.filter((entry) => matchesActiveGrade(entry.boulder?.difficulty ?? null));
    const relevantSessions = (trackingSessions ?? []).filter((session) => {
      if (!showAllTime && !activeBoulderIds.has(session.boulder_id)) {
        return false;
      }

      const sessionBoulder = allBoulders.find((boulder) => boulder.id === session.boulder_id);
      return matchesActiveGrade(sessionBoulder?.difficulty ?? null);
    });
    const totalBoulders = visibleBoulders.filter((boulder) => matchesActiveGrade(boulder.difficulty)).length;
    const topped = scopedEntries.filter((entry) => entry.tick.status === 'top' || entry.tick.status === 'flash');
    const flashed = scopedEntries.filter((entry) => entry.tick.status === 'flash');
    const tracked = scopedEntries.filter((entry) => entry.tick.status !== 'attempted' || (entry.tick.attempt_count ?? 0) > 0);
    const projects = scopedEntries.filter((entry) => entry.tick.is_project);
    const totalSessions = relevantSessions.length;
    const totalAttempts =
      relevantSessions.reduce((sum, session) => sum + (session.attempt_count ?? 0), 0) ??
      scopedEntries.reduce((sum, entry) => sum + (entry.tick.attempt_count ?? 0), 0);

    const toppedByGrade = entries
      .filter((entry) => entry.tick.status === 'top' || entry.tick.status === 'flash')
      .reduce<Record<string, number>>((acc, entry) => {
      const difficulty = entry.boulder?.difficulty;
      if (difficulty != null) {
        const grade = formatDifficulty(difficulty);
        acc[grade] = (acc[grade] ?? 0) + 1;
      }
      return acc;
      }, {});

    const gradeDistribution = DIFFICULTY_VALUES.map((grade) => ({
      grade,
      count: toppedByGrade[String(grade)] ?? 0,
    }));
    const maxGradeCount = Math.max(...gradeDistribution.map((item) => item.count), 1);

    const highestDifficulty = scopedEntries.reduce<number | null>((max, entry) => {
      const difficulty = entry.boulder?.difficulty;
      if (difficulty == null) return max;
      return max == null ? difficulty : Math.max(max, difficulty);
    }, null);

    const flashRate = topped.length > 0 ? Math.round((flashed.length / topped.length) * 100) : 0;
    const toppedPercent = totalBoulders > 0 ? Math.round((topped.length / totalBoulders) * 100) : 0;
    const trackedPercent = totalBoulders > 0 ? Math.round((tracked.length / totalBoulders) * 100) : 0;

    const recentSessions = [...scopedEntries]
      .sort((a, b) => new Date(b.tick.updated_at).getTime() - new Date(a.tick.updated_at).getTime())
      .slice(0, 6)
      .map((entry) => ({
        id: entry.tick.id,
        boulderId: entry.boulder?.id,
        boulderName: entry.boulder?.name || 'Unbekannter Boulder',
        grade: formatDifficulty(entry.boulder?.difficulty ?? null),
        colorHex: entry.boulder?.color_hex || '#7BB239',
        attempts: entry.tick.attempt_count ?? 0,
        date: new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(entry.tick.updated_at)),
        result: entry.tick.status === 'flash' ? 'geflasht' : entry.tick.status === 'top' ? 'getoppt' : 'probiert',
      }));

    return {
      totalBoulders,
      topped,
      flashed,
      tracked,
      projects,
      totalSessions,
      totalAttempts,
      gradeDistribution,
      maxGradeCount,
      highestGrade: highestDifficulty == null ? '-' : formatDifficulty(highestDifficulty),
      flashRate,
      toppedPercent,
      trackedPercent,
      recentSessions,
    };
  }, [activeGrade, boulders, showAllTime, trackedBoulders, trackingSessions]);

  const resultLabels: Record<string, string> = {
    probiert: 'Probiert',
    getoppt: 'Getoppt',
    geflasht: 'Geflasht',
  };

  const resultColors: Record<string, string> = {
    probiert: 'bg-secondary text-muted-foreground',
    getoppt: 'bg-primary/15 text-primary',
    geflasht: 'bg-primary text-primary-foreground',
  };

  const pageLayoutClassName = cn(
    'flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]',
    isExpanded ? 'md:ml-64' : 'md:ml-20',
  );

  if (isStatisticsLoading) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div ref={swipeRef} className={pageLayoutClassName}>
          <DashboardHeader />

          <main className="mx-auto w-full max-w-[1180px] flex-1 pb-12 pt-3 md:px-8 md:pt-6">
            <StatisticsLoadingState />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAF9]">
      <div ref={swipeRef} className={pageLayoutClassName}>
        <DashboardHeader />

        <main className="mx-auto w-full max-w-[1180px] flex-1 pb-12 pt-3 md:px-8 md:pt-6">
          <div className="mb-4 mt-3 px-4 md:mt-0 md:px-0">
            <div className="flex flex-col gap-3 rounded-kws-card bg-white px-3.5 py-3 shadow-[0_3px_14px_rgba(19,17,43,0.06)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">Statistikbasis</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {showAllTime ? 'Alltime · inklusive abgeschraubt' : 'Aktuell · nur hängende Boulder'}
                </p>
                {activeGrade ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setGradeFilter(null)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-kws-control bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13112B]/20"
                    >
                      Grad {activeGrade}
                      <span className="text-muted-foreground">zurücksetzen</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <KwsSegmentedControl
                value={showAllTime ? 'allTime' : 'hanging'}
                options={statisticsRangeOptions}
                onValueChange={(value) => setShowAllTime(value === 'allTime')}
                ariaLabel="Statistikzeitraum"
                className="w-full sm:w-auto sm:min-w-[12rem]"
              />
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="overflow-hidden rounded-kws-card bg-white p-4 shadow-[0_5px_18px_rgba(19,17,43,0.07)] sm:p-5">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <svg width="88" height="88" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="38" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                    <circle
                      cx="44"
                      cy="44"
                      r="38"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38}`}
                      strokeDashoffset={`${2 * Math.PI * 38 * (1 - statSummary.toppedPercent / 100)}`}
                      transform="rotate(-90 44 44)"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-foreground">{statSummary.toppedPercent}%</span>
                    <span className="text-[9px] font-medium text-muted-foreground">getoppt</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-sm font-semibold text-foreground">
                    {statSummary.topped.length} von {statSummary.totalBoulders} Boulder
                  </p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {statSummary.tracked.length} probiert - {statSummary.flashed.length} geflasht
                  </p>

                  <div className="space-y-1.5">
                    <div>
                      <div className="mb-0.5 flex justify-between">
                        <span className="text-[10px] text-muted-foreground">Probiert</span>
                        <span className="text-[10px] font-medium text-muted-foreground">{statSummary.trackedPercent}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-[2px] bg-secondary">
                        <div
                          className="h-full rounded-[2px] bg-muted-foreground/30 transition-all duration-500"
                          style={{ width: `${statSummary.trackedPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: Trophy, value: statSummary.topped.length, label: 'Tops' },
                { icon: Zap, value: statSummary.flashed.length, label: 'Flashes' },
                { icon: CircleDot, value: statSummary.projects.length, label: 'Projekte' },
                { icon: Flame, value: statSummary.totalSessions, label: 'Sessions' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center rounded-kws-control bg-white p-3 text-center shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
                  <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-kws-control bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-lg font-bold leading-tight text-foreground">{value}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="overflow-hidden rounded-kws-card bg-white shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
              <div className="p-4 pb-3">
                <h3 className="font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">Performance</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 px-3 pb-4">
                {[
                  { icon: Mountain, value: statSummary.highestGrade, label: 'Höchster Grad' },
                  { icon: Zap, value: `${statSummary.flashRate}%`, label: 'Flash-Rate' },
                  { icon: TrendingUp, value: String(statSummary.totalAttempts), label: 'Versuche' },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex flex-col items-center rounded-kws-control bg-secondary/70 px-2 py-3 text-center">
                    <Icon className="mb-1 h-4 w-4 text-primary" />
                    <span className="text-lg font-bold text-foreground">{value}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="rounded-kws-card bg-white p-4 shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">Grad-Verteilung</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {activeGrade ? `Gefiltert auf Grad ${activeGrade}` : 'Deine getoppten Boulder pro Grad'}
                  </p>
                </div>
                {activeGrade ? (
                  <button
                    type="button"
                    onClick={() => setGradeFilter(null)}
                    className="min-h-9 shrink-0 rounded-kws-control bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13112B]/20"
                  >
                    Filter zurücksetzen
                  </button>
                ) : null}
              </div>
              <div className="flex h-32 items-end gap-3">
                {statSummary.gradeDistribution.map((item) => {
                  const heightPct = item.count > 0 ? (item.count / statSummary.maxGradeCount) * 100 : 6;
                  const isActiveGrade = activeGrade === String(item.grade);
                  return (
                    <button
                      key={item.grade}
                      type="button"
                      onClick={() => setGradeFilter(isActiveGrade ? null : String(item.grade))}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-kws-control px-1 py-1 text-center transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13112B]/20',
                        activeGrade && !isActiveGrade && 'opacity-55',
                      )}
                      aria-pressed={isActiveGrade}
                      aria-label={isActiveGrade ? `Grad ${item.grade} Filter entfernen` : `Grad ${item.grade} filtern`}
                    >
                      <span className="tabular-nums text-[11px] font-bold text-foreground">
                        {item.count > 0 ? item.count : ''}
                      </span>
                      <div className="flex h-24 w-full flex-col justify-end">
                        <div
                          className={cn(
                            'w-full rounded-kws-badge transition-all duration-500',
                            item.count > 0 ? 'bg-primary' : 'bg-secondary',
                            isActiveGrade && 'ring-2 ring-primary/20',
                          )}
                          style={{ height: `${heightPct}%`, minHeight: '4px' }}
                        />
                      </div>
                      <span className={cn('text-[11px] font-semibold text-muted-foreground', isActiveGrade && 'text-foreground')}>
                        {item.grade}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="overflow-hidden rounded-kws-card bg-white shadow-[0_3px_14px_rgba(19,17,43,0.06)]">
              <div className="p-4 pb-2">
                <h3 className="font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">Letzte Aktivität</h3>
              </div>
              {statSummary.recentSessions.length > 0 ? (
                <div className="divide-y divide-border">
                  {statSummary.recentSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => navigate(session.boulderId ? `/boulders/${session.boulderId}` : '/boulders')}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-kws-control text-[10px] font-bold"
                          style={{
                            backgroundColor: `${session.colorHex}18`,
                            color: session.colorHex,
                          }}
                        >
                          {session.grade}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-medium text-foreground">{session.boulderName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {session.date} - {session.attempts} {session.attempts === 1 ? 'Versuch' : 'Versuche'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn('rounded-kws-badge px-2.5 py-0.5 text-[10px] font-bold', resultColors[session.result])}>
                          {resultLabels[session.result]}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {activeGrade ? `Noch keine Aktivität für Grad ${activeGrade}.` : 'Noch keine Aktivität.'}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Statistics;

