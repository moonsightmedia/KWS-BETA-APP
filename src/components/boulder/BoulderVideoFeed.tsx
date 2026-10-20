import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, BadgeCheck, Check, ChevronDown, ChevronRight, Eye, EyeOff, Loader2, MessageSquare, Pause, Play, Plus, Settings, SlidersHorizontal, Star, Target, Video, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DifficultyBadge } from './DifficultyBadge';
import { BoulderTypeBadge } from './BoulderTypeBadge';
import { BoulderFeedPanels, type FeedPanel } from './BoulderFeedPanels';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useBoulderFeedCommunity } from '@/hooks/useBoulderFeedCommunity';
import { useBoulderFeedGestures } from '@/hooks/useBoulderFeedGestures';
import { useBoulderFeedPlayback } from '@/hooks/useBoulderFeedPlayback';
import { feedResultNames, isExternalBoulderVideo } from '@/lib/boulderFeed';
import { getAvailableVideoQualities, type VideoQualityLevel } from '@/utils/videoUtils';
import type { Boulder } from '@/types/boulder';
import './BoulderVideoFeed.css';

const qualityNames = { hd: 'HD', sd: 'SD', low: 'Low' };

export function BoulderVideoFeed({ boulders, active, loading, onExit, onDetail, onFilter, filtersOpen, filterCount, sortLabel, sortControls, onReset }: {
  boulders: Boulder[]; active: boolean; loading?: boolean; onExit: () => void; onDetail: (id: string) => void;
  onFilter: () => void; filtersOpen: boolean; filterCount: number; sortLabel: string; sortControls: (close: () => void) => ReactNode; onReset: () => void;
}) {
  const { user } = useAuth();
  const { data: colors } = useColors();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState<FeedPanel>(null);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [previewRating, setPreviewRating] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reelRef = useRef<HTMLElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const starGesture = useRef<{ pointer: number; value: number } | null>(null);
  const panelTrigger = useRef<HTMLElement | null>(null);
  const focused = useRef(false);
  const index = Math.max(0, boulders.findIndex(boulder => boulder.id === currentId));
  const item = boulders[index];
  const data = useBoulderFeedCommunity(item?.id);
  const external = item ? isExternalBoulderVideo(item) : false;
  const gestures = useBoulderFeedGestures({ videoRef, reelRef, paused, onPause: setPaused, index, count: boulders.length,
    onIndex: next => { setCurrentId(boulders[next]?.id ?? null); setPaused(false); setPreviewRating(null); }, onExit,
    disabled: !active || Boolean(panel) || filtersOpen || qualityOpen || data.busy || loading === true,
  });
  const media = useBoulderFeedPlayback({ videoRef, boulder: item, enabled: active && !external && !panel && !filtersOpen && !qualityOpen,
    paused, holdRate: gestures.holdRate, suspended: gestures.suspended,
  });
  const openPanel = (next: FeedPanel, trigger: HTMLElement) => { panelTrigger.current = trigger; setPanel(next); };
  useEffect(() => { setPreviewRating(null); }, [item?.id]);
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement, body = document.body;
    root.setAttribute('data-boulder-feed', 'true'); body.setAttribute('data-boulder-feed', 'true');
    if (!focused.current) { focused.current = true; reelRef.current?.focus({ preventScroll: true }); }
    return () => { root.removeAttribute('data-boulder-feed'); body.removeAttribute('data-boulder-feed'); };
  }, [active]);
  const saveRating = (value: number) => {
    if (!user || !data.ready || data.busy) return;
    void data.saveRating(value).catch(error => toast.error(error instanceof Error ? error.message : 'Bewertung konnte nicht gespeichert werden.')).finally(() => setPreviewRating(null));
  };
  const starAt = (x: number) => { const box = starsRef.current!.getBoundingClientRect(); return Math.max(1, Math.min(5, Math.ceil((x - box.left) / (box.width / 5)))); };
  const beginRating = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !user || !data.ready || data.busy) return;
    const value = starAt(event.clientX); event.currentTarget.setPointerCapture(event.pointerId);
    starGesture.current = { pointer: event.pointerId, value }; setPreviewRating(value);
  };
  const finishRating = (event: PointerEvent<HTMLDivElement>) => {
    if (starGesture.current?.pointer !== event.pointerId) return;
    saveRating(starGesture.current.value); starGesture.current = null;
  };
  const commentCount = data.comments.data?.filter(comment => comment.moderation_status !== 'pending' && comment.moderation_status !== 'rejected').length;
  const availableQualities = item ? getAvailableVideoQualities(item.betaVideoUrls, item.betaVideoUrl) : [];
  const frames = boulders.slice(Math.max(0, index - 1), index + 2);
  return <>
    <main className="kws-feed" data-clean={gestures.hidden} data-holding={gestures.holdRate !== null} data-active-feed={active} data-swipe-ignore data-pull-to-refresh="ignore" aria-label="Boulder-Videofeed">
      <div className="desktop-caption"><Video size={19}/><strong>Videos</strong></div>
      <section ref={reelRef} className="reel" tabIndex={0} aria-label={item?.name ?? 'Boulder-Videos'} {...gestures.handlers}>
        <div className={`reel-track ${gestures.settling ? 'is-settling' : ''}`} style={{ transform: `translate3d(0,${gestures.dragY}px,0)` }}>
          {frames.map((boulder, frameIndex) => {
            const position = Math.max(0, index - 1) + frameIndex;
            const current = position === index;
            const remote = isExternalBoulderVideo(boulder);
            const selectedRating = current ? previewRating ?? data.community.data?.myRating ?? 0 : 0;
            const project = current && Boolean(data.current?.is_project);
            const TrackIcon = current && data.today?.result === 'flash' ? Zap : current && data.today?.result === 'top' ? BadgeCheck : Plus;
            return <article className="reel-page" key={boulder.id} data-boulder-id={boulder.id} data-active={current} aria-hidden={!current} {...(!current ? { inert: '' } : {})} style={{ transform: `translate3d(0,${(position - index) * 100}%,0)` }}>
              {remote ? <img className="reel-video" src={boulder.thumbnailUrl} alt=""/> : <video ref={media.register(boulder.id)} className="reel-video" data-active={current} src={media.sourceFor(boulder)} poster={boulder.thumbnailUrl} muted loop playsInline preload={current ? 'auto' : 'metadata'} {...media.events(boulder.id)}/>}
              <div className="reel-chrome" aria-hidden={gestures.hidden} {...(gestures.hidden ? { inert: '' } : {})}>
                <div className="video-shade"/>
                <header className="reel-header"><button className="overlay-button" aria-label="Zur Boulderübersicht" onClick={onExit}><ArrowLeft/></button><div><strong>Videos</strong><button className="sort-trigger" aria-label="Sortierung öffnen" onClick={event => openPanel('sort', event.currentTarget)}>{sortLabel}<ChevronDown size={12}/></button></div><button className="overlay-button" aria-label="Bedienelemente ausblenden" onClick={() => gestures.setClean(true)}><EyeOff/></button><button className="overlay-button filter-trigger" aria-label="Boulder filtern" onClick={onFilter}><SlidersHorizontal/>{filterCount > 0 && <span>{filterCount}</span>}</button></header>
                <div className="official"><BadgeCheck size={14}/>Offizielle Beta</div>
                {current && !remote && <DropdownMenu open={qualityOpen} onOpenChange={setQualityOpen}><DropdownMenuTrigger asChild><button className="quality-trigger" disabled={availableQualities.length < 2} aria-label={`Videoqualität: ${qualityNames[media.quality]}`}><Settings size={16}/>{qualityNames[media.quality]}<ChevronDown size={13}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="kws-feed-quality-menu"><DropdownMenuLabel>Videoqualität</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuRadioGroup value={media.quality} onValueChange={value => media.changeQuality(value as VideoQualityLevel)}>{availableQualities.map(value => <DropdownMenuRadioItem value={value} key={value} className="feed-quality-option"><span className="quality-check">{value === media.quality && <Check size={15}/>}</span><strong>{qualityNames[value]}</strong><span>{value === 'hd' ? 'Hohe Auflösung' : value === 'sd' ? 'Ausgewogen' : 'Weniger Daten'}</span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>}
                {user && <div className="reel-actions">
                  <button className={project ? 'is-selected' : ''} disabled={!data.trackReady || data.busy} title={project ? 'Projektmarkierung entfernen' : 'Als Projekt markieren'} aria-label={project ? 'Projektmarkierung entfernen' : 'Als Projekt markieren'} aria-pressed={project} onClick={() => void data.toggleProject()}><span className="action-icon"><Target/>{project && <Check className="project-check"/>}</span></button>
                  <button title="Kommentare öffnen" aria-label={commentCount === undefined ? 'Kommentare öffnen' : `${commentCount} Kommentare öffnen`} onClick={event => openPanel('comments', event.currentTarget)}><span className="action-icon comment-action"><MessageSquare/><span className="comment-count" aria-hidden="true">{data.comments.isError ? '!' : commentCount === undefined ? '…' : commentCount > 99 ? '99+' : commentCount}</span></span></button>
                  <button className={current && data.today ? 'is-selected' : ''} aria-label={current && data.today ? `Heute: ${feedResultNames[data.today.result]} · Tracking öffnen` : 'Tracking öffnen'} title="Tracking öffnen" disabled={data.busy} onClick={event => openPanel('track', event.currentTarget)}><span className="action-icon"><TrackIcon/></span></button>
                </div>}
                {current && remote && <div className="media-status"><p>Externes Beta-Video</p><Button onClick={() => onDetail(boulder.id)}>Beta in der Detailansicht ansehen</Button></div>}
                {current && !remote && (media.error || media.blocked || paused || media.buffering) && <div className="media-status">{media.error ? <><p>Video gerade nicht verfügbar</p><Button onClick={() => { setPaused(false); media.retry(); }}>Erneut versuchen</Button></> : media.blocked ? <button className="resume-button" aria-label="Video fortsetzen" onClick={() => { setPaused(false); media.play(); }}><Play fill="currentColor"/></button> : paused && gestures.holdRate === null ? <span className="resume-button" aria-hidden="true"><Play fill="currentColor"/></span> : media.buffering && <p role="status"><Loader2 size={18} className="animate-spin"/>Video wird geladen …</p>}</div>}
                <footer className="reel-footer">
                  <div className="boulder-identity"><DifficultyBadge color={boulder.color} color2={boulder.color2} difficulty={boulder.difficulty} colors={colors} className="feed-grade"/><div><a className="boulder-title" href={`/boulders/${boulder.id}`} aria-label={`${boulder.name}: Boulder-Details öffnen`} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onDetail(boulder.id); }}>{boulder.name}<ChevronRight size={17}/></a><BoulderTypeBadge volumeOnly={boulder.volumeOnly} compact className="mt-1"/><p>{boulder.sector2 ? `${boulder.sector} · ${boulder.sector2}` : boulder.sector}<span>·</span>{boulder.status === 'abgeschraubt' ? 'Abgeschraubt' : 'Aktuell an der Wand'}</p></div></div>
                  {user && <><div className="rating-head"><span>Deine Bewertung</span><span aria-live="polite">{!data.ready ? data.community.isError ? 'Nicht verfügbar' : 'Wird geladen …' : selectedRating ? `${selectedRating} / 5` : 'Noch offen'}</span></div><div className="rating-line"><div ref={current ? starsRef : undefined} className="star-control" data-gesture="rating" role="group" aria-label="Deine Sternebewertung" onPointerDown={beginRating} onPointerMove={event => { if (starGesture.current?.pointer === event.pointerId) { const value = starAt(event.clientX); starGesture.current.value = value; setPreviewRating(value); } }} onPointerUp={finishRating} onPointerCancel={() => { starGesture.current = null; setPreviewRating(null); }}>{[1, 2, 3, 4, 5].map(value => <button key={value} disabled={!data.ready || data.busy} className={selectedRating >= value ? 'filled' : ''} aria-label={`${value} von 5 Sternen`} aria-pressed={current && data.community.data?.myRating === value} onClick={event => { if (event.detail === 0) saveRating(value); }}><Star fill={selectedRating >= value ? 'currentColor' : 'none'}/></button>)}</div><span className="community-rating"><Star size={13} fill="currentColor"/>{current && data.community.data?.averageRating !== null && data.community.data?.averageRating !== undefined ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(data.community.data.averageRating) : '–'}<small>{current && data.community.data ? `(${data.community.data.ratingCount})` : ''}</small></span></div>{data.community.isError && <button className="feed-retry-data" onClick={() => void Promise.all([data.community.refetch(), data.sessions.refetch()])}>Persönliche Daten erneut laden</button>}</>}
                  {!remote && <div className="playback"><button aria-label={paused ? 'Video abspielen' : 'Video pausieren'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button><input aria-label="Videoposition" type="range" min="0" max="1000" value={current ? Math.round(media.progress * 1000) : 0} onChange={event => { if (videoRef.current && Number.isFinite(videoRef.current.duration)) videoRef.current.currentTime = Number(event.target.value) * videoRef.current.duration / 1000; }}/><span>{position + 1} / {boulders.length}</span></div>}
                </footer>
              </div>
            </article>;
          })}
        </div>
        {!item && <div className="empty-state"><Video size={34}/><h1>{loading ? 'Videos werden geladen …' : 'Keine passenden Videos'}</h1><p>{loading ? 'Deine Boulder werden geladen.' : 'Für diese Auswahl gibt es gerade keinen Boulder mit Video.'}</p><Button variant="secondary" onClick={onFilter}>Filter öffnen</Button><Button onClick={onReset}>Suche und Filter zurücksetzen</Button><Button variant="secondary" onClick={onExit}>Zur Boulderübersicht</Button></div>}
        {gestures.clean && gestures.holdRate === null && <button className="overlay-button restore-chrome" aria-label="Bedienelemente einblenden" onClick={() => gestures.setClean(false)}><Eye/></button>}
        {gestures.holdRate !== null && <div className="speed-feedback" role="status" aria-label={`Wiedergabegeschwindigkeit ${gestures.holdRate === .5 ? 'halb so schnell' : 'doppelt so schnell'}`}>{gestures.holdRate === .5 ? '0,5×' : '2×'}</div>}
      </section>
      {item && <nav className="feed-navigation" aria-label="Video wechseln"><button className="overlay-button" aria-label="Vorheriges Video" disabled={!index || data.busy} onClick={() => gestures.go(-1)}><ArrowUp/></button><span>{index + 1} / {boulders.length}</span><button className="overlay-button" aria-label="Nächstes Video" disabled={index >= boulders.length - 1 || data.busy} onClick={() => gestures.go(1)}><ArrowDown/></button><small>Wischen oder scrollen</small></nav>}
    </main>
    <BoulderFeedPanels panel={panel} name={item?.name ?? ''} data={data} onClose={() => setPanel(null)} returnFocus={panelTrigger.current} draft={drafts[item?.id ?? ''] ?? ''} onDraft={value => { if (item) setDrafts(previous => ({ ...previous, [item.id]: value })); }} sortControls={panel === 'sort' ? sortControls(() => setPanel(null)) : null}/>
  </>;
}
