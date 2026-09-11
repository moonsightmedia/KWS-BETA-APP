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
} from 'lucide-react';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

import { DashboardHeader } from '@/components/DashboardHeader';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { KwsMetricStrip } from '@/components/ui/kws-metric-strip';
import { Skeleton } from '@/components/ui/skeleton';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useMyTrackedBoulders } from '@/hooks/useBoulderCommunity';
import { usePreloadBoulderThumbnails } from '@/hooks/usePreloadBoulderThumbnails';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import type { Boulder } from '@/types/boulder';

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

const getSectorAreaName = (sectorName: string) => sectorName.replace(/\s+[A-D]$/, '');

const getSectorAreaLabel = ({ sector, sector2 }: Pick<Boulder, 'sector' | 'sector2'>) => {
  const primaryArea = getSectorAreaName(sector);
  if (!sector2) return primaryArea;

  const secondaryArea = getSectorAreaName(sector2);
  return primaryArea === secondaryArea ? primaryArea : `${primaryArea} · ${secondaryArea}`;
};

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
  <div className="mb-2.5 flex items-center justify-between gap-3 px-0.5">
    <div className="min-w-0">
      <h2 className="font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">{title}</h2>
      {description ? <p className="pt-0.5 text-xs text-muted-foreground">{description}</p> : null}
    </div>
    {actionLabel && onActionClick ? (
      <button
        type="button"
        onClick={onActionClick}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-kws-control px-2 font-sans text-xs font-semibold text-[#192436] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    ) : null}
  </div>
);

const HomePreviewCard = ({
  boulder,
  meta,
  onClick,
}: {
  boulder: Boulder;
  meta: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[76px] w-full overflow-hidden rounded-kws-card bg-card p-0 text-left shadow-[0_3px_14px_rgba(19,17,43,0.07)] transition-[transform,box-shadow] hover:shadow-[0_6px_20px_rgba(19,17,43,0.11)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
  >
    <div className="relative w-[4.75rem] shrink-0 overflow-hidden bg-muted">
      <img
        className="absolute inset-0 h-full w-full object-cover object-center"
        src={getThumbnailUrl(boulder.thumbnailUrl)}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <DifficultyBadge
        color={boulder.color}
        color2={boulder.color2}
        colorHex={boulder.colorHex}
        difficulty={boulder.difficulty}
        className="!bottom-1.5 !right-1.5 !h-6 !min-w-6 !text-[10px]"
      />
    </div>
    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">{boulder.name}</p>
        <p className="truncate pt-0.5 text-xs text-muted-foreground">{getSectorAreaLabel(boulder)}</p>
        <p className="truncate pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">{meta}</p>
      </div>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-kws-control bg-secondary">
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  </button>
);

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isExpanded } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const swipeRef = useHorizontalRouteSwipe({ routes: ['/', '/boulders', '/statistics'] });

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

    return Array.from(deduped.values()).slice(0, 2);
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
  const desktopGreeting = authLoading
    ? 'Willkommen'
    : greetingName
      ? `Hallo ${greetingName}`
      : 'Willkommen zurück';
  const desktopGreetingSubtitle = newestBoulders.length > 0
    ? `${newestBoulders.length} neue Boulder in den letzten 7 Tagen`
    : 'Alles Wichtige für deine nächste Session';

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div ref={swipeRef} className={layoutClassName}>
          <DashboardHeader
            desktopTitle={desktopGreeting}
            desktopSubtitle={desktopGreetingSubtitle}
            rightSlot={<NotificationCenter variant="header" />}
          />
          <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
            <div className="space-y-4">
              <Skeleton className="h-20 rounded-kws-card" />
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-kws-card" />
                ))}
              </div>
              <Skeleton className="h-44 rounded-kws-card" />
              <Skeleton className="h-40 rounded-kws-card" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-[#F9FAF9]">
        <div ref={swipeRef} className={layoutClassName}>
          <DashboardHeader
            desktopTitle={desktopGreeting}
            desktopSubtitle={desktopGreetingSubtitle}
            rightSlot={<NotificationCenter variant="header" />}
          />
          <main className="mx-auto w-full max-w-[1180px] flex-1 p-4 md:p-8">
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
        <div ref={swipeRef} className={layoutClassName}>
          <DashboardHeader
            desktopTitle={desktopGreeting}
            desktopSubtitle={desktopGreetingSubtitle}
            rightSlot={<NotificationCenter variant="header" />}
          />
          <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-center justify-center p-4 md:p-8">
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
      <div ref={swipeRef} className={layoutClassName}>
        <DashboardHeader
          desktopTitle={desktopGreeting}
          desktopSubtitle={desktopGreetingSubtitle}
          rightSlot={<NotificationCenter variant="header" />}
        />

        <main className="mx-auto w-full max-w-[1180px] flex-1 overflow-x-hidden px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6">
          <section className="mb-5 md:hidden">
            <h1 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-[#192436] md:text-[2rem]">
              {authLoading ? 'Willkommen' : greetingName ? `Hallo ${greetingName}` : 'Willkommen zurück'}
            </h1>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {newestBoulders.length > 0
                ? `${newestBoulders.length} neue Boulder in den letzten 7 Tagen`
                : 'Alles Wichtige für deine nächste Session'}
            </p>
          </section>

          <section className="mb-5">
            <DashboardSectionHeader title="Deine Woche" />
            <KwsMetricStrip
              items={[
                { icon: Trophy, value: weeklyStats.tops, label: 'Tops' },
                { icon: Zap, value: weeklyStats.flashes, label: 'Flashes' },
                { icon: CircleDot, value: weeklyStats.projects, label: 'Projekte' },
              ]}
            />
          </section>

          <section className="mb-5">
            <DashboardSectionHeader
              title="Neu an der Wand"
              actionLabel="Alle ansehen"
              onActionClick={() => navigate('/boulders?show=new')}
            />
            <div className="grid grid-cols-3 gap-2 md:gap-3 xl:grid-cols-6">
              {newestBoulders.map((boulder) => (
                <button
                  key={boulder.id}
                  type="button"
                  onClick={() => navigate(`/boulders/${boulder.id}`)}
                  aria-label={`${boulder.name}, Grad ${boulder.difficulty ?? '?'}, ${getSectorAreaLabel(boulder)}`}
                  className="group relative aspect-[4/5] w-full overflow-hidden rounded-kws-card bg-[#EEF2EE] p-0 text-left shadow-[0_3px_14px_rgba(19,17,43,0.10)] transition-[transform,box-shadow] hover:shadow-[0_7px_22px_rgba(19,17,43,0.16)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2"
                >
                  <img
                    className="absolute inset-0 h-full w-full bg-[#EEF2EE] object-cover object-center transition-opacity duration-300"
                    src={getThumbnailUrl(boulder.thumbnailUrl)}
                    alt={boulder.name}
                    loading="lazy"
                    decoding="async"
                    style={{ opacity: 0 }}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      if (image.naturalWidth > image.naturalHeight) image.style.transform = 'rotate(90deg)';
                      image.style.opacity = '1';
                    }}
                    onError={(event) => {
                      const placeholder = getThumbnailUrl(null);
                      if (event.currentTarget.src !== placeholder) {
                        event.currentTarget.src = placeholder;
                        event.currentTarget.style.opacity = '1';
                      }
                    }}
                  />

                  <DifficultyBadge
                    color={boulder.color}
                    color2={boulder.color2}
                    colorHex={boulder.colorHex}
                    difficulty={boulder.difficulty}
                    className="!bottom-auto !left-1.5 !right-auto !top-1.5 !h-6 !min-w-6 !px-1 !text-[10px] sm:!left-2 sm:!top-2"
                  />
                  <span className="absolute right-1.5 top-1.5 rounded-kws-badge bg-white/95 px-1.5 py-0.5 text-[7px] font-extrabold leading-none text-primary shadow-[0_2px_8px_rgba(19,17,43,0.16)] sm:right-2 sm:top-2 sm:text-[8px]">
                    NEU
                  </span>

                  <div className="absolute inset-x-0 bottom-0 flex h-[46%] flex-col justify-end bg-gradient-to-t from-white via-white/90 to-transparent px-1.5 pb-1.5 pt-7 text-[#192436] sm:px-2 sm:pb-2 md:h-[48%] md:px-3 md:pb-3">
                    <span className="block truncate text-[9px] font-bold leading-tight tracking-[-0.02em] sm:text-[10px] md:text-xs">
                      {boulder.name}
                    </span>
                    <span className="mt-0.5 truncate text-[8px] font-semibold leading-tight text-[#192436]/70 sm:text-[9px] md:text-[11px]">
                      {getSectorAreaLabel(boulder)}
                    </span>
                  </div>
                </button>
              ))}
              {newestBoulders.length === 0 ? (
                <div className="col-span-3 rounded-kws-card bg-card px-4 py-5 text-sm text-muted-foreground shadow-[0_3px_14px_rgba(19,17,43,0.05)] xl:col-span-6">
                  In den letzten sieben Tagen kamen keine Boulder dazu.
                </div>
              ) : null}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <DashboardSectionHeader title="Nächste Umschraubung" />
              <div className="rounded-kws-card bg-card p-3.5 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
                {upcomingSchedules.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-primary/10 text-primary">
                      <CalendarDays className="h-4.5 w-4.5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">
                        {getScheduleTitle(upcomingSchedules[0].sectorNames)}
                      </p>
                      <p className="truncate pt-0.5 text-xs text-muted-foreground">
                        {formatDate(upcomingSchedules[0].when, 'EEE, dd. MMM', { locale: de })}
                        {upcomingSchedules.length > 1 ? ` · +${upcomingSchedules.length - 1} weitere` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-kws-badge bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">
                      {daysUntilLabel(upcomingSchedules[0].when)}
                    </span>
                  </div>
                ) : (
                  <p className="py-1 text-sm text-muted-foreground">Kein Schraubtermin geplant.</p>
                )}
              </div>
            </section>

            <section>
              <DashboardSectionHeader
                title="Für deine Session"
                actionLabel="Projekte"
                onActionClick={() => navigate('/boulders?show=saved')}
              />
              {nextFocusBoulders.length > 0 ? (
                <div className="space-y-2.5">
                  {nextFocusBoulders.map((item) =>
                    item.boulder ? (
                      <HomePreviewCard
                        key={item.tick.id}
                        boulder={item.boulder}
                        meta={`${item.tick.is_project ? 'Projekt' : item.tick.is_favorite ? 'Gespeichert' : 'In Arbeit'} · ${item.tick.attempt_count ?? 0} ${(item.tick.attempt_count ?? 0) === 1 ? 'Versuch' : 'Versuche'}`}
                        onClick={() => navigate(`/boulders/${item.tick.boulder_id}`)}
                      />
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="rounded-kws-card bg-card px-4 py-4 text-sm text-muted-foreground shadow-[0_3px_14px_rgba(19,17,43,0.05)]">
                  Noch keine offenen Projekte.
                </div>
              )}
            </section>
          </div>

          <section className="mb-4 mt-5">
            <DashboardSectionHeader title="Rückblick" />
            <div className="rounded-kws-card bg-card px-4 py-3.5 shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Aktuelle Wand</p>
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{progressStats.toppedPercent}%</span> getoppt</p>
              </div>
              <div className="flex h-2 overflow-hidden rounded-[2px] bg-[#E2E6EC]" aria-label={`${progressStats.toppedPercent} Prozent getoppt, ${progressStats.triedPercent} Prozent probiert`}>
                <span className="bg-primary" style={{ width: `${progressStats.toppedPercent}%` }} />
                <span className="bg-[#6C7280]" style={{ width: `${progressStats.triedPercent}%` }} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-primary" />Getoppt</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#6C7280]" />Probiert</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#E2E6EC]" />Offen</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
