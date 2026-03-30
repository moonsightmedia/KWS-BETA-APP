import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, CircleDot, Flame, Mountain, TrendingUp, Trophy, Zap } from 'lucide-react';

import { DashboardHeader } from '@/components/DashboardHeader';
import { useSidebar } from '@/components/SidebarContext';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useMyTrackedBoulders, useMyTrackingSessions } from '@/hooks/useBoulderCommunity';
import { DIFFICULTY_VALUES, formatDifficulty } from '@/lib/difficulty';
import { cn } from '@/lib/utils';

const Statistics = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isExpanded } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const [showAllTime, setShowAllTime] = useState(false);
  const queriesEnabled = !authLoading && !!user;
  const { data: boulders } = useBouldersWithSectors(queriesEnabled);
  const { data: trackedBoulders } = useMyTrackedBoulders(null);
  const { data: trackingSessions } = useMyTrackingSessions();
  const selectedGradeParam = searchParams.get('grade');
  const activeGrade = useMemo(
    () => (selectedGradeParam && DIFFICULTY_VALUES.some((grade) => String(grade) === selectedGradeParam) ? selectedGradeParam : null),
    [selectedGradeParam],
  );

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
    'flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-background',
    isExpanded ? 'md:ml-64' : 'md:ml-20',
  );

  return (
    <div className="min-h-screen flex bg-background">
      <div className={pageLayoutClassName}>
        <div className="hidden md:block">
          <DashboardHeader />
        </div>

        <main className="flex-1 pb-12 md:px-6 md:pt-6 lg:px-8">
          <div className="px-4 pt-12 pb-2 md:hidden">
            <div className="mb-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors active:scale-95"
                aria-label="Zurück"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistiken</h1>
            </div>
            <p className="ml-[52px] text-sm text-muted-foreground">Dein Boulder-Fortschritt</p>
          </div>

          <div className="mb-4 mt-3 px-4 md:mt-0 md:px-0">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Statistikbasis</p>
                <p className="text-xs text-muted-foreground">
                  {showAllTime ? 'Alltime inklusive abgeschraubter Boulder' : 'Nur aktuell hängende Boulder'}
                </p>
                {activeGrade ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setGradeFilter(null)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#DDE7DF] bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Grad {activeGrade}
                      <span className="text-muted-foreground">zurücksetzen</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-medium', !showAllTime ? 'text-foreground' : 'text-muted-foreground')}>
                  Hängend
                </span>
                <Switch
                  checked={showAllTime}
                  onCheckedChange={setShowAllTime}
                  aria-label="Zwischen nur hängenden Bouldern und Alltime-Statistik umschalten"
                />
                <span className={cn('text-xs font-medium', showAllTime ? 'text-foreground' : 'text-muted-foreground')}>
                  Alltime
                </span>
              </div>
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />
              <div className="absolute -bottom-6 -right-14 h-24 w-24 rounded-full bg-primary/3" />

              <div className="relative flex items-center gap-5">
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
                      <div className="h-1.5 overflow-hidden rounded-sm bg-secondary">
                        <div
                          className="h-full rounded-sm bg-muted-foreground/30 transition-all duration-500"
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
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Trophy, value: statSummary.topped.length, label: 'Tops' },
                { icon: Zap, value: statSummary.flashed.length, label: 'Flashes' },
                { icon: CircleDot, value: statSummary.projects.length, label: 'Projekte' },
                { icon: Flame, value: statSummary.totalSessions, label: 'Sessions' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center rounded-2xl border border-border bg-card p-3 text-center">
                  <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-lg font-bold leading-tight text-foreground">{value}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="p-4 pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance</h3>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border px-2 pb-4">
                {[
                  { icon: Mountain, value: statSummary.highestGrade, label: 'Höchster Grad' },
                  { icon: Zap, value: `${statSummary.flashRate}%`, label: 'Flash-Rate' },
                  { icon: TrendingUp, value: String(statSummary.totalAttempts), label: 'Versuche' },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex flex-col items-center px-2 text-center">
                    <Icon className="mb-1 h-4 w-4 text-primary" />
                    <span className="text-lg font-bold text-foreground">{value}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-5 px-4 md:px-0">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grad-Verteilung</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {activeGrade ? `Gefiltert auf Grad ${activeGrade}` : 'Deine getoppten Boulder pro Grad'}
                  </p>
                </div>
                {activeGrade ? (
                  <button
                    type="button"
                    onClick={() => setGradeFilter(null)}
                    className="shrink-0 rounded-xl border border-[#DDE7DF] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
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
                        'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-center transition-colors hover:bg-secondary/50',
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
                            'w-full rounded-t-sm transition-all duration-500',
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
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="p-4 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Letzte Aktivität</h3>
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
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
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
                        <span className={cn('rounded-[6px] px-2.5 py-0.5 text-[10px] font-bold', resultColors[session.result])}>
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

