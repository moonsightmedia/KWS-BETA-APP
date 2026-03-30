import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CloudUpload, Image as ImageIcon, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  SetterBoulderEditorDialog,
  canSubmitSetterBoulderDraft,
  createEmptySetterBoulderDraft,
  type SetterBoulderDraft,
} from '@/components/setter/SetterBoulderEditorDialog';
import { Button } from '@/components/ui/button';
import { useUpload } from '@/contexts/UploadContext';
import { useBoulderAttributeCatalog, useSetBoulderAttributes } from '@/hooks/useBoulderCommunity';
import { logBoulderOperation } from '@/hooks/useBoulders';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';
import { sendPushNotificationForNotification } from '@/services/pushNotifications';
import { getColorBackgroundStyle } from '@/utils/colorUtils';

const devWarn = (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); };
const devError = (...args: unknown[]) => { if (import.meta.env.DEV) console.error(...args); };

const canQueueBoulder = (boulder: SetterBoulderDraft) => canSubmitSetterBoulderDraft(boulder);

async function createBatchNotifications(
  boulderIds: string[],
  sectors: Array<{ id: string; name: string }>,
  supabaseUrl: string,
  supabaseKey: string,
  accessToken: string,
) {
  if (!boulderIds.length) return;

  try {
    const boulderDetailsResponse = await fetch(
      `${supabaseUrl}/rest/v1/boulders?id=in.(${boulderIds.join(',')})&select=id,name,sector_id`,
      {
        method: 'GET',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      },
    );

    if (!boulderDetailsResponse.ok) {
      devError('[BatchUpload] Notification prep failed while loading boulders:', await boulderDetailsResponse.text());
      return;
    }

    const boulderDetails = (await boulderDetailsResponse.json()) as Array<{ sector_id?: string | null }>;
    const usersResponse = await fetch(`${supabaseUrl}/rest/v1/notification_preferences?boulder_new=eq.true&select=user_id`, {
      method: 'GET',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    if (!usersResponse.ok) {
      devError('[BatchUpload] Error fetching notification preferences:', await usersResponse.text());
      return;
    }

    const users = (await usersResponse.json()) as Array<{ user_id: string }>;
    const sectorIds = [...new Set(boulderDetails.map((item) => item.sector_id).filter(Boolean))] as string[];
    const sectorNames = sectorIds
      .map((sectorId) => sectors.find((sector) => sector.id === sectorId)?.name)
      .filter(Boolean) as string[];
    const sectorLabel =
      sectorNames.length === 1
        ? `in ${sectorNames[0]}`
        : sectorNames.length > 1
          ? `in ${sectorNames.join(', ')}`
          : '';

    await Promise.all(users.map(async (user) => {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            user_id: user.user_id,
            type: 'boulder_new',
            title: boulderIds.length === 1 ? 'Neuer Boulder' : `${boulderIds.length} neue Boulder`,
            message:
              boulderIds.length === 1
                ? `Ein neuer Boulder ist jetzt verfügbar${sectorLabel ? ` ${sectorLabel}` : ''}.`
                : `${boulderIds.length} neue Boulder sind jetzt verfügbar${sectorLabel ? ` ${sectorLabel}` : ''}.`,
            action_url: '/boulders',
            data: { boulder_count: boulderIds.length, boulder_ids: boulderIds },
          }),
        });

        if (!response.ok) {
          devError(`[BatchUpload] Error creating notification for ${user.user_id}:`, await response.text());
          return;
        }

        const created = await response.json();
        const notification = Array.isArray(created) ? created[0] : created;
        if (notification?.id) {
          await sendPushNotificationForNotification(notification.id, { access_token: accessToken });
        }
      } catch (error) {
        devError(`[BatchUpload] Error sending notification for ${user.user_id}:`, error);
      }
    }));
  } catch (error) {
    devError('[BatchUpload] Error creating batch notifications:', error);
  }
}

