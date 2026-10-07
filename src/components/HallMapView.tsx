import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { AlertCircle, Check, ImageOff, MapPinned, RotateCcw, X } from 'lucide-react';

import { InteractiveMapStage } from '@/components/InteractiveMapStage';
import { HallMap3DWalls } from '@/components/HallMap3DWalls';
import { resolveHallMapSource } from '@/lib/hallMapSource';
import { getHallMapDisplayGeometry, toHallMapDisplayPoint } from '@/lib/hallMapOrientation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveHallMap, useSectorMapRegions } from '@/hooks/useHallMaps';
import {
  countActiveBouldersForSectorIds,
  resolveSectorArea,
  getSectorAreas,
  type BoulderSectorReference,
} from '@/lib/sectorAreas';
import { cn } from '@/lib/utils';
import type { Sector } from '@/types/boulder';
import type { MapPoint, SectorMapRegion } from '@/types/hallMap';

interface HallMapViewProps {
  sectors: Sector[];
  countsBySectorId: Record<string, number>;
  boulderSectorReferences?: readonly BoulderSectorReference[];
  selectedSectorName?: string;
  selectedSectorNames?: string[];
  selectedSectorId?: string;
  selectedSectorIds?: string[];
  onSelectSector?: (sectorName: string) => void;
  onSelectSectorId?: (sectorId: string) => void;
  onClearSector: () => void;
  onClose?: () => void;
  compact?: boolean;
  frameless?: boolean;
  showCounts?: boolean;
  disablePanZoom?: boolean;
  lockAspectRatio?: boolean;
  viewportClassName?: string;
  /** Keep the stage and selection actions inside a viewport-sized panel. */
  fitContainer?: boolean;
}

type MarkerLayout = {
  line1: string;
  line2?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  compact: boolean;
};

