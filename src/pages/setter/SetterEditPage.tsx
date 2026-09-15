import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  SetterBoulderEditorDialog,
  type SetterBoulderDraft,
} from "@/components/setter/SetterBoulderEditorDialog";
import { SetterSurface } from "@/components/setter/SetterWorkspaceShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ActiveFilterChip, BoulderFilterControls, BoulderFilterPanel, BoulderFilterTrigger } from "@/components/boulder/BoulderFilterControls";
import { SectorFilterOptions } from "@/components/boulder/SectorFilterOptions";
import {
  SetterConfirm,
  SetterSearch,
  SetterSelectionBar,
  SetterState,
} from "@/components/setter/SetterControls";
import { useUpload } from "@/contexts/UploadContext";
import {
  useBoulderAttributeAssignments,
  useBoulderAttributeCatalog,
  useSetBoulderAttributes,
} from "@/hooks/useBoulderCommunity";
import {
  type Boulder as BoulderRow,
  useBouldersWithSectors,
  useDeleteBoulder,
  useUpdateBoulder,
} from "@/hooks/useBoulders";
import { useColors } from "@/hooks/useColors";
import { useSectorsTransformed } from "@/hooks/useSectors";
import { cn } from "@/lib/utils";
import type { Boulder } from "@/types/boulder";
import {
  getBoulderColorBackgroundStyle,
  getBoulderColorLabel,
  matchesBoulderColorFilter,
} from "@/utils/colorUtils";

import { formatDifficulty, getThumbnailUrl } from "./setterPageUtils";

