import { useId, useRef, useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCreateColor, useDeleteColor, useUpdateColor, type ColorRow } from '@/hooks/useColors';
import { ColorSwatch, ColorValueField } from './ColorValueField';
import { colorDraftPayload, makeColorDraft, validateColorDraft, type ColorDraft } from './colorForm';

export function ColorEditor({ color, colors, onClose, onRestoreFocus }: { color?: ColorRow; colors: ColorRow[]; onClose: () => void; onRestoreFocus: () => void }) {
  const id = useId();
  const initial = useRef(makeColorDraft(color, Math.max(0, ...colors.map(c => c.sort_order)) + 1));
  const [draft, setDraft] = useState(initial.current);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmation, setConfirmation] = useState<'delete' | 'discard' | null>(null);
  const confirmationTrigger = useRef<HTMLElement | null>(null);
  const confirm = (kind: 'delete' | 'discard') => {
    confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmation(kind);
  };
  const create = useCreateColor();
  const update = useUpdateColor();
  const remove = useDeleteColor();
  const pending = create.isPending || update.isPending || remove.isPending;
  const dirty = JSON.stringify(colorDraftPayload(draft)) !== JSON.stringify(colorDraftPayload(initial.current));
  const errors = attempted ? validateColorDraft(draft, colors, color?.id) : {};
  const setField = <K extends keyof ColorDraft>(key: K, value: ColorDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setServerError('');
  };
  const close = () => {
    if (pending) return;
    if (dirty) confirm('discard');
    else onClose();
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setAttempted(true);
    if (Object.keys(validateColorDraft(draft, colors, color?.id)).length) return;
    try {
      const payload = colorDraftPayload(draft);
      if (color) await update.mutateAsync({ id: color.id, ...payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch {
      setServerError('Speichern nicht möglich. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.');
    }
  };
  const deleteConfirmed = async () => {
    if (!color || pending) return;
    try { await remove.mutateAsync(color.id); onClose(); }
    catch { setConfirmation(null); setServerError('Löschen nicht möglich. Bitte versuche es erneut oder deaktiviere die Farbe.'); }
  };

  return <>
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollLayout="contained" className="flex max-h-[calc(100dvh-2rem)] flex-col sm:!max-w-[520px]" onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}>
        <div className="flex shrink-0 items-start justify-between gap-3 p-4 pb-3 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            <DialogTitle>{color ? 'Farbe bearbeiten' : 'Neue Farbe'}</DialogTitle>
            <DialogDescription className="sr-only">Name, Farbwerte und Sichtbarkeit der Grifffarbe bearbeiten.</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-11 w-11 shrink-0" aria-label="Farbeditor schließen" disabled={pending} onClick={close}><X /></Button>
        </div>
        <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
            <fieldset disabled={pending} className="min-w-0 space-y-4">
              <div className="flex items-center gap-4 py-2" aria-label="Farbvorschau">
                <ColorSwatch hex={draft.hex} secondaryHex={draft.twoTone ? draft.secondaryHex : null} className="h-20 w-20" />
                <div className="min-w-0"><p className="text-xs text-muted-foreground">{draft.twoTone ? 'Zweifarbiger Griff' : 'Einfarbiger Griff'}</p><p className="mt-1 break-words text-base font-semibold">{draft.name.trim() || 'Deine neue Grifffarbe'}</p></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={id + '-name'}>Farbname</Label>
                <Input id={id + '-name'} value={draft.name} onChange={e => setField('name', e.target.value)} placeholder="z. B. Grün–Gelb" autoComplete="off" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? id + '-name-error' : undefined} />
                {errors.name && <p id={id + '-name-error'} className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <KwsSegmentedControl value={draft.twoTone ? 'two' : 'one'} onValueChange={value => setField('twoTone', value === 'two')} options={[{ value: 'one', label: 'Einfarbig' }, { value: 'two', label: 'Zweifarbig' }]} ariaLabel="Farbaufbau" />
              <div className={draft.twoTone ? 'grid min-w-0 gap-4 sm:grid-cols-2' : 'min-w-0'}>
                <ColorValueField label={draft.twoTone ? 'Erste Farbe' : 'Farbwert'} value={draft.hex} onChange={value => setField('hex', value)} error={errors.hex} disabled={pending} />
                {draft.twoTone && <ColorValueField label="Zweite Farbe" value={draft.secondaryHex} onChange={value => setField('secondaryHex', value)} error={errors.secondaryHex} disabled={pending} />}
              </div>
              <div className="flex items-center justify-between gap-4 rounded-kws-control bg-secondary/60 p-3">
                <div><Label htmlFor={id + '-active'}>In der Farbauswahl anzeigen</Label><p className="mt-1 text-xs text-muted-foreground">{draft.active ? 'Für neue Boulder verfügbar' : 'Ausgeblendet, bleibt im Katalog'}</p></div>
                <span className="relative inline-flex min-h-11 shrink-0 items-center"><Switch id={id + '-active'} aria-label="Aktiv" checked={draft.active} onCheckedChange={value => setField('active', value)} disabled={pending} /></span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div><Label htmlFor={id + '-order'}>Reihenfolge</Label><p id={id + '-order-help'} className="mt-1 text-xs text-muted-foreground">Kleinere Zahlen stehen weiter oben.</p></div>
                <div className="space-y-2">
                  <Input id={id + '-order'} inputMode="numeric" value={draft.sortOrder} onChange={e => setField('sortOrder', e.target.value)} aria-invalid={Boolean(errors.sortOrder)} aria-describedby={errors.sortOrder ? id + '-order-error' : id + '-order-help'} className="w-20 text-center tabular-nums" />
                </div>
              </div>
              {errors.sortOrder && <p id={id + '-order-error'} className="text-xs text-destructive">{errors.sortOrder}</p>}
            </fieldset>
            {serverError && <p role="alert" className="mt-4 rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
            {attempted && Object.keys(errors).length > 0 && <p role="alert" className="mt-3 text-sm text-destructive">Prüfe die markierten Felder.</p>}
          </div>
          <div className="shrink-0 border-t border-border/60 p-4 sm:px-5">
            <div className="flex gap-2">
              {color && <Button type="button" variant="ghost" size="icon" aria-label={color.name + ' löschen'} className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={pending} onClick={() => confirm('delete')}><Trash2 className="h-4 w-4" /></Button>}
              <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={close}>Abbrechen</Button>
              <Button type="submit" className="flex-1" disabled={pending || (Boolean(color) && !dirty)}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{color ? 'Speichern' : 'Anlegen'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open && !pending) setConfirmation(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => { if (confirmationTrigger.current?.isConnected) confirmationTrigger.current.focus(); }); }}>
        <AlertDialogTitle>{confirmation === 'delete' ? '„' + color?.name + '“ löschen?' : 'Änderungen verwerfen?'}</AlertDialogTitle>
        <AlertDialogDescription>{confirmation === 'delete' ? 'Die Farbe wird dauerhaft aus dem Katalog entfernt. Wenn du sie nur aus der Auswahl ausblenden möchtest, deaktiviere sie stattdessen.' : 'Deine noch nicht gespeicherten Eingaben gehen dabei verloren.'}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Zurück</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirmation === 'delete' ? deleteConfirmed : onClose}>{pending ? 'Wird gelöscht …' : confirmation === 'delete' ? 'Farbe löschen' : 'Verwerfen'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