type LogicalMapGroup = {
  key: string;
  sectors: Sector[];
  regions: SectorMapRegion[];
  areaName?: string;
  areaSlug?: string;
  subareaCode?: string;
  anchorX: number;
  anchorY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function polygonToString(points: MapPoint[], width: number, height: number, rotateClockwise: boolean) {
  return points
    .map(point => toHallMapDisplayPoint(point, rotateClockwise))
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

function getLogicalSectorKey(sector: Sector) {
  const resolved = resolveSectorArea(sector);
  return resolved.area && resolved.subareaCode
    ? `${resolved.area.slug}:${resolved.subareaCode}`
    : sector.id;
}

function shortenSectorName(name: string, compact: boolean) {
  const maxLength = compact ? 15 : 20;
  return name.length > maxLength ? `${name.slice(0, maxLength - 1).trim()}…` : name;
}

function buildMarkerLayout({
  anchorX,
  anchorY,
  line1,
  line2,
  count,
  crowded,
  mapUnit,
  mapWidth,
  mapHeight,
  showCounts,
  minimal,
}: {
  anchorX: number;
  anchorY: number;
  line1: string;
  line2?: string;
  count: number;
  crowded: boolean;
  mapUnit: number;
  mapWidth: number;
  mapHeight: number;
  showCounts: boolean;
  minimal: boolean;
}): MarkerLayout {
  const centroidX = (anchorX / 100) * mapWidth;
  const centroidY = (anchorY / 100) * mapHeight;
  const compact = minimal || crowded || line1.length > 14;
  const visibleLine1 = shortenSectorName(line1, compact);
  const visibleLine2 = minimal
    ? undefined
    : line2
      ? showCounts ? `${line2} · ${count}` : line2
      : showCounts ? `${count} Boulder` : undefined;
  const longestLineLength = Math.max(visibleLine1.length, visibleLine2?.length ?? 0);
  const width = minimal
    ? Math.max(7.2, visibleLine1.length * 2.7 + 2) * mapUnit
    : clamp(
        longestLineLength * (compact ? 1.58 : 1.72) * mapUnit + 3.8 * mapUnit,
        17 * mapUnit,
        compact ? 33 * mapUnit : 39 * mapUnit,
      );
  const height = minimal
    ? 6.4 * mapUnit
    : visibleLine2 ? (compact ? 9.4 : 10.2) * mapUnit : (compact ? 7.1 : 7.7) * mapUnit;
  const edgeInset = 1.2 * mapUnit;

  return {
    line1: visibleLine1,
    line2: visibleLine2,
    width,
    height,
    compact,
    anchorX: centroidX,
    anchorY: centroidY,
    x: clamp(centroidX, width / 2 + edgeInset, mapWidth - width / 2 - edgeInset),
    y: clamp(centroidY, height / 2 + edgeInset, mapHeight - height / 2 - edgeInset),
  };
}

function markerOverlapArea(left: MarkerLayout, right: MarkerLayout, padding: number) {
  const overlapWidth = Math.min(left.x + left.width / 2, right.x + right.width / 2)
    - Math.max(left.x - left.width / 2, right.x - right.width / 2)
    + padding;
  const overlapHeight = Math.min(left.y + left.height / 2, right.y + right.height / 2)
    - Math.max(left.y - left.height / 2, right.y - right.height / 2)
    + padding;

  return Math.max(0, overlapWidth) * Math.max(0, overlapHeight);
}

function placeMarkerLayouts(
  entries: Array<{ key: string; marker: MarkerLayout }>,
  mapWidth: number,
  mapHeight: number,
  mapUnit: number,
) {
  const placed: Array<{ key: string; marker: MarkerLayout }> = [];
  const edgeInset = 1.2 * mapUnit;
  const collisionPadding = 0.72 * mapUnit;

  [...entries]
    .sort((left, right) => left.marker.anchorY - right.marker.anchorY || left.marker.anchorX - right.marker.anchorX)
    .forEach((entry) => {
      const { marker } = entry;
      const horizontalStep = marker.width * 0.58 + collisionPadding;
      const verticalStep = marker.height + collisionPadding;
      const rawOffsets: Array<[number, number]> = [[0, 0]];

      for (let ring = 1; ring <= 5; ring += 1) {
        rawOffsets.push(
          [0, -verticalStep * ring],
          [0, verticalStep * ring],
          [-horizontalStep * ring, 0],
          [horizontalStep * ring, 0],
          [-horizontalStep * ring, -verticalStep * ring],
          [horizontalStep * ring, -verticalStep * ring],
          [-horizontalStep * ring, verticalStep * ring],
          [horizontalStep * ring, verticalStep * ring],
        );
      }

      const candidates = rawOffsets.map(([offsetX, offsetY]) => ({
        ...marker,
        x: clamp(
          marker.anchorX + offsetX,
          marker.width / 2 + edgeInset,
          mapWidth - marker.width / 2 - edgeInset,
        ),
        y: clamp(
          marker.anchorY + offsetY,
          marker.height / 2 + edgeInset,
          mapHeight - marker.height / 2 - edgeInset,
        ),
      }));

      const bestCandidate = candidates
        .map((candidate) => {
          const overlap = placed.reduce(
            (sum, current) => sum + markerOverlapArea(candidate, current.marker, collisionPadding),
            0,
          );
          const displacement = Math.hypot(candidate.x - marker.anchorX, candidate.y - marker.anchorY);
          return { candidate, score: overlap * 10_000 + displacement };
        })
        .sort((left, right) => left.score - right.score)[0]?.candidate ?? marker;

      placed.push({ key: entry.key, marker: bestCandidate });
    });

  return new Map(placed.map(({ key, marker }) => [key, marker]));
}

export function HallMapView({
  sectors,
  countsBySectorId,
  boulderSectorReferences,
  selectedSectorName = 'all',
  selectedSectorNames,
  selectedSectorId,
  selectedSectorIds,
  onSelectSector,
  onSelectSectorId,
  onClearSector,
  onClose,
  compact = false,
  frameless = false,
  showCounts = true,
  disablePanZoom = false,
  lockAspectRatio = true,
  viewportClassName,
  fitContainer = false,
}: HallMapViewProps) {
  const appearanceId = useId().replace(/:/g, '');
  const wallFillId = `${appearanceId}-wall-fill`;
  const wallShadowId = `${appearanceId}-wall-shadow`;
  const markerShadowId = `${appearanceId}-marker-shadow`;
  const [imageError, setImageError] = useState(false);
  const isMobile = useIsMobile();
  const [hoveredSectorKey, setHoveredSectorKey] = useState<string | null>(null);
  const [focusedSectorKey, setFocusedSectorKey] = useState<string | null>(null);
  const [mapScale, setMapScale] = useState(1);
  const [walls3DReady, setWalls3DReady] = useState(false);
  // vectorEffect handles SVG/viewBox scaling; the stage's CSS zoom needs
  // separate compensation to keep the contour visually fine when enlarged.
  const handleMapViewportChange = useCallback(({ scale }: { scale: number }) => setMapScale(scale), []);
  const { session, loading: authLoading } = useAuth();
  const queriesEnabled = !authLoading;
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

  const logicalMapGroups = useMemo(() => {
    const grouped = new Map<string, LogicalMapGroup>();

    renderedRegions.forEach(({ region, sector }) => {
      const key = getLogicalSectorKey(sector);
      const resolved = resolveSectorArea(sector);
      const centroid = getCentroid(region);
      const current = grouped.get(key);

      if (current) {
        current.regions.push(region);
        if (!current.sectors.some((entry) => entry.id === sector.id)) current.sectors.push(sector);
        current.anchorX = (current.anchorX * (current.regions.length - 1) + centroid.x) / current.regions.length;
        current.anchorY = (current.anchorY * (current.regions.length - 1) + centroid.y) / current.regions.length;
        return;
      }

      grouped.set(key, {
        key,
        sectors: [sector],
        regions: [region],
        areaName: resolved.area?.name,
        areaSlug: resolved.area?.slug,
        subareaCode: resolved.subareaCode,
        anchorX: centroid.x,
        anchorY: centroid.y,
      });
    });

    return [...grouped.values()].sort((left, right) =>
      left.anchorY - right.anchorY || left.anchorX - right.anchorX,
    );
  }, [renderedRegions]);

  const wallRegions = useMemo(() => renderedRegions.map(({ region }) => region), [renderedRegions]);

  const logicalGroupKeysBySectorId = useMemo(
    () => new Map(logicalMapGroups.flatMap((group) => group.sectors.map((sector) => [sector.id, group.key] as const))),
    [logicalMapGroups],
  );

  const logicalGroupKeysBySectorName = useMemo(
    () => new Map(logicalMapGroups.flatMap((group) => group.sectors.map((sector) => [sector.name, group.key] as const))),
    [logicalMapGroups],
  );

  const logicalGroupSectorIds = useMemo(
    () => new Map(logicalMapGroups.map((group) => [group.key, group.sectors.map((sector) => sector.id)])),
    [logicalMapGroups],
  );

  const totalVisibleBoulders = useMemo(
    () => boulderSectorReferences
      ? countActiveBouldersForSectorIds(boulderSectorReferences, sectors.map((sector) => sector.id))
      : Object.values(countsBySectorId).reduce((sum, count) => sum + count, 0),
    [boulderSectorReferences, countsBySectorId, sectors],
  );

  const selectedSectorSet = useMemo(() => {
    if (selectedSectorNames !== undefined) {
      return new Set(selectedSectorNames.filter((name) => name && name !== 'all'));
    }

    return selectedSectorName && selectedSectorName !== 'all'
      ? new Set([selectedSectorName])
      : new Set<string>();
  }, [selectedSectorName, selectedSectorNames]);

  const selectedSectorIdSet = useMemo(() => {
    const values = selectedSectorIds !== undefined
      ? selectedSectorIds
      : selectedSectorId
        ? [selectedSectorId]
        : [];
    return new Set(values.filter(Boolean));
  }, [selectedSectorId, selectedSectorIds]);

  const selectedLogicalGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedSectorIdSet.forEach((sectorId) => {
      const key = logicalGroupKeysBySectorId.get(sectorId);
      if (key) keys.add(key);
    });
    // IDs are authoritative when supplied. A stale name channel must not select
    // additional regions, and an explicitly empty array must remain empty.
    if (selectedSectorIds === undefined && selectedSectorId === undefined) {
      selectedSectorSet.forEach((sectorName) => {
        const key = logicalGroupKeysBySectorName.get(sectorName);
        if (key) keys.add(key);
      });
    }
    return keys;
  }, [logicalGroupKeysBySectorId, logicalGroupKeysBySectorName, selectedSectorId, selectedSectorIds, selectedSectorIdSet, selectedSectorSet]);

  const selectedGroups = logicalMapGroups.filter(group => selectedLogicalGroupKeys.has(group.key));

  const { src: backgroundImageSrc, width: sourceWidth, height: sourceHeight, supportsProposals: isKwsDrawing } = resolveHallMapSource(activeMap);
  // Fixed-height editor previews stay horizontal; full mobile maps use portrait.
  const { width: mapWidth, height: mapHeight, rotateClockwise } = getHallMapDisplayGeometry(
    sourceWidth, sourceHeight, isMobile && lockAspectRatio,
  );
  const mapUnit = Math.max(Math.min(mapWidth, mapHeight) / 100, 1);
  useEffect(() => setImageError(false), [backgroundImageSrc]);

  const markerLayouts = useMemo(() => {
    const entries = logicalMapGroups.map((group) => {
      const closestNeighborDistance = logicalMapGroups
        .filter((entry) => entry.key !== group.key)
        .reduce((closest, entry) => {
          const distance = Math.hypot(entry.anchorX - group.anchorX, entry.anchorY - group.anchorY);
          return Math.min(closest, distance);
        }, Number.POSITIVE_INFINITY);
      const sectorIds = logicalGroupSectorIds.get(group.key) ?? [];
      const count = boulderSectorReferences
        ? countActiveBouldersForSectorIds(boulderSectorReferences, sectorIds)
        : sectorIds.reduce((sum, sectorId) => sum + (countsBySectorId[sectorId] ?? 0), 0);
      const anchor = toHallMapDisplayPoint({ x: group.anchorX, y: group.anchorY }, rotateClockwise);

      return {
        key: group.key,
        marker: buildMarkerLayout({
          anchorX: anchor.x,
          anchorY: anchor.y,
          line1: frameless
            ? group.areaSlug === 'kurze-platte' ? group.subareaCode ?? 'A'
              : selectedLogicalGroupKeys.has(group.key) ? resolveSectorArea(group.sectors[0]).publicName
                : group.subareaCode ?? group.areaName ?? group.sectors[0]?.name ?? 'Bereich'
            : group.areaName ?? group.sectors[0]?.name ?? 'Bereich',
          line2: frameless ? undefined : group.subareaCode,
          count,
          crowded: closestNeighborDistance < 15,
          mapUnit,
          mapWidth,
          mapHeight,
          showCounts,
          minimal: frameless,
        }),
      };
    });

    return placeMarkerLayouts(entries, mapWidth, mapHeight, mapUnit);
  }, [boulderSectorReferences, countsBySectorId, frameless, logicalGroupSectorIds, logicalMapGroups, mapHeight, mapUnit, mapWidth, rotateClockwise, selectedLogicalGroupKeys, showCounts]);

  // Wayfinding anchors sit in the open floor of the KWS plan, not in the
  // bounding boxes of walls. Rotate labels with the same transform as polygons.
  // Other plans use their wall bounds; these anchors never alter saved geometry.
  const areaLabels = useMemo(() => getSectorAreas(sectors).flatMap(area => {
    if (area.slug === 'kurze-platte') return [];
    const members = renderedRegions.filter(({ sector }) => resolveSectorArea(sector).area?.slug === area.slug);
    if (!members.length) return [];
    const points = members.flatMap(({ region }) => region.points_json.map(point => toHallMapDisplayPoint(point, rotateClockwise)));
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
    let x = (minX + maxX) / 2, y = (minY + maxY) / 2;
    const floorAnchors: Record<string, MapPoint> = {
      grotte: { x: 22, y: 74 }, bug: { x: 64, y: 75 },
      'lange-platte': { x: 38, y: 33 }, 'top-out': { x: 56, y: 28 },
      'couch-ecke': { x: 84, y: 57 },
    };
    if (isKwsDrawing && floorAnchors[area.slug]) {
      ({ x, y } = toHallMapDisplayPoint(floorAnchors[area.slug], rotateClockwise));
    }
    return [{ ...area, x: clamp(x, 10, 90), y: clamp(y, 8, 92) }];
  }), [isKwsDrawing, renderedRegions, rotateClockwise, sectors]);

  const handleSelectSector = (sector: Sector) => {
    setHoveredSectorKey(null);
    if (onSelectSectorId) onSelectSectorId(sector.id);
    else onSelectSector?.(sector.name);
  };

  const handleDeselectGroup = (group: LogicalMapGroup) => {
    if (selectedGroups.length === 1) {
      onClearSector();
      return;
    }
    const selectedMember = group.sectors.find(sector => selectedSectorIdSet.has(sector.id) || selectedSectorSet.has(sector.name));
    handleSelectSector(selectedMember ?? group.sectors[0]);
  };

  if (authLoading || isLoadingMap || isLoadingRegions) {
    return (
      <div className="space-y-4">
        {!compact && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-10 w-28 animate-pulse rounded-kws-control bg-[#E7F7E9]" />
            <div className="h-10 w-40 animate-pulse rounded-kws-control bg-[#F2F4F7]" />
          </div>
        )}
        <div className={cn('animate-pulse rounded-kws-card bg-[#EEF4EF]', compact ? 'h-[250px]' : 'h-[52vh]')} />
      </div>
    );
  }

  if (mapError || regionsError) {
    return (
      <Alert variant="destructive" className="rounded-kws-card border-red-200 bg-red-50/80">
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
      <div className="rounded-kws-card border border-dashed border-[#CFEFD5] bg-[linear-gradient(135deg,#f8fff8_0%,#f4f7fb_100%)] p-6">
        <Badge className="mb-4 w-fit rounded-kws-badge border-0 bg-[#E7F7E9] px-3 py-1 text-[#217a28]">
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
    <div className={cn('w-full max-w-full overflow-hidden', fitContainer ? 'flex min-h-0 flex-1 flex-col gap-3' : compact ? 'space-y-3' : 'space-y-4')}>
      {!compact && !frameless && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-kws-badge border border-[#D8EAD8] bg-[#F2FBF3] px-3 py-1 text-[#1F7C22]">
              <MapPinned className="mr-2 h-3.5 w-3.5" />
              {activeMap.name}
            </Badge>
            <Badge className="rounded-kws-badge border border-[#DCE5DE] bg-white px-3 py-1 text-[#13112B]/70 shadow-none">
              {new Set(renderedRegions.map(({ sector }) => resolveSectorArea(sector).area?.slug).filter(Boolean)).size || renderedRegions.length} Bereiche
            </Badge>
            <Badge className="rounded-kws-badge border border-[#DCE5DE] bg-white px-3 py-1 text-[#13112B]/70 shadow-none">
              {totalVisibleBoulders} Boulder in der Halle
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-kws-control text-[#13112B]/70 hover:bg-[#F3F6F3]">
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
            : 'rounded-kws-card border border-[#DBE3DD] bg-[#F5F8F5]',
          !frameless && (compact ? 'p-2' : 'p-2.5 sm:p-3'),
          fitContainer && 'min-h-0 flex-1',
        )}
      >
        {imageError ? (
          <Alert variant="destructive" className="rounded-kws-card">
            <ImageOff className="h-4 w-4" />
            <AlertTitle>Bild konnte nicht geladen werden</AlertTitle>
            <AlertDescription>Prüfe die Bild-URL der aktiven Hallenkarte.</AlertDescription>
          </Alert>
        ) : (
          <InteractiveMapStage
            width={mapWidth}
            height={mapHeight}
            className={fitContainer ? 'h-full' : undefined}
            viewportClassName={cn(
              frameless
                ? 'min-h-[340px] rounded-kws-card border-0 bg-[hsl(var(--hall-map-floor))] sm:min-h-[500px]'
                : compact
                  ? 'rounded-kws-card bg-[hsl(var(--hall-map-floor))]'
                  : 'min-h-[340px] rounded-kws-card bg-[hsl(var(--hall-map-floor))] sm:min-h-[480px]',
              viewportClassName,
              fitContainer && '!h-full !min-h-0',
            )}
            compact={compact}
            lockAspectRatio={fitContainer ? false : lockAspectRatio}
            disablePanZoom={disablePanZoom}
            onViewportChange={handleMapViewportChange}
            panPadding={frameless ? 180 : 0}
          >
            {renderedRegions.length === 0 && (
              <img
                src={backgroundImageSrc}
                alt={activeMap.name}
                className={cn('block select-none object-contain', rotateClockwise ? 'absolute left-1/2 top-1/2' : 'h-full w-full')}
                style={rotateClockwise ? {
                  width: `${(mapHeight / mapWidth) * 100}%`,
                  height: `${(mapWidth / mapHeight) * 100}%`,
                  maxWidth: 'none',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                } : undefined}
                draggable={false}
                onError={() => setImageError(true)}
              />
            )}
            {frameless && wallRegions.length > 0 && <HallMap3DWalls
              regions={wallRegions} width={mapWidth} height={mapHeight}
              rotateClockwise={rotateClockwise} onReady={setWalls3DReady}
            />}
            <svg
              data-map-orientation={rotateClockwise ? 'portrait' : 'landscape'}
              data-map-width={mapWidth}
              data-map-height={mapHeight}
              data-map-appearance="white-walls"
              viewBox={`${-4 * mapUnit} ${-4 * mapUnit} ${mapWidth + 8 * mapUnit} ${mapHeight + 8 * mapUnit}`}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id={wallFillId} x1="0" y1="0" x2="0.3" y2="1">
                  <stop offset="0" stopColor="hsl(var(--hall-map-wall-top))" />
                  <stop offset="1" stopColor="hsl(var(--hall-map-wall-bottom))" />
                </linearGradient>
                <filter id={wallShadowId} x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow dx={0.3 * mapUnit} dy={1 * mapUnit} stdDeviation={0.8 * mapUnit} floodColor="#192436" floodOpacity="0.2" />
                </filter>
                <filter id={markerShadowId} x="-40%" y="-40%" width="180%" height="200%">
                  <feDropShadow dx="0" dy={0.3 * mapUnit} stdDeviation={0.35 * mapUnit} floodColor="#192436" floodOpacity="0.18" />
                </filter>
              </defs>
              {(!frameless || !walls3DReady) && <g pointerEvents="none" aria-hidden="true">
                {renderedRegions.map(({ region }) => <polygon key={`depth-${region.id}`}
                  points={polygonToString(region.points_json, mapWidth, mapHeight, rotateClockwise)}
                  transform={`translate(${0.25 * mapUnit} ${1 * mapUnit})`}
                  fill="hsl(var(--hall-map-wall-edge))" filter={`url(#${wallShadowId})`} />)}
              </g>}
              {renderedRegions.map(({ region, sector }) => {
                const logicalSectorKey = getLogicalSectorKey(sector);
                const isSelected = selectedLogicalGroupKeys.has(logicalSectorKey);

                return (
                  <g key={region.id}>
                    <polygon
                      data-sector-region-group={logicalSectorKey}
                      data-selected={isSelected}
                      points={polygonToString(region.points_json, mapWidth, mapHeight, rotateClockwise)}
                      fill={`url(#${wallFillId})`}
                      fillOpacity={1}
                      stroke="hsl(var(--hall-map-wall-edge))"
                      strokeWidth={0.65 / mapScale}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer motion-safe:transition-[fill,fill-opacity] motion-safe:duration-150"
                      style={{
                        // Hit only the actual surface, never a neighbouring sector
                        // through an oversized invisible stroke.
                        pointerEvents: 'fill',
                        fillOpacity: frameless && walls3DReady ? 0 : 1,
                      }}
                      onPointerEnter={event => event.pointerType === 'mouse' && setHoveredSectorKey(logicalSectorKey)}
                      onPointerLeave={() => setHoveredSectorKey((current) => (current === logicalSectorKey ? null : current))}
                      onClick={() => handleSelectSector(sector)}
                    />
                  </g>
                );
              })}
              {/* Keep fine outlines above every surface so neighbouring separators
                  cannot hide an edge. Rounded joins avoid spikes at acute corners. */}
              {renderedRegions.map(({ region, sector }) => {
                const logicalSectorKey = getLogicalSectorKey(sector);
                const isSelected = selectedLogicalGroupKeys.has(logicalSectorKey);
                const isHovered = hoveredSectorKey === logicalSectorKey;
                if (!isSelected && !isHovered) return null;

                return <polygon
                  key={`outline-${region.id}`}
                  data-sector-region-outline={logicalSectorKey}
                  points={polygonToString(region.points_json, mapWidth, mapHeight, rotateClockwise)}
                  fill="none"
                  stroke={isSelected ? '#36B531' : '#192436'}
                  strokeWidth={(isSelected ? 1.5 : 1.25) / mapScale}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={isSelected ? undefined : `${3 / mapScale} ${3 / mapScale}`}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />;
              })}
              {frameless && <g pointerEvents="none" aria-hidden="true">
                {areaLabels.filter(area => selectedGroups.some(group => group.areaSlug === area.slug)).map(area => <text key={area.slug} data-map-area-label={area.slug}
                  x={area.x * mapWidth / 100} y={area.y * mapHeight / 100} textAnchor="middle"
                  fill="#192436" fontWeight="600" fontSize={3.6 * mapUnit}>
                  {rotateClockwise && area.slug === 'lange-platte'
                    ? <><tspan x={area.x * mapWidth / 100}>Lange</tspan><tspan x={area.x * mapWidth / 100} dy={4.4 * mapUnit}>Platte</tspan></>
                    : area.name}
                </text>)}
              </g>}
              {logicalMapGroups.map((group) => {
                const marker = markerLayouts.get(group.key);
                if (!marker) return null;

                const markerSector = group.sectors[0];
                const sectorIds = logicalGroupSectorIds.get(group.key) ?? [];
                const count = boulderSectorReferences
                  ? countActiveBouldersForSectorIds(boulderSectorReferences, sectorIds)
                  : sectorIds.reduce((sum, sectorId) => sum + (countsBySectorId[sectorId] ?? 0), 0);
                const isSelected = selectedLogicalGroupKeys.has(group.key);
                const isHovered = hoveredSectorKey === group.key;
                const isFocused = focusedSectorKey === group.key;
                const markerFill = '#FFFFFF';
                const markerStroke = isSelected ? '#36B531' : isHovered || isFocused ? '#192436' : 'transparent';
                const markerText = '#192436';

                return (
                  <g
                    key={`marker-${group.key}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${resolveSectorArea(markerSector).publicName}, ${count} Boulder filtern`}
                    aria-pressed={isSelected}
                    className="cursor-pointer outline-none"
                    data-sector-marker-group={group.key}
                    onPointerEnter={event => event.pointerType === 'mouse' && setHoveredSectorKey(group.key)}
                    onPointerLeave={() => setHoveredSectorKey((current) => (current === group.key ? null : current))}
                    onFocus={event => setFocusedSectorKey(event.currentTarget.matches(':focus-visible') ? group.key : null)}
                    onBlur={() => setFocusedSectorKey(null)}
                    onClick={event => {
                      if (event.detail > 0) setFocusedSectorKey(null);
                      if (markerSector) handleSelectSector(markerSector);
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && markerSector) {
                        event.preventDefault();
                        setFocusedSectorKey(group.key);
                        handleSelectSector(markerSector);
                      }
                    }}
                  >
                    <rect
                      data-sector-marker={group.key}
                      x={marker.x - marker.width / 2}
                      y={marker.y - marker.height / 2}
                      width={marker.width}
                      height={marker.height}
                      rx={0.62 * mapUnit}
                      fill={markerFill}
                      stroke={markerStroke}
                      strokeWidth={isSelected || isFocused ? 1.5 : 1}
                      vectorEffect="non-scaling-stroke"
                    filter={`url(#${markerShadowId})`}
                    />
                    {isFocused && <rect
                      x={marker.x - marker.width / 2 - 1.1 * mapUnit}
                      y={marker.y - marker.height / 2 - 1.1 * mapUnit}
                      width={marker.width + 2.2 * mapUnit}
                      height={marker.height + 2.2 * mapUnit}
                      rx={0.85 * mapUnit}
                      fill="none" stroke="#192436" strokeWidth={1.5}
                      strokeDasharray="3 2" vectorEffect="non-scaling-stroke" pointerEvents="none"
                    />}
                    <text
                      x={marker.x}
                      textAnchor="middle"
                      fill={markerText}
                      fontWeight="700"
                      style={{ pointerEvents: 'none' }}
                    >
                      <tspan
                        x={marker.x}
                        y={marker.line2 ? marker.y - 1.12 * mapUnit : marker.y + 0.88 * mapUnit}
                        fontSize={(frameless ? 3.45 : marker.compact ? 2.82 : 3.08) * mapUnit}
                        letterSpacing="0.005em"
                      >
                        {marker.line1}
                      </tspan>
                      {marker.line2 ? (
                        <tspan
                          x={marker.x}
                          y={marker.y + 2.18 * mapUnit}
                          fontSize={(frameless ? 2.15 : marker.compact ? 2.28 : 2.48) * mapUnit}
                          fontWeight="700"
                          letterSpacing="0.018em"
                        >
                          {marker.line2}
                        </tspan>
                      ) : null}
                    </text>
                    {isSelected && <g aria-hidden="true" transform={`translate(${marker.x + marker.width / 2 - 1.5 * mapUnit} ${marker.y - marker.height / 2 - 1.5 * mapUnit})`}>
                      <rect width={4 * mapUnit} height={4 * mapUnit} rx={0.6 * mapUnit} fill="#192436" />
                      <path d={`M ${0.8 * mapUnit} ${2 * mapUnit} l ${0.8 * mapUnit} ${0.8 * mapUnit} l ${1.6 * mapUnit} ${-1.6 * mapUnit}`} fill="none" stroke="white" strokeWidth={0.55 * mapUnit} strokeLinecap="round" strokeLinejoin="round" />
                    </g>}
                  </g>
                );
              })}
            </svg>
          </InteractiveMapStage>
        )}

        {frameless && selectedGroups.length > 0 && !imageError && areaLabels.length === 0 ? (
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2"
            aria-label="Hallenbereiche"
          >
            {getSectorAreas(sectors).filter((area) => selectedGroups.some(group => group.areaSlug === area.slug)).map((area) => {
              return (
                <div key={area.slug} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-[#192436]/10"
                    style={{ backgroundColor: 'white' }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-semibold leading-none text-[#192436]/70">
                    {area.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {!imageError && renderedRegions.length > 0 && (!frameless || selectedGroups.length > 0) && <div className={fitContainer ? 'flex shrink-0 items-center gap-2' : 'space-y-2'}>
        <div className={fitContainer ? 'order-2 shrink-0' : 'flex min-h-11 items-center justify-between gap-3'}>
          <p role="status" aria-live="polite" className={cn('text-xs font-medium text-foreground', fitContainer && 'sr-only')}>
            {selectedGroups.length ? <>{selectedGroups.length} {selectedGroups.length === 1 ? 'Teilbereich' : 'Teilbereiche'} ausgewählt<span className="sr-only">: {selectedGroups.map(group => resolveSectorArea(group.sectors[0]).publicName).join(', ')}</span></> : 'Ganze Halle'}
          </p>
          {selectedGroups.length > 0 && <Button variant="ghost" size="sm" aria-label="Sektorauswahl zurücksetzen" onClick={onClearSector} className="shrink-0">
            <RotateCcw className="h-4 w-4" /><span>Zurücksetzen</span>
          </Button>}
        </div>
        {selectedGroups.length > 0 && <div className={fitContainer ? 'flex min-w-0 flex-1 gap-2 overflow-x-auto py-1' : 'flex flex-wrap gap-2'}>
          {selectedGroups.map(group => {
            const name = resolveSectorArea(group.sectors[0]).publicName;
            return <button key={group.key} type="button" aria-label={`${name} abwählen`} onClick={() => handleDeselectGroup(group)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-kws-control bg-white px-3 text-xs font-semibold text-foreground shadow-soft hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Check className="h-4 w-4 text-primary-ink" aria-hidden="true" />{name}<X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>;
          })}
        </div>}
      </div>}

      {frameless && onClose && !imageError && renderedRegions.length > 0 && (
        <Button className="w-full shrink-0" onClick={onClose}>{fitContainer && selectedGroups.length === 0 ? 'Alle Boulder anzeigen' : 'Boulder anzeigen'}</Button>
      )}

      {renderedRegions.length === 0 && !imageError && !frameless && (
        <Alert className="rounded-kws-card border-[#E7F7E9] bg-[#F8FCF9]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Keine Teilflächen vorhanden</AlertTitle>
          <AlertDescription>Die Hallenkarte ist aktiv, aber es wurden noch keine klickbaren Teilbereiche hinterlegt.</AlertDescription>
        </Alert>
      )}

      {renderedRegions.length > 0 && !compact && !frameless && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#13112B]/45">Teilbereich direkt wählen</div>
          <div className="flex flex-wrap gap-2">
            {logicalMapGroups.map(group => {
              const sector = group.sectors[0];
              const active = selectedLogicalGroupKeys.has(group.key);
              const count = boulderSectorReferences
                ? countActiveBouldersForSectorIds(boulderSectorReferences, group.sectors.map(member => member.id))
                : group.sectors.reduce((sum, member) => sum + (countsBySectorId[member.id] ?? 0), 0);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => handleSelectSector(sector)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-kws-control px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-secondary text-foreground hover:bg-primary/5',
                  )}
                >
                  <Check className={cn('h-4 w-4 text-primary-ink', !active && 'invisible')} aria-hidden="true" />
                  <span className="text-sm font-semibold">{resolveSectorArea(sector).publicName}</span>
                  <span className="rounded-kws-badge border border-[#DFE7E1] bg-[#F7FAF8] px-2.5 py-1 text-xs font-semibold text-[#13112B]/72">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
