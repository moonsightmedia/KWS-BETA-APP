import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Check, ChevronDown, ImageOff, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { feedbackDraft, loadFeedbackDetail, priorityLabels, safeFeedbackUrl, saveFeedback, statusLabels, typeLabels, type Feedback, type FeedbackConnection, type FeedbackDraft } from '@/lib/adminFeedback';

interface Props { id: string; userId: string; connection: FeedbackConnection; onClose: () => void; onSaved: () => void; onDelete: (id: string) => void; restoreFocus: () => void }

export function FeedbackDetailDialog(props: Props) {
  const detail = useQuery({ queryKey: ['admin-feedback', props.userId, 'detail', props.id], queryFn: ({ signal }) => loadFeedbackDetail(props.connection, props.id, signal), retry: false, refetchOnWindowFocus: false });
  if (detail.data) return <FeedbackDetailContent key={props.id} {...props} feedback={detail.data} />;
  return <Dialog open onOpenChange={open => { if (!open) props.onClose(); }}>
    <DialogContent scrollLayout="contained" onCloseAutoFocus={event => { event.preventDefault(); props.restoreFocus(); }} className="flex h-[min(80vh,680px)] max-w-[680px] flex-col p-0">
      <DialogHeader className="flex-row items-center justify-between px-5 py-4 text-left"><div><DialogTitle>Rückmeldung</DialogTitle><DialogDescription>Details zum Eintrag</DialogDescription></div><Button variant="ghost" size="icon" onClick={props.onClose} aria-label="Details schließen"><X className="h-4 w-4" /></Button></DialogHeader>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">{detail.isError ? <div role="alert" className="space-y-3"><p className="text-sm">{detail.error.message}</p><Button variant="secondary" onClick={() => detail.refetch()}>Erneut laden</Button></div> : <><Skeleton className="h-12" /><Skeleton className="h-32" /></>}</div>
    </DialogContent>
  </Dialog>;
}

