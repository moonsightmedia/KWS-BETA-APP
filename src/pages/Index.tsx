import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CircleDot,
  RefreshCw,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

import { DashboardHeader } from '@/components/DashboardHeader';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useMyTrackedBoulders } from '@/hooks/useBoulderCommunity';
import { usePreloadBoulderThumbnails } from '@/hooks/usePreloadBoulderThumbnails';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { supabase } from '@/integrations/supabase/client';
import { formatDifficulty } from '@/lib/difficulty';
import { cn } from '@/lib/utils';

const getThumbnailUrl = (thumbnailUrl?: string | null) => {
  if (thumbnailUrl) {
    let url = thumbnailUrl;
    if (url.includes('cdn.kletterwelt-sauerland.de/uploads/videos/')) {
      url = url.replace('/uploads/videos/', '/uploads/');
    }
    return url;
  }

  return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';
};

const getSectorLabel = (sector: string, sector2?: string | null) =>
  sector2 ? `${sector} → ${sector2}` : sector;

const getScheduleTitle = (sectorNames: string[]) => {
  if (sectorNames.length === 1) return `${sectorNames[0]} bekommt neue Boulder`;
  if (sectorNames.length === 2) return `${sectorNames[0]} & ${sectorNames[1]} bekommen neue Boulder`;
  return `${sectorNames.length} Sektoren bekommen neue Boulder`;
};

