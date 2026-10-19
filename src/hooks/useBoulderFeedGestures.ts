import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

/** One gesture owner for taps, holds and vertical navigation. Media URLs/data live elsewhere. */
export function useBoulderFeedGestures({ videoRef, reelRef, paused, onPause, index, count, onIndex, onExit, disabled }: {
  videoRef: RefObject<HTMLVideoElement>; reelRef: RefObject<HTMLElement>; paused: boolean;
  onPause: (paused: boolean) => void; index: number; count: number;
  onIndex: (index: number) => void; onExit: () => void; disabled: boolean;
}) {
  const [clean, setClean] = useState(false);
  const [holdRate, setHoldRate] = useState<0.5 | 2 | null>(null);
  const [dragY, setDragY] = useState(0);
  const [settling, setSettling] = useState(false);
  const [suspended, setSuspended] = useState(document.hidden);
  const gesture = useRef<{ x: number; y: number; time: number; pointer: number; moved: boolean; held: boolean } | null>(null);
  const tap = useRef<{ x: number; y: number; time: number; type: string; timer: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef<{ video: HTMLVideoElement; rate: number; paused: boolean; owner: number | string } | null>(null);
  const settleTimer = useRef<number | null>(null);
  const settlingRef = useRef(false);
  const lastWheel = useRef(-Infinity);
  const hadClean = useRef(false);
  const cancelTap = useCallback(() => { if (tap.current) clearTimeout(tap.current.timer); tap.current = null; }, []);
  const clearHold = useCallback(() => { if (holdTimer.current !== null) clearTimeout(holdTimer.current); holdTimer.current = null; }, []);
  const stopHold = useCallback((suspend = false) => {
    clearHold();
    const previous = held.current; held.current = null;
    if (!previous) return;
    previous.video.playbackRate = previous.rate;
    if (suspend || previous.paused) previous.video.pause();
    setHoldRate(null);
  }, [clearHold]);
  const startHold = (rate: 0.5 | 2, owner: number | string) => {
    const video = videoRef.current;
    if (!video || held.current || suspended || disabled || document.hidden) return;
    cancelTap();
    held.current = { video, rate: video.playbackRate, paused, owner };
    if (gesture.current) gesture.current.held = true;
    video.playbackRate = rate;
    setHoldRate(rate);
  };
  const settle = (next: number) => {
    clearHold(); cancelTap();
    const direction = Math.sign(next - index);
    const finish = () => { setDragY(0); setSettling(false); settlingRef.current = false; if (direction) onIndex(next); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    settlingRef.current = true; setSettling(true);
    setDragY(-direction * (reelRef.current?.clientHeight ?? innerHeight));
    settleTimer.current = window.setTimeout(finish, 240);
  };
  const go = (direction: number) => {
    if (disabled || held.current || settlingRef.current) return;
    const next = Math.max(0, Math.min(count - 1, index + direction));
    if (next !== index) settle(next);
  };
  const cancelPointer = () => {
    cancelTap(); stopHold();
    const moved = gesture.current?.moved; gesture.current = null;
    if (moved) settle(index);
  };
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || disabled || settlingRef.current || (event.target as Element).closest('a,button,input,textarea,[data-gesture],[role="menu"]')) { cancelTap(); stopHold(); gesture.current = null; return; }
    if (tap.current) clearTimeout(tap.current.timer);
    clearHold();
    gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), pointer: event.pointerId, moved: false, held: false };
    const box = event.currentTarget.getBoundingClientRect();
    const rate = event.clientX < box.left + box.width / 2 ? 0.5 : 2;
    const pointer = event.pointerId;
    holdTimer.current = window.setTimeout(() => { holdTimer.current = null; if (gesture.current?.pointer === pointer && !gesture.current.moved) startHold(rate, pointer); }, 350);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointer !== event.pointerId || current.held) return;
    const dy = event.clientY - current.y, dx = event.clientX - current.x;
    if (Math.hypot(dx, dy) >= 8) { cancelTap(); clearHold(); }
    if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.3) return;
    current.moved = true;
    const edge = (dy > 0 && index === 0) || (dy < 0 && index === count - 1);
    const height = reelRef.current?.clientHeight ?? innerHeight;
    setDragY(Math.max(-height, Math.min(height, edge ? dy * .2 : dy)));
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    clearHold();
    const current = gesture.current; gesture.current = null;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.held) { stopHold(); return; }
    const dy = event.clientY - current.y, dx = event.clientX - current.x;
    if (!current.moved && Math.abs(dy) < 8 && Math.abs(dx) < 8) {
      const previous = tap.current, now = performance.now();
      const double = previous && now - previous.time <= 280 && previous.type === event.pointerType && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 32;
      cancelTap();
      if (double) { setClean(value => !value); return; }
      if (previous) onPause(!paused);
      tap.current = { x: event.clientX, y: event.clientY, time: now, type: event.pointerType, timer: window.setTimeout(() => { tap.current = null; onPause(previous ? paused : !paused); }, 280) };
      return;
    }
    const speed = Math.abs(dy) / Math.max(1, performance.now() - current.time);
    const threshold = Math.min(120, (reelRef.current?.clientHeight ?? 800) * .16);
    const direction = Math.abs(dy) >= threshold || (Math.abs(dy) > 45 && speed > .6) ? (dy < 0 ? 1 : -1) : 0;
    settle(Math.max(0, Math.min(count - 1, index + direction)));
  };
  useEffect(() => {
    cancelTap(); gesture.current = null; stopHold(true);
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settlingRef.current = false; setSettling(false); setDragY(0);
    return () => { cancelTap(); gesture.current = null; stopHold(true); if (settleTimer.current !== null) clearTimeout(settleTimer.current); };
  }, [disabled, index, count, clean, cancelTap, stopHold]);
  useEffect(() => {
    if (clean) { hadClean.current = true; reelRef.current?.querySelector<HTMLButtonElement>('.restore-chrome')?.focus({ preventScroll: true }); }
    else if (hadClean.current) { hadClean.current = false; reelRef.current?.querySelector<HTMLButtonElement>('[data-active="true"] [aria-label="Bedienelemente ausblenden"]')?.focus({ preventScroll: true }); }
  }, [clean, reelRef]);
  useEffect(() => {
    const background = () => { setSuspended(true); cancelTap(); gesture.current = null; stopHold(true); videoRef.current?.pause(); };
    const focus = () => { if (!document.hidden) setSuspended(false); };
    const visibility = () => document.hidden ? background() : focus();
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || disabled) return;
      if (held.current) { if (event.key === held.current.owner || event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault(); if (event.key === 'Escape') { event.preventDefault(); gesture.current = null; stopHold(); } return; }
      cancelTap();
      if (event.key === 'Escape' && clean) { event.preventDefault(); setClean(false); return; }
      if ((event.target as Element).closest('a,button,input,textarea,[role="dialog"],[role="menu"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); startHold(event.key === 'ArrowLeft' ? .5 : 2, event.key); }
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); go(1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); go(-1); }
      if (event.key === ' ') { event.preventDefault(); onPause(!paused); }
      if (event.key === 'Escape') { event.preventDefault(); onExit(); }
    };
    const keyUp = (event: KeyboardEvent) => { if (held.current?.owner === event.key) stopHold(); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', background); window.addEventListener('focus', focus); window.addEventListener('keydown', key, true); window.addEventListener('keyup', keyUp);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', background); window.removeEventListener('focus', focus); window.removeEventListener('keydown', key, true); window.removeEventListener('keyup', keyUp); };
  });
  return { clean, setClean, holdRate, hidden: clean || holdRate !== null, dragY, settling, suspended, go,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancelPointer,
      onLostPointerCapture: () => { if (gesture.current) cancelPointer(); },
      onContextMenu: (event: React.MouseEvent) => { if (!(event.target as Element).closest('a,button,input,textarea')) event.preventDefault(); },
      onDragStart: (event: React.DragEvent) => event.preventDefault(),
      onWheel: (event: React.WheelEvent) => { if ((event.target as Element).closest('a,button,input,[data-gesture]')) return; const now = performance.now(), gap = now - lastWheel.current; lastWheel.current = now; if (gap > 160 && Math.abs(event.deltaY) > 20) go(event.deltaY > 0 ? 1 : -1); },
    },
  };
}
