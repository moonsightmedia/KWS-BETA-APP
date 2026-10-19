import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, MessageSquare, Plus, Star, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';

// Same page composition as BoulderDetail; data and actions stay in this draft.
export function BoulderDetailPreview({ item, entry, onBack, onProject, onRating, onComments, onTrack, panelOpen, source, position, origin }: {
  item: { id: string; name: string; area: string; grade: number; color: string; poster: string; average: string; votes: number };
  entry: { project: boolean; rating: number; comments: { name: string; text: string; pending?: boolean }[]; track: { result: 'attempted' | 'top' | 'flash'; attempts: number; note: string } | null };
  onBack: () => void; onProject: () => void; onRating: (value: number) => void;
  onComments: (trigger: HTMLElement) => void; onTrack: (trigger: HTMLElement) => void;
  panelOpen: boolean; source: string; position: number; origin: 'Videofeed' | 'Boulderübersicht';
}) {
  const [tab, setTab] = useState<'Info' | 'Track' | 'Beta'>('Info');
  const ResultIcon = entry.track?.result === 'flash' ? Zap : entry.track?.result === 'top' ? BadgeCheck : Plus;
  return <Dialog open onOpenChange={open => { if (!open && !panelOpen) onBack(); }}>
    <DialogContent className="feed-detail" data-feed-detail="true" aria-describedby="detail-preview-description"
      onCloseAutoFocus={event => { event.preventDefault(); document.querySelector<HTMLElement>(`.reel-page[data-active="true"] .boulder-title, .catalog-items [data-boulder-id="${item.id}"]`)?.focus({ preventScroll: true }); }}
      onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('detail-page-title')?.focus(); }}>
      <header className="detail-header"><div><Button size="icon" variant="secondary" aria-label={`Zurück ${origin === 'Videofeed' ? 'zum Videofeed' : 'zur Boulderübersicht'}`} onClick={onBack}><ArrowLeft/></Button><DialogTitle id="detail-page-title" tabIndex={-1}>Boulder</DialogTitle></div></header>
      <DialogDescription id="detail-preview-description" className="sr-only">Detailvorschau mit Beispieldaten. Zurück führt zum vorherigen Einstieg.</DialogDescription>
      <div className="detail-main">
        <section className="detail-identity"><h2>{item.name}</h2><div><DifficultyBadge variant="detail" color={item.color} difficulty={item.grade}/><span>·</span><span>{item.area}</span><span>·</span><span>Beispieldaten</span></div></section>
        <div className="detail-columns">
          <section className="detail-media" aria-label="Boulder-Video"><video src={source} poster={item.poster} controls muted playsInline preload="auto"
            onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(position, Math.max(0, event.currentTarget.duration - .1)); }}
            ref={node => { if (node && panelOpen) node.pause(); }}/><span className="detail-official"><BadgeCheck size={14}/>Offizielle Beta</span></section>
          <section className="detail-content">
            <KwsSegmentedControl value={tab} options={['Info', 'Track', 'Beta'].map(value => ({ value: value as typeof tab, label: value }))} ariaLabel="Boulder-Inhalt" onValueChange={setTab}/>
            {tab === 'Info' && <>
              <section className="detail-section"><h3>Bewertung</h3><p><Star size={15}/>{item.average} <span>aus {item.votes} Bewertungen</span></p><div className="detail-stars" role="group" aria-label="Deine Sternebewertung">{[1,2,3,4,5].map(value => <button key={value} aria-label={`${value} von 5 Sternen`} aria-pressed={entry.rating === value} onClick={() => onRating(value)}><Star fill={entry.rating >= value ? 'currentColor' : 'none'}/></button>)}</div></section>
              <section className="detail-section"><h3>Kommentare <span>{entry.comments.filter(comment => !comment.pending).length}</span></h3>{entry.comments.map((comment, i) => <article className="detail-comment" key={i}><strong>{comment.name}</strong><p>{comment.text}</p>{comment.pending && <small>Wartet auf Freigabe</small>}</article>)}<Button variant="secondary" onClick={event => onComments(event.currentTarget)}><MessageSquare size={17}/>Kommentar schreiben</Button></section>
            </>}
            {tab === 'Track' && <>
              <section className="detail-section"><h3>Heute</h3><p>{entry.track ? <><ResultIcon size={17}/>{entry.track.result === 'top' ? 'Top' : entry.track.result === 'flash' ? 'Flash' : 'Versucht'} · {entry.track.attempts} {entry.track.attempts === 1 ? 'Versuch' : 'Versuche'}</> : 'Noch kein Eintrag für heute.'}</p>{entry.track?.note && <p>{entry.track.note}</p>}<Button onClick={event => onTrack(event.currentTarget)}><Plus size={17}/>{entry.track ? 'Bearbeiten' : 'Heute starten'}</Button></section>
              <section className="detail-section"><h3>Markierungen</h3><Button variant={entry.project ? 'default' : 'secondary'} aria-pressed={entry.project} onClick={onProject}><Target size={17}/>Projekt{entry.project && <Check size={15}/>}</Button></section>
            </>}
            {tab === 'Beta' && <section className="detail-section"><h3>Offizielle Beta</h3><p>Das Video zeigt eine mögliche Lösung für diesen Boulder.</p><p>Weitere Beta-Videos sind in diesem Entwurf nicht hinterlegt.</p></section>}
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
