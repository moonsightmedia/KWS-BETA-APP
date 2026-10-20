import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';

type Mode = 'fit' | 'fill';
type View = { mode: Mode; scale: number };
type Point = { x: number; y: number };
const initial: View = { mode: 'fill', scale: 1 };
const interactive = 'a,button,input,textarea,[data-gesture],[role="menu"]';

/** A short pinch selects one of two detents; no intermediate zoom survives release. */
export function useBoulderFeedZoom({ reelRef, mediaId, disabled }: {
  reelRef: RefObject<HTMLElement>; mediaId?: string; disabled: boolean;
}) {
  const [view, setView] = useState<View>(initial);
  const [pinching, setPinching] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [animating, setAnimating] = useState(false);
  const current = useRef(view);
  const fill = useRef<number | null>(null);
  const points = useRef(new Map<number, Point>());
  const pinch = useRef<{ start: View; distance: number; target: Mode } | null>(null);
  const draining = useRef(false);
  const feedbackTimer = useRef<number | null>(null);
  const animationTimer = useRef<number | null>(null);
  const isDisabled = useRef(disabled); isDisabled.current = disabled;
  const publish = useCallback((next: View) => { current.current = next; setView(next); }, []);
  const endpoint = useCallback((mode: Mode): View => ({ mode, scale: mode === 'fit' ? 1 : fill.current ?? 1 }), []);
  const stopAnimation = useCallback(() => {
    if (animationTimer.current !== null) clearTimeout(animationTimer.current);
    animationTimer.current = null; setAnimating(false);
  }, []);
  const snap = useCallback((mode: Mode) => {
    stopAnimation(); setAnimating(true); publish(endpoint(mode));
    animationTimer.current = window.setTimeout(() => { setAnimating(false); animationTimer.current = null; }, 160);
  }, [endpoint, publish, stopAnimation]);
  const clearPoints = useCallback(() => {
    const ids = [...points.current.keys()];
    points.current.clear(); pinch.current = null; draining.current = false; setPinching(false);
    for (const id of ids) if (reelRef.current?.hasPointerCapture(id)) reelRef.current.releasePointerCapture(id);
  }, [reelRef]);
  const cancel = useCallback(() => {
    if (pinch.current) publish(endpoint(pinch.current.start.mode));
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null; setFeedback(false); stopAnimation(); clearPoints();
  }, [clearPoints, endpoint, publish, stopAnimation]);
  const showFeedback = useCallback(() => {
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    setFeedback(true);
    feedbackTimer.current = window.setTimeout(() => { setFeedback(false); feedbackTimer.current = null; }, 900);
  }, []);
  const choose = useCallback((value: string) => {
    if (fill.current === null || (value !== 'fit' && value !== 'fill')) return;
    cancel(); snap(value); showFeedback();
  }, [cancel, showFeedback, snap]);
  const step = useCallback((direction: number) => choose(direction > 1 ? 'fill' : 'fit'), [choose]);
  useLayoutEffect(() => {
    cancel(); fill.current = null; publish(initial);
    const reel = reelRef.current;
    const video = reel?.querySelector<HTMLVideoElement>('.reel-page[data-active=true] video');
    if (!reel || !video) return;
    const measure = () => {
      if (!video.videoWidth || !video.videoHeight || !reel.clientWidth || !reel.clientHeight) return;
      cancel();
      const widthRatio = reel.clientWidth / video.videoWidth, heightRatio = reel.clientHeight / video.videoHeight;
      fill.current = Math.max(widthRatio, heightRatio) / Math.min(widthRatio, heightRatio);
      publish(endpoint(current.current.mode));
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(reel);
    video.addEventListener('loadedmetadata', measure);
    let wheelDelta = 0, lastWheel = 0, wheelChanged = false;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || isDisabled.current || (event.target as Element).closest(interactive)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 180) { wheelDelta = 0; wheelChanged = false; }
      lastWheel = now; wheelDelta -= event.deltaY;
      if (!wheelChanged && Math.abs(wheelDelta) >= 12) { step(wheelDelta > 0 ? 2 : .5); wheelChanged = true; }
    };
    reel.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect(); video.removeEventListener('loadedmetadata', measure); reel.removeEventListener('wheel', wheel); cancel();
    };
  }, [mediaId, reelRef, cancel, endpoint, publish, step]);
  const distance = () => { const [a, b] = [...points.current.values()]; return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)); };
  const down = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || fill.current === null) return false;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.current.size === 2 && !draining.current) {
      const video = reelRef.current?.querySelector<HTMLVideoElement>('.reel-page[data-active=true] video');
      const scale = video ? new DOMMatrix(getComputedStyle(video).transform).a : current.current.scale;
      const start = { ...current.current, scale };
      stopAnimation(); publish(start);
      pinch.current = { start, distance: distance(), target: start.mode };
      setPinching(true); setFeedback(true);
      if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    }
    if (points.current.size > 2) {
      if (pinch.current) publish(endpoint(pinch.current.start.mode));
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
    const span = distance(), delta = span - gesture.distance;
    const threshold = Math.max(10, gesture.distance * .06);
    gesture.target = delta >= threshold ? 'fill' : delta <= -threshold ? 'fit' : gesture.start.mode;
    const scale = Math.max(1, Math.min(fill.current ?? 1, gesture.start.scale * span / gesture.distance));
    publish({ mode: gesture.target, scale });
    return true;
  };
  const up = (event: PointerEvent<HTMLElement>) => {
    const owned = Boolean(pinch.current) || draining.current;
    points.current.delete(event.pointerId);
    if (pinch.current) { const target = pinch.current.target; pinch.current = null; setPinching(false); snap(target); showFeedback(); }
    draining.current = owned && points.current.size > 0;
    return owned;
  };
  const label = view.mode === 'fit' ? 'Originalgröße' : 'Vollbild';
  const style: CSSProperties | undefined = fill.current !== null ? {
    objectFit: 'contain', transform: `scale(${view.scale})`,
    transition: animating ? 'transform 160ms cubic-bezier(.2,.8,.2,1)' : 'none',
  } : undefined;
  return { style, scale: view.scale, mode: view.mode, pinching, feedback, label, cancel, choose, step, down, move, up,
    hasPointer: (id: number) => points.current.has(id),
  };
}
