import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Map,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { HallMapView } from "@/components/HallMapView";
import {
  SetterConfirm,
  SetterSearch,
  SetterSelect,
} from "@/components/setter/SetterControls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BoulderAttributeOption } from "@/types/community";
import { getColorBackgroundStyle } from "@/utils/colorUtils";
import { generateBoulderName } from "@/utils/nameGenerator";
import { isNativeVideoPipelineAvailable } from "@/utils/nativeVideoUpload";
import { pickNativeVideoForUpload } from "@/utils/nativeVideoPicker";
import { getUploadInputName, type UploadFileInput } from "@/types/upload";

export interface SetterBoulderDraft {
  id: string;
  name: string;
  sectorId: string;
  sectorId2?: string;
  spansMultipleSectors: boolean;
  colorId: string;
  colorId2?: string;
  difficulty: number | null;
  note: string;
  attributeIds: string[];
  videoFile: UploadFileInput | null;
  thumbFile: File | null;
  existingThumbnailUrl?: string | null;
  existingVideoUrl?: string | null;
  mapX?: number;
  mapY?: number;
}

type EditorColor = {
  id: string;
  name: string;
  hex?: string | null;
};

type EditorSector = {
  id: string;
  name: string;
  boulderCount?: number | null;
  legacyName?: string;
};

const OPTIONAL_ATTRIBUTE_KEYS = new Set(["partner_boulder", "dual_color"]);

const newId = () => Math.random().toString(36).slice(2, 11);

export const createEmptySetterBoulderDraft = (
  colors: EditorColor[],
): SetterBoulderDraft => {
  const defaultColor = colors[0];
  const defaultDifficulty = 4;

  return {
    id: newId(),
    name: defaultColor
      ? generateBoulderName(defaultColor.name, defaultDifficulty)
      : "Neuer Boulder",
    sectorId: "",
    sectorId2: undefined,
    spansMultipleSectors: false,
    colorId: defaultColor?.id ?? "",
    colorId2: undefined,
    difficulty: defaultDifficulty,
    note: "",
    attributeIds: [],
    videoFile: null,
    thumbFile: null,
    existingThumbnailUrl: null,
    existingVideoUrl: null,
    mapX: undefined,
    mapY: undefined,
  };
};

export const canSubmitSetterBoulderDraft = (
  draft: SetterBoulderDraft | null,
  dualColorAttributeId?: string,
) => {
  if (!draft) return false;

  const hasVideo = Boolean(draft.videoFile || draft.existingVideoUrl);
  const hasThumbnail = Boolean(draft.thumbFile || draft.existingThumbnailUrl);
  const needsSecondColor = Boolean(
    dualColorAttributeId && draft.attributeIds.includes(dualColorAttributeId),
  );
  const hasValidSecondColor =
    !needsSecondColor ||
    Boolean(draft.colorId2 && draft.colorId2 !== draft.colorId);

  return Boolean(
    hasVideo &&
      hasThumbnail &&
      draft.name.trim() &&
      draft.sectorId &&
      draft.colorId &&
      hasValidSecondColor &&
      (!draft.spansMultipleSectors ||
        Boolean(draft.sectorId2 && draft.sectorId2 !== draft.sectorId)),
  );
};

function EditorMediaDrop({
  label,
  accept,
  icon,
  previewUrl,
  fileName,
  existing,
  onChange,
  onPick,
  disabled,
}: {
  label: string;
  accept: string;
  icon: ReactNode;
  previewUrl?: string | null;
  fileName?: string | null;
  existing?: boolean;
  onChange: (file: File) => void;
  onPick?: () => void;
  disabled: boolean;
}) {
  return (
    <label className="relative flex min-h-28 min-w-0 flex-col items-start justify-center gap-2 overflow-hidden rounded-kws-control bg-secondary p-3 focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-center gap-2">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="h-9 w-9 rounded-kws-badge object-cover"
          />
        ) : (
          icon
        )}
        <span className="text-sm font-semibold">{label}</span>
        {(fileName || existing) && (
          <Check aria-hidden="true" className="h-4 w-4 text-primary-ink" />
        )}
      </div>
      <span className="line-clamp-2 w-full break-all text-xs text-muted-foreground">
        {fileName || (existing ? "Vorhanden · ersetzen" : "Datei wählen")}
      </span>
      {onPick ? (
        <button
          type="button"
          aria-label={label}
          className="absolute inset-0 disabled:cursor-not-allowed"
          onClick={onPick}
          disabled={disabled}
        />
      ) : (
        <input
          type="file"
          accept={accept}
          aria-label={label}
          disabled={disabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file);
            e.target.value = "";
          }}
        />
      )}
    </label>
  );
}

