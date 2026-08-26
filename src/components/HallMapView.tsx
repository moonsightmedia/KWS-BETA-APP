import { useMemo, useState } from 'react';
import { AlertCircle, ImageOff, MapPinned, RotateCcw, X } from 'lucide-react';

import { InteractiveMapStage } from '@/components/InteractiveMapStage';
import hallMapBase from '@/assets/boulderkarte-original.png';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useActiveHallMap, useSectorMapRegions } from '@/hooks/useHallMaps';
import {
  countActiveBouldersForSectorIds,
  getSectorAreaPalette,
  resolveSectorArea,
  SECTOR_AREAS,
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
    ? 7.2 * mapUnit
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
}: HallMapViewProps) {
  const [imageError, setImageError] = useState(false);
  const [hoveredSectorKey, setHoveredSectorKey] = useState<string | null>(null);
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
    if (selectedSectorNames?.length) {
      return new Set(selectedSectorNames.filter((name) => name && name !== 'all'));
    }

    return selectedSectorName && selectedSectorName !== 'all'
      ? new Set([selectedSectorName])
      : new Set<string>();
  }, [selectedSectorName, selectedSectorNames]);

  const selectedSectorIdSet = useMemo(() => {
    const values = selectedSectorIds?.length
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
    selectedSectorSet.forEach((sectorName) => {
      const key = logicalGroupKeysBySectorName.get(sectorName);
      if (key) keys.add(key);
    });
    return keys;
  }, [logicalGroupKeysBySectorId, logicalGroupKeysBySectorName, selectedSectorIdSet, selectedSectorSet]);

  const singleSelectedSectorName = selectedSectorSet.size === 1 ? Array.from(selectedSectorSet)[0] : null;
  const singleSelectedSectorId = selectedSectorIdSet.size === 1 ? Array.from(selectedSectorIdSet)[0] : null;
  const selectedSector = singleSelectedSectorId
    ? sectors.find((sector) => sector.id === singleSelectedSectorId) ?? null
    : singleSelectedSectorName
      ? sectors.find((sector) => sector.name === singleSelectedSectorName) ?? null
      : null;
  const selectedLogicalGroupKey = selectedSector
    ? logicalGroupKeysBySectorId.get(selectedSector.id) ?? logicalGroupKeysBySectorName.get(selectedSector.name)
    : undefined;
  const selectedCount = selectedLogicalGroupKey
    ? boulderSectorReferences
      ? countActiveBouldersForSectorIds(
          boulderSectorReferences,
          logicalGroupSectorIds.get(selectedLogicalGroupKey) ?? [],
        )
      : (logicalGroupSectorIds.get(selectedLogicalGroupKey) ?? [])
          .reduce((sum, sectorId) => sum + (countsBySectorId[sectorId] ?? 0), 0)
    : selectedSector ? countsBySectorId[selectedSector.id] ?? 0 : 0;
  const mapWidth = activeMap?.width ?? 100;
  const mapHeight = activeMap?.height ?? 100;
  const mapUnit = Math.max(Math.min(mapWidth, mapHeight) / 100, 1);
  const backgroundImageSrc = frameless
    ? hallMapBase
    : (activeMap?.image_url || hallMapBase);

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

      return {
        key: group.key,
        marker: buildMarkerLayout({
          anchorX: group.anchorX,
          anchorY: group.anchorY,
          line1: frameless
            ? group.subareaCode ?? group.areaName ?? group.sectors[0]?.name ?? 'Bereich'
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
  }, [boulderSectorReferences, countsBySectorId, frameless, logicalGroupSectorIds, logicalMapGroups, mapHeight, mapUnit, mapWidth, showCounts]);

  const visibleAreaSlugs = useMemo(
    () => new Set(logicalMapGroups.map((group) => group.areaSlug).filter(Boolean)),
    [logicalMapGroups],
  );

  const handleSelectSector = (sector: Sector) => {
    onSelectSectorId?.(sector.id);
    onSelectSector?.(sector.name);
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
    <div className={cn('w-full max-w-full overflow-hidden', compact ? 'space-y-3' : 'space-y-4')}>
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
              {selectedSectorSet.size + selectedSectorIdSet.size > 1
                ? `${selectedSectorSet.size + selectedSectorIdSet.size} Teilbereiche ausgewählt`
                : singleSelectedSectorName
                  ? singleSelectedSectorName
                  : singleSelectedSectorId
                    ? selectedSector?.name
                  : `${totalVisibleBoulders} Boulder sichtbar`}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {(selectedSectorSet.size > 0 || selectedSectorIdSet.size > 0) && (
              <Button variant="outline" size="sm" onClick={onClearSector} className="rounded-kws-control border-[#DCE5DE] text-[#13112B]">
                <RotateCcw className="mr-2 h-4 w-4" />
                Filter zurücksetzen
              </Button>
            )}
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
          !frameless && (compact ? 'p-2' : 'p-2.5 sm:p-3')
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
            viewportClassName={cn(
              frameless
                ? 'min-h-[340px] rounded-kws-card border-0 bg-[#FBFDF9] shadow-[0_8px_26px_rgba(25,36,54,0.08)] sm:min-h-[500px]'
                : compact
                  ? 'rounded-kws-card bg-white'
                  : 'min-h-[340px] rounded-kws-card bg-white sm:min-h-[480px]',
              viewportClassName,
            )}
            compact={compact}
            lockAspectRatio={lockAspectRatio}
            disablePanZoom={disablePanZoom}
            panPadding={frameless ? 180 : 0}
          >
            {!frameless && (
              <img
                src={backgroundImageSrc}
                alt={activeMap.name}
                className="block h-full w-full select-none object-contain"
                draggable={false}
                onError={() => setImageError(true)}
              />
            )}
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <filter id="sector-region-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy={0.2 * mapUnit} stdDeviation={0.34 * mapUnit} floodColor="#192436" floodOpacity="0.09" />
                </filter>
              </defs>
              {renderedRegions.map(({ region, sector }) => {
                const logicalSectorKey = getLogicalSectorKey(sector);
                const isSelected = selectedLogicalGroupKeys.has(logicalSectorKey);
                const isHovered = hoveredSectorKey === logicalSectorKey;
                const isHighlighted = isSelected || isHovered;
                const resolvedSector = resolveSectorArea(sector);
                const areaPalette = getSectorAreaPalette(resolvedSector.area?.slug);
                const regionFill = isHighlighted
                  ? areaPalette.regionFillHighlighted
                  : areaPalette.regionFill;

                return (
                  <g key={region.id}>
                    <polygon
                      points={polygonToString(region.points_json, mapWidth, mapHeight)}
                      fill="transparent"
                      stroke="rgba(17,24,39,0.001)"
                      strokeWidth={10 * mapUnit}
                      style={{ pointerEvents: 'stroke' }}
                      onMouseEnter={() => setHoveredSectorKey(logicalSectorKey)}
                      onMouseLeave={() => setHoveredSectorKey((current) => (current === logicalSectorKey ? null : current))}
                      onClick={() => handleSelectSector(sector)}
                    />
                    <polygon
                      points={polygonToString(region.points_json, mapWidth, mapHeight)}
                      fill={regionFill}
                      stroke={areaPalette.regionStroke}
                      filter={!frameless && !isSelected ? 'url(#sector-region-shadow)' : undefined}
                      strokeWidth={1.02 * mapUnit}
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        transition: 'fill 160ms ease',
                      }}
                      onMouseEnter={() => setHoveredSectorKey(logicalSectorKey)}
                      onMouseLeave={() => setHoveredSectorKey((current) => (current === logicalSectorKey ? null : current))}
                      onClick={() => handleSelectSector(sector)}
                    />
                  </g>
                );
              })}
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
                const isHighlighted = isSelected || isHovered;
                const areaPalette = getSectorAreaPalette(group.areaSlug);
                const markerFill = isSelected
                  ? areaPalette.tagFill
                  : isHighlighted
                    ? areaPalette.tagFillHighlighted
                    : areaPalette.tagFill;
                const markerStroke = isSelected
                  ? areaPalette.tagFill
                  : isHighlighted
                    ? areaPalette.tagFillHighlighted
                    : areaPalette.tagStroke;
                const markerText = isSelected
                  ? areaPalette.tagFillHighlighted
                  : isHighlighted
                    ? areaPalette.tagTextHighlighted
                    : areaPalette.tagText;

                return (
                  <g
                    key={`marker-${group.key}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${group.areaName ?? markerSector?.name ?? 'Teilbereich'}${group.subareaCode ? ` ${group.subareaCode}` : ''}, ${count} Boulder filtern`}
                    className="cursor-pointer outline-none"
                    data-sector-marker-group={group.key}
                    onMouseEnter={() => setHoveredSectorKey(group.key)}
                    onMouseLeave={() => setHoveredSectorKey((current) => (current === group.key ? null : current))}
                    onFocus={() => setHoveredSectorKey(group.key)}
                    onBlur={() => setHoveredSectorKey((current) => (current === group.key ? null : current))}
                    onClick={() => markerSector && handleSelectSector(markerSector)}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && markerSector) {
                        event.preventDefault();
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
                      strokeWidth={0.34 * mapUnit}
                      style={{ filter: 'drop-shadow(0 0.5px 1px rgba(25,36,54,0.14))' }}
                    />
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
                  </g>
                );
              })}
            </svg>
          </InteractiveMapStage>
        )}

        {frameless && !imageError ? (
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2"
            aria-label="Farblegende der Hallenbereiche"
          >
            {SECTOR_AREAS.filter((area) => visibleAreaSlugs.has(area.slug)).map((area) => {
              const palette = getSectorAreaPalette(area.slug);
              return (
                <div key={area.slug} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-[#192436]/10"
                    style={{ backgroundColor: palette.regionFill }}
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

      {selectedSector && !frameless && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-kws-card border border-[#DDE5DF] bg-white px-4 py-3',
            compact && 'rounded-kws-control px-3 py-2.5',
          )}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#13112B]/45">Ausgewählter Teilbereich</div>
            <div className="mt-1 truncate text-sm font-semibold text-[#13112B]">
              {selectedSector.name} <span className="text-[#13112B]/52">({selectedCount} Boulder)</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearSector} className="rounded-kws-control text-[#13112B]/70 hover:bg-[#F3F6F3]">
            Zurücksetzen
          </Button>
        </div>
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
            {renderedRegions.map(({ region, sector }) => {
              const active = selectedSectorIdSet.has(sector.id) || selectedSectorSet.has(sector.name);
              const count = countsBySectorId[sector.id] ?? 0;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleSelectSector(sector)}
                  className={cn(
                    'inline-flex min-h-12 items-center gap-3 rounded-kws-control border px-4 py-3 text-left transition',
                    active
                      ? 'border-[#36B531] bg-[#E8F7EA] text-[#17641d] shadow-[0_10px_24px_rgba(54,181,49,0.14)]'
                      : 'border-[#E5EBE7] bg-white text-[#13112B] hover:border-[#BCDDBF] hover:bg-[#F9FCF9]',
                  )}
                >
                  <span className="text-sm font-semibold">{sector.name}</span>
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