const DashboardSectionHeader = ({
  title,
  description,
  actionLabel,
  onActionClick,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">{title}</h2>
      {description ? <p className="pt-1 text-sm text-[#13112B]/58">{description}</p> : null}
    </div>
    {actionLabel && onActionClick ? (
      <button
        type="button"
        onClick={onActionClick}
        className="shrink-0 text-sm font-semibold text-[#36B531]"
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

const DashboardStatCard = ({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
}) => (
  <div className="rounded-2xl border border-[#DDE7DF] bg-white px-3 py-4 text-center shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#36B531]/10">
      <Icon className="h-5 w-5 text-[#36B531]" strokeWidth={1.9} />
    </div>
    <p className="text-[1.7rem] font-semibold leading-none tracking-[-0.04em] text-[#13112B]">{value}</p>
    <p className="pt-2 text-sm text-[#13112B]/58">{label}</p>
  </div>
);

const HomePreviewCard = ({
  title,
  subtitle,
  meta,
  onClick,
}: {
  title: string;
  subtitle: string;
  meta: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-2xl border border-[#DDE7DF] bg-white px-4 py-4 text-left shadow-[0_8px_24px_rgba(19,17,43,0.05)] transition-transform active:scale-[0.98]"
  >
    <div className="min-w-0">
      <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[#13112B]">{title}</p>
      <p className="truncate pt-1 text-sm text-[#13112B]/58">{subtitle}</p>
      <p className="pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#36B531]">{meta}</p>
    </div>
    <ArrowRight className="h-4 w-4 shrink-0 text-[#6E806A]" />
  </button>
);

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isExpanded } = useSidebar();
  const { user, loading: authLoading } = useAuth();

  const queriesEnabled = !authLoading && !!user;
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors(queriesEnabled);
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed(queriesEnabled);
  const { data: schedule } = useSectorSchedule();
  const { data: myTrackedBoulders } = useMyTrackedBoulders();

  const isLoading = isLoadingBoulders || isLoadingSectors;
  const error = bouldersError || sectorsError;

  usePreloadBoulderThumbnails(!!user && !authLoading);

  useEffect(() => {
    if (!authLoading && user) {
      const timeoutId = setTimeout(() => {
        const bouldersQuery = queryClient.getQueryState(['boulders']);
        const sectorsQuery = queryClient.getQueryState(['sectors']);

        if (bouldersQuery?.status === 'pending') {
          queryClient.cancelQueries({ queryKey: ['boulders'] });
          queryClient.refetchQueries({ queryKey: ['boulders'] });
        }

        if (sectorsQuery?.status === 'pending') {
          queryClient.cancelQueries({ queryKey: ['sectors'] });
          queryClient.refetchQueries({ queryKey: ['sectors'] });
        }
      }, 15000);

      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, user, queryClient]);

  const getPersistedName = () => {
    try {
      return localStorage.getItem('greetingName');
    } catch {
      return null;
    }
  };

  const initialFirstFromMeta = (() => {
    const persisted = getPersistedName();
    if (persisted) return persisted;
    const meta = (user?.user_metadata || {}) as Record<string, unknown>;
    const full = meta?.first_name || meta?.full_name || meta?.name;
    return full ? String(full).split(' ')[0] : null;
  })();

  const [greetingName, setGreetingName] = useState<string | null>(initialFirstFromMeta);

  useEffect(() => {
    if (greetingName) {
      try {
        localStorage.setItem('greetingName', greetingName);
      } catch {
        // ignore storage errors
      }
    }
  }, [greetingName]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (authLoading || !user) {
        const persisted = getPersistedName();
        if (persisted && !greetingName) {
          setGreetingName(persisted);
        }
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('first_name, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      const profile = data as { first_name?: string | null; full_name?: string | null } | null;
      const first = profile?.first_name || (profile?.full_name ? String(profile.full_name).split(' ')[0] : undefined);
      if (first) {
        setGreetingName(first);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading, greetingName]);

  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    const grouped = new Map<string, { when: Date; sectorNames: string[] }>();

    (schedule || [])
      .filter((item) => new Date(item.scheduled_at) > now)
      .forEach((item) => {
        const when = new Date(item.scheduled_at);
        const dayKey = when.toISOString().slice(0, 10);
        const sectorName = sectors?.find((sector) => sector.id === item.sector_id)?.name || 'Unbekannter Sektor';
        const existing = grouped.get(dayKey);

        if (existing) {
          existing.sectorNames.push(sectorName);
          return;
        }

        grouped.set(dayKey, {
          when,
          sectorNames: [sectorName],
        });
      });

    return [...grouped.values()]
      .map((entry) => ({
        when: entry.when,
        sectorNames: Array.from(new Set(entry.sectorNames)),
      }))
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 3);
  }, [schedule, sectors]);

  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);

  const hangingBoulders = useMemo(
    () => (boulders ?? []).filter((boulder) => boulder.status === 'haengt'),
    [boulders],
  );

  const newestBoulders = useMemo(
    () =>
      [...hangingBoulders]
        .filter((boulder) => boulder.createdAt >= sevenDaysAgo)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 6),
    [hangingBoulders, sevenDaysAgo],
  );

  const favoritePreview = useMemo(
    () =>
      (myTrackedBoulders ?? [])
        .filter((item) => item.tick.is_favorite && item.boulder)
        .slice(0, 2),
    [myTrackedBoulders],
  );

  const weeklyStats = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const recentTicks = (myTrackedBoulders ?? []).filter((item) => {
      const updatedAt = new Date(item.tick.updated_at);
      return updatedAt >= weekStart;
    });

    return {
      tops: recentTicks.filter((item) => item.tick.status === 'top').length,
      flashes: recentTicks.filter((item) => item.tick.status === 'flash').length,
      projects: recentTicks.filter((item) => item.tick.is_project).length,
    };
  }, [myTrackedBoulders]);

  const nextFocusBoulders = useMemo(() => {
    const candidates = (myTrackedBoulders ?? [])
      .filter((item) => item.boulder)
      .filter((item) => item.tick.status !== 'top' && item.tick.status !== 'flash')
      .filter((item) => item.tick.is_project || item.tick.is_favorite || (item.tick.attempt_count ?? 0) > 0)
      .sort((left, right) => {
        const projectDiff = Number(right.tick.is_project) - Number(left.tick.is_project);
        if (projectDiff !== 0) return projectDiff;

        const attemptDiff = (right.tick.attempt_count ?? 0) - (left.tick.attempt_count ?? 0);
        if (attemptDiff !== 0) return attemptDiff;

        return new Date(right.tick.updated_at).getTime() - new Date(left.tick.updated_at).getTime();
      });
    const deduped = new Map<string, (typeof candidates)[number]>();

    for (const item of candidates) {
      if (item.boulder && !deduped.has(item.boulder.id)) {
        deduped.set(item.boulder.id, item);
      }
    }

    return Array.from(deduped.values()).slice(0, 3);
  }, [myTrackedBoulders]);

  const progressStats = useMemo(() => {
    const topped = (myTrackedBoulders ?? []).filter((item) => item.tick.status === 'top' || item.tick.status === 'flash').length;
    const tried = (myTrackedBoulders ?? []).filter((item) => item.tick.status === 'attempted').length;
    const open = Math.max(hangingBoulders.length - topped - tried, 0);
    const total = Math.max(topped + tried + open, 1);

    return {
      toppedPercent: Math.round((topped / total) * 100),
      triedPercent: Math.round((tried / total) * 100),
    };
  }, [hangingBoulders.length, myTrackedBoulders]);

  const attemptSeries = useMemo(() => {
    return (myTrackedBoulders ?? [])
      .filter((item) => item.tick.attempt_count > 0)
      .slice(0, 5)
      .reverse()
      .map((item) => ({
        key: `${item.tick.id}-${item.tick.updated_at}`,
        label: formatDate(new Date(item.tick.updated_at), 'd.M.', { locale: de }),
        value: item.tick.attempt_count,
      }));
  }, [myTrackedBoulders]);

  const daysUntilLabel = (date: Date) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTarget = new Date(date);
    startOfTarget.setHours(0, 0, 0, 0);
    const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Heute';
    if (diffDays === 1) return 'in 1 Tag';
    return `in ${diffDays} Tagen`;
  };

  const layoutClassName = cn(
    'flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]',
    isExpanded ? 'md:ml-64' : 'md:ml-20',
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={layoutClassName}>
          <DashboardHeader rightSlot={<NotificationCenter variant="header" />} />
          <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-2xl" />
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-60 rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={layoutClassName}>
          <DashboardHeader rightSlot={<NotificationCenter variant="header" />} />
          <main className="flex-1 p-4 md:p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
              <AlertDescription className="mb-4">
                {error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'}
              </AlertDescription>
              <Button
                onClick={async () => {
                  await Promise.all([
                    queryClient.refetchQueries({ queryKey: ['boulders'] }),
                    queryClient.refetchQueries({ queryKey: ['sectors'] }),
                  ]);
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  if (!boulders?.length && !sectors?.length) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div className={layoutClassName}>
          <DashboardHeader rightSlot={<NotificationCenter variant="header" />} />
          <main className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="space-y-4 text-center">
              <p className="text-[#13112B]/60">Keine Daten geladen</p>
              <Button
                onClick={async () => {
                  await Promise.all([
                    queryClient.refetchQueries({ queryKey: ['boulders'] }),
                    queryClient.refetchQueries({ queryKey: ['sectors'] }),
                  ]);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Daten laden
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAF9]">
      <div className={layoutClassName}>
        <DashboardHeader rightSlot={<NotificationCenter variant="header" />} />

        <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-6 md:px-8 md:pb-10">
          <section className="mb-4">
            <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
              {authLoading ? 'Session' : `Hallo, ${greetingName || 'du'}`}
            </p>
            <h1 className="pt-2 text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-[#13112B]">
              Bereit für deine Session?
            </h1>
            <p className="pt-3 text-sm text-[#13112B]/60">
              Neue Boulder, Projekte und anstehende Umschraubungen direkt auf einen Blick.
            </p>
          </section>

          <section className="mb-5">
            <DashboardSectionHeader
              title="Deine Woche"
              description="Dein kompakter Rückblick auf die letzten 7 Tage."
            />
            <div className="grid grid-cols-3 gap-3">
              <DashboardStatCard icon={Trophy} value={weeklyStats.tops} label="Tops" />
              <DashboardStatCard icon={Zap} value={weeklyStats.flashes} label="Flashes" />
              <DashboardStatCard icon={CircleDot} value={weeklyStats.projects} label="Projekte" />
            </div>
          </section>

          <section className="mb-5">
            <DashboardSectionHeader
              title="Neu an der Wand"
              description="Frische Boulder aus den letzten 7 Tagen."
              actionLabel="Neu entdecken"
              onActionClick={() => navigate('/boulders?show=new')}
            />
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 hide-scrollbar">
              {newestBoulders.map((boulder) => (
                <button
                  key={boulder.id}
                  type="button"
                  onClick={() => navigate(`/boulders/${boulder.id}`)}
                  className="w-[138px] shrink-0 overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white text-left shadow-[0_8px_24px_rgba(19,17,43,0.05)] transition-transform active:scale-[0.98]"
                >
                  <div className="relative h-[104px] w-full overflow-hidden">
                    <img
                      className="h-full w-full object-cover object-center"
                      src={getThumbnailUrl(boulder.thumbnailUrl)}
                      alt={boulder.name}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="absolute bottom-2 right-2 rounded-xl bg-[#13112B]/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                      {formatDifficulty(boulder.difficulty ?? null)}
                    </span>
                  </div>
                  <div className="px-3 py-3">
                    <p className="truncate text-[0.98rem] font-semibold tracking-[-0.02em] text-[#13112B]">{boulder.name}</p>
                    <p className="truncate pt-1 text-sm text-[#13112B]/55">
                      {getSectorLabel(boulder.sector, boulder.sector2)}
                    </p>
                    <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36B531]">
                      Grad {formatDifficulty(boulder.difficulty ?? null)}
                    </p>
                  </div>
                </button>
              ))}
              {newestBoulders.length === 0 ? (
                <div className="w-full rounded-2xl border border-dashed border-[#DDE7DF] bg-white/70 px-4 py-5 text-sm text-[#13112B]/55">
                  Gerade gibt es keine neuen Boulder aus den letzten 7 Tagen.
                </div>
              ) : null}
            </div>
          </section>

          <section className="mb-5 overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white shadow-[0_10px_30px_rgba(19,17,43,0.05)]">
            <div className="px-4 pb-3 pt-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-[#36B531]/10 p-2 text-[#36B531]">
                  <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Nächste Umschraubung</h2>
                  <p className="pt-1 text-sm text-[#13112B]/58">Damit du schon vor deiner nächsten Session planen kannst.</p>
                </div>
              </div>
            </div>

            {upcomingSchedules.length > 0 ? (
              <>
                <div className="mx-4 mb-4 rounded-2xl border border-[#36B531]/20 bg-[#36B531]/10 px-4 py-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[1.06rem] font-semibold tracking-[-0.02em] text-[#13112B]">
                        {getScheduleTitle(upcomingSchedules[0].sectorNames)}
                      </p>
                      <div className="pt-2 text-sm text-[#13112B]/70">
                        {formatDate(upcomingSchedules[0].when, 'EEE, dd. MMM', { locale: de })} · {upcomingSchedules[0].sectorNames.join(', ')}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#36B531]/15 px-3 py-1 text-sm font-semibold text-[#36B531]">
                      {daysUntilLabel(upcomingSchedules[0].when)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {upcomingSchedules[0].sectorNames.map((sectorName) => (
                      <span
                        key={`${sectorName}-${upcomingSchedules[0].when.toISOString()}`}
                        className="rounded-full bg-[#E9E9F7] px-3 py-1 text-xs font-medium text-[#6C6A7E]"
                      >
                        {sectorName}
                      </span>
                    ))}
                  </div>
                </div>

                {upcomingSchedules.slice(1).map((entry) => (
                  <div key={entry.when.toISOString()} className="flex items-center justify-between border-t border-[#E8ECE8] px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-[1.02rem] font-medium tracking-[-0.02em] text-[#13112B]">
                        {getScheduleTitle(entry.sectorNames)}
                      </p>
                      <p className="truncate pt-1 text-sm text-[#13112B]/58">
                        {formatDate(entry.when, 'EEE, dd. MMM', { locale: de })} · {entry.sectorNames.join(', ')}
                      </p>
                    </div>
                    <CalendarDays className="ml-3 h-4 w-4 shrink-0 text-[#6E806A]" strokeWidth={1.9} />
                  </div>
                ))}
              </>
            ) : (
              <div className="px-4 pb-4 text-sm text-[#13112B]/55">
                Aktuell ist kein kommender Schraubtermin eingetragen.
              </div>
            )}
          </section>

          {favoritePreview.length > 0 ? (
            <section className="mb-5">
              <DashboardSectionHeader
                title="Deine Projekte"
                description="Boulder, die du weiterverfolgen oder gespeichert hast."
                actionLabel="Alle Projekte"
                onActionClick={() => navigate('/boulders?show=saved')}
              />
              <div className="space-y-3">
                {favoritePreview.map((item) =>
                  item.boulder ? (
                    <HomePreviewCard
                      key={item.tick.id}
                      title={item.boulder.name}
                      subtitle={getSectorLabel(item.boulder.sector, item.boulder.sector2)}
                      meta={`Grad ${formatDifficulty(item.boulder.difficulty ?? null)} · ${item.tick.is_project ? 'Projekt' : 'Gespeichert'}`}
                      onClick={() => navigate(`/boulders/${item.tick.boulder_id}`)}
                    />
                  ) : null,
                )}
              </div>
            </section>
          ) : null}

          <section className="space-y-4 pb-4">
            <section className="mb-5">
              <DashboardSectionHeader
                title="Nächster Boulder"
                description="Das ist dein nächster sinnvoller Anknüpfpunkt für die Session."
                actionLabel="Weiterklettern"
                onActionClick={() => navigate('/boulders?show=saved')}
              />
              {nextFocusBoulders.length > 0 ? (
                <div className="space-y-3">
                  {nextFocusBoulders.map((item) =>
                    item.boulder ? (
                      <HomePreviewCard
                        key={item.tick.id}
                        title={item.boulder.name}
                        subtitle={getSectorLabel(item.boulder.sector, item.boulder.sector2)}
                        meta={`Grad ${formatDifficulty(item.boulder.difficulty ?? null)} · ${item.tick.is_project ? 'Projekt' : item.tick.is_favorite ? 'Gespeichert' : 'In Arbeit'} · ${item.tick.attempt_count ?? 0} ${(item.tick.attempt_count ?? 0) === 1 ? 'Versuch' : 'Versuche'}`}
                        onClick={() => navigate(`/boulders/${item.tick.boulder_id}`)}
                      />
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FAFCFA] px-4 py-5 text-sm text-[#13112B]/55">
                  Noch keine offenen Projekte oder Versuche für deinen nächsten Boulder.
                </div>
              )}
            </section>
            <section>
              <DashboardSectionHeader
                title="Dein Fortschritt"
                description="Ein schneller Blick auf offene Boulder und deine letzten Versuche."
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#DDE7DF] bg-white p-4 shadow-[0_10px_30px_rgba(19,17,43,0.05)]">
                  <h3 className="mb-4 text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Übersicht</h3>
                  <div className="flex flex-col items-center">
                    <div
                      className="relative flex h-28 w-28 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#36B531 0 ${progressStats.toppedPercent}%, #6C7280 ${progressStats.toppedPercent}% ${progressStats.toppedPercent + progressStats.triedPercent}%, #E2E6EC 0 100%)`,
                      }}
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-xl font-semibold text-[#13112B]">
                        {progressStats.toppedPercent}%
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#6C6A7E]">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#36B531]" />Getoppt</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#6C7280]" />Probiert</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E2E6EC]" />Offen</span>
                    </div>
                    <p className="pt-4 text-center text-xs text-[#6C6A7E]">auf alle hängenden Boulder</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#DDE7DF] bg-white p-4 shadow-[0_10px_30px_rgba(19,17,43,0.05)]">
                  <h3 className="mb-4 text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Letzte Versuche</h3>
                  <div className="flex h-28 items-end justify-between gap-2">
                    {(attemptSeries.length > 0 ? attemptSeries : [{ key: 'Heute-0', label: 'Heute', value: 0 }]).map((item) => (
                      <div key={item.key} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="text-[11px] font-semibold leading-none text-[#13112B]">{item.value}</span>
                        <div
                          className="w-full max-w-5 rounded-t-[4px] rounded-b-[1px] bg-[#36B531]"
                          style={{ height: `${Math.max(12, item.value * 12)}px` }}
                        />
                        <span className="text-[10px] text-[#6C6A7E]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="pt-4 text-center text-xs text-[#6C6A7E]">pro zuletzt gepflegter Session</p>
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
