import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { getAccountDeletionRequest, requestAccountDeletion, formatDeletionDeadline } from '@/lib/accountDeletion';

export function AccountDeletion({ userId }: { userId: string }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const queryKey = ['account-deletion-request', userId];
  const request = useQuery({ queryKey, queryFn: () => getAccountDeletionRequest(userId), retry: 1 });
  useEffect(() => { if (request.data && !open && submitted.current) { confirmation.current?.focus(); submitted.current = false; } }, [request.data, open]);

  async function submit() {
    if (locked.current) return;
    locked.current = true; setPending(true); setError('');
    try {
      const record = await requestAccountDeletion();
      submitted.current = true;
      client.setQueryData(queryKey, record);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Antrag konnte nicht gespeichert werden.');
    } finally { locked.current = false; setPending(false); }
  }

  return <KwsSurface className="p-4 sm:p-5">
    <h2 className="text-base font-semibold">Konto löschen</h2>
    {request.data ? <div ref={confirmation} tabIndex={-1} className="mt-2 space-y-2 outline-none" role="status">
      <p className="text-sm">Dein Löschantrag ist eingegangen.</p>
      <p className="text-sm text-muted-foreground">Dein Konto und die zugehörigen persönlichen Daten werden spätestens bis {formatDeletionDeadline(request.data.due_at)} gelöscht. Du erhältst danach eine Bestätigung per E-Mail.</p>
    </div> : <>
      <p className="mt-2 text-sm text-muted-foreground">Du kannst die vollständige Löschung deines Kontos und deiner persönlichen Daten hier beantragen. Marketing bearbeitet den Antrag innerhalb von sieben Tagen und bestätigt die Löschung per E-Mail.</p>
      {request.isError && <p role="alert" className="mt-2 text-sm text-destructive">Der bisherige Antragsstatus konnte nicht geladen werden. Ein erneuter Antrag erzeugt keinen doppelten Vorgang.</p>}
      <Button ref={trigger} type="button" variant="outline" className="mt-4 h-11 w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto" disabled={request.isLoading} onClick={() => { setError(''); setOpen(true); }}>
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Konto löschen
      </Button>
    </>}
    <AlertDialog open={open} onOpenChange={value => { if (!locked.current) setOpen(value); }}>
      <AlertDialogContent onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
        <AlertDialogTitle>Konto endgültig löschen?</AlertDialogTitle>
        <AlertDialogDescription>Dein Profil, deine Aktivitäten, Kommentare, Bewertungen und persönlichen Dateien werden vollständig entfernt. Das Konto wird innerhalb von sieben Tagen gelöscht; danach lässt es sich nicht wiederherstellen. Du erhältst eine Bestätigung per E-Mail.</AlertDialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={() => void submit()}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}Löschung beantragen</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </KwsSurface>;
}
