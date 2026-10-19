import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Check, Minus, Plus, Send, X, Zap } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AccountAvatar, UserAvatar } from '@/components/AccountAvatar';
import { useAuth } from '@/hooks/useAuth';
import type { useBoulderFeedCommunity } from '@/hooks/useBoulderFeedCommunity';
import type { BoulderTickStatus } from '@/types/community';
import { feedResultNames } from '@/lib/boulderFeed';

export type FeedPanel = 'comments' | 'track' | 'sort' | null;

export function BoulderFeedPanels({ panel, name, data, onClose, returnFocus, draft, onDraft, sortControls }: {
  panel: FeedPanel; name: string; data: ReturnType<typeof useBoulderFeedCommunity>; onClose: () => void;
  returnFocus: HTMLElement | null; draft: string; onDraft: (value: string) => void; sortControls: React.ReactNode;
}) {
  const { user } = useAuth();
  const [result, setResult] = useState<BoulderTickStatus>('top');
  const [attempts, setAttempts] = useState(1);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [discard, setDiscard] = useState(false);
  const initialized = useRef(false);
  // Take a snapshot when opening; background refetches must not replace an edit.
  const [base, setBase] = useState('');
  useEffect(() => {
    if (panel !== 'track') { initialized.current = false; setError(''); return; }
    if (initialized.current || !data.trackReady) return;
    initialized.current = true;
    const initial = { result: data.today?.result ?? 'top', attempts: data.today?.attempt_count ?? 1, note: data.today?.note ?? '' };
    setResult(initial.result); setAttempts(initial.attempts); setNote(initial.note); setShowNote(Boolean(initial.note)); setBase(JSON.stringify(initial)); setError('');
  }, [panel, data.trackReady, data.today]);
  const close = () => {
    if (sending || data.busy) return;
    if (panel === 'track' && base !== JSON.stringify({ result, attempts, note })) {
      setDiscard(true); return;
    }
    onClose();
  };
  const comments = data.comments.data ?? [];
  return <><Dialog open={panel !== null} onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="kws-feed-sheet" data-compact="true" data-panel={panel} overlayClassName="kws-feed-overlay" scrollLayout="contained"
      onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus({ preventScroll: true }); }}>
      <div className="sheet-handle"/>
      <header className="sheet-header"><div><DialogTitle>{panel === 'comments' ? 'Kommentare' : panel === 'track' ? 'Boulder tracken' : 'Sortierung'}</DialogTitle><DialogDescription>{panel === 'track' ? `${name} · privat` : panel === 'comments' ? name : 'Gilt für deine Videoauswahl.'}</DialogDescription></div><DialogClose asChild><Button variant="secondary" size="icon" aria-label="Schließen" disabled={sending || data.busy}><X/></Button></DialogClose></header>
      <div className="sheet-body">
        {error && <p className="feed-form-error" role="alert">{error}</p>}
        {panel === 'comments' && <>
          {data.comments.isPending && <p role="status">Kommentare werden geladen …</p>}
          {data.comments.isError && <div role="alert"><p>Kommentare konnten nicht geladen werden.</p><Button variant="secondary" onClick={() => void data.comments.refetch()}>Erneut versuchen</Button></div>}
          {!data.comments.isPending && !data.comments.isError && !comments.length && <p>Noch keine Kommentare.</p>}
          <div className="comment-list">{comments.map(comment => <article className="comment" key={comment.id}><UserAvatar src={comment.author_avatar_url} name={comment.author_name}/><div><strong>{comment.author_name}</strong><p>{comment.comment}</p>{comment.moderation_status === 'pending' && <span className="pending-comment">Wartet auf Freigabe</span>}</div></article>)}</div>
        </>}
        {panel === 'track' && <>
          {!data.trackReady && <div role="status"><p>{data.community.isError || data.sessions.isError ? 'Deine Einträge konnten nicht geladen werden.' : 'Deine Einträge werden geladen …'}</p><Button variant="secondary" onClick={() => void Promise.all([data.community.refetch(), data.sessions.refetch()])}>Erneut versuchen</Button></div>}
          <fieldset disabled={!data.trackReady || data.busy}><div className="tracking-context"><span>Heute</span></div><h2>Wie lief der Boulder?</h2><div className="result-choices">{(['attempted', 'top', 'flash'] as const).map(value => <button key={value} className={result === value ? 'selected' : ''} aria-pressed={result === value} onClick={() => { setResult(value); if (value === 'flash') setAttempts(1); }}>{value === 'flash' ? <Zap/> : value === 'top' ? <BadgeCheck/> : <Plus/>}{feedResultNames[value]}</button>)}</div><div className="attempt-counter"><span>Versuche</span><div><Button variant="secondary" size="icon" aria-label="Einen Versuch weniger" disabled={attempts === 1 || result === 'flash'} onClick={() => setAttempts(value => Math.max(1, value - 1))}><Minus/></Button><strong>{attempts}</strong><Button variant="secondary" size="icon" aria-label="Einen Versuch mehr" disabled={result === 'flash'} onClick={() => setAttempts(value => value + 1)}><Plus/></Button></div></div><button className="add-note" aria-expanded={showNote} aria-controls="kws-feed-note-area" onClick={() => setShowNote(value => !value)}>{showNote ? <Minus size={15}/> : <Plus size={15}/>}Notiz {showNote ? 'ausblenden' : 'hinzufügen'}</button>{showNote && <div id="kws-feed-note-area"><label className="note-label" htmlFor="kws-feed-note">Private Notiz <span>optional</span></label><textarea id="kws-feed-note" rows={2} value={note} onChange={event => setNote(event.target.value)}/></div>}</fieldset>
        </>}
        {panel === 'sort' && sortControls}
      </div>
      <footer className="sheet-footer">
        {panel === 'comments' && user && <><form onSubmit={async event => { event.preventDefault(); if (!draft.trim() || sending) return; setSending(true); setError(''); try { await data.comments.addComment.mutateAsync(draft.trim()); onDraft(''); await data.comments.refetch(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Kommentar konnte nicht gespeichert werden.'); } finally { setSending(false); } }}><AccountAvatar user={user}/><Input aria-label="Kommentar schreiben" placeholder="Kommentar schreiben …" value={draft} maxLength={5000} disabled={sending} onChange={event => onDraft(event.target.value)}/><Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Kommentar senden"><Send/></Button></form><p>Neue Kommentare werden vor der Veröffentlichung geprüft.</p></>}
        {panel === 'track' && <Button className="save-track" disabled={!data.trackReady || data.busy} onClick={async () => { setError(''); try { await data.saveTrack({ result, attempts, note }); onClose(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Tracking konnte nicht gespeichert werden.'); } }}><Check size={17}/>{data.busy ? 'Wird gespeichert …' : `${feedResultNames[result]} für heute speichern`}</Button>}
        {panel === 'sort' && <Button className="save-track" onClick={close}>Zurück zum Video</Button>}
      </footer>
    </DialogContent>
  </Dialog><AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eingaben verwerfen?</AlertDialogTitle><AlertDialogDescription>Deine Änderungen an diesem Tracking-Eintrag wurden noch nicht gespeichert.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel><AlertDialogAction onClick={() => { setDiscard(false); onClose(); }}>Verwerfen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