function mapBoulderToDraft(
  boulder: Boulder,
  sectors: Array<{ id: string; name: string }>,
  colors: Array<{ id: string; name: string }>,
): SetterBoulderDraft {
  const sectorId =
    boulder.sectorId ??
    sectors.find((sector) => sector.name === boulder.sector)?.id ??
    "";
  const sectorId2 =
    boulder.sector2Id ??
    (boulder.sector2
      ? sectors.find((sector) => sector.name === boulder.sector2)?.id
      : undefined);
  const colorId =
    colors.find((color) => color.name === boulder.color)?.id ??
    colors[0]?.id ??
    "";
  const colorId2 = boulder.color2
    ? colors.find((color) => color.name === boulder.color2)?.id
    : undefined;

  return {
    id: boulder.id,
    name: boulder.name,
    sectorId,
    sectorId2,
    spansMultipleSectors: Boolean(sectorId2),
    colorId,
    colorId2,
    difficulty: boulder.difficulty,
    note: boulder.note ?? "",
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
  const queryClient = useQueryClient();
  const sectorQuery = useSectorsTransformed();
  const sectors = sectorQuery.data ?? [];
  const boulderQuery = useBouldersWithSectors();
  const { data: boulders = [] } = boulderQuery;
  const colorQuery = useColors();
  const colors = colorQuery.data ?? [];
  const attributeQuery = useBoulderAttributeCatalog();
  const attributeCatalog = attributeQuery.data ?? [];
  const updateBoulder = useUpdateBoulder();
  const deleteBoulder = useDeleteBoulder();
  const setBoulderAttributes = useSetBoulderAttributes();
  const { startUpload, waitForUploadSessions } = useUpload();

  const [search, setSearch] = useState("");
  const [sectorFilters, setSectorFilters] = useState<string[]>([]);
  const [colorFilters, setColorFilters] = useState<string[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(50);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deletingMany, setDeletingMany] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorDraft, setEditorDraft] = useState<SetterBoulderDraft | null>(
    null,
  );

  const hydratedId = useRef<string | null>(null);
  const selectedAttributeQuery = useBoulderAttributeAssignments(
    editorDraft?.id,
    Boolean(editorDraft?.id),
  );

  useEffect(() => {
    if (!editorDraft?.id) {
      hydratedId.current = null;
      return;
    }
    if (hydratedId.current === editorDraft.id || !selectedAttributeQuery.data) {
      return;
    }

    hydratedId.current = editorDraft.id;
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

  const filteredBoulders = useMemo(() => {
    return boulders.filter((boulder) => {
      if (
        sectorFilters.length &&
        !sectorFilters.includes(boulder.sector) &&
        !(boulder.sector2 && sectorFilters.includes(boulder.sector2))
      ) {
        return false;
      }

      if (
        colorFilters.length && !colorFilters.some(color => matchesBoulderColorFilter(boulder.color, boulder.color2, color))
      ) {
        return false;
      }

      if (difficultyFilters.length && !difficultyFilters.includes(boulder.difficulty == null ? '?' : String(boulder.difficulty))) return false;

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();
      const sectorText = boulder.sector2
        ? `${boulder.sector} ${boulder.sector2}`
        : boulder.sector;

      return (
        boulder.name.toLowerCase().includes(query) ||
        sectorText.toLowerCase().includes(query)
      );
    });
  }, [boulders, colorFilters, search, sectorFilters, difficultyFilters]);

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

  const deleteMany = async () => {
    if (!deleteIds || deletingMany) return false;
    setDeletingMany(true);
    // Remove confirmed successes immediately. A partial failure retries only remaining IDs.
    const remaining = [...deleteIds];
    try {
      for (const id of deleteIds) {
        await deleteBoulder.mutateAsync(id);
        remaining.splice(remaining.indexOf(id), 1);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        setDeleteIds([...remaining]);
      }
      toast.success("Ausgewählte Boulder gelöscht.");
    } finally {
      setDeletingMany(false);
    }
  };

  const saveEditor = async () => {
    if (!editorDraft || saving) return;

    const colorName =
      colors.find((color) => color.id === editorDraft.colorId)?.name ?? null;
    const dualColorAttributeId = attributeCatalog.find(
      (attribute) => attribute.key === "dual_color",
    )?.id;
    const isDualColor = Boolean(
      dualColorAttributeId &&
        editorDraft.attributeIds.includes(dualColorAttributeId),
    );
    const colorName2 = isDualColor
      ? (colors.find((color) => color.id === editorDraft.colorId2)?.name ??
        null)
      : null;

    if (
      !editorDraft.name.trim() ||
      !editorDraft.sectorId ||
      !colorName ||
      (isDualColor && (!colorName2 || colorName2 === colorName))
    ) {
      toast.error("Bitte Name, Sektor und Farbe ausfüllen.");
      return;
    }

    setSaving(true);
    try {
      // Never send map_x/map_y — columns are not on the live DB (PGRST204).
      const updates: Partial<BoulderRow> & { id: string } = {
        id: editorDraft.id,
        name: editorDraft.name.trim(),
        sector_id: editorDraft.sectorId,
        sector_id_2:
          editorDraft.spansMultipleSectors && editorDraft.sectorId2
            ? editorDraft.sectorId2
            : null,
        difficulty: editorDraft.difficulty,
        color: colorName,
        color_2: colorName2,
        note: editorDraft.note.trim() || null,
      };

      // Keep existing media URLs while a new file uploads (upload job sets the new URL).
      if (!editorDraft.videoFile) {
        updates.beta_video_url = editorDraft.existingVideoUrl ?? null;
      }
      if (!editorDraft.thumbFile) {
        updates.thumbnail_url = editorDraft.existingThumbnailUrl ?? null;
      }

      await updateBoulder.mutateAsync(updates);

      await setBoulderAttributes.mutateAsync({
        boulderId: editorDraft.id,
        attributeIds: editorDraft.attributeIds,
      });

      const uploadSessionIds: string[] = [];

      if (editorDraft.thumbFile) {
        const thumbSessionId = await startUpload(
          editorDraft.id,
          editorDraft.thumbFile,
          "thumbnail",
          editorDraft.sectorId,
        );
        uploadSessionIds.push(thumbSessionId);
      }

      if (editorDraft.videoFile) {
        const videoSessionId = await startUpload(
          editorDraft.id,
          editorDraft.videoFile,
          "video",
          editorDraft.sectorId,
        );
        uploadSessionIds.push(videoSessionId);
      }

      if (uploadSessionIds.length > 0) {
        await waitForUploadSessions(uploadSessionIds);
      }

      setEditorDraft(null);
    } catch (error) {
      console.error("[SetterEditPage] saveEditor failed:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteFromEditor = async () => {
    if (!editorDraft) {
      return;
    }

    await deleteBoulder.mutateAsync(editorDraft.id);
    setEditorDraft(null);
  };

  const visible = filteredBoulders.slice(0, limit);
  const selectedVisibleIds = visible
    .filter((b) => selectedIds.has(b.id))
    .map((b) => b.id);
  const groups = new Map<string, typeof visible>();
  visible.forEach((b) => {
    const key = sectorFilters.length === 1 ? sectorFilters[0] : b.sector;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  });
  const changeFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setLimit(50);
    setSelectedIds(new Set());
  };
  const toggleFilter = (setter: (values: string[]) => void, values: string[], value: string) => changeFilter(setter, values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  const activeFilterCount = sectorFilters.length + colorFilters.length + difficultyFilters.length;
  const resetFilters = () => {
    setSectorFilters([]);
    setColorFilters([]);
    setDifficultyFilters([]);
    setSelectedIds(new Set());
    setLimit(50);
  };
  const loading =
    boulderQuery.isLoading ||
    sectorQuery.isLoading ||
    colorQuery.isLoading ||
    attributeQuery.isLoading;
  const failed =
    Boolean(boulderQuery.error) ||
    Boolean(sectorQuery.error) ||
    colorQuery.isError ||
    attributeQuery.isError;
  const disabled = deletingMany || saving;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SetterSearch
          value={search}
          onChange={(v) => changeFilter(setSearch, v)}
          disabled={disabled}
        />
        <BoulderFilterTrigger count={activeFilterCount} aria-expanded={filtersOpen} disabled={disabled || loading || failed} onClick={() => setFiltersOpen(true)} />
      </div>
      {activeFilterCount > 0 && <fieldset disabled={disabled} className="flex flex-wrap gap-2" aria-label="Aktive Filter">
        {sectorFilters.map(name => <ActiveFilterChip key={name} label={`Sektor ${name}`} onRemove={() => toggleFilter(setSectorFilters, sectorFilters, name)}>{name}</ActiveFilterChip>)}
        {colorFilters.map(name => <ActiveFilterChip key={name} label={`Farbe ${name}`} onRemove={() => toggleFilter(setColorFilters, colorFilters, name)}><span className="h-4 w-4 shrink-0 rounded-kws-badge ring-1 ring-inset ring-foreground/15" style={getBoulderColorBackgroundStyle(name, null, colors)} />{name}</ActiveFilterChip>)}
        {difficultyFilters.map(grade => <ActiveFilterChip key={grade} label={`Grad ${grade}`} onRemove={() => toggleFilter(setDifficultyFilters, difficultyFilters, grade)}>Grad {grade}</ActiveFilterChip>)}
      </fieldset>}
      <BoulderFilterPanel open={filtersOpen && !disabled && !loading && !failed} onOpenChange={setFiltersOpen} resultCount={filteredBoulders.length} activeCount={activeFilterCount} onReset={resetFilters}>
        <BoulderFilterControls hideReset difficulties={difficultyFilters} onDifficultyToggle={value => toggleFilter(setDifficultyFilters, difficultyFilters, value)} onDifficultyReset={() => changeFilter(setDifficultyFilters, [])} selectedColors={colorFilters} onColorToggle={value => toggleFilter(setColorFilters, colorFilters, value)} onColorReset={() => changeFilter(setColorFilters, [])} colors={colors} colorsLoading={colorQuery.isPending} colorsError={colorQuery.isError} onRetryColors={() => void colorQuery.refetch()} activeCount={activeFilterCount} onReset={resetFilters}
          sectorControls={<SectorFilterOptions sectors={sectors} selected={sectorFilters} onChange={values => changeFilter(setSectorFilters, values)} />} />
      </BoulderFilterPanel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!loading && !failed && <p className="text-sm text-muted-foreground" role="status">
          {filteredBoulders.length} Boulder
          {filteredBoulders.length > visible.length
            ? ` · ${visible.length} angezeigt`
            : ""}
        </p>}
        <div className="flex gap-1">
          {(search || activeFilterCount > 0) && (
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setSearch("");
                resetFilters();
              }}
            >
              Zurücksetzen
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={disabled || loading || failed || !visible.length}
            onClick={() =>
              setSelectedIds(
                selectedVisibleIds.length === visible.length
                  ? new Set()
                  : new Set(visible.map((b) => b.id)),
              )
            }
          >
            {visible.length > 0 && selectedVisibleIds.length === visible.length
              ? "Auswahl aufheben"
              : "Sichtbare wählen"}
          </Button>
        </div>
      </div>
      {loading ? (
        <SetterState loading title="Boulder werden geladen …" />
      ) : failed ? (
        <SetterState
          title="Boulder konnten nicht geladen werden."
          retrying={boulderQuery.isFetching || sectorQuery.isFetching || colorQuery.isFetching || attributeQuery.isFetching}
          onRetry={() => {
            void queryClient.refetchQueries({ queryKey: ["boulders"] });
            void queryClient.refetchQueries({ queryKey: ["sectors"] });
            void colorQuery.refetch();
            void attributeQuery.refetch();
          }}
        />
      ) : !visible.length ? (
        <SetterState
          title="Keine Boulder gefunden"
          description="Passe die Suche oder die Filter an."
        />
      ) : (
        [...groups.entries()]
          .sort(([a], [b]) => a.localeCompare(b, "de", { numeric: true }))
          .map(([name, items]) => (
            <section key={name} className="space-y-2">
              <h2 className="text-base font-semibold">
                {name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {items.length}
                </span>
              </h2>
              <SetterSurface className="overflow-hidden p-0 sm:p-0">
                <div className="divide-y divide-border/60">
                  {items.map((b) => (
                    <article
                      key={b.id}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 sm:px-3",
                        selectedIds.has(b.id) && "bg-primary/10",
                      )}
                    >
                      <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(b.id)}
                          disabled={disabled}
                          aria-label={`${b.name} auswählen`}
                          onCheckedChange={(checked) =>
                            toggleSelected(b.id, checked === true)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`${b.name} bearbeiten`}
                        className="flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-kws-control px-1 py-2 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => openEditor(b)}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-kws-control bg-secondary">
                          {getThumbnailUrl(b) && (
                            <img
                              src={getThumbnailUrl(b)!}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">
                            {b.name}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 rounded-kws-badge ring-1 ring-inset ring-foreground/15"
                              style={getBoulderColorBackgroundStyle(
                                b.color,
                                b.color2,
                                colors,
                              )}
                            />
                            {getBoulderColorLabel(b.color, b.color2)} · Grad{" "}
                            {formatDifficulty(b.difficulty)}
                          </p>
                          {b.sector2 && (
                            <p className="text-xs text-muted-foreground">
                              Auch {b.sector2}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </article>
                  ))}
                </div>
              </SetterSurface>
            </section>
          ))
      )}
      {!loading && !failed && visible.length < filteredBoulders.length && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={disabled}
          onClick={() => setLimit((n) => n + 50)}
        >
          Weitere Boulder anzeigen ({filteredBoulders.length - visible.length})
        </Button>
      )}
      <SetterBoulderEditorDialog
        open={!!editorDraft}
        onOpenChange={(open) => {
          if (!open) setEditorDraft(null);
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
        loadError={
          selectedAttributeQuery.isError
            ? "Merkmale konnten nicht geladen werden."
            : undefined
        }
        onRetryLoad={() => void selectedAttributeQuery.refetch()}
        isSubmitting={saving || selectedAttributeQuery.isLoading}
        isDeleting={deleteBoulder.isPending}
      />
      <SetterSelectionBar
        count={loading || failed ? 0 : selectedVisibleIds.length}
        disabled={disabled || loading || failed}
        onClear={() => setSelectedIds(new Set())}
      >
        <Button
          variant="destructive"
          disabled={disabled || loading || failed}
          onClick={() => setDeleteIds(selectedVisibleIds)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Löschen
        </Button>
      </SetterSelectionBar>
      <SetterConfirm
        open={deleteIds !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIds(null);
        }}
        title={`${deleteIds?.length ?? 0} Boulder löschen?`}
        description="Nur die ausgewählten Boulder werden dauerhaft gelöscht. Diese Aktion lässt sich nicht rückgängig machen."
        onConfirm={deleteMany}
      />
    </div>
  );
}
