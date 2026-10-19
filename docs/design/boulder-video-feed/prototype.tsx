import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowUp, BadgeCheck, Bookmark, Check, ChevronDown, ChevronRight, Eye, EyeOff, Grid3X3, List, MessageSquare, Minus, Pause, Play, Plus, RotateCcw, Send, Settings, SlidersHorizontal, Sparkles, Star, Target, Video, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DifficultyBadge } from '@/components/boulder/DifficultyBadge';
import { BoulderFilterControls, BoulderFilterPanel, BoulderSortPanel, FilterSection, FilterToggle } from '@/components/boulder/BoulderFilterControls';
import { SectorFilterOptions } from '@/components/boulder/SectorFilterOptions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getOptimalVideoQualityWithDataSaver } from '@/utils/networkUtils';
import { getColorHex } from '@/utils/colorUtils';
import { resolveSectorArea } from '@/lib/sectorAreas';
import { getVideoUrl, type VideoQualityLevel } from '@/utils/videoUtils';
import hierarchySnapshot from '../../../test/fixtures/hall-hierarchy-snapshot.json';
import '@/index.css';
import './prototype.css';
import { BoulderDetailPreview } from './BoulderDetailPreview';

// Publicly readable media. All interactions and social data below are synthetic,
// held in memory; this entry does not import auth or any backend client.
const videos = [
  {
    "id": "green",
    "name": "Kühner Wurm",
    "area": "Grotte A",
    "grade": 6,
    "color": "Grün",
    "average": "4,6",
    "votes": 18,
    "video": "https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0295-feebfeba-cdae-41f5-a084-071fab7ed59f_sd.mp4",
    "poster": "https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0322-7d8e6317-b7f5-40e0-ae9b-5b89066cd72d.jpg"
  },
  {
    "id": "red",
    "name": "Süßer Panther",
    "area": "Bug B",
    "grade": 5,
    "color": "Weiß",
    "average": "4,3",
    "votes": 12,
    "video": "https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0297-8fc67e14-c609-461e-9367-87dd6fba1ab1_sd.mp4",
    "poster": "https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0323-96978d0f-9343-459b-b3a5-7d5b0cc6434b.jpg"
  },
  {
    "id": "white",
    "name": "Eisiger Bastion",
    "area": "Top-Out A",
    "grade": 5,
    "color": "Gelb",
    "average": "4,8",
    "votes": 9,
    "video": "https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0264-1afce903-e06a-4697-a340-10f793f72921_sd.mp4",
    "poster": "https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0324-b9264159-5722-4515-9414-a8def114f0d0.jpg"
  }
];
type Panel = 'comments' | 'track' | 'filters' | 'sort' | null;
type Result = 'attempted' | 'top' | 'flash';
type Comment = { name: string; initials: string; text: string; pending?: boolean };
type Entry = { project: boolean; rating: number; comments: Comment[]; track: { result: Result; attempts: number; note: string } | null };
const exampleComments: Comment[] = [
  { name: 'Lea M.', initials: 'LM', text: 'Der hohe rechte Fuß macht den Zug zum nächsten Griff deutlich entspannter.' },
  { name: 'Jonas F.', initials: 'JF', text: 'Schöne Linie! Der letzte Zug war meine Crux.' },
];
const resultNames: Record<Result, string> = { attempted: 'Versucht', top: 'Top', flash: 'Flash' };
const resultIcons = { attempted: Plus, top: BadgeCheck, flash: Zap };
const sortOptions = [
  { key: 'date-desc', label: 'Neueste zuerst' }, { key: 'date-asc', label: 'Älteste zuerst' },
  { key: 'difficulty-asc', label: 'Grad aufsteigend' }, { key: 'difficulty-desc', label: 'Grad absteigend' },
  { key: 'name-asc', label: 'Name A-Z' }, { key: 'name-desc', label: 'Name Z-A' },
] as const;
type SortKey = typeof sortOptions[number]['key'];
const previewColors = ['Grün', 'Gelb', 'Blau', 'Orange', 'Rot', 'Schwarz', 'Weiß', 'Lila'].map((name, i) => ({ id: `color-${i}`, name, hex: getColorHex(name).primary, is_active: true, sort_order: i }));
const previewSectors = hierarchySnapshot.sectors.map(sector => {
  const resolved = resolveSectorArea({ name: sector.name });
  return { name: resolved.publicName, area: resolved.area, subareaCode: resolved.subareaCode };
});
const qualitiesFor = (video: string) => ({ hd: video.replace('_sd.mp4', '_hd.mp4'), sd: video, low: video.replace('_sd.mp4', '_low.mp4') });
const qualityLabels = { hd: 'HD', sd: 'SD', low: 'Low' };

