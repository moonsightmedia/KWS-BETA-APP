import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SwipeRoute = string | { path: string; match?: (pathname: string) => boolean };

export interface HorizontalRouteSwipeOptions {
  /** Routes in their visual order. A right swipe advances to the next route. */
  routes: SwipeRoute[];
  threshold?: number;
  axisRatio?: number;
}

const INTERACTIVE_SELECTOR = 'input, textarea, select, button, a, [role="button"], [contenteditable="true"]';

const routePath = (route: SwipeRoute) => (typeof route === 'string' ? route : route.path);

/**
 * Adds deliberately conservative, pointer-based horizontal route navigation.
 * The returned ref should be attached to the page shell. Descendants can opt
 * out with data-swipe-ignore (useful for cards and horizontal scrollers).
 */
export const useHorizontalRouteSwipe = ({
  routes,
  threshold = 56,
  axisRatio = 1.2,
}: HorizontalRouteSwipeOptions) => {
  const ref = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const routesRef = useRef(routes);
  const locationRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  routesRef.current = routes;
  locationRef.current = location.pathname;
  navigateRef.current = navigate;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'pan-y';

    let startX = 0;
    let startY = 0;
    let pointerId: number | null = null;
    let cancelled = false;

    const shouldIgnore = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return true;
      if (target.closest(`[data-swipe-ignore], ${INTERACTIVE_SELECTOR}`)) return true;
      // Do not steal a gesture from a horizontally scrollable descendant.
      const scroller = target.closest<HTMLElement>('[data-swipe-scroll], [style*="overflow-x"], .overflow-x-auto, .overflow-x-scroll');
      return !!scroller && scroller.scrollWidth > scroller.clientWidth;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || shouldIgnore(event.target)) {
        pointerId = null;
        return;
      }
      startX = event.clientX;
      startY = event.clientY;
      pointerId = event.pointerId;
      cancelled = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId || cancelled) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) || (Math.abs(dx) > 8 && Math.abs(dy) > 0 && Math.abs(dx) < Math.abs(dy) * axisRatio)) {
        cancelled = true;
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      if (cancelled) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * axisRatio) return;

      const currentIndex = routesRef.current.findIndex((route) => (
        typeof route === 'string' ? locationRef.current === route : route.match?.(locationRef.current) ?? locationRef.current === route.path
      ));
      if (currentIndex < 0) return;

      // User-facing order: right = forward, left = backward.
      const nextIndex = currentIndex + (dx > 0 ? 1 : -1);
      const nextRoute = routesRef.current[nextIndex];
      if (nextRoute) navigateRef.current(routePath(nextRoute));
    };

    element.addEventListener('pointerdown', onPointerDown, { passive: true });
    element.addEventListener('pointermove', onPointerMove, { passive: true });
    element.addEventListener('pointerup', onPointerEnd, { passive: true });
    const onPointerCancel = () => {
      pointerId = null;
      cancelled = true;
    };

    element.addEventListener('pointercancel', onPointerCancel, { passive: true });
    return () => {
      element.style.touchAction = previousTouchAction;
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerEnd);
      element.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [axisRatio, threshold]);

  return ref;
};
