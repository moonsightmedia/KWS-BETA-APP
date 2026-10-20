import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';

type View = { mode: 'fit' | 'fill' | 'custom'; scale: number; x: number; y: number };
type Point = { x: number; y: number };
type Metrics = { width: number; height: number; fitWidth: number; fitHeight: number; fill: number };
const initial: View = { mode: 'fill', scale: 1, x: 0, y: 0 };
const interactive = 'a,button,input,textarea,[data-gesture],[role="menu"]';

/** Transform the whole source image, so zooming out really reveals its edges. */
export function useBoulderFeedZoom({ reelRef, mediaId, disabled }: {
  reelRef: RefObject<HTMLElement>; mediaId?: string; disabled: boolean;
}) {
  const [view, setView] = useState<View>(initial);
  const [pinching, setPinching] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const current = useRef(view);
  const metrics = useRef<Metrics | null>(null);
  const points = useRef(new Map<number, Point>());
  const pinch = useRef<{ start: View; distance: number; midpoint: Point } | null>(null);
  const draining = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const isDisabled = useRef(disabled); isDisabled.current = disabled;
  const publish = useCallback((next: View) => { current.current = next; setView(next); }, []);
  const bound = useCallback((next: View): View => {
    const m = metrics.current;
    if (!m) return next;
    const scale = Math.max(1, Math.min(m.fill * 4, next.scale));
    const maxX = Math.max(0, (m.fitWidth * scale - m.width) / 2);
    const maxY = Math.max(0, (m.fitHeight * scale - m.height) / 2);
    return { ...next, scale, x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
  }, []);
  const clearPoints = useCallback(() => {
    const ids = [...points.current.keys()];
    points.current.clear(); pinch.current = null; draining.current = false; setPinching(false);
    for (const id of ids) if (reelRef.current?.hasPointerCapture(id)) reelRef.current.releasePointerCapture(id);
  }, [reelRef]);
  const cancel = useCallback(() => {
    if (pinch.current) publish(bound(pinch.current.start));
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null; setFeedback(false);
    clearPoints();
  }, [bound, clearPoints, publish]);
  const showFeedback = useCallback(() => {
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    setFeedback(true);
    feedbackTimer.current = window.setTimeout(() => { setFeedback(false); feedbackTimer.current = null; }, 1200);
  }, []);
  const choose = useCallback((value: string) => {
    if (!metrics.current) return;
    cancel();
    const mode = value === 'fit' || value === 'fill' ? value : 'custom';
    publish(bound({ mode, scale: mode === 'fit' ? 1 : mode === 'fill' ? metrics.current.fill : Number(value), x: 0, y: 0 }));
    showFeedback();
  }, [bound, cancel, publish, showFeedback]);
  const step = useCallback((multiplier: number) => {
    if (!metrics.current) return;
    cancel();
    const next = bound({ ...current.current, mode: 'custom', scale: current.current.scale * multiplier });
    publish(next); showFeedback();
  }, [bound, cancel, publish, showFeedback]);
  useLayoutEffect(() => {
    cancel(); metrics.current = null; publish(initial); setFeedback(false);
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    const reel = reelRef.current;
    const video = reel?.querySelector<HTMLVideoElement>('.reel-page[data-active=true] video');
    if (!reel || !video) return;
    const measure = () => {
      if (!video.videoWidth || !video.videoHeight || !reel.clientWidth || !reel.clientHeight) return;
      // Resizing during a pinch ends that gesture before changing its coordinate system.
      cancel();
      const width = reel.clientWidth, height = reel.clientHeight;
      const fit = Math.min(width / video.videoWidth, height / video.videoHeight);
      const fitWidth = video.videoWidth * fit, fitHeight = video.videoHeight * fit;
      metrics.current = { width, height, fitWidth, fitHeight, fill: Math.max(width / fitWidth, height / fitHeight) };
      const previous = current.current;
      publish(bound({ ...previous, scale: previous.mode === 'fit' ? 1 : previous.mode === 'fill' ? metrics.current.fill : previous.scale }));
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(reel);
    video.addEventListener('loadedmetadata', measure);
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || isDisabled.current || (event.target as Element).closest(interactive)) return;
      event.preventDefault(); step(Math.exp(-event.deltaY * .002));
    };
    reel.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect(); video.removeEventListener('loadedmetadata', measure); reel.removeEventListener('wheel', wheel);
      cancel(); if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    };
  }, [mediaId, reelRef, bound, cancel, publish, step]);
  const midpoint = () => {
    const [a, b] = [...points.current.values()];
    const box = reelRef.current!.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - box.left - box.width / 2, y: (a.y + b.y) / 2 - box.top - box.height / 2 };
  };
  const distance = () => { const [a, b] = [...points.current.values()]; return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)); };
  const down = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || !metrics.current) return false;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size === 2 && !draining.current) {
      pinch.current = { start: { ...current.current }, distance: distance(), midpoint: midpoint() };
      setPinching(true); setFeedback(true);
      if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    }
    if (points.current.size > 2) {
      if (pinch.current) publish(bound(pinch.current.start));
      pinch.current = null; draining.current = true; setPinching(false); setFeedback(false);
    }
    if (pinch.current || draining.current) { event.currentTarget.setPointerCapture(event.pointerId); return true; }
    return false;
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!points.current.has(event.pointerId)) return false;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = pinch.current;
    if (!gesture) return draining.current;
    const scale = bound({ ...gesture.start, scale: gesture.start.scale * distance() / gesture.distance }).scale;
    const mid = midpoint(), ratio = scale / gesture.start.scale;
    publish(bound({ mode: scale === 1 ? 'fit' : 'custom', scale,
      x: mid.x - (gesture.midpoint.x - gesture.start.x) * ratio,
      y: mid.y - (gesture.midpoint.y - gesture.start.y) * ratio }));
    return true;
  };
  const up = (event: PointerEvent<HTMLElement>) => {
    const owned = Boolean(pinch.current) || draining.current;
    points.current.delete(event.pointerId);
    if (pinch.current) { pinch.current = null; setPinching(false); showFeedback(); }
    // The last finger of a pinch must never become a swipe, tap or speed hold.
    draining.current = owned && points.current.size > 0;
    return owned;
  };
  const label = view.mode === 'fit' || Math.abs(view.scale - 1) < .01 ? 'Ganzes Video'
    : view.mode === 'fill' ? 'Bildschirm füllen' : `Zoom ${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(view.scale)}×`;
  const style: CSSProperties | undefined = metrics.current ? { objectFit: 'contain', transform: `translate3d(${view.x}px,${view.y}px,0) scale(${view.scale})` } : undefined;
  return { style, scale: view.scale, mode: view.mode, pinching, feedback, label, cancel, choose, step, down, move, up,
    hasPointer: (id: number) => points.current.has(id),
  };
}
