import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgePlus,
  Check,
  Image as ImageIcon,
  Loader2,
  MapPinned,
  PencilLine,
  Save,
  Search,
  Settings,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { resolveHallMapSource } from '@/lib/hallMapSource';
import { insertPolygonPoint } from '@/lib/hallMapGeometry';
import { getAdminSectorLabel, getSectorAreaPalette, getSectorAreas, groupAdminSectors, groupAdminSubareas, resolveSectorArea } from '@/lib/sectorAreas';
import { HallMapSettingsDialog } from './HallMapSettingsDialog';
import { kwsSurfaceClassName } from '@/components/ui/kws-surface';
import hallMapRegionProposalsJson from '@/data/hallMapRegionProposals.json?raw';
import { InteractiveMapStage } from '@/components/InteractiveMapStage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import {
  useActiveHallMap,
  useCreateHallMap,
  useCreateSectorMapRegion,
  useDeleteHallMap,
  useDeleteSectorMapRegion,
  useHallMaps,
  useSectorMapRegions,
  useUpdateHallMap,
  useUpdateSectorMapRegion,
} from '@/hooks/useHallMaps';
import { useSectors } from '@/hooks/useSectors';
import { deleteHallMapImage, uploadHallMapImage } from '@/integrations/supabase/storage';
import { cn } from '@/lib/utils';
import type { MapPoint, SectorMapRegion } from '@/types/hallMap';

type EditorMode = 'idle' | 'create' | 'edit';

type HallMapRegionProposal = {
  id: string;
  label: string;
  originalIndex: number;
  sourceFill: string;
  surfaceRole: 'wall' | 'gap';
  pointCount: number;
  areaPx: number;
  centroid: MapPoint;
  label_x: number;
  label_y: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  points_json: MapPoint[];
};

type DragState =
  | { type: 'vertex'; index: number }
  | { type: 'label' }
  | null;

const HALL_MAP_REGION_PROPOSALS: HallMapRegionProposal[] = (() => {
  try {
    const parsed = JSON.parse(hallMapRegionProposalsJson) as { proposals?: HallMapRegionProposal[] };
    return Array.isArray(parsed.proposals) ? parsed.proposals : [];
  } catch (error) {
    console.error('[HallMapManagement] Failed to parse hall map region proposals:', error);
    return [];
  }
})();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}

function normalizePoint(point: MapPoint): MapPoint {
  return {
    x: roundPercent(clamp(point.x, 0, 100)),
    y: roundPercent(clamp(point.y, 0, 100)),
  };
}

function normalizePoints(points: MapPoint[]) {
  return points.map(normalizePoint);
}

function pointsEqual(left: MapPoint[], right: MapPoint[]) {
  if (left.length !== right.length) return false;

  return left.every((point, index) => {
    const other = right[index];
    return Math.abs(point.x - other.x) < 0.01 && Math.abs(point.y - other.y) < 0.01;
  });
}

function pointEqual(left: MapPoint | null, right: MapPoint | null) {
  if (!left && !right) return true;
  if (!left || !right) return false;

  return Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01;
}

function percentToAbsolute(point: MapPoint, width: number, height: number) {
  return {
    x: (point.x / 100) * width,
    y: (point.y / 100) * height,
  };
}

function absoluteToPercent(point: { x: number; y: number }, width: number, height: number) {
  return normalizePoint({
    x: (point.x / width) * 100,
    y: (point.y / height) * 100,
  });
}

function polygonToString(points: MapPoint[], width: number, height: number) {
  return points
    .map((point) => {
      const absolute = percentToAbsolute(point, width, height);
      return `${absolute.x},${absolute.y}`;
    })
    .join(' ');
}

function pointInPolygon(point: MapPoint, polygon: MapPoint[]) {
  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];

    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || Number.EPSILON) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getPolygonCentroid(points: MapPoint[]) {
  if (!points.length) {
    return { x: 50, y: 50 };
  }

  if (points.length < 3) {
    const total = points.reduce(
      (accumulator, point) => ({
        x: accumulator.x + point.x,
        y: accumulator.y + point.y,
      }),
      { x: 0, y: 0 },
    );

    return {
      x: total.x / points.length,
      y: total.y / points.length,
    };
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

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
  }

  return {
    x: centroidX / (6 * area),
    y: centroidY / (6 * area),
  };
}

function getRegionLabelPoint(region: SectorMapRegion) {
  if (region.label_x !== null && region.label_y !== null) {
    return { x: region.label_x, y: region.label_y };
  }

  return getPolygonCentroid(region.points_json);
}

async function getImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    image.src = src;
  });
}

function getFriendlyHallMapError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (/duplicate key/i.test(message) || /unique/i.test(message)) {
    return 'Für diesen Sektor existiert auf der Hallenkarte bereits eine Fläche.';
  }

  return message || fallback;
}

