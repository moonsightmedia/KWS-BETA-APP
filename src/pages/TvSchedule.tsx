import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, MapPinned, RefreshCw } from 'lucide-react';

import { InteractiveMapStage } from '@/components/InteractiveMapStage';
import fallbackHallMap from '@/assets/boulderkarte-original.png';
import fallbackRegionData from '@/data/hallMapRegionProposals.json';
import {
  type PublicSectorSchedule,
  usePublicActiveHallMap,
  usePublicSectorMapRegions,
  usePublicTvSchedule,
  usePublicTvSectors,
} from '@/hooks/usePublicTvSchedule';
import { cn } from '@/lib/utils';
import type { Sector } from '@/types/boulder';
import type { HallMap, MapPoint, SectorMapRegion } from '@/types/hallMap';

type ScheduleEntry = PublicSectorSchedule & {
  sectorName: string;
  sector: Sector | null;
};

type ScheduleGroup = {
  key: string;
  date: Date;
  label: string;
  entries: ScheduleEntry[];
};

type TvMapData = Pick<HallMap, 'name' | 'image_url' | 'width' | 'height'>;

const REFRESH_INTERVAL_SECONDS = 60;

const fallbackMap: TvMapData = {
  name: 'Boulderkarte',
  image_url: fallbackHallMap,
  width: 735,
  height: 466,
};

function isSameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateLabel(date: Date) {
  const today = new Date();
  if (isSameDay(date, today)) return 'Heute';
  if (isSameDay(date, addDays(today, 1))) return 'Morgen';

  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function polygonToString(points: MapPoint[], width: number, height: number) {
  return points
    .map((point) => `${(point.x / 100) * width},${(point.y / 100) * height}`)
    .join(' ');
}

function getPolygonCentroid(points: MapPoint[]) {
  if (points.length < 3) {
    if (!points.length) return { x: 50, y: 50 };
    const total = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: total.x / points.length, y: total.y / points.length };
  }

  let areaAccumulator = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const factor = current.x * next.y - next.x * current.y;

    areaAccumulator += factor;
    centroidX += (current.x + next.x) * factor;
    centroidY += (current.y + next.y) * factor;
  }

  const area = areaAccumulator / 2;
  if (Math.abs(area) < 0.0001) {
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  return {
    x: centroidX / (6 * area),
    y: centroidY / (6 * area),
  };
}

function getCentroid(region: SectorMapRegion) {
  if (region.label_x !== null && region.label_y !== null) {
    return { x: region.label_x, y: region.label_y };
  }

  return getPolygonCentroid(region.points_json);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildScheduleGroups(schedule: PublicSectorSchedule[] | undefined, sectors: Sector[]): ScheduleGroup[] {
  const now = new Date();
  const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));
  const groups = new Map<string, ScheduleGroup>();

  (schedule ?? [])
    .filter((item) => new Date(item.scheduled_at).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
    .forEach((item) => {
      const date = new Date(item.scheduled_at);
      const key = getDateKey(date);
      const group =
        groups.get(key) ??
        ({
          key,
          date,
          label: getDateLabel(date),
          entries: [],
        } satisfies ScheduleGroup);

      const sector = sectorById.get(item.sector_id) ?? null;
      group.entries.push({
        ...item,
        sector,
        sectorName: sector?.name ?? 'Unbekannter Sektor',
      });
      groups.set(key, group);
    });

  return Array.from(groups.values()).sort((left, right) => left.date.getTime() - right.date.getTime());
}

function buildFallbackRegions(sectors: Sector[]): SectorMapRegion[] {
  const proposals = (fallbackRegionData as { proposals?: Array<any> }).proposals ?? [];

  return sectors.slice(0, proposals.length).map((sector, index) => {
    const proposal = proposals[index];
    return {
      id: `fallback-${sector.id}`,
      hall_map_id: 'fallback-map',
      sector_id: sector.id,
      shape_type: 'polygon',
      points_json: proposal.points_json ?? [],
      label_x: proposal.label_x ?? proposal.centroid?.x ?? null,
      label_y: proposal.label_y ?? proposal.centroid?.y ?? null,
      z_index: index,
      created_at: '',
      updated_at: '',
    };
  });
}

