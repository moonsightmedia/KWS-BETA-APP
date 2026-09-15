import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CloudUpload,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  SetterBoulderEditorDialog,
  canSubmitSetterBoulderDraft,
  createEmptySetterBoulderDraft,
  type SetterBoulderDraft,
} from "@/components/setter/SetterBoulderEditorDialog";
import { SetterConfirm, SetterState } from "@/components/setter/SetterControls";
import { SetterSurface } from "@/components/setter/SetterWorkspaceShell";
import { UploadOverview } from "@/components/UploadOverview";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/contexts/UploadContext";
import {
  useBoulderAttributeCatalog,
  useSetBoulderAttributes,
} from "@/hooks/useBoulderCommunity";
import { logBoulderOperation } from "@/hooks/useBoulders";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useSectorsTransformed } from "@/hooks/useSectors";
import { cn } from "@/lib/utils";
import {
  getBoulderColorBackgroundStyle,
  getBoulderColorLabel,
} from "@/utils/colorUtils";

const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn(...args);
};
const devError = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.error(...args);
};

export function BatchUpload() {
  const queryClient = useQueryClient();
  const sectorQuery = useSectorsTransformed();
  const sectors = sectorQuery.data ?? [];
  const colorQuery = useColors();
  const { data: colors = [] } = colorQuery;
  const attributeQuery = useBoulderAttributeCatalog();
  const { data: attributeCatalog = [] } = attributeQuery;
  const setBoulderAttributes = useSetBoulderAttributes();
  const { session } = useAuth();
  const { startUpload, waitForUploadSessions } = useUpload();

  const [boulders, setBoulders] = useState<SetterBoulderDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [removing, setRemoving] = useState<SetterBoulderDraft | null>(null);
  const [phases, setPhases] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(0);
  const [lastSuccess, setLastSuccess] = useState(0);
  const loading =
    sectorQuery.isLoading || colorQuery.isLoading || attributeQuery.isLoading;
  const failed =
    Boolean(sectorQuery.error) || colorQuery.isError || attributeQuery.isError;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBoulder, setCurrentBoulder] =
    useState<SetterBoulderDraft | null>(null);
  const dualColorAttributeId = useMemo(
    () =>
      attributeCatalog.find((attribute) => attribute.key === "dual_color")?.id,
    [attributeCatalog],
  );

  useEffect(() => {
    if (!colors.length || currentBoulder) return;
    setCurrentBoulder(createEmptySetterBoulderDraft(colors));
  }, [colors, currentBoulder]);

  const readyCount = useMemo(
    () =>
      boulders.filter((boulder) =>
        canSubmitSetterBoulderDraft(boulder, dualColorAttributeId),
      ).length,
    [boulders, dualColorAttributeId],
  );
  const queueThumbPreviewUrls = useMemo(() => {
    const previews = new Map<string, string>();
    boulders.forEach((boulder) => {
      if (boulder.thumbFile) {
        previews.set(boulder.id, URL.createObjectURL(boulder.thumbFile));
      } else if (boulder.existingThumbnailUrl) {
        previews.set(boulder.id, boulder.existingThumbnailUrl);
      }
    });
    return previews;
  }, [boulders]);

  useEffect(
    () => () => {
      queueThumbPreviewUrls.forEach((previewUrl) => {
        if (previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
      });
    },
    [queueThumbPreviewUrls],
  );

  const openAddDialog = () => {
    setCurrentBoulder(createEmptySetterBoulderDraft(colors));
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (boulder: SetterBoulderDraft) => {
    setCurrentBoulder({ ...boulder });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const saveBoulderFromDialog = () => {
    if (
      !currentBoulder ||
      !canSubmitSetterBoulderDraft(currentBoulder, dualColorAttributeId)
    ) {
      toast.error(
        "Bitte zuerst Video, Thumbnail und alle Pflichtfelder ausfüllen.",
      );
      return;
    }

    setBoulders((prev) =>
      isEditing
        ? prev.map((item) =>
            item.id === currentBoulder.id ? currentBoulder : item,
          )
        : [currentBoulder, ...prev],
    );
    setIsDialogOpen(false);
  };

  const uploadAll = async () => {
    if (isProcessing) return;
    if (!boulders.length) {
      toast.error("Keine Boulder zum Hochladen.");
      return;
    }

    if (
      !boulders.every((boulder) =>
        canSubmitSetterBoulderDraft(boulder, dualColorAttributeId),
      )
    ) {
      toast.error(
        "Bitte für alle Boulder Video, Thumbnail und Pflichtfelder ergänzen.",
      );
      return;
    }

    if (!session?.access_token) {
      toast.error("Nicht angemeldet. Bitte melde dich an.");
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      toast.error("Supabase-Konfiguration fehlt.");
      return;
    }

    setIsProcessing(true);
    setCompleted(0);
    setLastSuccess(0);
    setPhases({});
    const successfulIds: string[] = [];
    const failures: Array<{ name: string; error: string }> = [];

    for (const boulder of [...boulders]) {
      setPhases((current) => ({
        ...current,
        [boulder.id]: "Boulder wird angelegt …",
      }));
      let createdBoulderId: string | null = null;
      try {
        const colorName =
          colors.find((color) => color.id === boulder.colorId)?.name ??
          "Unbekannt";
        const isDualColor = Boolean(
          dualColorAttributeId &&
            boulder.attributeIds.includes(dualColorAttributeId),
        );
        const colorName2 = isDualColor
          ? (colors.find((color) => color.id === boulder.colorId2)?.name ??
            null)
          : null;
        const payload: Record<string, unknown> = {
          name: boulder.name.trim(),
          sector_id: boulder.sectorId,
          color: colorName,
          color_2: colorName2,
          difficulty: boulder.difficulty,
          note: boulder.note.trim() || null,
          status: "haengt",
          // Keep the row private from the instant it is created. The video
          // session RPC replaces this placeholder with the durable session ID.
          beta_video_status: "uploading",
        };

        if (boulder.spansMultipleSectors && boulder.sectorId2) {
          payload.sector_id_2 = boulder.sectorId2;
        }

        const response = await authenticatedFetch(`${supabaseUrl}/rest/v1/boulders`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        const created = Array.isArray(data) ? data[0] : data;

        if (!created?.id) {
          throw new Error("Boulder konnte nicht erstellt werden.");
        }
        createdBoulderId = created.id;

        if (boulder.attributeIds.length) {
          try {
            await setBoulderAttributes.mutateAsync({
              boulderId: created.id,
              attributeIds: boulder.attributeIds,
            });
          } catch (error) {
            devWarn(
              "[BatchUpload] Attribute konnten nicht gespeichert werden:",
              error,
            );
          }
        }

        logBoulderOperation(
          "create",
          created.id,
          created.name ?? null,
          created,
          undefined,
          session.access_token,
        )
          .then(
            (logged) =>
              logged &&
              queryClient.invalidateQueries({
                queryKey: ["boulder-operation-logs"],
              }),
          )
          .catch(() => undefined);

        // The queue is intentionally serial on iOS. Finish the small thumbnail
        // first so a thumbnail failure cannot race an already-pending video
        // into publishing a Boulder that the batch reports as failed.
        setPhases((current) => ({
          ...current,
          [boulder.id]: "Vorschaubild wird übertragen …",
        }));
        const thumbSessionId = await startUpload(
          created.id,
          boulder.thumbFile!,
          "thumbnail",
          boulder.sectorId,
        );
        await waitForUploadSessions([thumbSessionId]);
        setPhases((current) => ({
          ...current,
          [boulder.id]: "Video wird übertragen …",
        }));
        const videoSessionId = await startUpload(
          created.id,
          boulder.videoFile!,
          "video",
          boulder.sectorId,
        );

        setBoulders((prev) =>
          prev.map((item) =>
            item.id === boulder.id
              ? { ...item, thumbFile: null, videoFile: null }
              : item,
          ),
        );

        await waitForUploadSessions([videoSessionId]);
        successfulIds.push(boulder.id);
        setCompleted(successfulIds.length);
        setPhases((current) => ({ ...current, [boulder.id]: "Übertragen" }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unbekannter Fehler";
        if (createdBoulderId) {
          await authenticatedFetch(
            `${supabaseUrl}/rest/v1/rpc/fail_pending_boulder_video_upload`,
            {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                p_boulder_id: createdBoulderId,
                p_error: message.slice(0, 500),
              }),
            },
          ).catch(() => undefined);
        }
        devError("[BatchUpload] Fehler beim Queueing:", error);
        failures.push({ name: boulder.name, error: message });
        setPhases((current) => ({
          ...current,
          [boulder.id]: "Fehlgeschlagen – Entwurf prüfen",
        }));
        toast.error(`Fehler bei "${boulder.name}": ${message}`);
      }
    }

    setBoulders((prev) =>
      prev.filter((boulder) => !successfulIds.includes(boulder.id)),
    );

    if (successfulIds.length) {
      toast.success(`${successfulIds.length} Boulder hochgeladen.`, {
        duration: 3200,
      });
      // The database emits the notification only once the Hostinger callback
      // has atomically published all video renditions as ready.
    }

    if (failures.length) {
      toast.error(
        `${failures.length} Boulder konnten nicht vorbereitet werden.`,
        { duration: 3200 },
      );
    }

    setLastSuccess(successfulIds.length);
    setIsProcessing(false);
  };

  return (
    <div className={cn("space-y-4", boulders.length ? "pb-72" : "pb-20")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Upload-Stapel</h2>
        <p className="text-sm text-muted-foreground" role="status">
          {boulders.length} {boulders.length === 1 ? "Entwurf" : "Entwürfe"}
          {boulders.length > 0 && !isProcessing
            ? ` · ${readyCount} bereit`
            : ""}
        </p>
      </div>
      {loading ? (
        <SetterState loading title="Sektoren und Farben werden geladen …" />
      ) : failed ? (
        <SetterState
          title="Stammdaten konnten nicht geladen werden."
          onRetry={() => {
            void queryClient.refetchQueries({ queryKey: ["sectors"] });
            void colorQuery.refetch();
            void attributeQuery.refetch();
          }}
        />
      ) : !colors.length || !sectors.length ? (
        <SetterState
          title="Sektoren oder Farben fehlen"
          description="Lege sie zuerst im Adminbereich an."
        />
      ) : !boulders.length ? (
        <SetterState
          title={
            lastSuccess
              ? `${lastSuccess} Boulder übertragen`
              : "Dein Stapel ist noch leer"
          }
          description={
            lastSuccess
              ? "Du kannst jetzt weitere Boulder hinzufügen."
              : "Füge Boulder mit Video und Vorschaubild hinzu. Hochgeladen wird erst, wenn du den Stapel startest."
          }
        />
      ) : (
        <SetterSurface className="overflow-hidden p-0 sm:p-0">
          <div className="divide-y divide-border/60">
            {boulders.map((boulder) => {
              const colorName =
                colors.find((c) => c.id === boulder.colorId)?.name ?? "";
              const secondColor = colors.find(
                (c) => c.id === boulder.colorId2,
              )?.name;
              const preview = queueThumbPreviewUrls.get(boulder.id);
              const phase = phases[boulder.id];
              const ready = canSubmitSetterBoulderDraft(
                boulder,
                dualColorAttributeId,
              );
              return (
                <article
                  key={boulder.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-kws-control bg-secondary">
                    {preview ? (
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="m-5 h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">
                      {boulder.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sectors.find((s) => s.id === boulder.sectorId)?.name}
                      {boulder.sectorId2
                        ? ` / ${sectors.find((s) => s.id === boulder.sectorId2)?.name ?? ""}`
                        : ""}{" "}
                      · Grad {boulder.difficulty ?? "?"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 rounded-kws-badge ring-1 ring-inset ring-foreground/15"
                        style={getBoulderColorBackgroundStyle(
                          colorName,
                          secondColor,
                          colors,
                        )}
                      />
                      {getBoulderColorLabel(colorName, secondColor)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        phase?.startsWith("Fehl")
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {phase ??
                        (ready
                          ? "Bereit zum Hochladen"
                          : "Medien oder Angaben ergänzen")}
                    </p>
                  </div>
                  <div className="ml-auto flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${boulder.name} bearbeiten`}
                      disabled={isProcessing}
                      onClick={() => openEditDialog(boulder)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${boulder.name} aus Stapel entfernen`}
                      disabled={isProcessing}
                      onClick={() => setRemoving(boulder)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </SetterSurface>
      )}
      <div className="pointer-events-none fixed bottom-[calc(88px+env(safe-area-inset-bottom,0px))] right-4 z-30 flex w-[calc(100%-2rem)] max-w-[600px] flex-col items-end gap-3 md:bottom-6 md:right-8 md:w-[calc(100%-20rem)]">
        <div className="flex w-full items-center justify-between gap-3 md:justify-end" data-setter-action-row>
        <UploadOverview placement="inline" />
        <Button onClick={openAddDialog} aria-label="Boulder hinzufügen" title="Boulder hinzufügen"
          data-boulder-fab
          className="pointer-events-auto ml-auto h-14 w-14 shrink-0 gap-2 rounded-kws-card p-0 shadow-medium md:w-auto md:px-5"
          disabled={isProcessing || loading || failed || !colors.length || !sectors.length}>
          <Plus className="h-6 w-6" aria-hidden="true" />
          <span className="hidden md:inline">Boulder hinzufügen</span>
        </Button>
        </div>
      {!!boulders.length && (
        <div className="pointer-events-auto w-full">
          <SetterSurface className="space-y-3 shadow-medium">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" role="status">
                  {isProcessing
                    ? `${completed} von ${boulders.length} übertragen`
                    : `${readyCount} Boulder bereit`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isProcessing
                    ? "Bitte in dieser Ansicht bleiben, bis der Stapel fertig ist."
                    : "Nicht übernommene Entwürfe gehen beim Neuladen verloren."}
                </p>
              </div>
              <Button
                className="w-full sm:w-auto"
                disabled={
                  isProcessing ||
                  loading ||
                  failed ||
                  readyCount !== boulders.length
                }
                onClick={() => void uploadAll()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                {isProcessing
                  ? "Upload läuft …"
                  : `${boulders.length} Boulder hochladen`}
              </Button>
            </div>
            {isProcessing && (
              <progress
                className="h-1.5 w-full accent-primary"
                value={completed}
                max={boulders.length}
                aria-label="Übertragene Boulder"
              />
            )}
          </SetterSurface>
        </div>
      )}
      </div>
      <SetterBoulderEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={isEditing ? "Boulder bearbeiten" : "Boulder hinzufügen"}
        submitLabel={isEditing ? "Übernehmen" : "Zum Stapel hinzufügen"}
        draft={currentBoulder}
        colors={colors}
        sectors={sectors}
        attributeCatalog={attributeCatalog}
        onDraftChange={setCurrentBoulder}
        onSubmit={saveBoulderFromDialog}
      />
      <SetterConfirm
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Entwurf entfernen?"
        description={`„${removing?.name ?? ""}“ wird nur aus diesem Upload-Stapel entfernt.`}
        confirmLabel="Entfernen"
        onConfirm={() => {
          setBoulders((current) =>
            current.filter((b) => b.id !== removing?.id),
          );
          setRemoving(null);
        }}
      />
    </div>
  );
}
