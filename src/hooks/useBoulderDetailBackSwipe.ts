import { useEffect, useRef } from 'react';

/** Non-player detail pages keep native vertical scroll and reserve only a clear
 * rightward gesture for the same return action as the header. Dialogs/controls
 * and embedded media retain their own gestures. The mobile video has its own owner. */
export function useBoulderDetailBackSwipe(onBack: () => void, enabled: boolean) {
  const back = useRef(onBack);
  back.current = onBack;
  useEffect(() => {
    if (!enabled) return;
    const surface = document.querySelector<HTMLElement>('[data-boulder-detail-scroll]')
      ?? document.querySelector<HTMLElement>('main');
    if (!surface) return;
    const previousTouchAction = surface.style.touchAction;
    surface.style.touchAction = 'pan-y pinch-zoom';
    let gesture: { id: number; x: number; y: number; time: number; axis: 'pending' | 'horizontal' } | null = null;
    let suppressUntil = 0;
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { gesture = null; return; }
      if (event.button !== 0 || !(event.target instanceof Element)
        || event.target.closest('a,button,input,textarea,select,video,iframe,[role="dialog"],[role="slider"],[data-swipe-ignore]')) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, axis: 'pending' };
    };
    const move = (event: PointerEvent) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (gesture.axis === 'pending') {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
        if (dx < -10) { gesture = null; return; }
        if (dx < 10 || dx < Math.abs(dy) * 1.3) return;
        gesture.axis = 'horizontal';
        surface.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
    };
    const cancel = (event: PointerEvent) => {
      if (event.type !== 'lostpointercapture' || (event.target === surface && !surface.hasPointerCapture(event.pointerId))) gesture = null;
    };
    const up = (event: PointerEvent) => {
      const current = gesture; gesture = null;
      if (!current || current.id !== event.pointerId || current.axis !== 'horizontal') return;
      suppressUntil = performance.now() + 350;
      const dx = event.clientX - current.x;
      const threshold = Math.max(64, Math.min(112, surface.clientWidth * .25));
      if (dx >= threshold || (dx > 45 && dx / Math.max(1, event.timeStamp - current.time) > .6)) back.current();
    };
    const click = (event: MouseEvent) => { if (performance.now() < suppressUntil) { event.preventDefault(); event.stopPropagation(); } };
    surface.addEventListener('pointerdown', down);
    surface.addEventListener('pointermove', move, { passive: false });
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', cancel);
    surface.addEventListener('lostpointercapture', cancel);
    surface.addEventListener('click', click, true);
    return () => {
      surface.style.touchAction = previousTouchAction;
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', up);
      surface.removeEventListener('pointercancel', cancel);
      surface.removeEventListener('lostpointercapture', cancel);
      surface.removeEventListener('click', click, true);
    };
  }, [enabled]);
}