export function SetterBoulderEditorDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  draft,
  colors,
  sectors,
  attributeCatalog,
  onDraftChange,
  onSubmit,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
  loadError,
  onRetryLoad,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  draft: SetterBoulderDraft | null;
  colors: EditorColor[];
  sectors: EditorSector[];
  attributeCatalog: BoulderAttributeOption[];
  onDraftChange: (draft: SetterBoulderDraft) => void;
  onSubmit: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  loadError?: string;
  onRetryLoad?: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [sectorSearch, setSectorSearch] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const lock = useRef(false);
  const busy = working || isSubmitting || isDeleting;
  useEffect(() => {
    setDirty(false);
    setError("");
    setShowErrors(false);
    setDiscard(false);
    setDeleteOpen(false);
    setSectorSearch("");
    setMapOpen(false);
    setExtraOpen(false);
  }, [open, draft?.id]);
  useEffect(() => {
    const url = draft?.thumbFile
      ? URL.createObjectURL(draft.thumbFile)
      : (draft?.existingThumbnailUrl ?? null);
    setThumbPreview(url);
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [draft?.thumbFile, draft?.existingThumbnailUrl]);
  if (!draft) return null;
  const dual = attributeCatalog.find((a) => a.key === "dual_color");
  const dualSelected = Boolean(dual && draft.attributeIds.includes(dual.id));
  const update = (updates: Partial<SetterBoulderDraft>) => {
    if (!busy && !lock.current) {
      setDirty(true);
      setError("");
      onDraftChange({ ...draft, ...updates });
    }
  };
  const close = () => {
    if (busy || lock.current) return;
    if (dirty) setDiscard(true);
    else onOpenChange(false);
  };
  const pickNative = async () => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    try {
      const file = await pickNativeVideoForUpload();
      if (file) {
        setDirty(true);
        onDraftChange({ ...draft, videoFile: file });
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Video konnte nicht gewählt werden.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const save = async () => {
    if (busy || loadError || lock.current) return;
    setShowErrors(true);
    setError("");
    if (!canSubmitSetterBoulderDraft(draft, dual?.id)) {
      setError("Bitte ergänze die markierten Pflichtfelder.");
      return;
    }
    lock.current = true;
    setWorking(true);
    try {
      await onSubmit();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const selectSector = (id: string) =>
    update({
      sectorId: id,
      sectorId2: draft.sectorId2 === id ? undefined : draft.sectorId2,
      mapX: draft.sectorId === id ? draft.mapX : undefined,
      mapY: draft.sectorId === id ? draft.mapY : undefined,
    });
  const sectorOptions = sectors.filter(
    (s) =>
      [s.name, s.legacyName]
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(sectorSearch.toLocaleLowerCase("de")) ||
      s.id === draft.sectorId,
  );
  const renderColor = (second: boolean) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {colors
        .filter((c) => !second || c.id !== draft.colorId)
        .map((c) => {
          const chosen = (second ? draft.colorId2 : draft.colorId) === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={chosen}
              aria-label={`${second ? "Zweite Farbe" : "Farbe"} ${c.name}`}
              onClick={() =>
                update(
                  second
                    ? { colorId2: c.id }
                    : {
                        colorId: c.id,
                        colorId2:
                          c.id === draft.colorId2 ? undefined : draft.colorId2,
                      },
                )
              }
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-kws-control px-3 py-2 text-left text-sm",
                chosen
                  ? "bg-primary/10 ring-1 ring-inset ring-primary text-foreground"
                  : "bg-secondary hover:bg-secondary/70",
              )}
            >
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 rounded-kws-badge ring-1 ring-inset ring-foreground/15"
                style={getColorBackgroundStyle(c.name, colors)}
              />
              <span className="min-w-0 flex-1 break-words">{c.name}</span>
              {chosen && (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              )}
            </button>
          );
        })}
    </div>
  );
  const missing = (condition: boolean, text: string) =>
    showErrors && condition ? (
      <p className="text-xs text-destructive">{text}</p>
    ) : null;
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent
          scrollLayout="contained"
          className="flex h-[min(90dvh,850px)] flex-col overflow-hidden p-0 md:!max-w-2xl"
          aria-busy={busy}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">
                Medien, Name, Sektor und Farbe festlegen.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Boulder-Editor schließen"
              disabled={busy}
              onClick={close}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6">
            {loadError && (
              <div
                role="alert"
                className="mb-4 rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive"
              >
                {loadError}
                <Button variant="ghost" onClick={onRetryLoad}>
                  Erneut versuchen
                </Button>
              </div>
            )}
            <fieldset
              disabled={busy || !!loadError}
              className="min-w-0 space-y-5"
            >
              {error && (
                <p
                  role="alert"
                  className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="setter-boulder-name">Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="setter-boulder-name"
                    value={draft.name}
                    aria-invalid={showErrors && !draft.name.trim()}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Neuen Namen vorschlagen"
                    onClick={() =>
                      update({
                        name: generateBoulderName(
                          colors.find((c) => c.id === draft.colorId)?.name ??
                            "Boulder",
                          draft.difficulty ?? 4,
                        ),
                      })
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                {missing(!draft.name.trim(), "Bitte einen Namen eingeben.")}
              </div>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Medien</h3>
                <div className="grid grid-cols-2 gap-3">
                  <EditorMediaDrop
                    label="Video"
                    accept="video/*"
                    icon={<FileVideo className="h-5 w-5" />}
                    fileName={
                      draft.videoFile
                        ? getUploadInputName(draft.videoFile)
                        : null
                    }
                    existing={!!draft.existingVideoUrl}
                    onChange={(file) => update({ videoFile: file })}
                    onPick={
                      isNativeVideoPipelineAvailable()
                        ? () => void pickNative()
                        : undefined
                    }
                    disabled={busy}
                  />
                  <EditorMediaDrop
                    label="Vorschaubild"
                    accept="image/*"
                    icon={<ImageIcon className="h-5 w-5" />}
                    previewUrl={thumbPreview}
                    fileName={draft.thumbFile?.name}
                    existing={!!draft.existingThumbnailUrl}
                    onChange={(file) => update({ thumbFile: file })}
                    disabled={busy}
                  />
                </div>
                {missing(
                  !draft.videoFile && !draft.existingVideoUrl,
                  "Bitte ein Video wählen.",
                )}
                {missing(
                  !draft.thumbFile && !draft.existingThumbnailUrl,
                  "Bitte ein Vorschaubild wählen.",
                )}
              </section>
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Sektor</h3>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    aria-expanded={mapOpen}
                    onClick={() => setMapOpen((v) => !v)}
                  >
                    <Map className="mr-2 h-4 w-4" />
                    Karte
                  </Button>
                </div>
                <SetterSearch
                  label="Sektor suchen"
                  value={sectorSearch}
                  onChange={setSectorSearch}
                  disabled={busy}
                />
                <SetterSelect
                  label="Sektor wählen"
                  value={draft.sectorId}
                  onChange={selectSector}
                  disabled={busy}
                  options={sectorOptions.map((s) => ({
                    value: s.id,
                    label:
                      sectors.filter((other) => other.name === s.name).length >
                        1 && s.legacyName
                        ? `${s.name} · ${s.legacyName}`
                        : s.name,
                  }))}
                />
                {mapOpen && (
                  <HallMapView
                    sectors={sectors.map((s) => ({
                      ...s,
                      boulderCount: s.boulderCount ?? 0,
                    }))}
                    countsBySectorId={Object.fromEntries(
                      sectors.map((s) => [s.id, s.boulderCount ?? 0]),
                    )}
                    selectedSectorIds={[draft.sectorId]}
                    onSelectSectorId={selectSector}
                    onClearSector={() => selectSector("")}
                    compact
                    frameless
                    viewportClassName="h-[240px]"
                    lockAspectRatio={false}
                  />
                )}
                {missing(!draft.sectorId, "Bitte einen Sektor wählen.")}
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Farbe</h3>
                {renderColor(false)}
                {missing(!draft.colorId, "Bitte eine Farbe wählen.")}
                {dual && (
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <Checkbox
                      checked={dualSelected}
                      onCheckedChange={(checked) =>
                        update({
                          attributeIds: checked
                            ? [...draft.attributeIds, dual.id]
                            : draft.attributeIds.filter((id) => id !== dual.id),
                          colorId2: checked ? draft.colorId2 : undefined,
                        })
                      }
                    />
                    Zweite Farbe
                  </label>
                )}
                {dualSelected && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Zweite Farbe wählen
                    </p>
                    {renderColor(true)}
                    {missing(
                      !draft.colorId2 || draft.colorId === draft.colorId2,
                      "Bitte eine andere zweite Farbe wählen.",
                    )}
                  </div>
                )}
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Schwierigkeit</h3>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
                  {[1, 2, 3, 4, 5, 6, 7, 8, null].map((level) => (
                    <button
                      type="button"
                      key={level ?? "?"}
                      aria-label={`Schwierigkeit ${level ?? "unbekannt"}`}
                      aria-pressed={draft.difficulty === level}
                      onClick={() => update({ difficulty: level })}
                      className={cn(
                        "relative grid h-11 place-items-center rounded-kws-control text-sm font-semibold tabular-nums",
                        draft.difficulty === level
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/70",
                      )}
                    >
                      {level ?? "?"}
                    </button>
                  ))}
                </div>
              </section>
              <details
                className="group"
                open={extraOpen}
                onToggle={(event) => setExtraOpen(event.currentTarget.open)}
              >
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
                  Weitere Angaben{" "}
                  <span className="font-normal text-muted-foreground">
                    · optional
                  </span>
                </summary>
                <div className="space-y-5 pt-2">
                  {attributeCatalog.some(
                    (a) =>
                      !OPTIONAL_ATTRIBUTE_KEYS.has(a.key) ||
                      a.key === "partner_boulder",
                  ) && (
                    <section className="space-y-2">
                      <h3 className="text-sm font-medium">Merkmale</h3>
                      <div className="flex flex-wrap gap-2">
                        {attributeCatalog
                          .filter((a) => a.key !== "dual_color")
                          .map((a) => {
                            const selected = draft.attributeIds.includes(a.id);
                            return (
                              <Button
                                type="button"
                                key={a.id}
                                variant={selected ? "default" : "secondary"}
                                aria-pressed={selected}
                                onClick={() =>
                                  update({
                                    attributeIds: selected
                                      ? draft.attributeIds.filter(
                                          (id) => id !== a.id,
                                        )
                                      : [...draft.attributeIds, a.id],
                                  })
                                }
                              >
                                {a.label}
                                {selected && <Check className="ml-2 h-4 w-4" />}
                              </Button>
                            );
                          })}
                      </div>
                    </section>
                  )}
                  <section className="space-y-2">
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <Checkbox
                        checked={draft.spansMultipleSectors}
                        onCheckedChange={(value) =>
                          update({
                            spansMultipleSectors: value === true,
                            sectorId2:
                              value === true ? draft.sectorId2 : undefined,
                          })
                        }
                      />
                      Boulder über zwei Sektoren
                    </label>
                    {draft.spansMultipleSectors && (
                      <>
                        <SetterSelect
                          label="Zweiten Sektor wählen"
                          value={draft.sectorId2 ?? ""}
                          onChange={(id) => update({ sectorId2: id })}
                          disabled={busy}
                          options={sectors
                            .filter((s) => s.id !== draft.sectorId)
                            .map((s) => ({
                              value: s.id,
                              label:
                                s.name +
                                (s.legacyName &&
                                sectors.some(
                                  (other) =>
                                    other.id !== s.id && other.name === s.name,
                                )
                                  ? ` · ${s.legacyName}`
                                  : ""),
                            }))}
                        />
                        {missing(
                          !draft.sectorId2,
                          "Bitte einen zweiten Sektor wählen.",
                        )}
                      </>
                    )}
                  </section>
                  <div className="space-y-2">
                    <Label htmlFor="setter-boulder-note">Notiz</Label>
                    <Textarea
                      id="setter-boulder-note"
                      value={draft.note}
                      onChange={(e) => update({ note: e.target.value })}
                      className="min-h-24"
                    />
                  </div>
                </div>
              </details>
              {onDelete && (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Boulder löschen
                </Button>
              )}
            </fieldset>
          </div>
          <footer className="flex shrink-0 gap-3 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <Button variant="secondary" disabled={busy} onClick={close}>
              Abbrechen
            </Button>
            <Button
              className="min-w-0 flex-1"
              disabled={busy || !!loadError}
              onClick={() => void save()}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {busy ? "Bitte warten …" : submitLabel}
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
      <SetterConfirm
        open={discard}
        onOpenChange={setDiscard}
        title="Änderungen verwerfen?"
        description="Deine Änderungen an diesem Boulder wurden noch nicht übernommen."
        confirmLabel="Verwerfen"
        onConfirm={() => {
          setDiscard(false);
          onOpenChange(false);
        }}
      />
      <SetterConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Boulder löschen?"
        description={`„${draft.name}“ wird dauerhaft gelöscht.`}
        onConfirm={async () => {
          await onDelete?.();
        }}
      />
    </>
  );
}
