import { useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useCreateSector, useDeleteSector, useSectors, useUpdateSector, type Sector } from "@/hooks/useSectors";
import { useSectorSchedule } from "@/hooks/useSectorSchedule";
import { uploadSectorImage, deleteSectorImage } from "@/integrations/supabase/storage";
import { getAdminSectorLabel, groupAdminSubareas, normalizeSubareaCode, resolveSectorArea } from "@/lib/sectorAreas";
import { useSectorAreas } from "@/hooks/useSectorAreas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminSearchField } from "./AdminSearchField";
import { SectorGroupList } from "./SectorGroupList";
import { SectorAreaEditor } from "./SectorAreaEditor";
import { SectorSubareaDetails } from "./SectorSubareaDetails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { SectorQRCode } from "./SectorQRCode";

type SectorDraft = { name: string; description: string; imageUrl: string; areaId: string; subareaCode: string };
const emptyDraft: SectorDraft = { name: "", description: "", imageUrl: "", areaId: "", subareaCode: "" };
const activeBoulderCount = (sector: Sector) => Math.max(0, sector.boulder_count ?? 0);

export const SectorManagement = () => {
  const catalog = useSectors();
  const areaCatalog = useSectorAreas();
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);
  const [returnToSector, setReturnToSector] = useState(false);
  const [newSubarea, setNewSubarea] = useState(false);
  const initialDraftRef = useRef<SectorDraft>(emptyDraft);
  const { data: schedule } = useSectorSchedule();
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [draft, setDraft] = useState<SectorDraft>(emptyDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sector | null>(null);
  const [qrTarget, setQrTarget] = useState<string | null>(null);
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [creationUnconfirmed, setCreationUnconfirmed] = useState(false);

  const sectors = useMemo(() => catalog.data ?? [], [catalog.data]);
  const pending = isSubmitting || createSector.isPending || updateSector.isPending || deleteSector.isPending;
  const nextSchedules = useMemo(() => {
    const now = Date.now();
    const result = new Map<string, string>();
    (schedule ?? []).forEach((entry: { sector_id: string; scheduled_at: string }) => {
      const timestamp = new Date(entry.scheduled_at).getTime();
      if (!entry.sector_id || !Number.isFinite(timestamp) || timestamp <= now) return;
      const current = result.get(entry.sector_id);
      if (!current || timestamp < new Date(current).getTime()) result.set(entry.sector_id, entry.scheduled_at);
    });
    return result;
  }, [schedule]);
  const filteredSubareas = useMemo(() => groupAdminSubareas(sectors, query), [query, sectors]);
  const detailsGroup = useMemo(() => groupAdminSubareas(sectors).find(group => group.key === detailsKey), [sectors, detailsKey]);
  const editingArea = editingSector ? resolveSectorArea(editingSector) : null;
  const protectLegacyName = Boolean(editingArea?.usedLegacyMapping);
  const availableAreas = useMemo(() => [...new Map([...sectors.flatMap(sector => sector.area?.id ? [sector.area] : []), ...(areaCatalog.data ?? [])].map(area => [area.id, area])).values()].sort((a, b) => a.sort_order - b.sort_order), [sectors, areaCatalog.data]);
  const hierarchyEditable = (areaCatalog.isSuccess || availableAreas.length > 0) && (sectors.length === 0 || sectors.some(s => Object.prototype.hasOwnProperty.call(s, "area_id")));
  const existingCodes = useMemo(() => [...new Set(sectors.filter(sector => sector.area_id === draft.areaId).map(sector => sector.subarea_code).filter((code): code is string => Boolean(code)))].sort((a, b) => a.localeCompare(b, "de", { numeric: true })), [sectors, draft.areaId]);
  const hierarchyValid = !hierarchyEditable || (!draft.areaId && !draft.subareaCode) || (availableAreas.some(area => area.id === draft.areaId) && Boolean(normalizeSubareaCode(draft.subareaCode)));
  const openAreaEditor = (fromSector = false) => { setReturnToSector(fromSector); setAreaEditorOpen(true); };
  const closeAreaEditor = () => { setAreaEditorOpen(false); if (!returnToSector) void areaCatalog.refetch(); };


  const resetEditor = () => {
    setSaveError(""); setCreationUnconfirmed(false);
    initialDraftRef.current = emptyDraft; setNewSubarea(false);
    setDraft(emptyDraft); setEditingSector(null); setImageFile(null); setImagePreview(null); setRemoveImage(false); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const openCreate = (trigger?: HTMLElement, areaId = "", code = "") => {
    editorTriggerRef.current = trigger ?? null; resetEditor();
    const initial = { ...emptyDraft, areaId, subareaCode: code };
    initialDraftRef.current = initial; setDraft(initial); setNewSubarea(Boolean(areaId && !code)); setEditorOpen(true);
  };
  const openEdit = (sector: Sector, trigger?: HTMLElement) => {
    setSaveError(""); setCreationUnconfirmed(false);
    editorTriggerRef.current = trigger ?? null; setEditingSector(sector);
    const initial = { name: sector.name, description: sector.description ?? "", imageUrl: sector.image_url ?? "", areaId: sector.area_id ?? "", subareaCode: sector.subarea_code ?? "" };
    initialDraftRef.current = initial; setDraft(initial); setNewSubarea(false);
    setImageFile(null); setImagePreview(sector.image_url ?? null); setRemoveImage(false); setUploadProgress(0); setEditorOpen(true);
  };
  const dirty = (Object.keys(emptyDraft) as (keyof SectorDraft)[]).some(key => draft[key] !== initialDraftRef.current[key]) || Boolean(imageFile) || removeImage;
  const restoreEditorFocus = () => requestAnimationFrame(() => {
    if (editorTriggerRef.current?.isConnected) editorTriggerRef.current.focus();
    else createTriggerRef.current?.focus();
  });
  const requestClose = () => {
    if (pending) return;
    if (dirty) setDiscardOpen(true); else { setEditorOpen(false); restoreEditorFocus(); }
  };
  const confirmDiscard = () => { setDiscardOpen(false); setEditorOpen(false); resetEditor(); restoreEditorFocus(); };
  const selectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) { toast.error("Bitte wähle JPEG, PNG, WebP oder GIF."); event.target.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Das Bild darf höchstens 10 MB groß sein."); event.target.value = ""; return; }
    setImageFile(file); setRemoveImage(false);
    const reader = new FileReader(); reader.onload = () => setImagePreview(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file);
  };
  const clearImage = () => { setImageFile(null); setImagePreview(null); setRemoveImage(Boolean(editingSector?.image_url)); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = protectLegacyName ? editingSector!.name : draft.name.trim(); if (!name || !hierarchyValid) return;
    const hierarchy = hierarchyEditable ? { area_id: draft.areaId || null, subarea_code: normalizeSubareaCode(draft.subareaCode) || null } : {};
    // React state updates are asynchronous; a second fast click can otherwise
    // enter this handler before `isSubmitting` has propagated to the button.
    if (submitLockRef.current || creationUnconfirmed) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setUploadProgress(0);
    setSaveError("");
    try {
      let sectorId = editingSector?.id;
      let newImageUrl: string | null = null;
      if (editingSector) {
        if (imageFile) newImageUrl = await uploadSectorImage(imageFile, editingSector.id, setUploadProgress);
        const imageUrl = newImageUrl ?? (removeImage ? null : editingSector.image_url ?? null);
        // A thrown request is ambiguous: the server may already have committed
        // the row before the response was lost. Keep both objects and the draft
        // for a safe retry; never delete a possibly referenced replacement.
        await updateSector.mutateAsync({ id: editingSector.id, ...hierarchy, name, description: draft.description.trim() || null, image_url: imageUrl });
        // The row points at the replacement (or null) before the old object is removed.
        if (editingSector.image_url && (newImageUrl || removeImage)) {
          try { await deleteSectorImage(editingSector.image_url); }
          catch { toast.warning("Sektor gespeichert. Das frühere Bild konnte nicht bereinigt werden."); }
        }
      } else {
        let created: Sector;
        try { created = await createSector.mutateAsync({ ...hierarchy, name, description: draft.description.trim() || null, image_url: null }); }
        catch (error) {
          setCreationUnconfirmed(true);
          throw error;
        }
        sectorId = created.id;
        // The row exists now. Any upload/update retry must target this same ID.
        setEditingSector(created);
        if (imageFile && sectorId) {
          // On a lost response keep the row, image and draft. A retry targets
          // the known ID above; never roll back a possibly committed update.
          newImageUrl = await uploadSectorImage(imageFile, sectorId, setUploadProgress);
          await updateSector.mutateAsync({ id: sectorId, image_url: newImageUrl });
        }
      }
      setEditorOpen(false); resetEditor(); restoreEditorFocus();
    } catch (error) {
      console.error("[SectorManagement] save failed", error);
      setSaveError("Speichern wurde nicht bestätigt. Deine Eingaben und hochgeladenen Bilder bleiben erhalten.");
      toast.error(error instanceof Error ? error.message : "Sektor konnte nicht gespeichert werden.");
    } finally { submitLockRef.current = false; setUploadProgress(0); setIsSubmitting(false); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget || deleteSector.isPending) return;
    const target = deleteTarget;
    try {
      await deleteSector.mutateAsync(target.id);
      if (target.image_url) {
        try { await deleteSectorImage(target.image_url); }
        catch { toast.warning("Sektor gelöscht. Das Bild konnte nicht bereinigt werden."); }
      }
      setDeleteTarget(null);
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Sektor konnte nicht gelöscht werden."); }
  };
  const nextDate = (sector: Sector) => { const value = nextSchedules.get(sector.id); return value ? format(new Date(value), "dd.MM.yy") : null; };

  return <section aria-labelledby="sector-management-title" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="sector-management-title" className="font-sans text-base font-semibold text-foreground">Sektoren</h2>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={!areaCatalog.isSuccess || !hierarchyEditable} onClick={() => openAreaEditor()} className="h-11 gap-1.5"><Plus className="h-4 w-4" aria-hidden="true" />Hauptbereich</Button>
        <Button ref={createTriggerRef} onClick={(event) => openCreate(event.currentTarget)} className="h-11 shrink-0 gap-1.5"><Plus className="h-4 w-4" aria-hidden="true" />Neuer Sektor</Button>
      </div>
    </div>
    <AdminSearchField label="Sektoren suchen" placeholder="Bereich oder Sektor suchen" value={query} onChange={setQuery} />
    {areaCatalog.isError && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="status"><span>Bereichsverwaltung nicht verfügbar. Die bestehende Zuordnung bleibt erhalten.</span><Button variant="ghost" className="h-11 px-2 text-xs" onClick={() => void areaCatalog.refetch()}>Bereiche neu laden</Button></div>}
    {catalog.isPending ? <div role="status" aria-label="Sektoren werden geladen" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-kws-card bg-secondary motion-reduce:animate-none" />)}</div>
      : catalog.isError ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Sektoren konnten nicht geladen werden.</p><Button variant="secondary" onClick={() => catalog.refetch()}>Erneut versuchen</Button></div>
        : <>
          {filteredSubareas.length === 0 && (query.trim() || availableAreas.length === 0) && <div className="flex flex-col items-center px-4 py-8 text-center"><Search className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" /><h3 className="text-sm font-semibold">{sectors.length ? "Keine passenden Sektoren" : "Noch keine Sektoren"}</h3><p className="mt-1 text-sm text-muted-foreground">{sectors.length ? "Passe die Suche an." : "Lege den ersten Sektor an."}</p>{sectors.length > 0 && <Button variant="secondary" className="mt-4" onClick={() => setQuery("")}>Suche zurücksetzen</Button>}</div>}
          <SectorGroupList sectors={sectors} areas={availableAreas} query={query} hierarchyEditable={hierarchyEditable} onCreate={openCreate} onDetails={(group, trigger) => { editorTriggerRef.current = trigger; setDetailsKey(group.key); }} onEdit={openEdit} onQR={(name, trigger) => { editorTriggerRef.current = trigger; setQrTarget(name); }} nextDate={nextDate} />
        </>}
    {detailsGroup && <SectorSubareaDetails group={detailsGroup} canCreate={hierarchyEditable} onClose={() => { setDetailsKey(null); restoreEditorFocus(); }} onCreate={() => { setDetailsKey(null); openCreate(editorTriggerRef.current ?? undefined, detailsGroup.areaId, detailsGroup.code); }} onEdit={sector => { setDetailsKey(null); openEdit(sector, editorTriggerRef.current ?? undefined); }} onDelete={sector => { setDetailsKey(null); setDeleteTarget(sector); }} onQR={() => { setDetailsKey(null); setQrTarget(detailsGroup.name); }} />}
    {areaEditorOpen && <SectorAreaEditor areas={availableAreas} onClose={closeAreaEditor} onCreated={area => { if (returnToSector) { setDraft(current => ({ ...current, areaId: area.id, subareaCode: "" })); setNewSubarea(true); } setAreaEditorOpen(false); }} />}

    <Dialog open={editorOpen && !areaEditorOpen} onOpenChange={(open) => { if (open) setEditorOpen(true); else requestClose(); }}>
      <DialogContent scrollLayout="contained" className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-[640px]" onInteractOutside={(event) => { if (pending) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (pending || dirty) { event.preventDefault(); requestClose(); } }} onCloseAutoFocus={(event) => { event.preventDefault(); if (!areaEditorOpen) restoreEditorFocus(); }}>
        <DialogHeader className="shrink-0 border-b border-border/60 p-4 pb-3 text-left sm:px-5 sm:pt-5"><DialogTitle>{editingSector ? "Sektor bearbeiten" : "Neuer Sektor"}</DialogTitle><DialogDescription className="mt-1 text-xs">{editingSector ? getAdminSectorLabel(editingSector) : "Neuen Sektor anlegen."}</DialogDescription></DialogHeader>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"><fieldset disabled={pending || creationUnconfirmed} className="space-y-4">
          {hierarchyEditable ? <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2"><Label htmlFor="sector-area">Hauptbereich</Label><Button type="button" variant="ghost" className="h-11 gap-1 px-2 text-xs" disabled={!areaCatalog.isSuccess} onClick={() => openAreaEditor(true)}><Plus className="h-3.5 w-3.5" aria-hidden="true" />Neu anlegen</Button></div>
              <Select value={draft.areaId || "__none"} onValueChange={value => { setDraft(current => ({ ...current, areaId: value === "__none" ? "" : value, subareaCode: "" })); setNewSubarea(false); }} disabled={pending || creationUnconfirmed}>
                <SelectTrigger id="sector-area" className="border-0 bg-secondary"><SelectValue placeholder="Hauptbereich wählen" /></SelectTrigger><SelectContent>{!editingArea?.area && <SelectItem value="__none">Ohne Bereich</SelectItem>}{availableAreas.map(area => <SelectItem key={area.id} value={area.id} disabled={!area.is_active && area.id !== draft.areaId}>{area.name}{!area.is_active && " · Inaktiv"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {draft.areaId && <div className="space-y-2">
              <Label htmlFor="sector-subarea">Teilbereich</Label>
              <Select value={newSubarea || (draft.subareaCode && !existingCodes.includes(draft.subareaCode)) ? "__new" : draft.subareaCode || undefined} onValueChange={value => { setNewSubarea(value === "__new"); setDraft(current => ({ ...current, subareaCode: value === "__new" ? "" : value })); }} disabled={pending || creationUnconfirmed}>
                <SelectTrigger id="sector-subarea" className="border-0 bg-secondary"><SelectValue placeholder="Teilbereich wählen" /></SelectTrigger><SelectContent>{existingCodes.map(code => <SelectItem key={code} value={code}>{availableAreas.find(area => area.id === draft.areaId)?.name} {code}</SelectItem>)}<SelectItem value="__new">Neuer Teilbereich</SelectItem></SelectContent>
              </Select>
              {(newSubarea || (draft.subareaCode && !existingCodes.includes(draft.subareaCode))) && <div className="space-y-2 pt-2"><Label htmlFor="sector-subarea-code">Kürzel des Teilbereichs</Label><Input id="sector-subarea-code" value={draft.subareaCode} maxLength={3} autoComplete="off" autoCapitalize="characters" placeholder="z. B. E oder B2" aria-describedby="sector-subarea-help" aria-invalid={Boolean(draft.subareaCode && !normalizeSubareaCode(draft.subareaCode))} onChange={event => setDraft(current => ({ ...current, subareaCode: event.target.value.toUpperCase() }))} /><p id="sector-subarea-help" className="text-xs text-muted-foreground">1–3 Buchstaben oder Zahlen, beginnend mit einem Buchstaben. Wird mit diesem Sektor angelegt.</p>{existingCodes.includes(draft.subareaCode) && <p className="text-xs text-primary-ink">Der Sektor wird dem bestehenden Teilbereich zugeordnet.</p>}</div>}
            </div>}
          </div> : <div className="rounded-kws-control bg-secondary p-3">{editingArea?.area && <p className="text-sm font-semibold">{editingArea.publicName}</p>}<p className="text-xs text-muted-foreground">Die Bereichszuordnung ist nach Aktualisierung der Datenbank verfügbar. Bestehende Zuordnungen bleiben erhalten.</p></div>}<div className="space-y-2"><Label htmlFor="sector-name">Name *</Label><Input id="sector-name" readOnly={protectLegacyName} aria-describedby={protectLegacyName ? "sector-name-note" : undefined} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required autoComplete="off" className="h-11 rounded-kws-control" />{protectLegacyName && <p id="sector-name-note" className="text-xs text-muted-foreground">Bestehender Name bleibt für die Bereichszuordnung erhalten.</p>}</div><div className="space-y-2"><Label htmlFor="sector-description">Beschreibung</Label><Textarea id="sector-description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Kurz beschreiben" rows={3} className="rounded-kws-control" /></div><div className="space-y-2"><Label htmlFor="sector-image">Sektorbild</Label>{imagePreview && <div className="relative aspect-[16/7] overflow-hidden rounded-kws-control bg-muted"><img src={imagePreview} alt="Vorschau des Sektorbilds" className="h-full w-full object-cover" /><Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 h-11 w-11 rounded-kws-control" aria-label="Sektorbild entfernen" onClick={clearImage}><X className="h-4 w-4" /></Button></div>}<Input ref={fileInputRef} id="sector-image" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={selectImage} className="h-11 rounded-kws-control" /><p className="text-xs text-muted-foreground">JPEG, PNG, WebP oder GIF · maximal 10 MB</p>{uploadProgress > 0 && <div className="space-y-1"><Progress value={uploadProgress} /><p className="text-xs text-muted-foreground">Bild wird gespeichert … {Math.round(uploadProgress)} %</p></div>}</div></fieldset>{saveError && <p role="alert" className="mt-4 rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{creationUnconfirmed ? "Der Sektor wurde möglicherweise bereits angelegt. Schließe das Formular und prüfe die neu geladene Liste, bevor du erneut anlegst." : saveError}</p>}{creationUnconfirmed && <Button type="button" variant="outline" className="mt-3" onClick={() => void catalog.refetch()}>Liste neu laden</Button>}</div><div className="flex shrink-0 gap-2 border-t border-border/60 p-4 sm:px-5"><Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={requestClose}>Abbrechen</Button><Button type="submit" className="flex-1" disabled={pending || creationUnconfirmed || !draft.name.trim() || !hierarchyValid}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{editingSector ? "Speichern" : "Anlegen"}</Button></div></form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={discardOpen} onOpenChange={(open) => { if (!pending && !open) setDiscardOpen(false); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle><AlertDialogDescription>Deine noch nicht gespeicherten Eingaben gehen verloren.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Zurück</AlertDialogCancel><AlertDialogAction onClick={confirmDiscard} disabled={pending}>Verwerfen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={Boolean(qrTarget)} onOpenChange={(open) => { if (!open) { setQrTarget(null); restoreEditorFocus(); } }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); restoreEditorFocus(); }} className="max-h-[calc(100dvh-2rem)] p-4 sm:max-w-[430px] sm:p-5"><DialogHeader className="text-left"><DialogTitle>QR-Code</DialogTitle><DialogDescription>Teilbereich direkt öffnen und teilen.</DialogDescription></DialogHeader>{qrTarget && <SectorQRCode sectorName={qrTarget} onClose={() => { setQrTarget(null); restoreEditorFocus(); }} />}</DialogContent></Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!deleteSector.isPending && !open) setDeleteTarget(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); restoreEditorFocus(); }}>
        <AlertDialogHeader><AlertDialogTitle>„{deleteTarget?.name}“ löschen?</AlertDialogTitle><AlertDialogDescription>{deleteTarget && activeBoulderCount(deleteTarget) > 0 ? `Die ${activeBoulderCount(deleteTarget)} aktiven Boulder dieses Sektors werden ebenfalls entfernt.` : "Der Sektor wird dauerhaft entfernt."} Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={deleteSector.isPending}>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmDelete(); }} disabled={deleteSector.isPending} className="bg-destructive text-white hover:bg-destructive">{deleteSector.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}Löschen</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
};