function FeedbackDetailContent({ feedback, connection, userId, onClose, onSaved, onDelete, restoreFocus: returnFocus }: Props & { feedback: Feedback }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FeedbackDraft>(() => feedbackDraft(feedback));
  const [discard, setDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const lock = useRef(false);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(feedbackDraft(feedback));
  const url = safeFeedbackUrl(feedback.url);
  const screenshot = safeFeedbackUrl(feedback.screenshot_url);
  const close = () => {
    if (lock.current) return;
    if (dirty) { restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setDiscard(true); } else onClose();
  };
  const save = async () => {
    if (lock.current || !draft.title.trim()) return;
    lock.current = true; setSaving(true); setError('');
    try { await saveFeedback(connection, feedback, draft, userId); onSaved(); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Speichern fehlgeschlagen.'); }
    finally { lock.current = false; setSaving(false); }
  };
  const technical = [['Fehlerdetails', feedback.error_details], ['Gerät & Browser', feedback.browser_info], ['Metadaten', feedback.metadata]] as const;
  return <>
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollLayout="contained" onCloseAutoFocus={event => { event.preventDefault(); returnFocus(); }} className="flex h-[min(88vh,820px)] max-w-[700px] flex-col gap-0 p-0" onInteractOutside={event => { if (saving) event.preventDefault(); }} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><DialogTitle>{editing ? 'Rückmeldung bearbeiten' : feedback.type === 'error' ? 'Fehlermeldung' : 'Rückmeldung'}</DialogTitle><DialogDescription className="mt-1 text-xs">{new Date(feedback.created_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</DialogDescription></div><Button variant="ghost" size="icon" aria-label="Details schließen" disabled={saving} onClick={close}><X className="h-4 w-4" /></Button></div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {error && <p role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {editing ? <div className="space-y-2"><Label htmlFor="feedback-title">Titel</Label><Input id="feedback-title" value={draft.title} disabled={saving} onChange={event => setDraft({ ...draft, title: event.target.value })} maxLength={300} aria-invalid={!draft.title.trim()} />{!draft.title.trim() && <p className="text-xs text-destructive">Bitte einen Titel eingeben.</p>}</div> : <h3 className="break-words text-base font-semibold leading-relaxed text-foreground">{feedback.title.replace(/^Fehler:\s*/, '')}</h3>}
          {editing ? <div className="space-y-2"><Label htmlFor="feedback-description">Beschreibung</Label><Textarea id="feedback-description" value={draft.description} disabled={saving} onChange={event => setDraft({ ...draft, description: event.target.value })} className="min-h-32" /></div> : <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{feedback.description || 'Keine Beschreibung hinterlegt.'}</p>}
          {editing ? <div className="grid gap-4 sm:grid-cols-2">
            {(['status', 'priority', 'type'] as const).map(field => {
              const options = field === 'status' ? statusLabels : field === 'priority' ? priorityLabels : typeLabels;
              const label = field === 'status' ? 'Status' : field === 'priority' ? 'Priorität' : 'Typ';
              // Automatic reports stay automatic; changing their source would hide errors.
              return <div className="space-y-2" key={field}><Label htmlFor={`feedback-${field}`}>{label}</Label><Select value={draft[field]} disabled={saving || (field === 'type' && feedback.type === 'error')} onValueChange={value => setDraft({ ...draft, [field]: value })}><SelectTrigger id={`feedback-${field}`} aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options).filter(([value]) => field !== 'type' || value !== 'error' || feedback.type === 'error').map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>;
            })}
          </div> : <dl className="grid grid-cols-2 gap-4 rounded-kws-control bg-secondary p-4 text-sm"><div><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-1 font-medium">{statusLabels[feedback.status]}</dd></div><div><dt className="text-xs text-muted-foreground">Priorität</dt><dd className="mt-1 font-medium">{priorityLabels[feedback.priority]}</dd></div><div className="col-span-2 min-w-0"><dt className="text-xs text-muted-foreground">Von</dt><dd className="mt-1 break-words">{feedback.user_email || 'Gast'}</dd></div></dl>}
          {screenshot && <div className="space-y-2"><h4 className="text-sm font-semibold">Screenshot</h4>{imageFailed ? <div className="flex items-center gap-2 rounded-kws-control bg-secondary p-4 text-sm text-muted-foreground"><ImageOff className="h-4 w-4" />Screenshot nicht verfügbar</div> : <a href={screenshot} target="_blank" rel="noopener noreferrer" className="block rounded-kws-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Screenshot in voller Größe öffnen"><img src={screenshot} alt="Screenshot zur Rückmeldung" onError={() => setImageFailed(true)} loading="lazy" className="max-h-80 w-full rounded-kws-control bg-secondary object-contain" /></a>}</div>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-kws-control bg-secondary p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0 break-all">{new URL(url).host}{new URL(url).pathname}</span><ArrowUpRight className="h-4 w-4 shrink-0" /><span className="sr-only">Betroffene Seite öffnen</span></a>}
          {technical.some(([, value]) => value && Object.keys(value).length > 0) && <details className="group border-t border-border pt-2"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Technische Informationen<ChevronDown className="h-4 w-4 group-open:rotate-180" /></summary><div className="space-y-4 py-3">{technical.filter(([, value]) => value && Object.keys(value).length > 0).map(([label, value]) => <section key={label}><h4 className="mb-2 text-xs font-semibold">{label}</h4><pre className="whitespace-pre-wrap break-all rounded-kws-control bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">{JSON.stringify(value, null, 2)}</pre></section>)}</div></details>}
        </div>
        <DialogFooter className="shrink-0 flex-row gap-2 border-t border-border px-5 py-3 sm:space-x-0">
          {editing ? <><Button variant="secondary" className="flex-1" onClick={close} disabled={saving}>Abbrechen</Button><Button className="flex-1" onClick={save} disabled={saving || !draft.title.trim()}><Check className="mr-2 h-4 w-4" />{saving ? 'Speichert …' : 'Speichern'}</Button></> : <><Button variant="ghost" className="text-destructive" onClick={() => onDelete(feedback.id)} aria-label="Rückmeldung löschen"><Trash2 className="h-4 w-4" /></Button><Button variant="secondary" className="flex-1" onClick={close}>Schließen</Button><Button className="flex-1" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Bearbeiten</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent overlayClassName="z-[120]" className="z-[125]" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus.current?.focus(); }}><AlertDialogHeader><AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle><AlertDialogDescription>Deine Eingaben sind noch nicht gespeichert.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel><Button onClick={onClose}>Verwerfen</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
