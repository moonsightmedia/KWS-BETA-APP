import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ImagePlus,
  Loader2,
  Map,
  MapPinned,
  Pencil,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSectors } from '@/hooks/useSectors';
import {
  useCreateHallMap,
  useCreateSectorMapRegion,
  useDeleteHallMap,
  useDeleteSectorMapRegion,
  useHallMaps,
  useSectorMapRegions,
  useUpdateHallMap,
  useUpdateSectorMapRegion,
} from '@/hooks/useHallMaps';
import { deleteHallMapImage, uploadHallMapImage } from '@/integrations/supabase/storage';
import type { HallMap, MapPoint, SectorMapRegion } from '@/types/hallMap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type DraftMode = 'create' | 'edit';
type DragState =
  | { type: 'point'; index: number }
  | { type: 'label' }
  | null;

const MIN_POINTS = 3;

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  });
}

function centroid(points: MapPoint[]) {
  if (points.length === 0) {
    return { x: 50, y: 50 };
  }

  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) < 0.0001) {
    const averageX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const averageY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    return { x: averageX, y: averageY };
  }

  return {
    x: centroidX / (3 * twiceArea),
    y: centroidY / (3 * twiceArea),
  };
}

function toPolygonString(points: MapPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function buildRegionDraft(region: SectorMapRegion) {
  const autoLabel = centroid(region.points_json);
  return {
    sectorId: region.sector_id,
    points: region.points_json,
    label: {
      x: region.label_x ?? autoLabel.x,
      y: region.label_y ?? autoLabel.y,
      manual: region.label_x !== null && region.label_y !== null,
    },
  };
}

function getSectorName(sectors: Array<{ id: string; name: string }>, sectorId: string | null) {
  if (!sectorId) return 'Kein Sektor gewählt';
  return sectors.find((sector) => sector.id === sectorId)?.name ?? 'Unbekannter Sektor';
}

export function HallMapManagement() {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;
  const dataEnabled = !authLoading && !!accessToken;

  const { data: hallMaps = [], isLoading: mapsLoading } = useHallMaps(accessToken, dataEnabled);
  const { data: sectors = [], isLoading: sectorsLoading } = useSectors(dataEnabled);

  const createHallMap = useCreateHallMap(accessToken);
  const updateHallMap = useUpdateHallMap(accessToken);
  const deleteHallMap = useDeleteHallMap(accessToken);
  const createRegion = useCreateSectorMapRegion(accessToken);
  const updateRegion = useUpdateSectorMapRegion(accessToken);
  const deleteRegion = useDeleteSectorMapRegion(accessToken);

  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [mapName, setMapName] = useState('');
  const [mapActive, setMapActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingMap, setSavingMap] = useState(false);

  const [draftMode, setDraftMode] = useState<DraftMode>('create');
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<MapPoint[]>([]);
  const [draftLabel, setDraftLabel] = useState<{ x: number; y: number; manual: boolean } | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);

  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedMapId && hallMaps.length > 0) {
      setSelectedMapId(hallMaps[0].id);
    }
  }, [hallMaps, selectedMapId]);

  const selectedMap = useMemo(
    () => hallMaps.find((hallMap) => hallMap.id === selectedMapId) ?? null,
    [hallMaps, selectedMapId],
  );

  const { data: regions = [], isLoading: regionsLoading } = useSectorMapRegions(selectedMap?.id, accessToken, dataEnabled);

  useEffect(() => {
    if (!selectedMap) {
      setMapName('');
      setMapActive(true);
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress(0);
      setSelectedSectorId(null);
      setDraftPoints([]);
      setDraftLabel(null);
      setDraftMode('create');
      setEditingRegionId(null);
      return;
    }

    setMapName(selectedMap.name);
    setMapActive(selectedMap.is_active);
    setImageFile(null);
    setImagePreview(selectedMap.image_url);
    setUploadProgress(0);
    setSelectedSectorId(null);
    setDraftPoints([]);
    setDraftLabel(null);
    setDraftMode('create');
    setEditingRegionId(null);
  }, [selectedMap?.id]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

      if (dragState.type === 'point') {
        setDraftPoints((current) =>
          current.map((point, index) => (index === dragState.index ? { x, y } : point)),
        );
        setDraftLabel((current) => (current?.manual ? current : { ...centroid(draftPoints), manual: false }));
      }

      if (dragState.type === 'label') {
        setDraftLabel({ x, y, manual: true });
      }
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, draftPoints]);

  useEffect(() => {
    if (!draftLabel || draftLabel.manual) return;
    setDraftLabel({ ...centroid(draftPoints), manual: false });
  }, [draftPoints, draftLabel]);

  const regionsWithSector = useMemo(
    () =>
      regions.map((region) => ({
        ...region,
        sectorName: getSectorName(sectors, region.sector_id),
      })),
    [regions, sectors],
  );

  const statusText = useMemo(() => {
    if (!selectedMap) return 'Wähle oder erstelle zuerst einen Hallenplan.';
    if (!selectedSectorId) return 'Wähle einen Sektor, bevor du speicherst.';
    if (draftPoints.length < MIN_POINTS) return `Es fehlen noch ${MIN_POINTS - draftPoints.length} Punkte.`;
    return draftMode === 'edit' ? 'Region kann aktualisiert werden.' : 'Region kann gespeichert werden.';
  }, [draftMode, draftPoints.length, selectedMap, selectedSectorId]);

  const canSaveRegion = !!selectedMap && !!selectedSectorId && draftPoints.length >= MIN_POINTS;
  const isBusy =
    savingMap ||
    createHallMap.isPending ||
    updateHallMap.isPending ||
    deleteHallMap.isPending ||
    createRegion.isPending ||
    updateRegion.isPending ||
    deleteRegion.isPending;

  const handleMapImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setImageFile(nextFile);

    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    if (!nextFile) {
      setImagePreview(selectedMap?.image_url ?? null);
      return;
    }

    setImagePreview(URL.createObjectURL(nextFile));
  };

  const resetDraft = () => {
    setDraftMode('create');
    setEditingRegionId(null);
    setSelectedSectorId(null);
    setDraftPoints([]);
    setDraftLabel(null);
    setDragState(null);
  };

  const startEditingRegion = (region: SectorMapRegion) => {
    const nextDraft = buildRegionDraft(region);
    setDraftMode('edit');
    setEditingRegionId(region.id);
    setSelectedSectorId(nextDraft.sectorId);
    setDraftPoints(nextDraft.points);
    setDraftLabel(nextDraft.label);
  };

  const handleMapClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || dragState) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-handle="true"]')) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

    setDraftPoints((current) => {
      const next = [...current, { x, y }];
      if (!draftLabel || !draftLabel.manual) {
        setDraftLabel({ ...centroid(next), manual: false });
      }
      return next;
    });
  };

  const persistMap = async () => {
    if (!mapName.trim()) return;

    setSavingMap(true);
    try {
      let nextImageUrl = selectedMap?.image_url ?? '';
      let nextWidth = selectedMap?.width ?? null;
      let nextHeight = selectedMap?.height ?? null;

      if (imageFile) {
        const targetId = selectedMap?.id ?? crypto.randomUUID();
        nextImageUrl = await uploadHallMapImage(imageFile, targetId, setUploadProgress);
        const dimensions = await getImageDimensions(nextImageUrl);
        nextWidth = dimensions.width;
        nextHeight = dimensions.height;
      }

      if (!nextImageUrl) {
        throw new Error('Bitte wähle zuerst ein Hallenplan-Bild aus.');
      }

      if (selectedMap) {
        const previousImage = selectedMap.image_url;
        await updateHallMap.mutateAsync({
          id: selectedMap.id,
          name: mapName.trim(),
          image_url: nextImageUrl,
          width: nextWidth,
          height: nextHeight,
          is_active: mapActive,
        });

        if (imageFile && previousImage && previousImage !== nextImageUrl) {
          await deleteHallMapImage(previousImage);
        }
      } else {
        const created = await createHallMap.mutateAsync({
          name: mapName.trim(),
          image_url: nextImageUrl,
          width: nextWidth,
          height: nextHeight,
          is_active: mapActive,
        });

        if (created?.id) {
          setSelectedMapId(created.id);
        }
      }

      setImageFile(null);
      setUploadProgress(0);
    } finally {
      setSavingMap(false);
    }
  };

  const persistRegion = async () => {
    if (!selectedMap || !selectedSectorId || draftPoints.length < MIN_POINTS) return;

    const autoLabel = centroid(draftPoints);
    const payload = {
      hall_map_id: selectedMap.id,
      sector_id: selectedSectorId,
      shape_type: 'polygon' as const,
      points_json: draftPoints,
      label_x: draftLabel?.manual ? draftLabel.x : autoLabel.x,
      label_y: draftLabel?.manual ? draftLabel.y : autoLabel.y,
      z_index: editingRegionId ? regions.find((region) => region.id === editingRegionId)?.z_index ?? 0 : regions.length,
    };

    if (editingRegionId) {
      await updateRegion.mutateAsync({ id: editingRegionId, ...payload });
    } else {
      await createRegion.mutateAsync(payload);
    }

    resetDraft();
  };

  const handleDeleteSelectedMap = async () => {
    if (!selectedMap) return;

    const confirmed = window.confirm(`Hallenkarte "${selectedMap.name}" wirklich löschen?`);
    if (!confirmed) return;

    await deleteHallMap.mutateAsync(selectedMap.id);
    await deleteHallMapImage(selectedMap.image_url);

    const remaining = hallMaps.filter((hallMap) => hallMap.id !== selectedMap.id);
    setSelectedMapId(remaining[0]?.id ?? null);
  };

  const handleDeleteRegion = async (region: SectorMapRegion) => {
    const confirmed = window.confirm(`Sektorfläche für "${getSectorName(sectors, region.sector_id)}" wirklich löschen?`);
    if (!confirmed) return;

    await deleteRegion.mutateAsync({ id: region.id, hallMapId: region.hall_map_id });
    if (editingRegionId === region.id) {
      resetDraft();
    }
  };

  if (authLoading || mapsLoading || sectorsLoading) {
    return (
      <Card className="border-[#E3ECE5] bg-white">
        <CardContent className="flex min-h-[240px] items-center justify-center">
          <div className="flex items-center gap-3 text-[#13112B]/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Hallenkarten werden geladen…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <Card className="border-[#E3ECE5] bg-white">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-[#13112B]">Pläne</CardTitle>
            <CardDescription>
              Wähle einen Hallenplan oder lege einen neuen an. Der aktive Plan wird später in der Boulder-Ansicht genutzt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {hallMaps.map((hallMap) => (
                <button
                  key={hallMap.id}
                  type="button"
                  onClick={() => setSelectedMapId(hallMap.id)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                    selectedMapId === hallMap.id
                      ? 'border-[#36B531] bg-[#F4FBF4]'
                      : 'border-[#E3ECE5] bg-white hover:border-[#BFD7C2]',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#13112B]">{hallMap.name}</div>
                      <div className="text-xs text-[#13112B]/55">
                        {hallMap.width && hallMap.height ? `${hallMap.width} × ${hallMap.height}` : 'Bildgröße folgt nach Upload'}
                      </div>
                    </div>
                    {hallMap.is_active && (
                      <span className="rounded-full bg-[#E9F9E9] px-2.5 py-1 text-[11px] font-semibold text-[#2F8F2B]">
                        Aktiv
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-[#CFE2D2] text-[#13112B]"
              onClick={() => {
                setSelectedMapId(null);
                setMapName('');
                setMapActive(true);
                setImageFile(null);
                setImagePreview(null);
                setUploadProgress(0);
                resetDraft();
              }}
            >
              <ImagePlus className="h-4 w-4" />
              Neuen Hallenplan anlegen
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#E3ECE5] bg-white">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-[#13112B]">Editor</CardTitle>
            <CardDescription>
              Klicke direkt auf den Plan, um Punkte zu setzen. Punkte und Label können anschließend verschoben werden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF7] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[#13112B]">
                  <span className="font-medium">Planname</span>
                  <input
                    value={mapName}
                    onChange={(event) => setMapName(event.target.value)}
                    placeholder="z. B. Boulderhalle"
                    className="h-11 w-full rounded-xl border border-[#D8E4DA] bg-white px-3 text-sm outline-none transition focus:border-[#36B531]"
                  />
                </label>

                <label className="space-y-2 text-sm text-[#13112B]">
                  <span className="font-medium">Hallenplan</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleMapImageSelect}
                    className="block h-11 w-full rounded-xl border border-[#D8E4DA] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#E9F9E9] file:px-3 file:py-1.5 file:text-[#2F8F2B]"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E3ECE5] bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[#13112B]">Aktiver Plan</div>
                  <div className="text-xs text-[#13112B]/60">Nur eine Hallenkarte ist gleichzeitig aktiv.</div>
                </div>
                <Switch checked={mapActive} onCheckedChange={setMapActive} />
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#13112B]/60">
                    <span>Bild wird hochgeladen</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E6EFE7]">
                    <div className="h-full rounded-full bg-[#36B531]" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" onClick={persistMap} disabled={isBusy || !mapName.trim() || !imagePreview}>
                  {savingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedMap ? 'Plan aktualisieren' : 'Plan speichern'}
                </Button>
                {selectedMap && (
                  <Button type="button" variant="outline" onClick={handleDeleteSelectedMap} disabled={isBusy}>
                    <Trash2 className="h-4 w-4" />
                    Plan löschen
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF7] p-4">
              {imagePreview ? (
                <div className="space-y-4">
                  <div
                    ref={imageContainerRef}
                    className="relative w-full overflow-hidden rounded-2xl border border-[#DCE6DE] bg-white"
                    style={{ aspectRatio: selectedMap?.width && selectedMap?.height ? `${selectedMap.width} / ${selectedMap.height}` : '16 / 10' }}
                    onClick={handleMapClick}
                  >
                    <img src={imagePreview} alt="Hallenplan" className="absolute inset-0 h-full w-full object-contain" />
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                      {regionsWithSector.map((region) => (
                        <g key={region.id}>
                          <polygon
                            points={toPolygonString(region.points_json)}
                            fill={editingRegionId === region.id ? 'rgba(54,181,49,0.30)' : 'rgba(19,17,43,0.12)'}
                            stroke={editingRegionId === region.id ? '#36B531' : 'rgba(19,17,43,0.45)'}
                            strokeWidth={editingRegionId === region.id ? 0.8 : 0.45}
                            className="cursor-pointer transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditingRegion(region);
                            }}
                          />
                        </g>
                      ))}

                      {draftPoints.length > 0 && (
                        <>
                          <polyline
                            points={toPolygonString(draftPoints)}
                            fill={draftPoints.length >= MIN_POINTS ? 'rgba(54,181,49,0.26)' : 'rgba(54,181,49,0.14)'}
                            stroke="#36B531"
                            strokeWidth={0.8}
                          />
                          {draftLabel && (
                            <g
                              transform={`translate(${draftLabel.x}, ${draftLabel.y})`}
                              data-handle="true"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setDragState({ type: 'label' });
                              }}
                              className="cursor-move"
                            >
                              <rect
                                x={-8}
                                y={-3.4}
                                rx={2.6}
                                width={16}
                                height={6.8}
                                fill="#13112B"
                                opacity={0.92}
                              />
                              <text
                                x={0}
                                y={0.8}
                                textAnchor="middle"
                                className="fill-white text-[2.4px] font-semibold"
                              >
                                {`${getSectorName(sectors, selectedSectorId)} (${draftPoints.length})`}
                              </text>
                            </g>
                          )}
                          {draftPoints.map((point, index) => (
                            <g
                              key={`${point.x}-${point.y}-${index}`}
                              transform={`translate(${point.x}, ${point.y})`}
                              data-handle="true"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setDragState({ type: 'point', index });
                              }}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <circle r={2.1} fill="rgba(19,17,43,0.15)" />
                              <circle r={1.1} fill="#13112B" />
                            </g>
                          ))}
                        </>
                      )}
                    </svg>
                  </div>

                  <div className="rounded-xl border border-[#E3ECE5] bg-white px-4 py-3 text-sm text-[#13112B]/72">
                    {statusText}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#CFDDCF] bg-white text-center text-sm text-[#13112B]/55">
                  <div className="space-y-2 px-6">
                    <Map className="mx-auto h-8 w-8 text-[#36B531]" />
                    <p>Lege zuerst einen Hallenplan an oder wähle einen bestehenden Plan.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E3ECE5] bg-white">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-[#13112B]">Regionen</CardTitle>
            <CardDescription>
              Weise den aktuellen Entwurf einem Sektor zu und verwalte bereits gespeicherte Flächen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF7] p-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-[#13112B]">
                  {draftMode === 'edit' ? 'Sektorfläche bearbeiten' : 'Neue Sektorfläche'}
                </div>
                <Select value={selectedSectorId ?? ''} onValueChange={setSelectedSectorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sektor auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" onClick={() => setDraftPoints((current) => current.slice(0, -1))} disabled={draftPoints.length === 0}>
                    <Undo2 className="h-4 w-4" />
                    Letzten Punkt entfernen
                  </Button>
                  <Button type="button" variant="outline" onClick={resetDraft} disabled={draftPoints.length === 0 && !editingRegionId}>
                    <X className="h-4 w-4" />
                    Entwurf verwerfen
                  </Button>
                </div>

                <Button type="button" className="w-full" onClick={persistRegion} disabled={!canSaveRegion || isBusy}>
                  {(createRegion.isPending || updateRegion.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {draftMode === 'edit' ? 'Sektorfläche aktualisieren' : 'Sektorfläche speichern'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-[#13112B]/70"
                  disabled={!draftLabel}
                  onClick={() => setDraftLabel(draftPoints.length > 0 ? { ...centroid(draftPoints), manual: false } : null)}
                >
                  Label auf Automatik zurücksetzen
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF7] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-[#13112B]">Gespeicherte Flächen</div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#13112B]/65">
                  {regions.length}
                </span>
              </div>

              {regionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#13112B]/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regionen werden geladen…
                </div>
              ) : regions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#CFDDCF] bg-white px-4 py-5 text-sm text-[#13112B]/55">
                  Für diesen Plan sind noch keine Sektorflächen gespeichert.
                </div>
              ) : (
                <div className="space-y-3">
                  {regionsWithSector.map((region) => (
                    <div key={region.id} className="rounded-xl border border-[#E3ECE5] bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#13112B]">{region.sectorName}</div>
                          <div className="text-xs text-[#13112B]/55">
                            {region.points_json.length} Punkte
                            {editingRegionId === region.id ? ' • wird bearbeitet' : ''}
                          </div>
                        </div>
                        {editingRegionId === region.id && (
                          <span className="rounded-full bg-[#E9F9E9] px-2.5 py-1 text-[11px] font-semibold text-[#2F8F2B]">
                            Aktiv
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => startEditingRegion(region)}>
                          <Pencil className="h-4 w-4" />
                          Bearbeiten
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => handleDeleteRegion(region)}>
                          <Trash2 className="h-4 w-4" />
                          Löschen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#E3ECE5] bg-[#F7FAF7] p-4 text-sm text-[#13112B]/72">
              <div className="mb-2 flex items-center gap-2 font-medium text-[#13112B]">
                <MapPinned className="h-4 w-4 text-[#36B531]" />
                So funktioniert der Editor
              </div>
              <p>Klick auf das Bild setzt Punkte. Ziehe Punkte oder das Label direkt im Plan, um die Fläche präzise auszurichten.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

