import { useId, useRef, useState } from 'react';
import { Loader2, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { makeProfileDraft, parseBirthDate, profileDraftPayload, type EditableProfile, type ProfileDraft, type ProfilePayload } from '@/lib/userProfileForm';

type Props = {
  profile: EditableProfile;
  onSave: (payload: ProfilePayload) => Promise<unknown>;
  onClose: () => void;
  onRestoreFocus: () => void;
};

export function UserProfileEditor({ profile, onSave, onClose, onRestoreFocus }: Props) {
  const id = useId();
  const initial = useRef(makeProfileDraft(profile));
  const [draft, setDraft] = useState(initial.current);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const discardTrigger = useRef<HTMLElement | null>(null);
  const birthdayInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial.current);
  const birthdayInvalid = attempted && parseBirthDate(draft.birthDate) === undefined;
  const setField = (key: keyof ProfileDraft, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
    setServerError('');
  };
  const close = () => {
    if (saving.current) return;
    if (!dirty) { onClose(); return; }
    discardTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmDiscard(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving.current || !dirty) return;
    setAttempted(true);
    if (parseBirthDate(draft.birthDate) === undefined) { birthdayInput.current?.focus(); return; }
    saving.current = true;
    setPending(true);
    setServerError('');
    try {
      await onSave(profileDraftPayload(draft));
      onClose();
    } catch {
      setServerError('Das Profil konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  };

  return <>
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollLayout="contained" className="flex max-h-[calc(100dvh-2rem)] flex-col sm:!max-w-[520px]" onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}>
        <div className="flex shrink-0 items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="min-w-0"><DialogTitle>Benutzer bearbeiten</DialogTitle><DialogDescription className="sr-only">Persönliche Angaben bearbeiten.</DialogDescription></div>
          <Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-2 h-11 w-11 shrink-0" aria-label="Benutzereditor schließen" disabled={pending} onClick={close}><X aria-hidden="true" /></Button>
        </div>
        <form onSubmit={save} noValidate aria-busy={pending} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5" data-testid="profile-editor-scroll">
            <div className="mb-5 flex items-center gap-3 rounded-kws-control bg-secondary/70 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-card text-muted-foreground"><User className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Konto</p><p className="mt-1 break-all text-sm font-medium">{profile.email || 'Keine E-Mail hinterlegt'}</p></div>
            </div>
            <fieldset disabled={pending} className="min-w-0">
              <legend className="sr-only">Persönliche Angaben</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor={id + '-first'}>Vorname</Label><Input id={id + '-first'} value={draft.firstName} onChange={e => setField('firstName', e.target.value)} autoComplete="off" /></div>
                <div className="space-y-2"><Label htmlFor={id + '-last'}>Nachname</Label><Input id={id + '-last'} value={draft.lastName} onChange={e => setField('lastName', e.target.value)} autoComplete="off" /></div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor={id + '-birth'}>Geburtsdatum <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input ref={birthdayInput} id={id + '-birth'} value={draft.birthDate} onChange={e => setField('birthDate', e.target.value)} placeholder="TT.MM.JJJJ" autoComplete="off" inputMode="text" maxLength={10} aria-invalid={birthdayInvalid} aria-describedby={id + '-birth-help'} />
                <p id={id + '-birth-help'} className={birthdayInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{birthdayInvalid ? 'Bitte ein gültiges Datum eingeben, das nicht in der Zukunft liegt.' : 'TT.MM.JJJJ · Zum Entfernen leeren.'}</p>
              </div>
            </fieldset>
            {serverError && <p role="alert" className="mt-4 rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
            {birthdayInvalid && <p role="alert" className="sr-only">Bitte das Geburtsdatum prüfen.</p>}
          </div>
          <div className="shrink-0 border-t border-border/60 p-4 sm:px-5">
            <p className="mb-3 text-xs text-muted-foreground" role="status">{pending ? 'Profil wird gespeichert …' : dirty ? 'Ungespeicherte Änderungen' : 'Noch keine Änderungen'}</p>
            <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={close}>Abbrechen</Button><Button type="submit" className="flex-1" disabled={pending || !dirty}>{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Speichern</Button></div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
      <AlertDialogContent overlayClassName="z-[120]" className="z-[125]" onCloseAutoFocus={event => { event.preventDefault(); discardTrigger.current?.focus(); }}>
        <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
        <AlertDialogDescription>Die Änderungen an diesem Benutzerprofil sind noch nicht gespeichert.</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel><Button type="button" onClick={() => { setConfirmDiscard(false); onClose(); }}>Verwerfen</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