function Prototype() {
  const [index, setIndex] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [catalog, setCatalog] = useState(false);
  const [catalogView, setCatalogView] = useState<'grid' | 'list'>('grid');
  const [entries, setEntries] = useState<Record<string, Entry>>(() => Object.fromEntries(videos.map(v => [v.id, { project: false, rating: 0, comments: exampleComments.map(c => ({ ...c })), track: null }])));
  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewRating, setPreviewRating] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result>('top');
  const [attempts, setAttempts] = useState(1);
  const [note, setNote] = useState('');
  const [difficultyFilters, setDifficultyFilters] = useState<string[]>([]);
  const [colorFilters, setColorFilters] = useState<string[]>([]);
  const [sectorFilters, setSectorFilters] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showOnlyHanging, setShowOnlyHanging] = useState(true);
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [quality, setQuality] = useState<VideoQualityLevel>(() => getOptimalVideoQualityWithDataSaver());
  const [qualityOpen, setQualityOpen] = useState(false);
  const [cleanView, setCleanView] = useState(false);
  const [holdRate, setHoldRate] = useState<0.5 | 2 | null>(null);
  const [dragY, setDragY] = useState(0);
  const [settling, setSettling] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailPosition = useRef(0);
  const detailFromFeed = useRef(false);
  const reelRef = useRef<HTMLElement>(null);
  const mediaRefs = useRef(new Map<string, HTMLVideoElement>());
  const mediaCallbacks = useRef(new Map<string, (element: HTMLVideoElement | null) => void>());
  const settlingRef = useRef(false);
  const settleTimer = useRef<number | null>(null);
  const lastWheel = useRef(Number.NEGATIVE_INFINITY);
  const hadCleanView = useRef(false);
  const qualityRestore = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<number | null>(null);
  const speedHold = useRef<{ video: HTMLVideoElement; rate: number; paused: boolean; owner: number | string } | null>(null);
  const interactionSuspended = useRef(false);
  const starsRef = useRef<HTMLDivElement>(null);
  const starGesture = useRef<{ pointer: number; value: number } | null>(null);
  const feedGesture = useRef<{ x: number; y: number; time: number; pointer: number; moved: boolean; held: boolean } | null>(null);
  const pendingTap = useRef<{ x: number; y: number; time: number; pointerType: string; timer: number } | null>(null);
  const cancelPendingTap = useCallback(() => {
    if (pendingTap.current) window.clearTimeout(pendingTap.current.timer);
    pendingTap.current = null;
  }, []);
  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);
  const stopSpeedHold = useCallback((suspend = false) => {
    clearHoldTimer();
    const held = speedHold.current;
    speedHold.current = null;
    if (!held) return;
    held.video.playbackRate = held.rate;
    if (suspend || held.paused) held.video.pause();
    setHoldRate(null);
  }, [clearHoldTimer]);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Catalog and feed use exactly the same selection. Personal/new/archive flags
  // here are explicit examples, independent of the real media-source metadata.
  const filtered = videos.filter(v => (!difficultyFilters.length || difficultyFilters.includes(String(v.grade)))
    && (!colorFilters.length || colorFilters.includes(v.color))
    && (!sectorFilters.length || sectorFilters.includes(v.area))
    && (!showNew || v.id !== 'white') && (!showSaved || v.id === 'red')
    && (!showOnlyHanging || v.id !== 'white'));
  const sequence = [...filtered].sort((a, b) => {
    const direction = sort.endsWith('asc') ? 1 : -1;
    if (sort.startsWith('difficulty')) return direction * (a.grade - b.grade) || videos.indexOf(a) - videos.indexOf(b);
    if (sort.startsWith('name')) return direction * a.name.localeCompare(b.name, 'de');
    return direction * (videos.indexOf(b) - videos.indexOf(a));
  });
  const safeIndex = Math.min(index, Math.max(0, sequence.length - 1));
  const item = videos.find(video => video.id === detailId) ?? sequence[safeIndex];
  const chromeHidden = cleanView || holdRate !== null;
  const entry = item ? entries[item.id] : null;
  const activeFilters = difficultyFilters.length + colorFilters.length + sectorFilters.length + [showNew, showSaved, !showOnlyHanging].filter(Boolean).length;
  const resetFilters = () => { setDifficultyFilters([]); setColorFilters([]); setSectorFilters([]); setShowNew(false); setShowSaved(false); setShowOnlyHanging(true); setIndex(0); };
  const toggleFilter = (values: string[], value: string) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];
  const registerMedia = (id: string) => {
    let callback = mediaCallbacks.current.get(id);
    if (!callback) {
      callback = element => {
        if (element) mediaRefs.current.set(id, element);
        else { mediaRefs.current.get(id)?.pause(); mediaRefs.current.delete(id); }
      };
      mediaCallbacks.current.set(id, callback);
    }
    return callback;
  };

  const update = (patch: Partial<Entry>) => {
    if (item) setEntries(current => ({ ...current, [item.id]: { ...current[item.id], ...patch } }));
  };
  const openDetail = (target = item) => {
    if (!target) return;
    detailPosition.current = videoRef.current?.currentTime ?? 0;
    detailFromFeed.current = true;
    window.history.pushState(null, '', `#/boulders/${target.id}`);
    setDetailId(target.id);
  };
  const closeDetail = () => {
    if (detailFromFeed.current) window.history.back();
    else { window.history.replaceState(null, '', window.location.pathname); setDetailId(null); }
  };
  useEffect(() => {
    const readRoute = () => {
      const id = window.location.hash.match(/^#\/boulders\/([^/]+)$/)?.[1];
      const next = videos.find(video => video.id === id);
      setDetailId(next?.id ?? null);
      setPanel(null);
    };
    readRoute();
    window.addEventListener('popstate', readRoute);
    window.addEventListener('hashchange', readRoute);
    return () => { window.removeEventListener('popstate', readRoute); window.removeEventListener('hashchange', readRoute); };
  }, []);
  const openPanel = (next: Panel, trigger?: HTMLElement) => {
    triggerRef.current = trigger ?? document.activeElement as HTMLElement;
    if (next === 'track') {
      setResult(entry?.track?.result ?? 'top');
      setAttempts(entry?.track?.attempts ?? 1);
      setNote(entry?.track?.note ?? '');
      setShowNote(Boolean(entry?.track?.note));
    }
    setPanel(next);
  };
  const settleFeed = (nextIndex: number) => {
    clearHoldTimer();
    cancelPendingTap();
    const direction = Math.sign(nextIndex - safeIndex);
    const finish = () => {
      setIndex(nextIndex); setDragY(0); setSettling(false); settlingRef.current = false;
      if (direction) { setPaused(false); setPreviewRating(null); }
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    settlingRef.current = true;
    setSettling(true);
    setDragY(-direction * (reelRef.current?.clientHeight ?? window.innerHeight));
    settleTimer.current = window.setTimeout(finish, 240);
  };
  const go = (direction: number) => {
    if (panel || catalog || detailId || qualityOpen || speedHold.current || settlingRef.current) return;
    const nextIndex = Math.max(0, Math.min(sequence.length - 1, safeIndex + direction));
    if (nextIndex !== safeIndex) settleFeed(nextIndex);
  };
  const startSpeedHold = (rate: 0.5 | 2, owner: number | string) => {
    const video = videoRef.current;
    if (!video || speedHold.current || document.hidden || interactionSuspended.current) return;
    cancelPendingTap();
    speedHold.current = { video, rate: video.playbackRate, paused, owner };
    if (feedGesture.current) feedGesture.current.held = true;
    video.playbackRate = rate;
    setHoldRate(rate);
  };
  const startFeedGesture = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || panel || detailId || qualityOpen || settlingRef.current || (event.target as HTMLElement).closest('a,button,input,textarea,[data-gesture],[role="menu"]')) { cancelPendingTap(); stopSpeedHold(); feedGesture.current = null; return; }
    // Suspend a preceding tap while this contact could become a double tap or hold.
    if (pendingTap.current) window.clearTimeout(pendingTap.current.timer);
    clearHoldTimer();
    feedGesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), pointer: event.pointerId, moved: false, held: false };
    const box = event.currentTarget.getBoundingClientRect();
    const rate = event.clientX < box.left + box.width / 2 ? 0.5 : 2;
    const pointer = event.pointerId;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      if (feedGesture.current?.pointer === pointer && !feedGesture.current.moved) startSpeedHold(rate, pointer);
    }, 350);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveFeedGesture = (event: PointerEvent<HTMLElement>) => {
    const gesture = feedGesture.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (gesture.held) return;
    const dy = event.clientY - gesture.y, dx = event.clientX - gesture.x;
    if (Math.hypot(dx, dy) >= 8) { cancelPendingTap(); clearHoldTimer(); }
    if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.3) return;
    gesture.moved = true;
    const atEdge = (dy > 0 && safeIndex === 0) || (dy < 0 && safeIndex === sequence.length - 1);
    const height = reelRef.current?.clientHeight ?? window.innerHeight;
    setDragY(Math.max(-height, Math.min(height, atEdge ? dy * .2 : dy)));
  };
  const endFeedGesture = (event: PointerEvent<HTMLElement>) => {
    clearHoldTimer();
    const gesture = feedGesture.current; feedGesture.current = null;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (gesture.held) { stopSpeedHold(); return; }
    const dy = event.clientY - gesture.y, dx = event.clientX - gesture.x;
    if (!gesture.moved && Math.abs(dy) < 8 && Math.abs(dx) < 8) {
      const previous = pendingTap.current;
      const now = performance.now();
      const doubleTap = previous && now - previous.time <= 280 && previous.pointerType === event.pointerType
        && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 32;
      cancelPendingTap();
      if (doubleTap) { setCleanView(value => !value); return; }
      // A far-apart second tap completes the first tap independently.
      if (previous) setPaused(value => !value);
      pendingTap.current = {
        x: event.clientX, y: event.clientY, time: now, pointerType: event.pointerType,
        timer: window.setTimeout(() => { pendingTap.current = null; setPaused(value => !value); }, 280),
      };
      return;
    }
    const speed = Math.abs(dy) / Math.max(1, performance.now() - gesture.time);
    const threshold = Math.min(120, (reelRef.current?.clientHeight ?? 800) * .16);
    const direction = Math.abs(dy) >= threshold || (Math.abs(dy) > 45 && speed > .6) ? (dy < 0 ? 1 : -1) : 0;
    settleFeed(Math.max(0, Math.min(sequence.length - 1, safeIndex + direction)));
  };
  const saveRating = (value: number) => {
    update({ rating: value });
    setToast(`${value} ${value === 1 ? 'Stern' : 'Sterne'} · im Entwurf`);
    setPreviewRating(null);
  };
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => { setProgress(0); setMediaError(false); setBlocked(false); qualityRestore.current = null; }, [item?.id]);
  useLayoutEffect(() => { videoRef.current = item ? mediaRefs.current.get(item.id) ?? null : null; }, [item, catalog]);
  useEffect(() => () => { if (settleTimer.current !== null) window.clearTimeout(settleTimer.current); }, []);
  useEffect(() => {
    cancelPendingTap();
    return cancelPendingTap;
  }, [panel, catalog, detailId, qualityOpen, item?.id, cleanView, cancelPendingTap]);
  useEffect(() => {
    feedGesture.current = null;
    stopSpeedHold(true);
    return () => { feedGesture.current = null; stopSpeedHold(true); };
  }, [panel, catalog, detailId, qualityOpen, item?.id, quality, cleanView, stopSpeedHold]);
  useEffect(() => {
    if (cleanView) {
      hadCleanView.current = true;
      document.querySelector<HTMLButtonElement>('.restore-chrome')?.focus({ preventScroll: true });
    } else if (hadCleanView.current) {
      hadCleanView.current = false;
      document.querySelector<HTMLButtonElement>('.reel-page[data-active="true"] [aria-label="Bedienelemente ausblenden"]')?.focus({ preventScroll: true });
    }
  }, [cleanView]);
  useEffect(() => {
    mediaRefs.current.forEach((media, id) => { if (id !== item?.id) media.pause(); });
    const video = videoRef.current;
    if (!video) return;
    if (panel || catalog || detailId || (paused && holdRate === null) || document.hidden || interactionSuspended.current) video.pause();
    else void video.play().catch(() => setBlocked(true));
  }, [panel, catalog, detailId, paused, item?.id, quality, holdRate]);
  useEffect(() => {
    const visibility = () => {
      interactionSuspended.current = document.hidden;
      if (document.hidden) { cancelPendingTap(); feedGesture.current = null; stopSpeedHold(true); videoRef.current?.pause(); }
      else if (!panel && !catalog && !detailId && !paused) void videoRef.current?.play().catch(() => setBlocked(true));
    };
    const blur = () => { interactionSuspended.current = true; cancelPendingTap(); feedGesture.current = null; stopSpeedHold(true); videoRef.current?.pause(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || panel || catalog || detailId || qualityOpen) return;
      if (speedHold.current) {
        if (event.key === speedHold.current.owner || event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
        if (event.key === 'Escape') { event.preventDefault(); feedGesture.current = null; stopSpeedHold(); }
        return;
      }
      cancelPendingTap();
      if (event.key === 'Escape' && cleanView) { event.preventDefault(); setCleanView(false); return; }
      if ((event.target as HTMLElement).closest('a, input, textarea, button, [role="dialog"], [role="menu"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); startSpeedHold(event.key === 'ArrowLeft' ? 0.5 : 2, event.key); return; }
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); go(1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); go(-1); }
      if (event.key === ' ' && !panel && !catalog) { event.preventDefault(); setPaused(value => !value); }
      if (event.key === 'Escape' && !panel) setCatalog(true);
    };
    const onKeyUp = (event: KeyboardEvent) => { if (speedHold.current?.owner === event.key) stopSpeedHold(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', visibility);
    window.addEventListener('keyup', onKeyUp);
    // Capture observes the open panel before Radix handles Escape; the same key
    // must never also send the newly exposed feed back to the catalog.
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('focus', visibility); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('keydown', onKey, true); };
  });
  const starAt = (x: number) => {
    const box = starsRef.current!.getBoundingClientRect();
    return Math.max(1, Math.min(5, Math.ceil((x - box.left) / (box.width / 5))));
  };
  const beginRating = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const value = starAt(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
    starGesture.current = { pointer: event.pointerId, value };
    setPreviewRating(value);
  };
  const finishRating = (event: PointerEvent<HTMLDivElement>) => {
    if (starGesture.current?.pointer !== event.pointerId) return;
    saveRating(starGesture.current.value);
    starGesture.current = null;
  };

  return <>
    <div className="prototype-notice">Screenentwurf <span>· Beispieldaten · keine echten Änderungen</span></div>
    {catalog ? <main className="catalog">
      <header><div><p className="eyebrow">KLETTERWELT SAUERLAND</p><h1>Boulder</h1></div><Button variant="secondary" size="icon" aria-label="Filter öffnen" onClick={e => openPanel('filters', e.currentTarget)}><SlidersHorizontal /></Button></header>
      <div className="catalog-toolbar"><span>{sequence.length} Boulder mit Video</span><div className="view-switch" role="group" aria-label="Boulderansicht">
        <button aria-label="Kartenansicht" aria-pressed={catalogView === 'list'} onClick={() => setCatalogView('list')}><List /></button>
        <button aria-label="Rasteransicht" aria-pressed={catalogView === 'grid'} onClick={() => setCatalogView('grid')}><Grid3X3 /></button>
        <button aria-label="Videoansicht öffnen" aria-pressed={false} onClick={() => setCatalog(false)}><Video /></button>
      </div></div>
      <div className={`catalog-items ${catalogView}`}>
        {sequence.map((v, i) => <button key={v.id} data-boulder-id={v.id} onClick={() => { setIndex(i); openDetail(v); }}><img src={v.poster} alt="" /><span><strong>{v.name}</strong><small>Grad {v.grade} · {v.area}</small></span><ChevronRight /></button>)}
      </div>
      {sequence.length === 0 && <p>Keine passenden Videos. Passe die Filter an.</p>}
      <p className="catalog-help">Die dritte Ansicht öffnet den bildschirmfüllenden Videofeed.</p>
    </main> : <main className="video-shell" data-clean={chromeHidden} data-holding={holdRate !== null} aria-label="Boulder-Videofeed">
      <div className="desktop-caption"><Video size={19} /><strong>Videos</strong><span>Kletterwelt Sauerland</span></div>
      <section ref={reelRef} className="reel" tabIndex={0} aria-label={item?.name ?? 'Keine passenden Videos'}
        onPointerDown={startFeedGesture} onPointerMove={moveFeedGesture} onPointerUp={endFeedGesture}
        onPointerCancel={() => { cancelPendingTap(); stopSpeedHold(); const wasMoving = feedGesture.current?.moved; feedGesture.current = null; if (wasMoving) settleFeed(safeIndex); }}
        onLostPointerCapture={() => { if (feedGesture.current) cancelPendingTap(); const wasMoving = feedGesture.current?.moved; clearHoldTimer(); stopSpeedHold(); feedGesture.current = null; if (wasMoving) settleFeed(safeIndex); }}
        onContextMenu={event => { if (!(event.target as HTMLElement).closest('a,button,input,textarea')) event.preventDefault(); }}
        onDragStart={event => event.preventDefault()}
        onWheel={e => { if ((e.target as HTMLElement).closest('button,input,[data-gesture]')) return; const now = performance.now(); const gap = now - lastWheel.current; lastWheel.current = now; if (gap > 160 && Math.abs(e.deltaY) > 20) go(e.deltaY > 0 ? 1 : -1); }}>
        <div className={`reel-track ${settling ? 'is-settling' : ''}`} style={{ transform: `translate3d(0,${dragY}px,0)` }}>
        {sequence.map((frame, frameIndex) => {
          if (Math.abs(frameIndex - safeIndex) > 1) return null;
          const active = frameIndex === safeIndex;
          const item = frame;
          const entry = entries[item.id];
          const shownRating = active ? (previewRating ?? entry.rating) : entry.rating;
          const TrackActionIcon = entry.track ? resultIcons[entry.track.result] : Plus;
          return <article key={item.id} className="reel-page" data-active={active} aria-hidden={!active} {...(!active ? { inert: '' } : {})} style={{ transform: `translate3d(0,${(frameIndex - safeIndex) * 100}%,0)` }}>
          <video ref={registerMedia(item.id)} className="reel-video" data-active={active} src={getVideoUrl(qualitiesFor(item.video), item.video, quality)} poster={item.poster} muted loop playsInline preload={active ? 'auto' : 'metadata'}
            onLoadedMetadata={e => { if (active && qualityRestore.current !== null) { e.currentTarget.currentTime = Math.min(qualityRestore.current, Math.max(0, e.currentTarget.duration - .1)); qualityRestore.current = null; } }}
            onLoadedData={e => { if (!active || panel || catalog || detailId || (paused && holdRate === null) || interactionSuspended.current) e.currentTarget.pause(); else void e.currentTarget.play().catch(() => setBlocked(true)); }}
            onTimeUpdate={e => { if (active) setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0); }}
            onPlaying={() => { if (active) setBlocked(false); }} onError={() => { if (active) setMediaError(true); }} />
          <div className="reel-chrome" aria-hidden={chromeHidden} {...(chromeHidden ? { inert: '' } : {})}>
        <div className="video-shade" />
        <header className="reel-header"><button className="overlay-button" aria-label="Zur Boulderübersicht" onClick={() => setCatalog(true)}><ArrowLeft /></button><div><strong>Videos</strong><button className="sort-trigger" aria-label="Sortierung öffnen" onClick={e => openPanel('sort', e.currentTarget)}>{sortOptions.find(option => option.key === sort)?.label}<ChevronDown size={12}/></button></div><button className="overlay-button" aria-label="Bedienelemente ausblenden" onClick={() => setCleanView(true)}><EyeOff/></button><button className="overlay-button filter-trigger" aria-label="Boulder filtern" onClick={e => openPanel('filters', e.currentTarget)}><SlidersHorizontal />{activeFilters > 0 && <span>{activeFilters}</span>}</button></header>
        {item && entry ? <>
          <div className="official"><BadgeCheck size={14} /> Offizielle Beta</div>
          {active && <DropdownMenu open={qualityOpen} onOpenChange={setQualityOpen}>
            <DropdownMenuTrigger asChild><button className="quality-trigger" aria-label={`Videoqualität: ${qualityLabels[quality]}`}><Settings size={16}/>{qualityLabels[quality]}<ChevronDown size={13}/></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="feed-quality-menu">
              <DropdownMenuLabel>Videoqualität</DropdownMenuLabel><DropdownMenuSeparator/>
              <DropdownMenuRadioGroup value={quality} onValueChange={value => { if (value === quality) return; qualityRestore.current = videoRef.current?.currentTime ?? 0; setQuality(value as VideoQualityLevel); setBlocked(false); setMediaError(false); }}>
                {(['hd', 'sd', 'low'] as const).map(value => <DropdownMenuRadioItem key={value} value={value} className="feed-quality-option"><span className="quality-check">{quality === value && <Check size={15}/>}</span><strong>{qualityLabels[value]}</strong><span>{value === 'hd' ? 'Hohe Auflösung' : value === 'sd' ? 'Ausgewogen' : 'Weniger Daten'}</span></DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>}
          <div className="reel-actions">
            <button className={entry.project ? 'is-selected' : ''} title={entry.project ? 'Projektmarkierung entfernen' : 'Als Projekt markieren'} aria-label={entry.project ? 'Projektmarkierung entfernen' : 'Als Projekt markieren'} aria-pressed={entry.project} onClick={() => { update({ project: !entry.project }); setToast(entry.project ? 'Projekt entfernt · im Entwurf' : 'Als Projekt markiert · im Entwurf'); }}><span className="action-icon"><Target />{entry.project && <Check className="project-check"/>}</span></button>
            <button title="Kommentare öffnen" aria-label={`${entry.comments.filter(c => !c.pending).length} Kommentare öffnen`} onClick={e => openPanel('comments', e.currentTarget)}><span className="action-icon comment-action"><MessageSquare /><span className="comment-count" aria-hidden="true">{entry.comments.filter(c => !c.pending).length > 99 ? '99+' : entry.comments.filter(c => !c.pending).length}</span></span></button>
            <button className={entry.track ? 'is-selected' : ''} title={entry.track ? `Heute: ${resultNames[entry.track.result]} · Tracking öffnen` : 'Tracking öffnen'} aria-label={entry.track ? `Heute: ${resultNames[entry.track.result]} · Tracking öffnen` : 'Tracking öffnen'} onClick={e => openPanel('track', e.currentTarget)}><span className="action-icon"><TrackActionIcon /></span></button>
          </div>
          {active && (paused || blocked || mediaError) && <div className="media-status">{mediaError ? <><p>Video gerade nicht verfügbar</p><Button onClick={() => { setMediaError(false); videoRef.current?.load(); void videoRef.current?.play().catch(() => setBlocked(true)); }}>Erneut versuchen</Button></> : blocked ? <button className="resume-button" aria-label="Video fortsetzen" onClick={() => { setPaused(false); void videoRef.current?.play().catch(() => setBlocked(true)); }}><Play fill="currentColor" /></button> : <span className="resume-button" aria-hidden="true"><Play fill="currentColor" /></span>}</div>}
          <footer className="reel-footer">
            <div className="boulder-identity"><DifficultyBadge color={item.color} difficulty={item.grade} className="feed-grade" /><div><a className="boulder-title" href={`#/boulders/${item.id}`} aria-label={`${item.name}: Boulder-Details öffnen`} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openDetail(); }}>{item.name}<ChevronRight size={17} /></a><p>{item.area} <span>·</span> {entry.track ? `Heute: ${resultNames[entry.track.result]}` : item.id === 'white' ? 'Abgeschraubt' : 'Aktuell an der Wand'}</p></div></div>
            <div className="rating-head"><span>Deine Bewertung</span><span aria-live="polite">{shownRating ? `${shownRating} / 5` : 'Noch offen'}</span></div>
            <div className="rating-line">
              <div ref={active ? starsRef : undefined} className="star-control" data-gesture="rating" role="group" aria-label="Deine Sternebewertung"
                onPointerDown={beginRating}
                onPointerMove={e => { if (starGesture.current?.pointer === e.pointerId) { const value = starAt(e.clientX); starGesture.current.value = value; setPreviewRating(value); } }}
                onPointerUp={finishRating}
                onPointerCancel={() => { starGesture.current = null; setPreviewRating(null); }}>
                {[1, 2, 3, 4, 5].map(value => <button key={value} aria-label={`${value} von 5 Sternen`} aria-pressed={entry.rating === value} className={shownRating >= value ? 'filled' : ''} onClick={e => { if (e.detail === 0) saveRating(value); }}><Star fill={shownRating >= value ? 'currentColor' : 'none'} /></button>)}
              </div>
              <span className="community-rating"><Star size={13} fill="currentColor" />{item.average}<small>({item.votes})</small></span>
            </div>
            <div className="playback"><button aria-label={paused ? 'Video abspielen' : 'Video pausieren'} onClick={() => setPaused(v => !v)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button><input aria-label="Videoposition" type="range" min="0" max="100" value={Math.round(progress * 100)} onChange={e => { if (videoRef.current?.duration) videoRef.current.currentTime = Number(e.target.value) * videoRef.current.duration / 100; }} /><span>{safeIndex + 1} / {sequence.length}</span></div>
          </footer>
        </> : <div className="empty-state"><Video size={34} /><h1>Keine passenden Videos</h1><p>Für diese Auswahl gibt es gerade keinen Boulder mit Video.</p><Button onClick={resetFilters}>Filter zurücksetzen</Button></div>}
          </div>
          </article>;
        })}
        </div>
        {!item && <div className="empty-state"><Video size={34}/><h1>Keine passenden Videos</h1><p>Für diese Auswahl gibt es gerade keinen Boulder mit Video.</p><Button onClick={resetFilters}>Filter zurücksetzen</Button><Button variant="secondary" onClick={() => setCatalog(true)}>Zur Boulderübersicht</Button></div>}
        {cleanView && holdRate === null && <button className="overlay-button restore-chrome" aria-label="Bedienelemente einblenden" onClick={() => setCleanView(false)}><Eye/></button>}
        {holdRate !== null && <div className="speed-feedback" role="status" aria-label={`Wiedergabegeschwindigkeit ${holdRate === 0.5 ? 'halb so schnell' : 'doppelt so schnell'}`}>{holdRate === 0.5 ? '0,5×' : '2×'}</div>}
      </section>
      {item && <nav className="feed-navigation" aria-label="Video wechseln"><button className="overlay-button" aria-label="Vorheriges Video" disabled={safeIndex === 0} onClick={() => go(-1)}><ArrowUp /></button><span>{safeIndex + 1} / {sequence.length}</span><button className="overlay-button" aria-label="Nächstes Video" disabled={safeIndex >= sequence.length - 1} onClick={() => go(1)}><ArrowDown /></button><small>Wischen oder scrollen</small></nav>}
    </main>}
    <div className={`preview-toast ${toast ? 'visible' : ''}`} role="status"><Check size={16} />{toast}</div>
    {detailId && item && entry && <BoulderDetailPreview key={detailId} item={item} entry={entry} origin={catalog ? 'Boulderübersicht' : 'Videofeed'} source={getVideoUrl(qualitiesFor(item.video), item.video, quality)} position={detailPosition.current} panelOpen={Boolean(panel)} onBack={closeDetail} onProject={() => update({ project: !entry.project })} onRating={saveRating} onComments={trigger => openPanel('comments', trigger)} onTrack={trigger => openPanel('track', trigger)}/>}
    <BoulderFilterPanel open={panel === 'filters'} onOpenChange={open => { if (!open) setPanel(null); }} resultCount={sequence.length} activeCount={activeFilters} onReset={resetFilters}>
      <p className="prototype-filter-note">Nur Boulder mit Video · gleiche Filter wie in der Übersicht.</p>
      <BoulderFilterControls hideReset
        leadingControls={<FilterSection title="Schnellfilter" icon={Sparkles} active={showNew || showSaved || !showOnlyHanging} summary={[showNew && 'Neu', showSaved && 'Gespeichert', !showOnlyHanging && 'Mit abgeschraubten'].filter(Boolean).join(' · ') || 'Aktuell an der Wand'}>
          <FilterToggle label="Neu" description="In den letzten 7 Tagen" icon={Sparkles} checked={showNew} onCheckedChange={value => { setShowNew(value); setIndex(0); }}/>
          <FilterToggle label="Gespeichert" icon={Bookmark} checked={showSaved} onCheckedChange={value => { setShowSaved(value); setIndex(0); }}/>
          <FilterToggle label="Auch abgeschraubte" icon={RotateCcw} checked={!showOnlyHanging} onCheckedChange={value => { setShowOnlyHanging(!value); setIndex(0); }}/>
        </FilterSection>}
        difficulties={difficultyFilters} onDifficultyToggle={value => { setDifficultyFilters(values => toggleFilter(values, value)); setIndex(0); }} onDifficultyReset={() => { setDifficultyFilters([]); setIndex(0); }}
        selectedColors={colorFilters} onColorToggle={value => { setColorFilters(values => toggleFilter(values, value)); setIndex(0); }} onColorReset={() => { setColorFilters([]); setIndex(0); }}
        colors={previewColors} colorsLoading={false} colorsError={false} onRetryColors={() => {}}
        sectorControls={<SectorFilterOptions sectors={previewSectors} selected={sectorFilters} onChange={values => { setSectorFilters(values); setIndex(0); }}/>} activeCount={activeFilters} onReset={resetFilters}/>
    </BoulderFilterPanel>
    <Dialog open={panel !== null && panel !== 'filters'} onOpenChange={open => { if (!open) setPanel(null); }}>
      <DialogContent className="feed-sheet" data-compact="true" data-panel={panel} overlayClassName="feed-overlay" scrollLayout="contained" onCloseAutoFocus={e => { e.preventDefault(); triggerRef.current?.focus(); }}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header"><div><DialogTitle>{panel === 'comments' ? 'Kommentare' : panel === 'track' ? 'Boulder tracken' : 'Sortierung'}</DialogTitle><DialogDescription>{panel === 'sort' ? 'Gilt für alle Videos in deiner Auswahl.' : panel === 'track' ? `${item?.name} · privat` : `${item?.name} · Beispielkommentare`}</DialogDescription></div><DialogClose asChild><Button variant="secondary" size="icon" aria-label="Schließen"><X /></Button></DialogClose></header>
        <div className="sheet-body">
          {panel === 'comments' && entry && <div className="comment-list">{entry.comments.map((comment, i) => <article className="comment" key={i}><span className="avatar">{comment.initials}</span><div><strong>{comment.name}<small>{comment.pending ? 'Gerade eben' : i === 0 ? 'vor 2 Std.' : 'gestern'}</small></strong><p>{comment.text}</p>{comment.pending && <span className="pending-comment">Wartet auf Freigabe</span>}</div></article>)}</div>}
          {panel === 'track' && <><div className="tracking-context"><span>Heute</span><strong>{new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long' }).format(new Date())}</strong></div><h2>Wie lief der Boulder?</h2><div className="result-choices">{(['attempted', 'top', 'flash'] as const).map(value => <button key={value} className={result === value ? 'selected' : ''} aria-pressed={result === value} onClick={() => { setResult(value); if (value === 'flash') setAttempts(1); }}>{value === 'flash' ? <Zap /> : value === 'top' ? <BadgeCheck /> : <Plus />}{resultNames[value]}</button>)}</div><div className="attempt-counter"><span>Versuche</span><div><Button variant="secondary" size="icon" aria-label="Einen Versuch weniger" disabled={attempts === 1 || result === 'flash'} onClick={() => setAttempts(v => Math.max(1, v - 1))}><Minus /></Button><strong>{attempts}</strong><Button variant="secondary" size="icon" aria-label="Einen Versuch mehr" disabled={result === 'flash'} onClick={() => setAttempts(v => v + 1)}><Plus /></Button></div></div><button className="add-note" aria-expanded={showNote} aria-controls="tracking-note-area" onClick={() => setShowNote(value => !value)}>{showNote ? <Minus size={15}/> : <Plus size={15}/>}Notiz {showNote ? "ausblenden" : "hinzufügen"}</button>{showNote && <div id="tracking-note-area"><label className="note-label" htmlFor="tracking-note">Private Notiz <span>optional</span></label><textarea id="tracking-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Was möchtest du dir merken?" rows={2}/></div>}</>}
          {panel === 'sort' && <BoulderSortPanel options={sortOptions} selected={sort} onSelect={value => { setSort(value); setIndex(0); setPanel(null); }} className="preview-sort-panel"/>}
        </div>
        <footer className="sheet-footer">
          {panel === 'comments' && item && entry ? <><form onSubmit={e => { e.preventDefault(); const text = commentDrafts[item.id]?.trim(); if (!text) return; update({ comments: [...entry.comments, { name: 'Du', initials: 'DU', text, pending: true }] }); setCommentDrafts(drafts => ({ ...drafts, [item.id]: '' })); setToast('Kommentar vorgemerkt · im Entwurf'); }}><span className="avatar">DU</span><Input aria-label="Kommentar schreiben" placeholder="Kommentar schreiben …" value={commentDrafts[item.id] ?? ''} onChange={e => setCommentDrafts(drafts => ({ ...drafts, [item.id]: e.target.value }))} /><Button type="submit" size="icon" disabled={!commentDrafts[item.id]?.trim()} aria-label="Kommentar senden"><Send /></Button></form><p>Neue Kommentare werden vor der Veröffentlichung geprüft.</p></> : panel === 'track' ? <><Button className="save-track" onClick={() => { update({ track: { result, attempts, note } }); setPanel(null); setToast(`${resultNames[result]} vorgemerkt · im Entwurf`); }}><Check size={17} />{resultNames[result]} für heute vormerken</Button><small>Screenentwurf · wird nicht in deinem Konto gespeichert</small></> : <Button className="save-track" onClick={() => setPanel(null)}>Zurück zum Video</Button>}
        </footer>
      </DialogContent>
    </Dialog>
  </>;
}

createRoot(document.getElementById('root')!).render(<Prototype />);