function StatChip({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'muted';
}) {
  return (
    <div className="rounded-2xl border border-[#DDE7DF] bg-white px-3 py-4 text-center shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">{label}</p>
      <p
        className={cn(
          'pt-2 text-[1.7rem] font-semibold leading-none tracking-[-0.04em] text-[#13112B]',
          tone === 'success' && 'text-[#69B545]',
          tone === 'muted' && 'text-[#6C6A7E]',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function BatchUpload() {
  const queryClient = useQueryClient();
  const { data: sectors = [] } = useSectorsTransformed();
  const { data: colors = [] } = useColors();
  const { data: attributeCatalog = [] } = useBoulderAttributeCatalog();
  const setBoulderAttributes = useSetBoulderAttributes();
  const { session } = useAuth();
  const { startUpload } = useUpload();

  const [boulders, setBoulders] = useState<SetterBoulderDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBoulder, setCurrentBoulder] = useState<SetterBoulderDraft | null>(null);

  useEffect(() => {
    if (!colors.length || currentBoulder) return;
    setCurrentBoulder(createEmptySetterBoulderDraft(colors));
  }, [colors, currentBoulder]);

  const readyCount = useMemo(() => boulders.filter(canQueueBoulder).length, [boulders]);
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

  useEffect(() => () => {
    queueThumbPreviewUrls.forEach((previewUrl) => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    });
  }, [queueThumbPreviewUrls]);

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
    if (!currentBoulder || !canQueueBoulder(currentBoulder)) {
      toast.error('Bitte zuerst Video, Thumbnail und alle Pflichtfelder ausfüllen.');
      return;
    }

    setBoulders((prev) =>
      isEditing
        ? prev.map((item) => (item.id === currentBoulder.id ? currentBoulder : item))
        : [currentBoulder, ...prev],
    );
    setIsDialogOpen(false);
  };

  const uploadAll = async () => {
    if (!boulders.length) {
      toast.error('Keine Boulder zum Hochladen.');
      return;
    }

    if (!boulders.every(canQueueBoulder)) {
      toast.error('Bitte für alle Boulder Video, Thumbnail und Pflichtfelder ergänzen.');
      return;
    }

    if (!session?.access_token) {
      toast.error('Nicht angemeldet. Bitte melde dich an.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      toast.error('Supabase-Konfiguration fehlt.');
      return;
    }

    setIsProcessing(true);
    const successfulIds: string[] = [];
    const createdIds: string[] = [];
    const failures: Array<{ name: string; error: string }> = [];

    for (const boulder of [...boulders]) {
      try {
        const colorName = colors.find((color) => color.id === boulder.colorId)?.name ?? 'Unbekannt';
        const payload: Record<string, unknown> = {
          name: boulder.name.trim(),
          sector_id: boulder.sectorId,
          color: colorName,
          difficulty: boulder.difficulty,
          note: boulder.note.trim() || null,
          status: 'haengt',
        };

        if (boulder.spansMultipleSectors && boulder.sectorId2) {
          payload.sector_id_2 = boulder.sectorId2;
        }

        if (typeof boulder.mapX === 'number' && typeof boulder.mapY === 'number') {
          payload.map_x = Math.min(100, Math.max(0, boulder.mapX));
          payload.map_y = Math.min(100, Math.max(0, boulder.mapY));
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/boulders`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        const created = Array.isArray(data) ? data[0] : data;

        if (!created?.id) {
          throw new Error('Boulder konnte nicht erstellt werden.');
        }

        createdIds.push(created.id);

        if (boulder.attributeIds.length) {
          try {
            await setBoulderAttributes.mutateAsync({ boulderId: created.id, attributeIds: boulder.attributeIds });
          } catch (error) {
            devWarn('[BatchUpload] Attribute konnten nicht gespeichert werden:', error);
          }
        }

        logBoulderOperation('create', created.id, created.name ?? null, created, undefined, session.access_token)
          .then((logged) => logged && queryClient.invalidateQueries({ queryKey: ['boulder-operation-logs'] }))
          .catch(() => undefined);

        await startUpload(created.id, boulder.thumbFile!, 'thumbnail', boulder.sectorId);
        await startUpload(created.id, boulder.videoFile!, 'video', boulder.sectorId);
        successfulIds.push(boulder.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        devError('[BatchUpload] Fehler beim Queueing:', error);
        failures.push({ name: boulder.name, error: message });
        toast.error(`Fehler bei "${boulder.name}": ${message}`);
      }
    }

    setBoulders((prev) => prev.filter((boulder) => !successfulIds.includes(boulder.id)));

    if (successfulIds.length) {
      toast.success(`${successfulIds.length} Boulder in die Upload-Warteschlange gestellt.`, { duration: 3200 });
      await createBatchNotifications(createdIds, sectors, supabaseUrl, supabaseKey, session.access_token);
    }

    if (failures.length) {
      toast.error(`${failures.length} Boulder konnten nicht vorbereitet werden.`, { duration: 3200 });
    }

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 pb-44">
      <SetterBoulderEditorDialog
        open={isDialogOpen}
        onOpenChange={(open) => setIsDialogOpen(open)}
        title={isEditing ? 'Boulder bearbeiten' : 'Boulder hinzufügen'}
        submitLabel={isEditing ? 'Speichern' : 'In Queue übernehmen'}
        draft={currentBoulder}
        colors={colors}
        sectors={sectors}
        attributeCatalog={attributeCatalog}
        onDraftChange={setCurrentBoulder}
        onSubmit={saveBoulderFromDialog}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Überblick</h2>
          <span className="text-xs text-[#13112B]/45">{boulders.length} Entwürfe</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatChip label="Entwürfe" value={`${boulders.length}`} />
          <StatChip label="Medien komplett" value={`${readyCount}`} tone="success" />
          <StatChip label="Upload" value={isProcessing ? 'Läuft' : 'Bereit'} tone={isProcessing ? 'success' : 'muted'} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#13112B]">Entwürfe</h2>
          {boulders.length > 0 ? <span className="text-xs text-[#13112B]/45">{readyCount} uploadbereit</span> : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
          {boulders.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-lg font-semibold text-[#13112B]">Noch keine Entwürfe.</p>
              <p className="mt-2 text-sm text-[#13112B]/58">Nutze den Floating Action Button, um den ersten Entwurf anzulegen.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E7F0E8]">
              {boulders.map((boulder) => {
                const sectorName = sectors.find((sector) => sector.id === boulder.sectorId)?.name ?? 'Sektor?';
                const sectorName2 = boulder.sectorId2
                  ? sectors.find((sector) => sector.id === boulder.sectorId2)?.name ?? 'Sektor?'
                  : null;
                const colorName = colors.find((color) => color.id === boulder.colorId)?.name ?? 'Farbe?';
                const previewUrl = queueThumbPreviewUrls.get(boulder.id);

                return (
                  <article key={boulder.id} className="px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-4">
                      <div className="relative h-[118px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-[#E7F0E8] bg-[#EEF1EE]">
                        {previewUrl ? (
                          <img src={previewUrl} alt={boulder.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#6C6A7E]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 rounded-xl bg-[#E55A4E] px-2 py-1 text-xs font-bold text-white">
                          {boulder.difficulty ?? '?'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 break-words text-[1.06rem] font-semibold tracking-[-0.02em] text-[#13112B]">
                              {boulder.name}
                            </p>
                            <p className="pt-1 text-sm text-[#13112B]/58">
                              {sectorName}
                              {sectorName2 ? ` → ${sectorName2}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-[#6C6A7E]"
                              onClick={() => openEditDialog(boulder)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-[#6C6A7E] hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setBoulders((prev) => prev.filter((item) => item.id !== boulder.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-xl px-3 py-1 text-xs font-semibold" style={getColorBackgroundStyle(colorName, colors)}>
                            {colorName}
                          </span>
                          <span className="rounded-xl border border-[#E7F0E8] bg-[#F7FAF7] px-3 py-1 text-xs font-medium text-[#6C6A7E]">
                            {boulder.attributeIds.length} Attribute
                          </span>
                          {typeof boulder.mapX === 'number' && typeof boulder.mapY === 'number' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7F0E8] bg-[#F7FAF7] px-3 py-1 text-xs font-medium text-[#6C6A7E]">
                              <MapPin className="h-3.5 w-3.5 text-[#69B545]" />
                              Hallenplan gesetzt
                            </span>
                          ) : null}
                        </div>

                        {boulder.note ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#13112B]/60">{boulder.note}</p> : null}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE4B8] bg-[#EEF6E1] px-3 py-1 text-xs font-semibold text-[#4E8A31]">
                            <Check className="h-3.5 w-3.5" />
                            Bereit für Upload
                          </span>
                          <span className="text-xs text-[#13112B]/45">Video und Thumbnail sind zugeordnet.</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {!isDialogOpen ? (
        <div className="fixed bottom-[calc(104px+env(safe-area-inset-bottom,0px))] right-4 z-[125] flex flex-col items-end gap-3 md:bottom-[calc(176px+env(safe-area-inset-bottom,0px))] md:right-8">
          {boulders.length > 0 ? (
            <Button
              type="button"
              className="h-14 rounded-2xl bg-[#69B545] px-5 text-white shadow-[0_16px_40px_rgba(105,181,69,0.28)] hover:bg-[#5fa039]"
              disabled={isProcessing}
              onClick={() => void uploadAll()}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
              Alle hochladen
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="h-14 rounded-2xl border-[#DDE7DF] bg-white px-5 text-[#13112B] shadow-[0_14px_36px_rgba(19,17,43,0.10)] hover:bg-[#F7FAF7]"
            onClick={openAddDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            Boulder hinzufügen
          </Button>
        </div>
      ) : null}
    </div>
  );
}
