import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSectorArea, type CreateSectorArea } from '@/hooks/useSectorAreas';
import type { SectorArea } from '@/hooks/useSectors';
import { normalizeAreaSlug } from '@/lib/sectorAreas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function SectorAreaEditor({ areas, onClose, onCreated }: {
  areas: SectorArea[]; onClose: () => void; onCreated: (area: SectorArea) => void;
}) {
  const create = useCreateSectorArea();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const [attempt, setAttempt] = useState<CreateSectorArea | null>(null);
  const lock = useRef(false);
  const close = () => { if (!lock.current) { if (name.trim()) setDiscard(true); else onClose(); } };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const slug = normalizeAreaSlug(name);
    if (!name.trim() || !slug) { setError('Bitte gib einen Namen mit Buchstaben oder Zahlen ein.'); return; }
    if (!attempt && areas.some(area => area.slug === slug || area.name.toLocaleLowerCase('de') === name.trim().toLocaleLowerCase('de'))) {
      setError('Diesen Hauptbereich gibt es bereits.'); return;
    }
    const payload = attempt ?? { id: crypto.randomUUID(), name: name.trim(), slug, sort_order: Math.max(0, ...areas.map(area => area.sort_order)) + 1 };
    lock.current = true; setAttempt(payload); setError('');
    try { const area = await create.mutateAsync(payload); toast.success('Hauptbereich angelegt.'); onCreated(area); }
    catch (cause) {
      if (cause instanceof Error && cause.name === 'AreaConflictError') setAttempt(null);
      setError(cause instanceof Error ? cause.message : 'Anlegen wurde nicht bestätigt.');
    } finally { lock.current = false; }
  };
  return <>
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollLayout="contained" className="flex flex-col gap-0 p-0 sm:max-w-[480px]" onInteractOutside={event => { event.preventDefault(); close(); }} onEscapeKeyDown={event => { event.preventDefault(); close(); }}>
        <DialogHeader className="shrink-0 p-4 text-left sm:p-5"><DialogTitle>Neuer Hauptbereich</DialogTitle><DialogDescription>Zum Beispiel Trainingswand oder Galerie.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 sm:px-5">
            <div className="space-y-2"><Label htmlFor="area-name">Name des Hauptbereichs</Label><Input id="area-name" maxLength={60} value={name} disabled={create.isPending || Boolean(attempt)} onChange={event => { setName(event.target.value); setError(''); }} placeholder="z. B. Trainingswand" autoComplete="off" /></div>
            <p className="text-xs text-muted-foreground">Teilbereiche entstehen, sobald du ihnen den ersten Sektor zuordnest.</p>
            {error && <div role="alert" className="space-y-2 rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive"><p>{error}</p>{attempt && <p>Die Antwort ist unklar. Erneut versuchen prüft denselben Bereich, ohne ihn doppelt anzulegen.</p>}</div>}
          </div>
          <div className="flex shrink-0 gap-2 border-t border-border/60 p-4 sm:p-5"><Button type="button" variant="secondary" className="flex-1" disabled={create.isPending} onClick={close}>Abbrechen</Button><Button type="submit" className="flex-1" disabled={create.isPending || !name.trim()}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{attempt && error ? 'Erneut versuchen' : 'Bereich anlegen'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle><AlertDialogDescription>{attempt ? 'Ein möglicherweise bereits angelegter Bereich bleibt erhalten. Prüfe anschließend die Liste.' : 'Dein noch nicht gespeicherter Name geht verloren.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Zurück</AlertDialogCancel><AlertDialogAction onClick={onClose}>Verwerfen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