export const HallMapManagement = () => {
  const { user, session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;
  const queriesEnabled = !authLoading && !!user;
  const { data: hallMaps = [], isLoading: isLoadingHallMaps, error: hallMapsError } = useHallMaps(accessToken, queriesEnabled);
  const { data: activeHallMap, error: activeHallMapError } = useActiveHallMap(accessToken, queriesEnabled);
  const { data: sectors = [], isLoading: isLoadingSectors, error: sectorsError } = useSectors(queriesEnabled);
  const managedHallMap = activeHallMap ?? hallMaps[0] ?? null;
  const managedHallMapId = managedHallMap?.id ?? null;
  const {
    data: regions = [],
    isLoading: isLoadingRegions,
    error: regionsError,
  } = useSectorMapRegions(managedHallMapId, accessToken, queriesEnabled && !!managedHallMapId);
  const createHallMap = useCreateHallMap(accessToken);
  const updateHallMap = useUpdateHallMap(accessToken);
  const deleteHallMap = useDeleteHallMap(accessToken);
  const createSectorRegion = useCreateSectorMapRegion(accessToken);
  const updateSectorRegion = useUpdateSectorMapRegion(accessToken);
  const deleteSectorRegion = useDeleteSectorMapRegion(accessToken);
  const isBusyRegionMutation = createSectorRegion.isPending || updateSectorRegion.isPending || deleteSectorRegion.isPending;

  const [viewportWidth, setViewportWidth] = useState(1280);
  const isMobile = viewportWidth < 1024;
  const [hallMapName, setHallMapName] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavingHallMap, setIsSavingHallMap] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('idle');
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<MapPoint[]>([]);
  const [draftLabel, setDraftLabel] = useState<MapPoint | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [appendPointMode, setAppendPointMode] = useState(false);
  const [isSectorSheetOpen, setIsSectorSheetOpen] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDeleteRegionDialog, setShowDeleteRegionDialog] = useState(false);
  const [showDeleteHallMapDialog, setShowDeleteHallMapDialog] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMapImage, setShowMapImage] = useState(false);
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [mapSaveError, setMapSaveError] = useState<string | null>(null);
  const [regionSaveError, setRegionSaveError] = useState<string | null>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const [showProposalOverlay, setShowProposalOverlay] = useState(true);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [hoveredProposalId, setHoveredProposalId] = useState<string | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const suppressMapClick = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setHallMapName(managedHallMap?.name ?? '');
    setSelectedImageFile(null);
    setImagePreview(managedHallMap?.image_url ?? null);
    setUploadProgress(0);
    setImageError(false);
    setSelectedSectorId(null);
    setEditorMode('idle');
    setEditingRegionId(null);
    setDraftPoints([]);
    setDraftLabel(null);
    setSelectedVertexIndex(null);
    setAppendPointMode(false);
    setShowDeleteRegionDialog(false);
    setSelectedProposalId(null);
    setHoveredProposalId(null);
  // Draft fields reset only when switching maps, not when a query refreshes the same map.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedHallMapId]);

  const regionsBySectorId = useMemo(() => new Map(regions.map((region) => [region.sector_id, region])), [regions]);

  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId) ?? null,
    [selectedSectorId, sectors],
  );

  const selectedRegion = useMemo(() => {
    if (!selectedSectorId) return null;
    return regionsBySectorId.get(selectedSectorId) ?? null;
  }, [regionsBySectorId, selectedSectorId]);

  const sectorGroups = useMemo(() => groupAdminSectors(sectors, sectorSearch), [sectorSearch, sectors]);

  const assignedSectorCount = useMemo(
    () => sectors.filter((sector) => regionsBySectorId.has(sector.id)).length,
    [regionsBySectorId, sectors],
  );
  const missingSectorCount = sectors.length - assignedSectorCount;

  const occupiedProposalIds = useMemo(() => {
    const occupied = new Set<string>();

    for (const proposal of HALL_MAP_REGION_PROPOSALS) {
      const proposalCentroid = proposal.centroid;
      const proposalLabelPoint = { x: proposal.label_x, y: proposal.label_y };

      const matchesExistingRegion = regions.some((region) => {
        const regionCentroid = getRegionLabelPoint(region);

        return (
          pointInPolygon(proposalCentroid, region.points_json) ||
          pointInPolygon(proposalLabelPoint, region.points_json) ||
          pointInPolygon(regionCentroid, proposal.points_json)
        );
      });

      if (matchesExistingRegion) {
        occupied.add(proposal.id);
      }
    }

    return occupied;
  }, [regions]);

  const availableProposals = useMemo(
    () =>
      HALL_MAP_REGION_PROPOSALS.filter(
        (proposal) => proposal.surfaceRole === 'wall' && !occupiedProposalIds.has(proposal.id),
      ),
    [occupiedProposalIds],
  );

  const selectedProposal = useMemo(
    () => availableProposals.find((proposal) => proposal.id === selectedProposalId) ?? null,
    [availableProposals, selectedProposalId],
  );

  // Keep editing the saved coordinate system until an image replacement is saved.
  // The pending replacement is previewed separately in Kartendaten.
  const { src: displayedMapImageSrc, width: mapWidth, height: mapHeight, supportsProposals } = resolveHallMapSource(managedHallMap);
  useEffect(() => setImageError(false), [displayedMapImageSrc]);

  const normalizedDraftPoints = useMemo(() => normalizePoints(draftPoints), [draftPoints]);
  const normalizedDraftLabel = useMemo(() => (draftLabel ? normalizePoint(draftLabel) : null), [draftLabel]);
  const originalDraftPoints = useMemo(
    () => (selectedRegion ? normalizePoints(selectedRegion.points_json) : []),
    [selectedRegion],
  );
  const originalDraftLabel = useMemo(
    () => (selectedRegion ? normalizePoint(getRegionLabelPoint(selectedRegion)) : null),
    [selectedRegion],
  );

  const isDraftDirty = useMemo(() => {
    if (editorMode === 'idle' || !selectedSectorId) {
      return false;
    }

    if (!selectedRegion) {
      return normalizedDraftPoints.length > 0 || normalizedDraftLabel !== null;
    }

    return (
      !pointsEqual(normalizedDraftPoints, originalDraftPoints) ||
      !pointEqual(normalizedDraftLabel, originalDraftLabel)
    );
  }, [
    editorMode,
    normalizedDraftLabel,
    normalizedDraftPoints,
    originalDraftLabel,
    originalDraftPoints,
    selectedRegion,
    selectedSectorId,
  ]);

  const clearSelection = useCallback(() => {
    setSelectedSectorId(null);
    setEditorMode('idle');
    setEditingRegionId(null);
    setDraftPoints([]);
    setDraftLabel(null);
    setSelectedVertexIndex(null);
    setAppendPointMode(false);
    setDragState(null);
    setSelectedProposalId(null);
    setHoveredProposalId(null);
  }, []);

  const requestDraftReset = useCallback(
    (nextAction: () => void) => {
      if (isDraftDirty) {
        discardActionRef.current = nextAction;
        setShowDiscardDialog(true);
        return;
      }

      nextAction();
    },
    [isDraftDirty],
  );

  const openSectorEditor = useCallback(
    (sectorId: string) => {
      if (isBusyRegionMutation) return;
      if (sectorId === selectedSectorId) { setIsSectorSheetOpen(false); return; }
      requestDraftReset(() => {
        setRegionSaveError(null);
        const region = regionsBySectorId.get(sectorId);

        setSelectedSectorId(sectorId);
        setSelectedVertexIndex(null);
        setAppendPointMode(false);
        setDragState(null);
        setSelectedProposalId(null);
        setHoveredProposalId(null);

        if (region) {
          setEditorMode('edit');
          setEditingRegionId(region.id);
          setDraftPoints(region.points_json);
          setDraftLabel(getRegionLabelPoint(region));
          setShowProposalOverlay(false);
        } else {
          setEditorMode('create');
          setEditingRegionId(null);
          setDraftPoints([]);
          setDraftLabel(null);
          setShowProposalOverlay(true);
        }

        setIsSectorSheetOpen(false);
      });
    },
    [isBusyRegionMutation, regionsBySectorId, requestDraftReset, selectedSectorId],
  );

  const clientToPercentPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;

      // The responsive stage can letterbox the SVG. Convert through its actual
      // screen transform so taps and drags remain aligned with the saved map.
      const transform = svg.getScreenCTM();
      if (!transform) return null;
      const point = new DOMPoint(clientX, clientY).matrixTransform(transform.inverse());
      if (point.x < 0 || point.y < 0 || point.x > mapWidth || point.y > mapHeight) return null;
      return absoluteToPercent(point, mapWidth, mapHeight);
    },
    [mapHeight, mapWidth],
  );

  useEffect(() => {
    if (!dragState || isBusyRegionMutation) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextPoint = clientToPercentPoint(event.clientX, event.clientY);
      if (!nextPoint) return;
      suppressMapClick.current = true;

      if (dragState.type === 'label') {
        setDraftLabel(nextPoint);
        return;
      }

      setDraftPoints((current) =>
        current.map((point, index) => (index === dragState.index ? nextPoint : point)),
      );
    };

    const handlePointerEnd = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [clientToPercentPoint, dragState, isBusyRegionMutation]);

  useEffect(() => {
    if (selectedProposalId && !availableProposals.some((proposal) => proposal.id === selectedProposalId)) {
      setSelectedProposalId(null);
    }
  }, [availableProposals, selectedProposalId]);

  useEffect(() => {
    if (hoveredProposalId && !availableProposals.some((proposal) => proposal.id === hoveredProposalId)) {
      setHoveredProposalId(null);
    }
  }, [availableProposals, hoveredProposalId]);

  const handleMapOverlayClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!selectedSectorId || editorMode === 'idle' || isBusyRegionMutation) return;
      if (editorMode === 'edit' && !appendPointMode) return;

      const nextPoint = clientToPercentPoint(event.clientX, event.clientY);
      if (!nextPoint) return;

      setDraftPoints((current) => {
        const nextPoints = editorMode === 'edit' ? insertPolygonPoint(current, nextPoint, mapWidth, mapHeight) : [...current, nextPoint];
        if (nextPoints.length >= 3 && !draftLabel) {
          setDraftLabel(getPolygonCentroid(nextPoints));
        }
        return nextPoints;
      });
      setAppendPointMode(false);
      setSelectedVertexIndex(null);
    },
    [appendPointMode, clientToPercentPoint, draftLabel, editorMode, selectedSectorId, isBusyRegionMutation, mapWidth, mapHeight],
  );

  const handleStartVertexDrag = useCallback(
    (index: number, event: React.PointerEvent<SVGCircleElement>) => {
      if (isBusyRegionMutation) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedVertexIndex(index);
      setDragState({ type: 'vertex', index });
    },
    [isBusyRegionMutation],
  );

  const handleStartLabelDrag = useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    if (isBusyRegionMutation) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedVertexIndex(null);
    setDragState({ type: 'label' });
  }, [isBusyRegionMutation]);

  const validateDraft = useCallback(() => {
    if (!selectedSectorId) {
      return 'Bitte zuerst einen Sektor auswählen.';
    }

    if (normalizedDraftPoints.length < 3) {
      return 'Eine Sektorfläche braucht mindestens drei Punkte.';
    }

    const invalidPoint = normalizedDraftPoints.some(
      (point) =>
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        point.x < 0 ||
        point.x > 100 ||
        point.y < 0 ||
        point.y > 100,
    );

    if (invalidPoint) {
      return 'Alle Polygonpunkte müssen innerhalb der Karte liegen.';
    }

    const labelPoint = normalizedDraftLabel ?? getPolygonCentroid(normalizedDraftPoints);
    if (
      !Number.isFinite(labelPoint.x) ||
      !Number.isFinite(labelPoint.y) ||
      labelPoint.x < 0 ||
      labelPoint.x > 100 ||
      labelPoint.y < 0 ||
      labelPoint.y > 100
    ) {
      return 'Die Label-Position muss innerhalb der Karte liegen.';
    }

    return null;
  }, [normalizedDraftLabel, normalizedDraftPoints, selectedSectorId]);

  const handleSaveHallMap = useCallback(async () => {
    if (isSavingHallMap || isDraftDirty) return;
    const trimmedName = hallMapName.trim();
    if (!trimmedName) {
      toast.error('Bitte vergib einen Namen für die Hallenkarte.');
      return;
    }

    if (!managedHallMap && !selectedImageFile) {
      toast.error('Bitte lade zuerst ein Kartenbild hoch.');
      return;
    }

    setIsSavingHallMap(true);
    setMapSaveError(null);
    setUploadProgress(0);

    let uploadedImageUrl = managedHallMap?.image_url ?? null;
    const previousImageUrl = managedHallMap?.image_url ?? null;
    const targetHallMapId = managedHallMap?.id ?? crypto.randomUUID();

    try {
      if (selectedImageFile) {
        uploadedImageUrl = await uploadHallMapImage(selectedImageFile, targetHallMapId, setUploadProgress);
      }

      if (!uploadedImageUrl) {
        throw new Error('Es ist keine Kartenbild-URL vorhanden.');
      }

      // Renaming a map must not require its image to be reachable or change its geometry.
      const dimensions = selectedImageFile || !managedHallMap
        ? await getImageDimensions(uploadedImageUrl)
        : { width: managedHallMap.width, height: managedHallMap.height };

      if (managedHallMap) {
        await updateHallMap.mutateAsync({
          id: managedHallMap.id,
          name: trimmedName,
          image_url: uploadedImageUrl,
          width: dimensions.width,
          height: dimensions.height,
          is_active: true,
        });

        if (selectedImageFile && previousImageUrl && previousImageUrl !== uploadedImageUrl) {
          deleteHallMapImage(previousImageUrl).catch((error) => {
            console.error('[HallMapManagement] Failed to delete previous hall map image:', error);
          });
        }
      } else {
        await createHallMap.mutateAsync({
          id: targetHallMapId,
          name: trimmedName,
          image_url: uploadedImageUrl,
          width: dimensions.width,
          height: dimensions.height,
          is_active: true,
        });
      }

      setSelectedImageFile(null);
      setImagePreview(uploadedImageUrl);
      setUploadProgress(0);
      setShowMapSettings(false);
      toast.success(managedHallMap ? 'Hallenkarte aktualisiert.' : 'Hallenkarte angelegt.');
    } catch (error) {
      // A failed acknowledgement may still have created the map. Never remove
      // its uploaded image until the persisted state has been reconciled.

      const message = getFriendlyHallMapError(error, 'Hallenkarte konnte nicht gespeichert werden.');
      setMapSaveError(message);
      toast.error(message);
    } finally {
      setIsSavingHallMap(false);
      setUploadProgress(0);
    }
  }, [createHallMap, hallMapName, managedHallMap, selectedImageFile, updateHallMap, isSavingHallMap, isDraftDirty]);

  const handleDeleteHallMap = useCallback(async () => {
    if (!managedHallMap) return;

    try {
      await deleteHallMap.mutateAsync(managedHallMap.id);
      if (managedHallMap.image_url) {
        deleteHallMapImage(managedHallMap.image_url).catch((error) => {
          console.error('[HallMapManagement] Failed to cleanup hall map image after delete:', error);
      toast.warning('Die Hallenkarte wurde gelöscht, das Kartenbild konnte aber nicht automatisch entfernt werden.');
        });
      }
      clearSelection();
      setShowDeleteHallMapDialog(false);
      setHallMapName('');
      setImagePreview(null);
      setSelectedImageFile(null);
      setShowMapSettings(false);
    } catch (error) {
      toast.error(getFriendlyHallMapError(error, 'Hallenkarte konnte nicht gelöscht werden.'));
    }
  }, [clearSelection, deleteHallMap, managedHallMap]);

  const handleSaveRegion = useCallback(async () => {
    if (!managedHallMap || !selectedSectorId || isBusyRegionMutation) return;
    setRegionSaveError(null);

    const validationError = validateDraft();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = {
      hall_map_id: managedHallMap.id,
      sector_id: selectedSectorId,
      shape_type: 'polygon' as const,
      points_json: normalizedDraftPoints,
      label_x: (normalizedDraftLabel ?? getPolygonCentroid(normalizedDraftPoints)).x,
      label_y: (normalizedDraftLabel ?? getPolygonCentroid(normalizedDraftPoints)).y,
      z_index: selectedRegion?.z_index ?? regions.length,
    };

    try {
      const nextRegion = editingRegionId
        ? await updateSectorRegion.mutateAsync({ id: editingRegionId, ...payload })
        : await createSectorRegion.mutateAsync(payload);

      setEditorMode('edit');
      setEditingRegionId(nextRegion.id);
      setDraftPoints(nextRegion.points_json);
      setDraftLabel(getRegionLabelPoint(nextRegion));
      setSelectedVertexIndex(null);
      setAppendPointMode(false);
      toast.success('Sektorfläche gespeichert.');
    } catch (error) {
      const message = getFriendlyHallMapError(error, 'Sektorfläche konnte nicht gespeichert werden.');
      setRegionSaveError(message);
      toast.error(message);
    }
  }, [
    createSectorRegion,
    editingRegionId,
    managedHallMap,
    normalizedDraftLabel,
    normalizedDraftPoints,
    regions.length,
    selectedRegion?.z_index,
    selectedSectorId,
    updateSectorRegion,
    validateDraft,
    isBusyRegionMutation,
  ]);

  const handleDeleteRegion = useCallback(async () => {
    if (!managedHallMap || !editingRegionId) return;

    try {
      await deleteSectorRegion.mutateAsync({
        id: editingRegionId,
        hallMapId: managedHallMap.id,
      });

      setShowDeleteRegionDialog(false);
      clearSelection();
    } catch (error) {
      toast.error(getFriendlyHallMapError(error, 'Sektorfläche konnte nicht gelöscht werden.'));
    }
  }, [clearSelection, deleteSectorRegion, editingRegionId, managedHallMap]);

  const removeLastPoint = useCallback(() => {
    setDraftPoints((current) => current.slice(0, -1));
    setSelectedVertexIndex(null);
  }, []);

  const removeSelectedVertex = useCallback(() => {
    if (selectedVertexIndex === null) return;
    if (draftPoints.length <= 3) {
      toast.error('Mindestens drei Punkte müssen erhalten bleiben.');
      return;
    }

    setDraftPoints((current) => current.filter((_, index) => index !== selectedVertexIndex));
    setSelectedVertexIndex(null);
  }, [draftPoints.length, selectedVertexIndex]);

  const centerLabel = useCallback(() => {
    if (!draftPoints.length) return;
    setDraftLabel(getPolygonCentroid(draftPoints));
  }, [draftPoints]);

  const applyProposalToCurrentSector = useCallback(
    (proposal: HallMapRegionProposal) => {
      if (!selectedSectorId) {
      toast.error('Bitte zuerst einen Sektor auswählen.');
        return;
      }

      requestDraftReset(() => {
        const existingRegion = regionsBySectorId.get(selectedSectorId) ?? null;
        const proposalPoints = normalizePoints(proposal.points_json);
        const proposalLabel = normalizePoint({ x: proposal.label_x, y: proposal.label_y });

        setSelectedProposalId(proposal.id);
        setSelectedVertexIndex(null);
        setAppendPointMode(false);
        setDragState(null);
        setDraftPoints(proposalPoints);
        setDraftLabel(proposalLabel);
        setShowProposalOverlay(false);

        if (existingRegion) {
          setEditorMode('edit');
          setEditingRegionId(existingRegion.id);
        } else {
          setEditorMode('create');
          setEditingRegionId(null);
        }

      toast.success(`Vorschlag ${proposal.label} für ${selectedSector?.name ?? 'den Sektor'} geladen.`);
      });
    },
    [regionsBySectorId, requestDraftReset, selectedSector?.name, selectedSectorId],
  );

  const handleImageInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Das Kartenbild darf maximal 10 MB groß sein.');
      return;
    }

    setSelectedImageFile(file);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
    setImageError(false);
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const isMapFormDirty = useMemo(() => {
    const trimmedName = hallMapName.trim();
    if (!managedHallMap) {
      return trimmedName.length > 0 || !!selectedImageFile;
    }

    return trimmedName !== managedHallMap.name || !!selectedImageFile;
  }, [hallMapName, managedHallMap, selectedImageFile]);

  const canSaveMap =
    hallMapName.trim().length > 0 &&
    (!!managedHallMap || !!selectedImageFile) &&
    (isMapFormDirty || !managedHallMap) && !isDraftDirty;

  const canSaveRegion = normalizedDraftPoints.length >= 3 && !!selectedSectorId && editorMode !== 'idle' && isDraftDirty;
  const proposalAssistVisible =
    supportsProposals &&
    !!selectedSector &&
    editorMode === 'create' &&
    availableProposals.length > 0 &&
    showProposalOverlay;

  const renderSectorList = (className?: string) => (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="space-y-2">
        <Label htmlFor="hall-map-sector-search" className="sr-only">
          Sektoren suchen
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="hall-map-sector-search"
            value={sectorSearch}
            onChange={(event) => setSectorSearch(event.target.value)}
            placeholder="Sektor suchen"
            className="h-11 border-0 bg-secondary/70 pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {missingSectorCount === 0 ? <><Check className="h-3.5 w-3.5 text-primary-ink" />Alle Flächen zugeordnet</> : <>{missingSectorCount} ohne Kartenfläche</>}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-[560px]">
        {sectorGroups.map((group) => <section key={group.slug} aria-label={group.name} className="space-y-1.5 pb-3">
          <h3 className="flex items-center gap-2 px-1 py-2 text-xs font-semibold text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSectorAreaPalette(group.slug).regionFill }} />{group.name}</h3>
          {groupAdminSubareas(group.sectors).map(subarea => <div key={subarea.key} className="space-y-1">
            {subarea.sectors.length > 1 && <p className="px-2 pt-2 text-xs font-semibold">{subarea.name}<span className="ml-2 font-normal text-muted-foreground">{subarea.sectors.length} Flächen</span></p>}
          {subarea.sectors.map((sector) => {
          const region = regionsBySectorId.get(sector.id);
          const isSelected = selectedSectorId === sector.id;
          const resolved = resolveSectorArea(sector);

          return (
            <button
              key={sector.id}
              type="button"
              aria-label={getAdminSectorLabel(sector)}
              aria-pressed={isSelected}
              disabled={isBusyRegionMutation}
              onClick={() => openSectorEditor(sector.id)}
              className={cn(
                'min-h-11 w-full rounded-kws-control px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                isSelected
                  ? 'bg-primary/15'
                  : 'hover:bg-secondary',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-foreground">{subarea.sectors.length > 1 ? sector.name : resolved.publicName}</div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 rounded-kws-badge border-0 px-1.5 py-0.5 text-[11px] font-semibold',
                    region
                      ? 'bg-transparent text-primary-ink'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {region ? <><Check aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">Zugeordnet</span></> : 'fehlt'}
                </Badge>
              </div>
            </button>
          );
        })}</div>)}</section>)}

        {sectorGroups.length === 0 ? (
          <div className="rounded-kws-card border border-dashed border-border bg-secondary px-4 py-5 text-sm text-muted-foreground">
            Kein passender Sektor gefunden.
          </div>
        ) : null}
      </div>
    </div>
  );

  const activePolygonPoints = editorMode === 'idle' ? [] : normalizedDraftPoints;

  const handleDiscardConfirm = useCallback(() => {
    const pendingAction = discardActionRef.current;
    discardActionRef.current = null;
    setShowDiscardDialog(false);
    pendingAction?.();
  }, []);

  const handleDiscardCancel = useCallback(() => {
    discardActionRef.current = null;
    setShowDiscardDialog(false);
    setIsSectorSheetOpen(false);
  }, []);

  const editorActionBar = selectedSector ? (
    <fieldset disabled={isBusyRegionMutation} className="space-y-4">
      <legend className="sr-only">Kartenfläche bearbeiten</legend>
      <div className="grid grid-cols-2 gap-2 [&_button]:h-auto [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:whitespace-normal [&_button]:px-2 [&_button]:py-2 [&_button]:leading-4 sm:grid-cols-3">
        {editorMode === 'edit' && <Button type="button" variant="secondary" aria-pressed={appendPointMode} onClick={() => setAppendPointMode(current => !current)} className={cn('gap-2 text-xs', appendPointMode && 'bg-primary/15')}><BadgePlus className="h-4 w-4" />Punkt hinzufügen</Button>}
        <Button type="button" variant="secondary" className="gap-2 text-xs" onClick={editorMode === 'create' ? removeLastPoint : removeSelectedVertex} disabled={editorMode === 'create' ? draftPoints.length === 0 : selectedVertexIndex === null}><Undo2 className="h-4 w-4" />{editorMode === 'create' ? 'Letzten Punkt entfernen' : 'Punkt entfernen'}</Button>
        <Button type="button" variant="secondary" className="text-xs" onClick={centerLabel} disabled={draftPoints.length < 3}>Beschriftung zentrieren</Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editorMode === 'edit' && <Button type="button" variant="ghost" className="gap-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowDeleteRegionDialog(true)}><Trash2 className="h-4 w-4" />Fläche löschen</Button>}
        {!isMobile && <div className="ml-auto flex gap-2"><Button type="button" variant="secondary" onClick={() => requestDraftReset(clearSelection)}>Abbrechen</Button><Button type="button" className="gap-2" onClick={handleSaveRegion} disabled={!canSaveRegion || isBusyRegionMutation}>{isBusyRegionMutation ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Save className="h-4 w-4" />}Sektorfläche speichern</Button></div>}
      </div>
    </fieldset>
  ) : null;
  const mapInteractionHint = !selectedSector
    ? 'Sektor auswählen, um seine Fläche zu bearbeiten.'
    : editorMode === 'create'
      ? supportsProposals && showProposalOverlay
        ? 'Wandfläche antippen und den Vorschlag anpassen.'
        : 'Mindestens drei Eckpunkte auf der Karte setzen.'
      : appendPointMode
        ? 'Karte antippen, um einen Punkt hinzuzufügen.'
        : 'Eckpunkte und Beschriftung direkt auf der Karte ziehen.';

  const mapBusy = isLoadingHallMaps || isLoadingRegions || isLoadingSectors;
  const hasProposalOverlay = supportsProposals && availableProposals.length > 0;
  const loadError = hallMapsError || activeHallMapError || sectorsError || regionsError;

  return (
    <div className="w-full max-w-full space-y-4" data-swipe-ignore>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><h2 className="font-sans text-base font-semibold">Sektorflächen</h2><p className="mt-1 text-xs text-muted-foreground">{mapBusy ? 'Karte wird geladen …' : loadError ? 'Daten nicht vollständig geladen' : managedHallMap ? `${groupAdminSubareas(sectors).length} Teilbereiche · ${assignedSectorCount} Kartenflächen` : 'Noch keine Karte eingerichtet'}</p></div>
        <Button ref={settingsTrigger} variant={managedHallMap ? 'secondary' : 'default'} disabled={mapBusy || Boolean(loadError) || isSavingHallMap} className="shrink-0 gap-2 px-3 text-xs" onClick={() => { setMapSaveError(null); setShowMapSettings(true); }} aria-label="Karte verwalten"><Settings className="h-4 w-4" />Karte verwalten</Button>
      </div>

      {hallMaps.length > 1 ? (
        <Alert className="rounded-kws-card border-border bg-white">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mehrere Hallenkarten gefunden</AlertTitle>
          <AlertDescription>
            In dieser Verwaltung wird in V1 nur die aktive bzw. erste gefundene Hallenkarte bearbeitet.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex w-full min-w-0 flex-col gap-4">

        <section className={cn('min-w-0 space-y-4', managedHallMap ? 'order-1' : 'order-2')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{mapInteractionHint}</p>
            </div>

            <div className="flex items-center gap-2 lg:justify-end">
              <Button type="button" variant="secondary" className="gap-2" aria-label={showMapImage ? 'Zurück zu Sektorflächen' : 'Zeichenvorlage anzeigen'} aria-pressed={showMapImage} disabled={!managedHallMap} onClick={() => setShowMapImage(current => !current)}>
                <ImageIcon className="h-4 w-4" />{showMapImage ? 'Sektorflächen anzeigen' : 'Zeichenvorlage'}
              </Button>
              {isMobile ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSectorSheetOpen(true)}
                  className="gap-2"
                  disabled={!managedHallMap}
                >
                  <PencilLine className="h-4 w-4" />
                  Sektoren
                </Button>
              ) : null}
            </div>
          </div>

          {!managedHallMap ? (
            <div className={cn(kwsSurfaceClassName, 'grid min-h-64 place-items-center p-6 text-center')}>
              <div className="space-y-3"><MapPinned className="mx-auto h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{mapBusy ? 'Kartenverwaltung wird geladen …' : loadError ? 'Kartenverwaltung konnte nicht geladen werden.' : 'Hinterlege ein Kartenbild und ordne deine Sektoren zu.'}</p><Button disabled={mapBusy || Boolean(loadError)} onClick={() => setShowMapSettings(true)}>Karte einrichten</Button></div>
            </div>
          ) : (
            <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              {!isMobile ? (
                <aside aria-label="Sektorauswahl" className={cn(kwsSurfaceClassName, 'min-w-0 p-3')}>
                  {renderSectorList()}
                </aside>
              ) : null}

              <div className="min-w-0 space-y-4">
                <div className={cn(kwsSurfaceClassName, 'w-full overflow-hidden')}>
                  {selectedSector && <div className="space-y-3 p-4" data-testid="map-edit-tools">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{getAdminSectorLabel(selectedSector)}</h3><p className="mt-1 text-xs text-muted-foreground">{draftPoints.length} Eckpunkte · {editorMode === 'create' ? 'Neue Fläche zeichnen' : 'Fläche bearbeiten'}</p></div><Badge variant="secondary" className="w-28 shrink-0 justify-center">{isDraftDirty ? 'Ungespeichert' : editorMode === 'create' ? 'Entwurf' : 'Gespeichert'}</Badge></div>
                    {hasProposalOverlay && editorMode === 'create' && <Button variant="secondary" onClick={() => setShowProposalOverlay(current => !current)}>{showProposalOverlay ? 'Selbst zeichnen' : 'Flächenvorschläge anzeigen'}</Button>}
                    {editorActionBar}
                    {regionSaveError && <p role="alert" className="text-sm text-destructive">{regionSaveError} Deine Änderungen bleiben erhalten.</p>}
                  </div>}
                  {showMapImage && <p role="status" className="bg-secondary px-4 py-3 text-xs text-muted-foreground">Zeichenvorlage: das gespeicherte Originalbild, nicht die farbige App-Ansicht.</p>}
                  {loadError ? (
                    <Alert variant="destructive" className="m-3 rounded-kws-card">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Kartenverwaltung konnte nicht vollständig geladen werden</AlertTitle>
                      <AlertDescription>
                        Bitte lade die Seite erneut. Bereits sichtbare Daten werden nicht als vollständig aktuell dargestellt.
                      </AlertDescription>
                    </Alert>
                  ) : imageError && showMapImage ? (
                    <Alert variant="destructive" className="m-3 rounded-kws-card">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Kartenbild konnte nicht geladen werden</AlertTitle>
                      <AlertDescription>
                        <p>Bitte prüfe die Bild-URL der aktiven Hallenkarte oder lade das Bild neu hoch.</p>
                        <Button type="button" variant="outline" className="mt-3 rounded-kws-control border-border bg-white text-foreground" onClick={() => { setImageError(false); setImageRetryKey((current) => current + 1); }}>
                          Erneut laden
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : mapBusy ? (
                    <div className="grid min-h-[420px] place-items-center bg-white text-sm text-muted-foreground">
                      Kartenverwaltung wird geladen...
                    </div>
                  ) : (
                    <InteractiveMapStage
                      width={mapWidth}
                      height={mapHeight}
                      disablePanZoom={editorMode !== 'idle'}
                      allowPageScroll
                      lockAspectRatio={false}
                      viewportClassName="h-[300px] rounded-none border-0 bg-white shadow-none sm:h-[480px] lg:h-[520px]"
                    >
                      <img
                        key={imageRetryKey}
                        src={displayedMapImageSrc}
                        alt="Gespeicherte Zeichenvorlage"
                        aria-hidden={!showMapImage}
                        className={cn('pointer-events-none block h-full w-full select-none object-contain', !showMapImage && 'opacity-0')}
                        draggable={false}
                        onError={() => setImageError(true)}
                      />
                      <svg
                        ref={svgRef}
                        data-testid="hall-map-editor"
                        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="absolute inset-0 h-full w-full"
                        onPointerDownCapture={() => { suppressMapClick.current = false; }}
                        onClickCapture={event => {
                          if (suppressMapClick.current) {
                            suppressMapClick.current = false;
                            event.preventDefault();
                            event.stopPropagation();
                          } else if (selectedSectorId && (appendPointMode || (editorMode === 'create' && !proposalAssistVisible)) && !(event.target as Element).closest('[data-map-handle]')) {
                            event.preventDefault();
                            event.stopPropagation();
                            handleMapOverlayClick(event);
                          }
                        }}
                        onClick={handleMapOverlayClick}
                      >
                          {regions.map((region) => {
                            const sector = sectors.find((entry) => entry.id === region.sector_id);
                            if (!sector) return null;

                            const isSelectedRegion =
                              selectedSectorId === region.sector_id && editingRegionId === region.id;
                            const points = isSelectedRegion ? activePolygonPoints : region.points_json;
                            const labelPoint = isSelectedRegion
                              ? normalizedDraftLabel ?? getPolygonCentroid(points)
                              : getRegionLabelPoint(region);
                            const absoluteLabelPoint = percentToAbsolute(labelPoint, mapWidth, mapHeight);
                            const resolved = resolveSectorArea(sector);
                            const palette = getSectorAreaPalette(resolved.area?.slug);
                            const labelScale = isMobile
                              ? mapWidth / Math.max(viewportWidth - 32, 280) * 0.6
                              : Math.min(mapWidth, mapHeight) / 930;
                            const markerHalfWidth = resolved.subareaCode ? Math.max(20, resolved.subareaCode.length * 8 + 6) : 58;
                            const labelHalfWidth = markerHalfWidth * labelScale;
                            const labelX = clamp(absoluteLabelPoint.x, labelHalfWidth + 3, mapWidth - labelHalfWidth - 3);
                            const labelY = clamp(absoluteLabelPoint.y, 20 * labelScale + 3, mapHeight - 20 * labelScale - 3);

                            return (
                              <g key={region.id}>
                                <title>{getAdminSectorLabel(sector)}</title>
                                <polygon
                                  points={polygonToString(points, mapWidth, mapHeight)}
                                  fill="transparent"
                                  stroke="rgba(19,17,43,0.001)"
                                  strokeWidth={24}
                                  style={{ pointerEvents: 'stroke' }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openSectorEditor(region.sector_id);
                                  }}
                                />
                                <polygon
                                  points={polygonToString(points, mapWidth, mapHeight)}
                                  fill={showMapImage ? 'transparent' : isSelectedRegion ? palette.regionFillHighlighted : palette.regionFill}
                                  fillOpacity={0.9}
                                  stroke={showMapImage ? 'transparent' : isSelectedRegion ? palette.regionStrokeHighlighted : palette.regionStroke}
                                  strokeWidth={isSelectedRegion ? 3 : 1.5}
                                  className="cursor-pointer transition-colors duration-200 motion-reduce:transition-none"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openSectorEditor(region.sector_id);
                                  }}
                                />

                                <g
                                  className={cn('pointer-events-none', showMapImage && !isSelectedRegion && 'opacity-0')}
                                  transform={`translate(${labelX}, ${labelY}) scale(${labelScale})`}
                                >
                                  <rect
                                    x={-markerHalfWidth}
                                    y={-20}
                                    width={markerHalfWidth * 2}
                                    height={40}
                                    rx={4}
                                    fill="rgba(255,255,255,0.96)"
                                    stroke={isSelectedRegion ? palette.regionStrokeHighlighted : 'rgba(19,17,43,0.1)'}
                                  />
                                  <text
                                    x={0}
                                    y={6}
                                    textAnchor="middle"
                                    fontSize={resolved.subareaCode ? 22 : 14}
                                    fontWeight={700}
                                    fill="hsl(var(--foreground))"
                                  >
                                    {resolved.subareaCode ?? sector.name}
                                  </text>
                                </g>
                              </g>
                            );
                          })}

                          {proposalAssistVisible
                            ? availableProposals.map((proposal) => {
                                const isProposalSelected = selectedProposalId === proposal.id || hoveredProposalId === proposal.id;

                                return (
                                  <g key={proposal.id}>
                                    <polygon
                                      points={polygonToString(proposal.points_json, mapWidth, mapHeight)}
                                      fill="transparent"
                                      stroke="rgba(19,17,43,0.001)"
                                      strokeWidth={20}
                                      style={{ pointerEvents: 'stroke' }}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        applyProposalToCurrentSector(proposal);
                                      }}
                                    />
                                    <polygon
                                      points={polygonToString(proposal.points_json, mapWidth, mapHeight)}
                                      fill={isProposalSelected ? 'rgba(54, 181, 49, 0.12)' : 'rgba(54, 181, 49, 0.04)'}
                                      stroke={isProposalSelected ? '#36B531' : 'rgba(19,17,43,0.18)'}
                                      strokeWidth={isProposalSelected ? 3.5 : 1.6}
                                      strokeDasharray={isProposalSelected ? 'none' : '10 10'}
                                      className="cursor-pointer transition-all duration-200"
                                      onMouseEnter={() => setHoveredProposalId(proposal.id)}
                                      onMouseLeave={() => setHoveredProposalId((current) => (current === proposal.id ? null : current))}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        applyProposalToCurrentSector(proposal);
                                      }}
                                    />
                                  </g>
                                );
                              })
                            : null}

                          {selectedSector && activePolygonPoints.length > 0 ? (
                            <g>
                              {activePolygonPoints.length >= 2 ? (
                                <polyline
                                  points={polygonToString(activePolygonPoints, mapWidth, mapHeight)}
                                  fill={editorMode === 'edit' ? 'rgba(54, 181, 49, 0.14)' : 'rgba(54, 181, 49, 0.08)'}
                                  stroke="#36B531"
                                  strokeWidth={3}
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                              ) : null}

                              {activePolygonPoints.length >= 3 ? (
                                <polygon
                                  points={polygonToString(activePolygonPoints, mapWidth, mapHeight)}
                                  fill="rgba(54, 181, 49, 0.16)"
                                  stroke="#1F7C22"
                                  strokeWidth={3}
                                  strokeLinejoin="round"
                                />
                              ) : null}

                              {activePolygonPoints.map((point, index) => {
                                const absolutePoint = percentToAbsolute(point, mapWidth, mapHeight);

                                return (
                                  <g key={`${selectedSector.id}-point-${index}`}>
                                    <circle
                                      cx={absolutePoint.x}
                                      cy={absolutePoint.y}
                                      r={13}
                                      fill="rgba(54, 181, 49, 0.12)"
                                      stroke="transparent"
                                      data-map-handle
                                      className="touch-none cursor-grab active:cursor-grabbing"
                                      onPointerDown={(event) => handleStartVertexDrag(index, event)}
                                    />
                                    <circle
                                      cx={absolutePoint.x}
                                      cy={absolutePoint.y}
                                      r={7}
                                      fill={selectedVertexIndex === index ? '#1F7C22' : '#36B531'}
                                      stroke="#ffffff"
                                      strokeWidth={3}
                                      data-map-handle
                                      className="touch-none cursor-grab active:cursor-grabbing"
                                      onPointerDown={(event) => handleStartVertexDrag(index, event)}
                                    />
                                    <text
                                      x={absolutePoint.x}
                                      y={absolutePoint.y - 14}
                                      textAnchor="middle"
                                      fontSize={12}
                                      fontWeight={700}
                                      fill="#13112B"
                                    >
                                      {index + 1}
                                    </text>
                                  </g>
                                );
                              })}

                              {normalizedDraftLabel && activePolygonPoints.length >= 3 ? (
                                <g>
                                  <line
                                    x1={percentToAbsolute(getPolygonCentroid(activePolygonPoints), mapWidth, mapHeight).x}
                                    y1={percentToAbsolute(getPolygonCentroid(activePolygonPoints), mapWidth, mapHeight).y}
                                    x2={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).x}
                                    y2={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).y}
                                    stroke="rgba(19,17,43,0.22)"
                                    strokeDasharray="6 5"
                                  />
                                  <circle
                                    cx={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).x}
                                    cy={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).y}
                                    r={13}
                                    fill="rgba(19,17,43,0.1)"
                                    stroke="transparent"
                                    data-map-handle
                                    className="touch-none cursor-grab active:cursor-grabbing"
                                    onPointerDown={handleStartLabelDrag}
                                  />
                                  <circle
                                    cx={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).x}
                                    cy={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).y}
                                    r={7}
                                    fill="#13112B"
                                    stroke="#ffffff"
                                    strokeWidth={3}
                                    data-map-handle
                                    className="touch-none cursor-grab active:cursor-grabbing"
                                    onPointerDown={handleStartLabelDrag}
                                  />
                                </g>
                              ) : null}
                            </g>
                          ) : null}
                      </svg>
                    </InteractiveMapStage>
                  )}
                  {managedHallMap && <div aria-label="Farblegende der Hallenbereiche" className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 py-3 text-xs text-muted-foreground">{getSectorAreas(sectors).map(area => <span key={area.slug} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSectorAreaPalette(area.slug).regionFill }} />{area.name}</span>)}</div>}
                  {!selectedSector && <p className="sr-only">Noch kein Sektor ausgewählt.</p>}
                </div>
              </div>
            </div>
          )}
          {isMobile && managedHallMap && selectedSector ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-kws-card bg-card p-3 shadow-soft">
          <Button type="button" variant="ghost" disabled={isBusyRegionMutation} onClick={() => requestDraftReset(clearSelection)}>Abbrechen</Button>
          <Button type="button" aria-label="Sektorfläche speichern" disabled={!canSaveRegion || isBusyRegionMutation} onClick={handleSaveRegion}>{isBusyRegionMutation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Speichern</Button>
        </div>
      ) : null}

        </section>
      </div>

      {showMapSettings && <HallMapSettingsDialog
        error={mapSaveError}
        existing={Boolean(managedHallMap)} name={hallMapName} onNameChange={setHallMapName}
        preview={selectedImageFile ? imagePreview : managedHallMap ? displayedMapImageSrc : null}
        fileName={selectedImageFile?.name} onFileChange={handleImageInputChange}
        pending={isSavingHallMap || deleteHallMap.isPending} progress={uploadProgress}
        dirty={isMapFormDirty} canSave={canSaveMap} geometryDirty={isDraftDirty}
        onSave={handleSaveHallMap} onDelete={() => setShowDeleteHallMapDialog(true)}
        onClose={() => setShowMapSettings(false)}
        onDiscard={() => { setHallMapName(managedHallMap?.name ?? ''); setSelectedImageFile(null); setImagePreview(managedHallMap?.image_url ?? null); }}
        onRestoreFocus={() => requestAnimationFrame(() => settingsTrigger.current?.focus())}
      />}

      <Sheet open={isSectorSheetOpen} onOpenChange={setIsSectorSheetOpen}>
        <SheetContent side="bottom" className="flex max-h-[88vh] flex-col rounded-t-kws-card bg-white px-4 pb-8 pt-6">
          <SheetHeader className="shrink-0 pr-10 text-left">
            <SheetTitle>Sektor auswählen</SheetTitle>
            <SheetDescription className="sr-only">Sektorfläche auf der Hallenkarte bearbeiten.</SheetDescription>
          </SheetHeader>
          {renderSectorList('mt-4 min-h-0 flex-1')}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="rounded-kws-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deine Änderungen an der aktuellen Sektorfläche sind noch nicht gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-kws-control border-border" onClick={handleDiscardCancel}>
              Weiter bearbeiten
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardConfirm} className="rounded-kws-control bg-primary-strong text-primary-foreground hover:bg-primary-strong">
              Verwerfen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteRegionDialog} onOpenChange={open => { if (!deleteSectorRegion.isPending) setShowDeleteRegionDialog(open); }}>
        <AlertDialogContent className="rounded-kws-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Sektorfläche für {selectedSector?.name ?? 'diesen Sektor'} löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Nur die Kartenfläche wird entfernt. Der Sektor selbst und seine Boulder bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSectorRegion.isPending} className="rounded-kws-control border-border">Abbrechen</AlertDialogCancel>
            <Button disabled={deleteSectorRegion.isPending} onClick={handleDeleteRegion} variant="destructive">{deleteSectorRegion.isPending ? 'Wird gelöscht …' : 'Löschen'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteHallMapDialog} onOpenChange={open => { if (!deleteHallMap.isPending) setShowDeleteHallMapDialog(open); }}>
        <AlertDialogContent className="rounded-kws-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{managedHallMap?.name ?? 'Hallenkarte'} löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Hallenkarte und alle zugeordneten Sektorflächen werden entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteHallMap.isPending} className="rounded-kws-control border-border">Abbrechen</AlertDialogCancel>
            <Button disabled={deleteHallMap.isPending} onClick={handleDeleteHallMap} variant="destructive">{deleteHallMap.isPending ? 'Wird gelöscht …' : 'Karte löschen'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


