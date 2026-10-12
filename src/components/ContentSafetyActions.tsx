import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Flag, UserRoundMinus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { blockUser, reportContent, reportReasons, type ContentKind, type ReportReason } from '@/lib/communitySafety';

export function ContentSafetyActions({ kind, targetId, authorId }: { kind: ContentKind; targetId: string; authorId?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<'report' | 'block' | null>(null);
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement | null>(null);
  if (!user) return <p className="text-xs text-muted-foreground">Inhalt melden: <a className="text-primary-ink underline" href="mailto:marketing@kletterwelt-sauerland.de">Marketing kontaktieren</a></p>;
  async function submit() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'block' && authorId) {
        await blockUser(authorId, true);
        await Promise.all(['boulder-comments', 'blocked-users'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
        toast.success('Nutzer blockiert', { description: 'Seine Kommentare werden für dich ausgeblendet. Du kannst die Sperre im Profil aufheben.' });
      } else if (action === 'report') {
        await reportContent(kind, targetId, reason, detail);
        toast.success('Meldung eingegangen', { description: 'Marketing prüft den Inhalt. Bei dringenden Fällen kontaktiere Marketing direkt.' });
      }
      setAction(null); setDetail('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Die Aktion konnte nicht bestätigt werden.'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" onClick={event => { trigger.current = event.currentTarget; setError(''); setAction('report'); }}><Flag className="mr-1.5 h-4 w-4" />Melden</Button>
      {authorId && authorId !== user.id && <Button size="sm" variant="ghost" onClick={event => { trigger.current = event.currentTarget; setError(''); setAction('block'); }}><UserRoundMinus className="mr-1.5 h-4 w-4" />Nutzer blockieren</Button>}
    </div>
    <Dialog open={action !== null} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
      <DialogContent scrollLayout="contained" className="flex flex-col gap-5 p-5 sm:!max-w-lg sm:p-6" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
        <DialogHeader><DialogTitle>{action === 'block' ? 'Nutzer blockieren?' : 'Inhalt melden'}</DialogTitle>
          <DialogDescription>{action === 'block' ? 'Die Kommentare dieses Nutzers werden für dich ausgeblendet. Du kannst die Sperre im Profil wieder aufheben.' : 'Die Meldung ist für andere Nutzer nicht sichtbar. Zuständig ist Marketing der Kletterwelt Sauerland.'}</DialogDescription></DialogHeader>
        {action === 'report' && <div className="min-h-0 space-y-3 overflow-y-auto">
          <label className="block text-sm font-semibold" htmlFor={`report-reason-${targetId}`}>Grund</label>
          <Select value={reason} onValueChange={value => setReason(value as ReportReason)}><SelectTrigger id={`report-reason-${targetId}`}><SelectValue /></SelectTrigger><SelectContent>{reportReasons.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <label className="block text-sm font-semibold" htmlFor={`report-detail-${targetId}`}>Beschreibung (optional)</label>
          <Textarea id={`report-detail-${targetId}`} value={detail} onChange={event => setDetail(event.target.value)} maxLength={1000} rows={4} />
          <p className="break-words text-xs text-muted-foreground">Dringender Fall? <a className="text-primary-ink underline" href="mailto:marketing@kletterwelt-sauerland.de">marketing@kletterwelt-sauerland.de</a></p>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="mt-auto gap-2 sm:mt-0"><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Abbrechen</Button><Button disabled={busy} onClick={submit}>{busy ? 'Wird gesendet …' : action === 'block' ? 'Nutzer blockieren' : 'Meldung senden'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
