import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  SetterBoulderEditorDialog,
  type SetterBoulderDraft,
} from '@/components/setter/SetterBoulderEditorDialog';
import { SetterSurface } from '@/components/setter/SetterWorkspaceShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpload } from '@/contexts/UploadContext';
import {
  useBoulderAttributeAssignments,
  useBoulderAttributeCatalog,
  useSetBoulderAttributes,
} from '@/hooks/useBoulderCommunity';
import { useBouldersWithSectors, useDeleteBoulder, useUpdateBoulder } from '@/hooks/useBoulders';
import { useColors } from '@/hooks/useColors';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';
import type { Boulder } from '@/types/boulder';

import { formatDifficulty, getTextClassForHex, getThumbnailUrl } from './setterPageUtils';

function mapBoulderToDraft(
  boulder: Boulder,
  sectors: Array<{ id: string; name: string }>,
  colors: Array<{ id: string; name: string }>,
): SetterBoulderDraft {
  const sectorId = sectors.find((sector) => sector.name === boulder.sector)?.id ?? '';
  const sectorId2 = boulder.sector2
    ? sectors.find((sector) => sector.name === boulder.sector2)?.id
    : undefined;
  const colorId = colors.find((color) => color.name === boulder.color)?.id ?? colors[0]?.id ?? '';

  return {
    id: boulder.id,
    name: boulder.name,
    sectorId,
    sectorId2,
    spansMultipleSectors: Boolean(sectorId2),
    colorId,
    difficulty: boulder.difficulty,
    note: boulder.note ?? '',
    attributeIds: [],
    videoFile: null,
    thumbFile: null,
    existingThumbnailUrl: getThumbnailUrl(boulder),
    existingVideoUrl: boulder.betaVideoUrl ?? null,
    mapX: boulder.mapX,
    mapY: boulder.mapY,
  };
}