function TvScheduleMap({
  sectors,
  activeSectorIds,
}: {
  sectors: Sector[];
  activeSectorIds: Set<string>;
}) {
  const [imageError, setImageError] = useState(false);
  const { data: activeMap, isLoading: isLoadingMap } = usePublicActiveHallMap();
  const {
    data: regions = [],
    isLoading: isLoadingRegions,
  } = usePublicSectorMapRegions(activeMap?.id);

  const sectorById = useMemo(() => new Map(sectors.map((sector) => [sector.id, sector])), [sectors]);
  const mapData = activeMap ?? fallbackMap;
  const mapRegions = activeMap && regions.length > 0 ? regions : buildFallbackRegions(sectors);
  const usesFallbackMap = !activeMap || regions.length === 0;

  const renderedRegions = useMemo(
    () =>
      mapRegions
        .map((region) => ({ region, sector: sectorById.get(region.sector_id)! }))
        .filter((entry) => entry.sector),
    [mapRegions, sectorById],
  );

  const mapWidth = mapData.width ?? fallbackMap.width;
  const mapHeight = mapData.height ?? fallbackMap.height;
  const mapUnit = Math.max(Math.min(mapWidth, mapHeight) / 100, 1);

  if (isLoadingMap || isLoadingRegions) {
    return (
      <div className="grid h-full min-h-[460px] place-items-center bg-[#F9FAF9] text-[#13112B]/60">
        <div className="flex items-center gap-3 text-[clamp(1rem,1.5vw,1.5rem)] font-semibold">
          <RefreshCw className="h-6 w-6 animate-spin text-[#69B545]" />
          Hallenkarte wird geladen
        </div>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="grid h-full min-h-[460px] place-items-center bg-[#F9FAF9] px-10 text-center text-[#13112B]">
        <div className="max-w-xl">
          <MapPinned className="mx-auto h-12 w-12 text-[#69B545]" />
          <p className="mt-5 font-heading text-[clamp(2.2rem,4vw,4.8rem)] leading-none">Karte wird vorbereitet</p>
          <p className="mt-3 text-[clamp(1rem,1.35vw,1.35rem)] text-[#13112B]/65">
            Die Termine werden rechts weiter angezeigt. Die Anzeige versucht automatisch erneut zu laden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <InteractiveMapStage
      width={mapWidth}
      height={mapHeight}
      disablePanZoom
      lockAspectRatio
      viewportClassName="h-full min-h-[460px] rounded-none border-0 bg-[#F9FAF9]"
    >
      <img
        src={mapData.image_url}
        alt={mapData.name}
        className="block h-full w-full select-none object-contain"
        draggable={false}
        onError={() => setImageError(true)}
      />
      <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        {renderedRegions.map(({ region, sector }) => {
          const isActive = activeSectorIds.has(sector.id);
          const centroid = getCentroid(region);
          const x = (centroid.x / 100) * mapWidth;
          const y = (centroid.y / 100) * mapHeight;
          const labelWidth = Math.max(17 * mapUnit, Math.min(34 * mapUnit, sector.name.length * 1.45 * mapUnit + 8 * mapUnit));

          return (
            <g key={region.id}>
              <polygon
                points={polygonToString(region.points_json, mapWidth, mapHeight)}
                fill={isActive ? 'rgba(105, 181, 69, 0.44)' : 'rgba(19, 17, 43, 0.07)'}
                stroke={isActive ? 'rgba(23, 100, 29, 0.92)' : 'rgba(19, 17, 43, 0.16)'}
                strokeWidth={isActive ? 1.45 * mapUnit : 0.55 * mapUnit}
              />
              {isActive ? (
                <g>
                  <rect
                    x={x - labelWidth / 2}
                    y={y - 3.7 * mapUnit}
                    width={labelWidth}
                    height={7.4 * mapUnit}
                    rx={2.4 * mapUnit}
                    fill="rgba(19, 17, 43, 0.94)"
                    stroke="rgba(105, 181, 69, 0.8)"
                    strokeWidth={0.38 * mapUnit}
                  />
                  <text
                    x={x}
                    y={y + 1.15 * mapUnit}
                    textAnchor="middle"
                    fontSize={2.45 * mapUnit}
                    fill="#ffffff"
                    fontWeight="800"
                  >
                    {sector.name}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      {usesFallbackMap ? (
        <div className="absolute bottom-4 left-4 rounded-lg border border-[#DDE7DF] bg-white/92 px-3 py-2 text-[0.78rem] font-semibold text-[#13112B]/58 shadow-[0_8px_24px_rgba(19,17,43,0.06)]">
          Standardkarte aktiv
        </div>
      ) : null}
    </InteractiveMapStage>
  );
}

const TvSchedule = () => {
  const { data: sectors = [], isLoading: sectorsLoading, error: sectorsError } = usePublicTvSectors();
  const {
    data: schedule = [],
    isLoading: scheduleLoading,
    error: scheduleError,
    dataUpdatedAt,
    isFetching,
  } = usePublicTvSchedule();

  const [now, setNow] = useState(() => new Date());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SECONDS);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
      setSecondsUntilRefresh((current) => (current <= 1 ? REFRESH_INTERVAL_SECONDS : current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const groups = useMemo(() => buildScheduleGroups(schedule, sectors), [schedule, sectors]);
  const activeSectorIds = useMemo(
    () => new Set(groups.flatMap((group) => group.entries.map((entry) => entry.sector_id))),
    [groups],
  );
  const hasError = !!sectorsError || !!scheduleError;
  const isLoading = sectorsLoading || scheduleLoading;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#F9FAF9] text-[#13112B]">
      <div className="grid min-h-screen grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex items-center justify-between gap-8 border-b border-[#DDE7DF] bg-white px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(0.9rem,1.7vh,1.4rem)] shadow-[0_8px_28px_rgba(19,17,43,0.04)]">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-[#69B545]">
              <MapPinned className="h-[clamp(1.1rem,1.6vw,1.8rem)] w-[clamp(1.1rem,1.6vw,1.8rem)]" />
              <p className="text-[clamp(0.76rem,0.95vw,1.05rem)] font-bold uppercase tracking-[0.24em]">Kletterwelt Sauerland</p>
            </div>
            <h1 className="mt-1 font-heading text-[clamp(2.8rem,5.2vw,6.1rem)] leading-[0.86] tracking-normal text-[#13112B]">
              Routenschraubplan
            </h1>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-heading text-[clamp(2.4rem,4.1vw,4.9rem)] leading-none text-[#13112B]">
              {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="mt-1 text-[clamp(0.86rem,1.05vw,1.2rem)] font-semibold text-[#13112B]/58">
              {now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </header>

        <section className="grid min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.65fr)]">
          <div className="relative min-h-[42vh] overflow-hidden border-b border-[#DDE7DF] bg-[#F9FAF9] xl:min-h-0 xl:border-b-0 xl:border-r">
            <TvScheduleMap sectors={sectors} activeSectorIds={activeSectorIds} />
            <div className="pointer-events-none absolute left-6 top-6 rounded-lg border border-[#DDE7DF] bg-white/92 px-4 py-3 text-[#13112B] shadow-[0_8px_24px_rgba(19,17,43,0.06)] backdrop-blur">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#6E806A]">Geplante Sektoren</p>
              <p className="mt-1 font-heading text-[clamp(2rem,3.5vw,3.7rem)] leading-none">{activeSectorIds.size}</p>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col bg-white text-[#13112B]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#DDE7DF] px-[clamp(1rem,2vw,2rem)] py-[clamp(0.9rem,1.6vh,1.4rem)]">
              <div>
                <p className="text-[0.76rem] font-bold uppercase tracking-[0.22em] text-[#6E806A]">Nächste Termine</p>
                <p className="mt-1 font-heading text-[clamp(1.9rem,3vw,3.4rem)] leading-none">{groups.length} Tage</p>
              </div>
              <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold', isFetching ? 'border-[#69B545]/35 bg-[#EAF5E7] text-[#347D2F]' : 'border-[#DDE7DF] bg-[#F9FAF9] text-[#6E806A]')}>
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                {secondsUntilRefresh}s
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-[clamp(1rem,2vw,2rem)] py-[clamp(1rem,2vh,2rem)]">
              {isLoading ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <RefreshCw className="mx-auto h-10 w-10 animate-spin text-[#69B545]" />
                    <p className="mt-5 text-[clamp(1.2rem,1.7vw,1.8rem)] font-semibold">Termine werden geladen</p>
                  </div>
                </div>
              ) : hasError ? (
                <div className="grid h-full place-items-center text-center">
                  <div className="max-w-md">
                    <RefreshCw className="mx-auto h-12 w-12 text-[#B86B2B]" />
                    <p className="mt-5 font-heading text-[clamp(2.4rem,4vw,4.8rem)] leading-none">Keine Verbindung</p>
                    <p className="mt-3 text-[clamp(1rem,1.4vw,1.45rem)] text-[#566056]">
                      Die Anzeige versucht automatisch erneut zu laden.
                    </p>
                  </div>
                </div>
              ) : groups.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div className="max-w-lg">
                    <CalendarClock className="mx-auto h-12 w-12 text-[#69B545]" />
                    <p className="mt-5 font-heading text-[clamp(2.1rem,3.6vw,4.1rem)] leading-none">
                      Aktuell keine Schraubtermine geplant.
                    </p>
                    <p className="mt-3 text-[clamp(0.95rem,1.15vw,1.25rem)] font-medium text-[#13112B]/58">
                      Die Anzeige aktualisiert sich automatisch jede Minute.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col gap-[clamp(0.8rem,1.4vh,1.25rem)] overflow-hidden">
                  {groups.slice(0, 5).map((group, groupIndex) => (
                    <section key={group.key} className="min-h-0 border-b border-[#DDE7DF] pb-[clamp(0.8rem,1.4vh,1.25rem)] last:border-b-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <h2 className="font-heading text-[clamp(2.1rem,3.8vw,4.1rem)] leading-none text-[#13112B]">{group.label}</h2>
                        <p className="text-[clamp(0.85rem,1.05vw,1.15rem)] font-bold uppercase tracking-[0.18em] text-[#6E806A]">
                          {group.entries.length} {group.entries.length === 1 ? 'Termin' : 'Termine'}
                        </p>
                      </div>

                      <div className="mt-[clamp(0.55rem,1vh,0.9rem)] grid gap-[clamp(0.5rem,0.85vh,0.75rem)]">
                        {group.entries.slice(0, groupIndex === 0 ? 5 : 3).map((entry) => (
                          <article key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-lg border border-[#DDE7DF] bg-[#F9FAF9] px-[clamp(0.8rem,1.2vw,1.25rem)] py-[clamp(0.7rem,1vh,1rem)]">
                            <div className="flex min-w-[5.4rem] items-center gap-2 text-[#17641D]">
                              <Clock className="h-5 w-5" />
                              <span className="font-heading text-[clamp(1.7rem,2.6vw,2.8rem)] leading-none">{formatTime(entry.scheduled_at)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[clamp(1.08rem,1.55vw,1.7rem)] font-extrabold leading-tight text-[#13112B]">
                                {entry.sectorName}
                              </p>
                              {entry.note ? (
                                <p className="mt-1 line-clamp-1 text-[clamp(0.85rem,1vw,1.1rem)] font-medium text-[#13112B]/58">{entry.note}</p>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#DDE7DF] px-[clamp(1rem,2vw,2rem)] py-3 text-[clamp(0.78rem,0.95vw,1rem)] font-semibold text-[#6E806A]">
              <span>Zuletzt aktualisiert: {updatedAt ? updatedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'noch nicht geladen'}</span>
              <span>Nächster Sync in {secondsUntilRefresh}s</span>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default TvSchedule;
