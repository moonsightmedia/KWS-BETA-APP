import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgePlus,
  Loader2,
  MapPinned,
  PencilLine,
  Save,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import hallMapBase from '@/assets/boulderkarte-original.png';
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
import { Progress } from '@/components/ui/progress';
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

const USER_HALL_MAP_DIMENSIONS = {
  width: 1471,
  height: 930,
} as const;

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
  const { data: hallMaps = [], isLoading: isLoadingHallMaps } = useHallMaps(accessToken, queriesEnabled);
  const { data: activeHallMap } = useActiveHallMap(accessToken, queriesEnabled);
  const { data: sectors = [], isLoading: isLoadingSectors } = useSectors(queriesEnabled);
  const managedHallMap = activeHallMap ?? hallMaps[0] ?? null;
  const managedHallMapId = managedHallMap?.id ?? null;
  const {
    data: regions = [],
    isLoading: isLoadingRegions,
  } = useSectorMapRegions(managedHallMapId, accessToken, queriesEnabled && !!managedHallMapId);
  const createHallMap = useCreateHallMap(accessToken);
  const updateHallMap = useUpdateHallMap(accessToken);
  const deleteHallMap = useDeleteHallMap(accessToken);
  const createSectorRegion = useCreateSectorMapRegion(accessToken);
  const updateSectorRegion = useUpdateSectorMapRegion(accessToken);
  const deleteSectorRegion = useDeleteSectorMapRegion(accessToken);

  const [isMobile, setIsMobile] = useState(false);
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
  const [showProposalOverlay, setShowProposalOverlay] = useState(true);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [hoveredProposalId, setHoveredProposalId] = useState<string | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
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

  const filteredSectors = useMemo(() => {
    const normalizedSearch = sectorSearch.trim().toLowerCase();

    return sectors.filter((sector) => {
      if (!normalizedSearch) return true;
      return sector.name.toLowerCase().includes(normalizedSearch);
    });
  }, [sectorSearch, sectors]);

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

  const displayedMapImageSrc = selectedImageFile && imagePreview ? imagePreview : hallMapBase;
  const mapWidth = displayedMapImageSrc === hallMapBase
    ? USER_HALL_MAP_DIMENSIONS.width
    : managedHallMap?.width ?? USER_HALL_MAP_DIMENSIONS.width;
  const mapHeight = displayedMapImageSrc === hallMapBase
    ? USER_HALL_MAP_DIMENSIONS.height
    : managedHallMap?.height ?? USER_HALL_MAP_DIMENSIONS.height;

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
      requestDraftReset(() => {
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
    [regionsBySectorId, requestDraftReset],
  );

  const clientToPercentPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      return absoluteToPercent(
        {
          x: clamp(((clientX - rect.left) / rect.width) * mapWidth, 0, mapWidth),
          y: clamp(((clientY - rect.top) / rect.height) * mapHeight, 0, mapHeight),
        },
        mapWidth,
        mapHeight,
      );
    },
    [mapHeight, mapWidth],
  );

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextPoint = clientToPercentPoint(event.clientX, event.clientY);
      if (!nextPoint) return;

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
  }, [clientToPercentPoint, dragState]);

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
      if (!selectedSectorId || editorMode === 'idle') return;
      if (editorMode === 'edit' && !appendPointMode) return;

      const nextPoint = clientToPercentPoint(event.clientX, event.clientY);
      if (!nextPoint) return;

      setDraftPoints((current) => {
        const nextPoints = [...current, nextPoint];
        if (nextPoints.length >= 3 && !draftLabel) {
          setDraftLabel(getPolygonCentroid(nextPoints));
        }
        return nextPoints;
      });
      setAppendPointMode(false);
      setSelectedVertexIndex(null);
    },
    [appendPointMode, clientToPercentPoint, draftLabel, editorMode, selectedSectorId],
  );

  const handleStartVertexDrag = useCallback(
    (index: number, event: React.PointerEvent<SVGCircleElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedVertexIndex(index);
      setDragState({ type: 'vertex', index });
    },
    [],
  );

  const handleStartLabelDrag = useCallback((event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedVertexIndex(null);
    setDragState({ type: 'label' });
  }, []);

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

      const dimensions = await getImageDimensions(uploadedImageUrl);

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
      toast.success(managedHallMap ? 'Hallenkarte aktualisiert.' : 'Hallenkarte angelegt.');
    } catch (error) {
      if (!managedHallMap && uploadedImageUrl) {
        deleteHallMapImage(uploadedImageUrl).catch((cleanupError) => {
          console.error('[HallMapManagement] Failed to cleanup hall map upload after create error:', cleanupError);
        });
      }

      toast.error(getFriendlyHallMapError(error, 'Hallenkarte konnte nicht gespeichert werden.'));
    } finally {
      setIsSavingHallMap(false);
      setUploadProgress(0);
    }
  }, [createHallMap, hallMapName, managedHallMap, selectedImageFile, updateHallMap]);

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
    } catch (error) {
      toast.error(getFriendlyHallMapError(error, 'Hallenkarte konnte nicht gelöscht werden.'));
    }
  }, [clearSelection, deleteHallMap, managedHallMap]);

  const handleSaveRegion = useCallback(async () => {
    if (!managedHallMap || !selectedSectorId) return;

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
      toast.error(getFriendlyHallMapError(error, 'Sektorfläche konnte nicht gespeichert werden.'));
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
    (isMapFormDirty || !managedHallMap);

  const canSaveRegion = normalizedDraftPoints.length >= 3 && !!selectedSectorId && editorMode !== 'idle';
  const isBusyRegionMutation =
    createSectorRegion.isPending || updateSectorRegion.isPending || deleteSectorRegion.isPending;
  const proposalAssistVisible =
    !!selectedSector &&
    editorMode === 'create' &&
    availableProposals.length > 0 &&
    showProposalOverlay;

  const renderSectorList = (className?: string) => (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        <Label htmlFor="hall-map-sector-search" className="text-sm font-medium text-[#13112B]">
          Sektoren
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="hall-map-sector-search"
            value={sectorSearch}
            onChange={(event) => setSectorSearch(event.target.value)}
            placeholder="Sektor suchen"
            className="h-11 rounded-xl border-[#DDE7DF] bg-white pl-9"
          />
        </div>
      </div>

      <div className="text-xs text-[#13112B]/58">
        {assignedSectorCount} zugeordnet / {missingSectorCount} offen
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {filteredSectors.map((sector) => {
          const region = regionsBySectorId.get(sector.id);
          const isSelected = selectedSectorId === sector.id;

          return (
            <button
              key={sector.id}
              type="button"
              onClick={() => openSectorEditor(sector.id)}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                isSelected
                  ? 'border-[#36B531] bg-[#F7FBF7]'
                  : 'border-[#DDE7DF] bg-white hover:border-[#36B531]/30 hover:bg-[#FCFEFC]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#13112B]">{sector.name}</div>
                  <div className="mt-1 text-xs text-[#13112B]/55">
                    {region ? 'Region vorhanden' : 'Noch keine Kartenfläche'}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                    region
                      ? 'border-[#DDE7DF] bg-[#F7FBF7] text-[#13112B]'
                      : 'border-[#DDE7DF] bg-white text-[#13112B]/62',
                  )}
                >
                  {region ? 'zugeordnet' : 'fehlt'}
                </Badge>
              </div>
            </button>
          );
        })}

        {filteredSectors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FAFCFA] px-4 py-5 text-sm text-[#13112B]/58">
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
  }, []);

  const editorActionBar = selectedSector ? (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {editorMode === 'edit' ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAppendPointMode(true)}
          className={cn(
            'rounded-xl border-[#DDE7DF] bg-white text-[#13112B]',
            appendPointMode && 'border-[#36B531] bg-[#F7FBF7] text-[#13112B]',
          )}
        >
          <BadgePlus className="h-4 w-4" />
          Punkt hinzufügen
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={editorMode === 'create' ? removeLastPoint : removeSelectedVertex}
        disabled={editorMode === 'create' ? draftPoints.length === 0 : selectedVertexIndex === null}
        className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
      >
        <Undo2 className="h-4 w-4" />
        {editorMode === 'create' ? 'Letzten Punkt entfernen' : 'Punkt entfernen'}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={centerLabel}
        disabled={draftPoints.length < 3}
        className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
      >
        Label zentrieren
      </Button>

      {editorMode === 'edit' ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowDeleteRegionDialog(true)}
          className="rounded-xl border-[#E8C9C0] bg-white text-[#C14E37] hover:bg-[#FFF7F5] hover:text-[#C14E37]"
        >
          <Trash2 className="h-4 w-4" />
          Region löschen
        </Button>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={() => requestDraftReset(clearSelection)}
        className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
      >
        <X className="h-4 w-4" />
        Abbrechen
      </Button>

      <Button
        type="button"
        onClick={handleSaveRegion}
        disabled={!canSaveRegion || isBusyRegionMutation}
        className="rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B]"
      >
        {isBusyRegionMutation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Speichern
      </Button>
    </div>
  ) : null;

  const mapInteractionHint = !selectedSector
    ? 'Wähle links einen Sektor aus, um eine Fläche anzulegen oder zu bearbeiten.'
    : editorMode === 'create'
      ? showProposalOverlay
        ? 'Tippe direkt auf die passende Wandfläche. Der Vorschlag wird übernommen und kann danach fein angepasst werden.'
        : 'Tippe auf die Karte, um Polygonpunkte für diesen Sektor zu setzen. Ab dem dritten Punkt kannst du speichern.'
      : appendPointMode
        ? 'Tippe auf die Karte, um einen weiteren Punkt in die bestehende Fläche einzufügen.'
        : 'Ziehe Punkte oder das Label auf der Karte. Du kannst einzelne Punkte löschen und die Fläche direkt speichern.';

  const mapBusy = isLoadingHallMaps || isLoadingRegions || isLoadingSectors;
  const hasProposalOverlay = availableProposals.length > 0;

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 md:space-y-5">
      <div className="space-y-2">
        <div className="min-w-0">
          <div className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
            Hallenkarte
          </div>
          <h3 className="mt-2 text-[1.32rem] font-semibold tracking-[-0.02em] text-[#13112B]">
            Karte und Sektorflächen verwalten
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#13112B]/58">
            Pflege das Kartenbild und ordne jedem Sektor genau eine Fläche zu.
          </p>
        </div>
        <div className="text-xs text-[#13112B]/58">
          {managedHallMap ? 'Aktive Karte eingerichtet' : 'Noch keine Hallenkarte'} / {assignedSectorCount}/{sectors.length} Sektoren zugeordnet
          {hasProposalOverlay ? ` / ${availableProposals.length} Vorschläge verfügbar` : ''}
        </div>
      </div>

      {hallMaps.length > 1 ? (
        <Alert className="rounded-2xl border-[#DDE7DF] bg-white">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mehrere Hallenkarten gefunden</AlertTitle>
          <AlertDescription>
            In dieser Verwaltung wird in V1 nur die aktive bzw. erste gefundene Hallenkarte bearbeitet.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white p-4 md:p-5">
          <div className="mb-4">
            <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
              Kartendaten
            </div>
            <p className="mt-2 text-sm text-[#13112B]/58">
              Name, Bild und aktiver Stand der Hallenkarte.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hall-map-name" className="text-sm font-medium text-[#13112B]">
                Kartenname
              </Label>
              <Input
                id="hall-map-name"
                value={hallMapName}
                onChange={(event) => setHallMapName(event.target.value)}
                placeholder="z. B. Hauptbereich"
                className="h-11 rounded-xl border-[#DDE7DF] bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hall-map-file" className="text-sm font-medium text-[#13112B]">
                Kartenbild
              </Label>

              {imagePreview ? (
                <div className="w-full overflow-hidden rounded-2xl border border-[#DDE7DF] bg-[#FCFEFC]">
                  <img
                    src={displayedMapImageSrc}
                    alt={hallMapName || 'Hallenkarte'}
                    className="block h-auto w-full max-w-full object-contain"
                    style={{ aspectRatio: `${USER_HALL_MAP_DIMENSIONS.width} / ${USER_HALL_MAP_DIMENSIONS.height}` }}
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFEFC] px-4 text-center text-sm text-[#13112B]/58">
                  Noch kein Kartenbild hinterlegt.
                </div>
              )}

              <div className="rounded-xl border border-dashed border-[#DDE7DF] bg-[#FCFEFC] p-3">
                <Input
                  id="hall-map-file"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageInputChange}
                  className="sr-only"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label
                    htmlFor="hall-map-file"
                    className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#DDE7DF] bg-white px-4 text-sm font-medium text-[#13112B] transition-colors hover:border-[#36B531]/35 hover:bg-[#FCFEFC] sm:w-auto"
                  >
                    Datei auswählen
                  </label>
                  <div className="min-w-0 flex-1 rounded-xl border border-[#DDE7DF] bg-white px-4 py-3 text-sm text-[#13112B]/68">
                    <span className="block truncate">
                      {selectedImageFile?.name ?? (managedHallMap ? 'Aktuelles Kartenbild aktiv' : 'Noch keine Datei ausgewählt')}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#13112B]/55">
                  JPG, PNG oder WebP. Die Bildmaße werden automatisch für die Kartenansicht übernommen.
                </p>
              </div>
            </div>

            {isSavingHallMap && uploadProgress > 0 ? (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-[#13112B]/55">Upload: {Math.round(uploadProgress)}%</p>
              </div>
            ) : null}

            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <Button
                type="button"
                onClick={handleSaveHallMap}
                disabled={!canSaveMap || isSavingHallMap}
                className="w-full rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B]"
              >
                {isSavingHallMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {managedHallMap ? 'Karte speichern' : 'Karte anlegen'}
              </Button>

              {managedHallMap ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteHallMapDialog(true)}
                  className="w-full rounded-xl border-[#E8C9C0] bg-white text-[#C14E37] hover:bg-[#FFF7F5] hover:text-[#C14E37]"
                >
                  <Trash2 className="h-4 w-4" />
                  Karte löschen
                </Button>
              ) : null}
            </div>

            {!managedHallMap ? (
              <Alert className="rounded-2xl border-[#DDE7DF] bg-[#FCFEFC]">
                <MapPinned className="h-4 w-4" />
                <AlertTitle>Ersteinrichtung</AlertTitle>
                <AlertDescription>
                  Lege zuerst die aktive Hallenkarte an. Danach kannst du die Sektorflächen direkt auf dem Bild setzen.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                Sektorflächen
              </div>
              <h4 className="mt-2 text-[1.08rem] font-semibold tracking-[-0.02em] text-[#13112B]">
                Bereiche auf der Karte bearbeiten
              </h4>
              <p className="mt-2 text-sm leading-6 text-[#13112B]/58">{mapInteractionHint}</p>
            </div>

            <div className="flex items-center gap-2 lg:justify-end">
              {isMobile ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSectorSheetOpen(true)}
                  className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
                  disabled={!managedHallMap}
                >
                  <PencilLine className="h-4 w-4" />
                  Sektoren
                </Button>
              ) : null}
              {selectedSector ? (
                <Badge variant="outline" className="rounded-lg border-[#DDE7DF] bg-white px-3 py-1 text-[#13112B]">
                  {selectedSector.name}
                </Badge>
              ) : null}
            </div>
          </div>

          {!managedHallMap ? (
            <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFEFC] px-4 py-5 text-sm text-[#13112B]/58">
              Lege zuerst eine Hallenkarte an. Danach kannst du die Sektorflächen direkt auf dem Bild setzen.
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
              {!isMobile ? (
                <div className="min-w-0 rounded-2xl border border-[#DDE7DF] bg-white p-4">
                  {renderSectorList()}
                </div>
              ) : null}

              <div className="min-w-0 space-y-4">
                <div className="w-full overflow-hidden rounded-2xl border border-[#DDE7DF] bg-[#FCFEFC]">
                  {imageError ? (
                    <Alert variant="destructive" className="m-3 rounded-2xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Kartenbild konnte nicht geladen werden</AlertTitle>
                      <AlertDescription>
                        Bitte prüfe die Bild-URL der aktiven Hallenkarte oder lade das Bild neu hoch.
                      </AlertDescription>
                    </Alert>
                  ) : mapBusy ? (
                    <div className="grid min-h-[420px] place-items-center bg-white text-sm text-[#13112B]/58">
                      Kartenverwaltung wird geladen...
                    </div>
                  ) : (
                    <InteractiveMapStage
                      width={mapWidth}
                      height={mapHeight}
                      disablePanZoom
                      viewportClassName="min-h-[360px] bg-white sm:min-h-[520px]"
                    >
                      <img
                        src={displayedMapImageSrc}
                        alt={managedHallMap.name}
                        className="pointer-events-none block h-full w-full select-none object-contain"
                        draggable={false}
                        onError={() => setImageError(true)}
                      />
                      <svg
                        ref={svgRef}
                        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="absolute inset-0 h-full w-full"
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

                            return (
                              <g key={region.id}>
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
                                  fill={isSelectedRegion ? 'rgba(54, 181, 49, 0.22)' : 'rgba(54, 181, 49, 0.1)'}
                                  stroke={isSelectedRegion ? '#1F7C22' : 'rgba(46, 139, 53, 0.55)'}
                                  strokeWidth={isSelectedRegion ? 4 : 2.5}
                                  className="cursor-pointer transition-all duration-200"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openSectorEditor(region.sector_id);
                                  }}
                                />

                                <g
                                  className="pointer-events-none"
                                  transform={`translate(${absoluteLabelPoint.x}, ${absoluteLabelPoint.y})`}
                                >
                                  <rect
                                    x={-58}
                                    y={-18}
                                    width={116}
                                    height={36}
                                    rx={12}
                                    fill={isSelectedRegion ? 'rgba(19,17,43,0.92)' : 'rgba(255,255,255,0.92)'}
                                    stroke={isSelectedRegion ? 'rgba(54,181,49,0.45)' : 'rgba(19,17,43,0.1)'}
                                  />
                                  <text
                                    x={0}
                                    y={6}
                                    textAnchor="middle"
                                    fontSize={14}
                                    fontWeight={700}
                                    fill={isSelectedRegion ? '#ffffff' : '#13112B'}
                                  >
                                    {sector.name}
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
                                      className="cursor-grab active:cursor-grabbing"
                                      onPointerDown={(event) => handleStartVertexDrag(index, event)}
                                    />
                                    <circle
                                      cx={absolutePoint.x}
                                      cy={absolutePoint.y}
                                      r={7}
                                      fill={selectedVertexIndex === index ? '#1F7C22' : '#36B531'}
                                      stroke="#ffffff"
                                      strokeWidth={3}
                                      className="cursor-grab active:cursor-grabbing"
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
                                    className="cursor-grab active:cursor-grabbing"
                                    onPointerDown={handleStartLabelDrag}
                                  />
                                  <circle
                                    cx={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).x}
                                    cy={percentToAbsolute(normalizedDraftLabel, mapWidth, mapHeight).y}
                                    r={7}
                                    fill="#13112B"
                                    stroke="#ffffff"
                                    strokeWidth={3}
                                    className="cursor-grab active:cursor-grabbing"
                                    onPointerDown={handleStartLabelDrag}
                                  />
                                </g>
                              ) : null}
                            </g>
                          ) : null}
                      </svg>
                    </InteractiveMapStage>
                  )}
                  <div className="border-t border-[#DDE7DF] bg-white px-4 py-4">
                    {selectedSector ? (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-[#13112B]">{selectedSector.name}</div>
                            <div className="mt-1 text-xs text-[#13112B]/58">
                              {editorMode === 'create' ? 'Neue Fläche zeichnen' : 'Bestehende Fläche anpassen'}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'w-fit rounded-lg px-3 py-1',
                              editorMode === 'create'
                                ? 'border-[#DDE7DF] bg-white text-[#13112B]/65'
                                : 'border-[#DDE7DF] bg-[#F7FBF7] text-[#13112B]',
                            )}
                          >
                            {editorMode === 'create' ? 'neu' : 'bearbeiten'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-lg border-[#DDE7DF] bg-white px-3 py-1 text-[#13112B]">
                            {draftPoints.length} Punkte
                          </Badge>
                          <Badge variant="outline" className="rounded-lg border-[#DDE7DF] bg-white px-3 py-1 text-[#13112B]/72">
                            Label {draftLabel ? 'gesetzt' : draftPoints.length >= 3 ? 'zentrierbar' : 'offen'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-lg px-3 py-1',
                              isDraftDirty
                                ? 'border-[#36B531] bg-[#F7FBF7] text-[#13112B]'
                                : 'border-[#DDE7DF] bg-white text-[#13112B]/72',
                            )}
                          >
                            {isDraftDirty ? 'ungespeichert' : 'synchron'}
                          </Badge>
                        </div>

                        {hasProposalOverlay && editorMode === 'create' ? (
                          <div className="rounded-xl border border-[#DDE7DF] bg-[#FCFEFC] px-4 py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#13112B]/45">
                                  Vorschlagsmodus
                                </div>
                                <div className="mt-1 text-sm leading-6 text-[#13112B]/68">
                                  Tippe direkt auf eine sichtbare Wandfläche auf der Karte. Die gefundene Form wird danach als editierbare Fläche übernommen.
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowProposalOverlay((current) => !current);
                                  setHoveredProposalId(null);
                                }}
                                className="w-fit rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
                              >
                                {showProposalOverlay ? 'Vorschlagsmodus aus' : 'Vorschlagsmodus an'}
                              </Button>
                            </div>
                            <p className="mt-3 text-sm text-[#13112B]/58">
                              {showProposalOverlay
                                ? 'Aktiv. Die Wandflächen auf der Karte können jetzt direkt angetippt werden.'
                                : 'Aus. Wenn du Hilfe willst, schalte den Vorschlagsmodus wieder ein.'}
                            </p>
                          </div>
                        ) : null}

                        {!isMobile ? editorActionBar : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFEFC] px-4 py-6 text-sm text-[#13112B]/58">
                        Wähle einen Sektor aus, um auf der Karte eine Fläche anzulegen oder zu bearbeiten.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {isMobile && managedHallMap && selectedSector ? (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-[#DDE7DF] bg-[#FCFEFC]/95 px-4 py-3 backdrop-blur">
          {editorActionBar}
        </div>
      ) : null}

      <Sheet open={isSectorSheetOpen} onOpenChange={setIsSectorSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl bg-white px-4 pb-8 pt-6">
          <SheetHeader>
            <SheetTitle>Sektoren verwalten</SheetTitle>
            <SheetDescription>Wähle einen Sektor aus, um ihn auf der Hallenkarte zuzuordnen oder zu bearbeiten.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{renderSectorList()}</div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="rounded-2xl border-[#DDE7DF]">
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deine Änderungen an der aktuellen Sektorfläche sind noch nicht gespeichert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-[#DDE7DF]" onClick={handleDiscardCancel}>
              Weiter bearbeiten
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardConfirm} className="rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B]">
              Verwerfen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteRegionDialog} onOpenChange={setShowDeleteRegionDialog}>
        <AlertDialogContent className="rounded-2xl border-[#DDE7DF]">
          <AlertDialogHeader>
            <AlertDialogTitle>Sektorfläche löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Region wird von der Hallenkarte entfernt. Der Sektor selbst bleibt erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-[#DDE7DF]">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRegion} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteHallMapDialog} onOpenChange={setShowDeleteHallMapDialog}>
        <AlertDialogContent className="rounded-2xl border-[#DDE7DF]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hallenkarte löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die aktive Hallenkarte und alle zugeordneten Sektorflächen werden entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-[#DDE7DF]">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHallMap} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Karte löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