export default function SetterEditPage() {
  const { data: sectors = [] } = useSectorsTransformed();
  const { data: boulders = [], isLoading } = useBouldersWithSectors();
  const { data: colors = [] } = useColors();
  const { data: attributeCatalog = [] } = useBoulderAttributeCatalog();
  const updateBoulder = useUpdateBoulder();
  const deleteBoulder = useDeleteBoulder();
  const setBoulderAttributes = useSetBoulderAttributes();
  const { startUpload } = useUpload();

  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editorDraft, setEditorDraft] = useState<SetterBoulderDraft | null>(null);

  const selectedAttributeQuery = useBoulderAttributeAssignments(editorDraft?.id, Boolean(editorDraft?.id));

  useEffect(() => {
    if (!editorDraft?.id || !selectedAttributeQuery.data) {
      return;
    }

    setEditorDraft((current) => {
      if (!current || current.id !== editorDraft.id) {
        return current;
      }

      return {
        ...current,
        attributeIds: selectedAttributeQuery.data,
      };
    });
  }, [editorDraft?.id, selectedAttributeQuery.data]);

  const colorHexMap = useMemo(
    () => new Map(colors.map((color) => [color.name, color.hex ?? undefined])),
    [colors],
  );

  const filteredBoulders = useMemo(() => {
    const selectedSectorName =
      sectorFilter === 'all'
        ? null
        : sectors.find((sector) => sector.id === sectorFilter)?.name ?? null;

    return boulders
      .filter((boulder) => {
        if (
          selectedSectorName &&
          boulder.sector !== selectedSectorName &&
          boulder.sector2 !== selectedSectorName
        ) {
          return false;
        }

        if (colorFilter !== 'all' && boulder.color !== colorFilter) {
          return false;
        }

        if (!search.trim()) {
          return true;
        }

        const query = search.trim().toLowerCase();
        const sectorText = boulder.sector2 ? `${boulder.sector} ${boulder.sector2}` : boulder.sector;

        return (
          boulder.name.toLowerCase().includes(query) ||
          sectorText.toLowerCase().includes(query)
        );
      })
      .slice(0, 100);
  }, [boulders, colorFilter, search, sectorFilter, sectors]);

  const openEditor = (boulder: Boulder) => {
    setEditorDraft(mapBoulderToDraft(boulder, sectors, colors));
  };

  const toggleSelected = (boulderId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(boulderId);
      } else {
        next.delete(boulderId);
      }

      return next;
    });
  };

  const deleteMany = async (ids: string[]) => {
    for (const id of ids) {
      await deleteBoulder.mutateAsync(id);
    }
  };

  const saveEditor = async () => {
    if (!editorDraft) {
      return;
    }

    const colorName = colors.find((color) => color.id === editorDraft.colorId)?.name ?? null;

    if (!editorDraft.name.trim() || !editorDraft.sectorId || !colorName) {
      toast.error('Bitte Name, Sektor und Farbe ausfüllen.');
      return;
    }

    await updateBoulder.mutateAsync({
      id: editorDraft.id,
      name: editorDraft.name.trim(),
      sector_id: editorDraft.sectorId,
      sector_id_2:
        editorDraft.spansMultipleSectors && editorDraft.sectorId2
          ? editorDraft.sectorId2
          : null,
      difficulty: editorDraft.difficulty,
      color: colorName,
      beta_video_url: editorDraft.videoFile ? null : editorDraft.existingVideoUrl ?? null,
      thumbnail_url: editorDraft.thumbFile ? null : editorDraft.existingThumbnailUrl ?? null,
      note: editorDraft.note.trim() || null,
      map_x: typeof editorDraft.mapX === 'number' ? editorDraft.mapX : null,
      map_y: typeof editorDraft.mapY === 'number' ? editorDraft.mapY : null,
    } as any);

    await setBoulderAttributes.mutateAsync({
      boulderId: editorDraft.id,
      attributeIds: editorDraft.attributeIds,
    });

    if (editorDraft.thumbFile) {
      await startUpload(editorDraft.id, editorDraft.thumbFile, 'thumbnail', editorDraft.sectorId);
    }

    if (editorDraft.videoFile) {
      await startUpload(editorDraft.id, editorDraft.videoFile, 'video', editorDraft.sectorId);
    }

    setEditorDraft(null);
  };

  const deleteFromEditor = async () => {
    if (!editorDraft) {
      return;
    }

    await deleteBoulder.mutateAsync(editorDraft.id);
    setEditorDraft(null);
  };

  return (
    <div className="space-y-5 pb-32">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/42" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Boulder suchen"
            className="h-11 rounded-xl border-[#DCEEDF] bg-white pl-10"
          />
        </div>

        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="h-11 rounded-xl border-[#DCEEDF] bg-white">
            <SelectValue placeholder="Sektor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Sektoren</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector.id} value={sector.id}>
                {sector.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="h-11 rounded-xl border-[#DCEEDF] bg-white">
            <SelectValue placeholder="Farbe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Farben</SelectItem>
            {colors.map((color) => (
              <SelectItem key={color.id} value={color.name}>
                {color.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SetterSurface className="overflow-hidden p-0">
        {isLoading ? (
          <div className="px-5 py-10 text-sm text-[#13112B]/68">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#36B531]" />
              Boulderbestand wird geladen.
            </div>
          </div>
        ) : filteredBoulders.length > 0 ? (
          <div className="divide-y divide-[#E7F0E8]">
            {filteredBoulders.map((boulder) => {
              const thumbnailUrl = getThumbnailUrl(boulder);
              const colorHex = colorHexMap.get(boulder.color) ?? '#94A3B8';
              const isSelected = selectedIds.has(boulder.id);

              return (
                <article
                  key={boulder.id}
                  className={cn('px-4 py-2.5 transition-colors sm:px-5', isSelected && 'bg-[#F7FBF7]')}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleSelected(boulder.id, checked === true)}
                      aria-label={`${boulder.name} auswählen`}
                      className="shrink-0 bg-white"
                      onClick={(event) => event.stopPropagation()}
                    />

                    <button
                      type="button"
                      onClick={() => openEditor(boulder)}
                      className="min-w-0 flex-1 rounded-xl px-1 py-2 text-left transition-colors active:bg-[#F4F8F4] sm:hover:bg-[#F7FBF7]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E7F0E8] bg-[#F5F9F5]">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={boulder.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-[#13112B]/45">
                              Kein Bild
                            </div>
                          )}
                          <span
                            className={cn(
                              'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm',
                              getTextClassForHex(colorHex),
                            )}
                            style={{ backgroundColor: colorHex }}
                          >
                            {formatDifficulty(boulder.difficulty)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 overflow-hidden break-words text-[1rem] font-semibold leading-tight tracking-[-0.02em] text-[#13112B]">
                            {boulder.name}
                          </p>
                          <p className="mt-1 truncate text-sm text-[#13112B]/60">
                            {boulder.sector2 ? `${boulder.sector} → ${boulder.sector2}` : boulder.sector}
                          </p>
                        </div>
                      </div>
                    </button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[#CFE4B8] bg-[#F7FBF7] text-[#13112B]/72 hover:bg-[#EEF6E1] hover:text-[#13112B]"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditor(boulder);
                      }}
                      aria-label={`${boulder.name} bearbeiten`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-sm text-[#13112B]/60">
            Keine Boulder für die aktuelle Suche gefunden.
          </div>
        )}
      </SetterSurface>

      <SetterBoulderEditorDialog
        open={Boolean(editorDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setEditorDraft(null);
          }
        }}
        title="Boulder bearbeiten"
        submitLabel="Speichern"
        draft={editorDraft}
        colors={colors}
        sectors={sectors}
        attributeCatalog={attributeCatalog}
        onDraftChange={setEditorDraft}
        onSubmit={saveEditor}
        onDelete={deleteFromEditor}
        isSubmitting={updateBoulder.isPending || setBoulderAttributes.isPending}
        isDeleting={deleteBoulder.isPending}
      />

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-[125] md:bottom-6 md:left-auto md:right-6 md:w-auto">
          <div className="flex items-center gap-2 rounded-2xl border border-[#DCEEDF] bg-white/96 p-2 shadow-[0_18px_40px_rgba(19,17,43,0.12)] backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-[#F1D7D2] px-4 text-[#B64332] hover:bg-[#FFF4F2] hover:text-[#B64332]"
              disabled={deleteBoulder.isPending}
              onClick={async () => {
                await deleteMany(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
            >
              {deleteBoulder.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Auswahl löschen ({selectedIds.size})
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
