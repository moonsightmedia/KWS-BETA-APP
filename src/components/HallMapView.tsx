import { useMemo, useState } from 'react';
import { AlertCircle, ImageOff, MapPinned, RotateCcw, X } from 'lucide-react';

import { InteractiveMapStage } from '@/components/InteractiveMapStage';
import hallMapBase from '@/assets/boulderkarte-original.png';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useActiveHallMap, useSectorMapRegions } from '@/hooks/useHallMaps';
import { cn } from '@/lib/utils';
import type { Sector } from '@/types/boulder';
import type { MapPoint, SectorMapRegion } from '@/types/hallMap';

interface HallMapViewProps {
  sectors: Sector[];
  countsBySectorId: Record<string, number>;
  selectedSectorName?: string;
  selectedSectorNames?: string[];
  onSelectSector: (sectorName: string) => void;
  onClearSector: () => void;
  onClose?: () => void;
  compact?: boolean;
  frameless?: boolean;
  lockAspectRatio?: boolean;
  viewportClassName?: string;
}

type MarkerLayout = {
  label: string;
  width: number;
  height: number;
  x: number;
  y: number;
  compact: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function shortenSectorName(name: string, compact: boolean) {
  const maxLength = compact ? 10 : 16;
  return name.length > maxLength ? `${name.slice(0, maxLength - 3)}...` : name;
}

function buildMarkerLayout({
  region,
  sectorName,
  count,
  crowded,
  mapUnit,
  mapWidth,
  mapHeight,
}: {
  region: SectorMapRegion;
  sectorName: string;
  count: number;
  crowded: boolean;
  mapUnit: number;
  mapWidth: number;
  mapHeight: number;
}): MarkerLayout {
  const centroid = getCentroid(region);
  const centroidX = (centroid.x / 100) * mapWidth;
  const centroidY = (centroid.y / 100) * mapHeight;
  const compact = crowded || sectorName.length > 14;
  const label = `${shortenSectorName(sectorName, compact)} (${count})`;
  const width = clamp(label.length * (compact ? 1.34 : 1.52) * mapUnit + 6.6 * mapUnit, 14 * mapUnit, compact ? 24 * mapUnit : 31 * mapUnit);
  const height = compact ? 5.6 * mapUnit : 6.3 * mapUnit;
  const edgeInset = 1.2 * mapUnit;

  return {
    label,
    width,
    height,
    compact,
    x: clamp(centroidX, width / 2 + edgeInset, mapWidth - width / 2 - edgeInset),
    y: clamp(centroidY, height / 2 + edgeInset, mapHeight - height / 2 - edgeInset),
  };
}

export function HallMapView({
  sectors,
  countsBySectorId,
  selectedSectorName = 'all',
  selectedSectorNames,
  onSelectSector,
  onClearSector,
  onClose,
  compact = false,
  frameless = false,
  lockAspectRatio = true,
  viewportClassName,
}: HallMapViewProps) {
  const [imageError, setImageError] = useState(false);
  const [hoveredSectorName, setHoveredSectorName] = useState<string | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const queriesEnabled = !authLoading && !!user;
  const accessToken = session?.access_token ?? null;
  const { data: activeMap, isLoading: isLoadingMap, error: mapError } = useActiveHallMap(accessToken, queriesEnabled);
  const { data: regions = [], isLoading: isLoadingRegions, error: regionsError } = useSectorMapRegions(activeMap?.id, accessToken, queriesEnabled);

  const sectorById = useMemo(() => new Map(sectors.map((sector) => [sector.id, sector])), [sectors]);
  const renderedRegions = useMemo(
    () =>
      regions
        .map((region) => ({ region, sector: sectorById.get(region.sector_id)! }))
        .filter((entry) => entry.sector),
    [regions, sectorById],
  );

  const regionCentroids = useMemo(
    () =>
      renderedRegions.map(({ region }) => ({
        id: region.id,
        point: getCentroid(region),
      })),
    [renderedRegions],
  );

  const totalVisibleBoulders = useMemo(
    () => Object.values(countsBySectorId).reduce((sum, count) => sum + count, 0),
    [countsBySectorId],
  );

  const selectedSectorSet = useMemo(() => {
    if (selectedSectorNames?.length) {
      return new Set(selectedSectorNames.filter((name) => name && name !== 'all'));
    }

    return selectedSectorName && selectedSectorName !== 'all'
      ? new Set([selectedSectorName])
      : new Set<string>();
  }, [selectedSectorName, selectedSectorNames]);

  const singleSelectedSectorName = selectedSectorSet.size === 1 ? Array.from(selectedSectorSet)[0] : null;
  const highlightedSectorName = hoveredSectorName ?? singleSelectedSectorName;
  const selectedSector = singleSelectedSectorName
    ? sectors.find((sector) => sector.name === singleSelectedSectorName) ?? null
    : null;
  const selectedCount = selectedSector ? countsBySectorId[selectedSector.id] ?? 0 : 0;
  const mapWidth = activeMap?.width ?? 100;
  const mapHeight = activeMap?.height ?? 100;
  const mapUnit = Math.max(Math.min(mapWidth, mapHeight) / 100, 1);
  const backgroundImageSrc = frameless ? hallMapBase : activeMap.image_url;

  if (authLoading || isLoadingMap || isLoadingRegions) {
    return (
      <div className="space-y-4">
        {!compact && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-10 w-28 animate-pulse rounded-full bg-[#E7F7E9]" />
            <div className="h-10 w-40 animate-pulse rounded-full bg-[#F2F4F7]" />
          </div>
        )}
        <div className={cn('animate-pulse rounded-2xl bg-[#EEF4EF]', compact ? 'h-[250px]' : 'h-[52vh]')} />
      </div>
    );
  }

  if (mapError || regionsError) {
    return (
      <Alert variant="destructive" className="rounded-2xl border-red-200 bg-red-50/80">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hallenkarte konnte nicht geladen werden</AlertTitle>
        <AlertDescription>
          {(mapError as Error | undefined)?.message ?? (regionsError as Error | undefined)?.message ?? 'Unbekannter Fehler'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!activeMap) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CFEFD5] bg-[linear-gradient(135deg,#f8fff8_0%,#f4f7fb_100%)] p-6">
        <Badge className="mb-4 w-fit rounded-full border-0 bg-[#E7F7E9] px-3 py-1 text-[#217a28]">
          <MapPinned className="mr-2 h-3.5 w-3.5" />
          Hallenkartenmodus bereit
        </Badge>
        <h3 className="text-2xl font-semibold tracking-tight text-[#13112B]">Noch keine aktive Hallenkarte</h3>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[#13112B]/68">
          Lege im Admin einen Hallenplan an und zeichne die ersten Sektorflächen ein. Danach ist die Sektorwahl hier direkt in der Filterleiste verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-full overflow-hidden', compact ? 'space-y-3' : 'space-y-4')}>
      {!compact && !frameless && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-[#D8EAD8] bg-[#F2FBF3] px-3 py-1 text-[#1F7C22]">
              <MapPinned className="mr-2 h-3.5 w-3.5" />
              {activeMap.name}
            </Badge>
            <Badge className="rounded-full border border-[#DCE5DE] bg-white px-3 py-1 text-[#13112B]/70 shadow-none">
              {renderedRegions.length} Sektoren
            </Badge>
            <Badge className="rounded-full border border-[#DCE5DE] bg-white px-3 py-1 text-[#13112B]/70 shadow-none">
              {selectedSectorSet.size > 1
                ? `${selectedSectorSet.size} Sektoren ausgewählt`
                : singleSelectedSectorName
                  ? highlightedSectorName
                  : `${totalVisibleBoulders} Boulder sichtbar`}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {selectedSectorSet.size > 0 && (
              <Button variant="outline" size="sm" onClick={onClearSector} className="rounded-2xl border-[#DCE5DE] text-[#13112B]">
                <RotateCcw className="mr-2 h-4 w-4" />
                Filter zurücksetzen
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl text-[#13112B]/70 hover:bg-[#F3F6F3]">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'w-full max-w-full overflow-hidden',
          frameless
            ? 'rounded-none border-0 bg-transparent p-0'
            : 'rounded-2xl border border-[#DBE3DD] bg-[#F5F8F5]',
          !frameless && (compact ? 'p-2' : 'p-2.5 sm:p-3')
        )}
      >
        {imageError ? (
          <Alert variant="destructive" className="rounded-2xl">
            <ImageOff className="h-4 w-4" />
            <AlertTitle>Bild konnte nicht geladen werden</AlertTitle>
            <AlertDescription>Prüfe die Bild-URL der aktiven Hallenkarte.</AlertDescription>
          </Alert>
        ) : (
          <InteractiveMapStage
            width={mapWidth}
            height={mapHeight}
            viewportClassName={cn(
              frameless
                ? 'min-h-[360px] rounded-none border-0 bg-transparent shadow-none sm:min-h-[520px]'
                : compact
                  ? 'rounded-2xl bg-white'
                  : 'min-h-[340px] rounded-2xl bg-white sm:min-h-[480px]',
              viewportClassName,
            )}
            compact={compact}
            lockAspectRatio={lockAspectRatio}
            panPadding={frameless ? 180 : 0}
            honeycombBackground={frameless}
          >
            <img
              src={backgroundImageSrc}
              alt={activeMap.name}
              className="block h-full w-full select-none object-contain"
              draggable={false}
              onError={() => setImageError(true)}
            />
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
            >
              {renderedRegions.map(({ region, sector }) => {
                const isSelected = selectedSectorSet.has(sector.name);
                const isHovered = hoveredSectorName === sector.name;
                const isHighlighted = isSelected || isHovered;
                const count = countsBySectorId[sector.id] ?? 0;
                const centroid = getCentroid(region);
                const closestNeighborDistance = regionCentroids
                  .filter((entry) => entry.id !== region.id)
                  .reduce((closest, entry) => {
                    const currentDistance = Math.hypot(entry.point.x - centroid.x, entry.point.y - centroid.y);
                    return Math.min(closest, currentDistance);
                  }, Number.POSITIVE_INFINITY);
                const marker = buildMarkerLayout({
                  region,
                  sectorName: sector.name,
                  count,
                  crowded: closestNeighborDistance < 14,
                  mapUnit,
                  mapWidth,
                  mapHeight,
                });

                return (
                  <g key={region.id}>
                    <polygon
                      points={polygonToString(region.points_json, mapWidth, mapHeight)}
                      fill="transparent"
                      stroke="rgba(17,24,39,0.001)"
                      strokeWidth={10 * mapUnit}
                      style={{ pointerEvents: 'stroke' }}
                      onMouseEnter={() => setHoveredSectorName(sector.name)}
                      onMouseLeave={() => setHoveredSectorName((current) => (current === sector.name ? null : current))}
                      onClick={() => onSelectSector(sector.name)}
                    />
                    <polygon
                      points={polygonToString(region.points_json, mapWidth, mapHeight)}
                      className={cn(
                        'cursor-pointer transition-all duration-200',
                        isHighlighted
                          ? 'fill-[#36B531]/38 stroke-[#1C6324]'
                          : 'fill-[#36B531]/16 stroke-[#2E8B35]/52 hover:fill-[#36B531]/24',
                      )}
                      strokeWidth={isHighlighted ? 1.6 * mapUnit : 1.05 * mapUnit}
                      onMouseEnter={() => setHoveredSectorName(sector.name)}
                      onMouseLeave={() => setHoveredSectorName((current) => (current === sector.name ? null : current))}
                      onClick={() => onSelectSector(sector.name)}
                    />
                    <g className="pointer-events-none">
                      <rect
                        x={marker.x - marker.width / 2}
                        y={marker.y - marker.height / 2}
                        width={marker.width}
                        height={marker.height}
                        rx={(marker.compact ? 2.35 : 2.8) * mapUnit}
                        fill={isHighlighted ? 'rgba(19, 17, 43, 0.94)' : 'rgba(255, 255, 255, 0.9)'}
                        stroke={isHighlighted ? 'rgba(54, 181, 49, 0.42)' : 'rgba(19, 17, 43, 0.1)'}
                        strokeWidth={0.42 * mapUnit}
                      />
                      <text
                        x={marker.x}
                        y={marker.y + (marker.compact ? 0.95 : 1.08) * mapUnit}
                        textAnchor="middle"
                        fontSize={(marker.compact ? 1.95 : 2.18) * mapUnit}
                        fill={isHighlighted ? '#ffffff' : '#13112B'}
                        fontWeight="700"
                      >
                        {marker.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </InteractiveMapStage>
        )}
      </div>

      {selectedSector && !frameless && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-2xl border border-[#DDE5DF] bg-white px-4 py-3',
            compact && 'rounded-xl px-3 py-2.5',
          )}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#13112B]/45">Ausgewählter Sektor</div>
            <div className="mt-1 truncate text-sm font-semibold text-[#13112B]">
              {selectedSector.name} <span className="text-[#13112B]/52">({selectedCount} Boulder)</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearSector} className="rounded-2xl text-[#13112B]/70 hover:bg-[#F3F6F3]">
            Zurücksetzen
          </Button>
        </div>
      )}

      {renderedRegions.length === 0 && !imageError && !frameless && (
        <Alert className="rounded-2xl border-[#E7F7E9] bg-[#F8FCF9]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Keine Sektorflächen vorhanden</AlertTitle>
          <AlertDescription>Die Hallenkarte ist aktiv, aber es wurden noch keine klickbaren Sektorflächen hinterlegt.</AlertDescription>
        </Alert>
      )}

      {renderedRegions.length > 0 && !compact && !frameless && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#13112B]/45">Sektoren direkt wählen</div>
          <div className="flex flex-wrap gap-2">
            {renderedRegions.map(({ region, sector }) => {
              const active = selectedSectorName === sector.name;
              const count = countsBySectorId[sector.id] ?? 0;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => onSelectSector(sector.name)}
                  className={cn(
                    'inline-flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                    active
                      ? 'border-[#36B531] bg-[#E8F7EA] text-[#17641d] shadow-[0_10px_24px_rgba(54,181,49,0.14)]'
                      : 'border-[#E5EBE7] bg-white text-[#13112B] hover:border-[#BCDDBF] hover:bg-[#F9FCF9]',
                  )}
                >
                  <span className="text-sm font-semibold">{sector.name}</span>
                  <span className="rounded-full border border-[#DFE7E1] bg-[#F7FAF8] px-2.5 py-1 text-xs font-semibold text-[#13112B]/72">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
