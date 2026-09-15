import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface Props {
  error?: string | null;
  existing: boolean;
  name: string;
  onNameChange: (name: string) => void;
  preview: string | null;
  fileName?: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  pending: boolean;
  progress: number;
  dirty: boolean;
  canSave: boolean;
  geometryDirty: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onDiscard: () => void;
  onRestoreFocus: () => void;
}

export function HallMapSettingsDialog(props: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const close = () => {
    if (props.pending) return;
    if (props.dirty) setConfirmDiscard(true);
    else props.onClose();
  };
  return <>
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollLayout="contained" className="flex flex-col md:!max-w-[520px]" onCloseAutoFocus={event => { event.preventDefault(); props.onRestoreFocus(); }} onInteractOutside={event => { if (props.pending) event.preventDefault(); }} onEscapeKeyDown={event => { if (props.pending) event.preventDefault(); }}>
        <div className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-5">
          <div><DialogTitle>{props.existing ? 'Karte verwalten' : 'Hallenkarte einrichten'}</DialogTitle><DialogDescription>Zeichenvorlage und interne Bezeichnung.</DialogDescription></div>
          <Button variant="ghost" size="icon" aria-label="Kartenverwaltung schließen" disabled={props.pending} onClick={close}><X className="h-4 w-4" /></Button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5 sm:px-5">
          <div className="space-y-3">
            <Label htmlFor="hall-map-file">Zeichenvorlage</Label>
            <div className="grid min-h-32 place-items-center overflow-hidden rounded-kws-control bg-secondary p-3">
              {props.preview && !previewFailed ? <img key={props.preview} src={props.preview} alt="Vorschau der gespeicherten Zeichenvorlage" className="max-h-52 w-full object-contain" onError={() => setPreviewFailed(true)} /> : <p className="text-sm text-muted-foreground">{previewFailed ? 'Vorschau nicht verfügbar' : 'Noch keine Zeichenvorlage'}</p>}
            </div>
            <input ref={fileInput} id="hall-map-file" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" disabled={props.pending} className="sr-only" onChange={event => { setPreviewFailed(false); props.onFileChange(event); }} />
            <Button variant="secondary" className="w-full gap-2" disabled={props.pending} onClick={() => fileInput.current?.click()}><ImagePlus className="h-4 w-4" />{props.preview ? 'Zeichenvorlage ersetzen' : 'Zeichenvorlage auswählen'}</Button>
            <p className="break-words text-xs text-muted-foreground">{props.fileName || 'JPG, PNG oder WebP · maximal 10 MB'}</p>
            <p className="text-xs text-muted-foreground">Nur die Vorlage zum Nachzeichnen. Die farbigen Sektorflächen bearbeitest du direkt auf der Karte.</p>
            {props.fileName && <p role="status" className="rounded-kws-control bg-secondary p-3 text-xs">Neues Bild als Entwurf. Die gespeicherten Flächen bleiben unverändert – nach dem Speichern ihre Position prüfen.</p>}
          </div>
          <div className="space-y-2"><Label htmlFor="hall-map-name">Interne Bezeichnung</Label><Input id="hall-map-name" aria-describedby="hall-map-name-help" value={props.name} onChange={event => props.onNameChange(event.target.value)} disabled={props.pending} placeholder="z. B. Boulderhalle" /><p id="hall-map-name-help" className="text-xs text-muted-foreground">Dient nur zur Zuordnung in der Verwaltung, nicht als Sektorname.</p></div>
          {props.error && <p role="alert" className="text-sm text-destructive">{props.error} Deine Eingaben bleiben erhalten.</p>}
          {props.existing && <details className="text-xs"><summary className="cursor-pointer py-3 text-muted-foreground">Weitere Aktionen</summary><Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={props.onDelete} disabled={props.pending || props.geometryDirty}><Trash2 className="h-4 w-4" />Hallenkarte und Flächen löschen</Button></details>}
          {props.geometryDirty && <p className="text-sm text-muted-foreground">Speichere oder verwirf zuerst die geänderte Sektorfläche.</p>}
          {props.pending && props.progress > 0 && <div role="status" className="space-y-2"><Progress value={props.progress} /><p className="text-xs text-muted-foreground">Bild wird hochgeladen · {Math.round(props.progress)} %</p></div>}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border/60 p-4 sm:px-5">
          <Button variant="secondary" className="flex-1" disabled={props.pending} onClick={close}>Abbrechen</Button>
          <Button className="flex-1" disabled={!props.canSave || props.pending} onClick={props.onSave}>{props.pending && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{props.existing ? 'Karte speichern' : 'Karte anlegen'}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <AlertDialogContent><AlertDialogTitle>Kartenänderungen verwerfen?</AlertDialogTitle><AlertDialogDescription>Der geänderte Name und das ausgewählte Bild werden nicht gespeichert.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel><Button variant="destructive" onClick={() => { props.onDiscard(); props.onClose(); }}>Verwerfen</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}
