import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { resolveHorizontalSwipeIntent } from '@/lib/routeSwipe';

export type SwipeRoute = string | { path: string; match?: (pathname: string) => boolean };

export interface HorizontalRouteSwipeOptions {
  /** Routes in their visual order. A right swipe advances to the next route. */
  routes: SwipeRoute[];
  threshold?: number;
  axisRatio?: number;
}

const SWIPE_IGNORE_SELECTOR = [
  '[data-swipe-ignore]',
  '[data-vaul-drawer]',
  '[role="dialog"]',
  '[role="slider"]',
  '[role="switch"]',
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(',');

const routePath = (route: SwipeRoute) => (typeof route === 'string' ? route : route.path);

/**
 * Adds deliberately conservative horizontal route navigation. Touch events
 * drive real mobile gestures; pointer events keep mouse/stylus QA possible.
 * Cards and links remain valid swipe surfaces. Complex controls and horizontal
 * scrollers opt out automatically or with data-swipe-ignore.
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
    let lastX = 0;
    let lastY = 0;
    let pointerId: number | null = null;
    let cancelled = false;
    let horizontalLocked = false;
    let touchTracking = false;
    let suppressClickUntil = 0;

    const shouldIgnore = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return true;
      if (target.closest(SWIPE_IGNORE_SELECTOR)) return true;
      // Do not steal a gesture from a horizontally scrollable descendant.
      const scroller = target.closest<HTMLElement>('[data-swipe-scroll], [style*="overflow-x"], .overflow-x-auto, .overflow-x-scroll, [data-radix-scroll-area-viewport]');
      return !!scroller && scroller.scrollWidth > scroller.clientWidth;
    };

    const resetGesture = () => {
      pointerId = null;
      cancelled = false;
      horizontalLocked = false;
      touchTracking = false;
    };

    const moveGesture = (clientX: number, clientY: number, event?: Event) => {
      if (cancelled) return;

      lastX = clientX;
      lastY = clientY;
      const intent = resolveHorizontalSwipeIntent(
        clientX - startX,
        clientY - startY,
        threshold,
        axisRatio,
      );

      if (intent === 'vertical') {
        cancelled = true;
        horizontalLocked = false;
        return;
      }

      if (intent === 'horizontal' || intent === 'next' || intent === 'previous') {
        horizontalLocked = true;
        if (event?.cancelable) event.preventDefault();
      }
    };

    const finishGesture = (clientX: number, clientY: number) => {
      if (cancelled || !horizontalLocked) {
        resetGesture();
        return false;
      }

      const intent = resolveHorizontalSwipeIntent(
        clientX - startX,
        clientY - startY,
        threshold,
        axisRatio,
      );
      const currentIndex = routesRef.current.findIndex((route) => (
        typeof route === 'string'
          ? locationRef.current === route
          : route.match?.(locationRef.current) ?? locationRef.current === route.path
      ));

      if (currentIndex < 0 || (intent !== 'next' && intent !== 'previous')) {
        resetGesture();
        return false;
      }

      const nextIndex = currentIndex + (intent === 'next' ? 1 : -1);
      const nextRoute = routesRef.current[nextIndex];
      resetGesture();

      if (!nextRoute) return false;

      suppressClickUntil = Date.now() + 450;
      navigateRef.current(routePath(nextRoute));
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      // Real touch input is handled below because older Android WebViews can
      // cancel pointer sequences while handing a gesture to native scrolling.
      if (event.pointerType === 'touch') return;
      if (!event.isPrimary || event.button !== 0 || shouldIgnore(event.target)) {
        pointerId = null;
        return;
      }
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      pointerId = event.pointerId;
      cancelled = false;
      horizontalLocked = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || pointerId !== event.pointerId) return;
      moveGesture(event.clientX, event.clientY, event);
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || pointerId !== event.pointerId) return;
      finishGesture(event.clientX, event.clientY);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || shouldIgnore(event.target)) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastY = touch.clientY;
      cancelled = false;
      horizontalLocked = false;
      touchTracking = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchTracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      moveGesture(touch.clientX, touch.clientY, event);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchTracking) return;
      const touch = event.changedTouches[0];
      const navigated = finishGesture(touch?.clientX ?? lastX, touch?.clientY ?? lastY);
      if (navigated && event.cancelable) event.preventDefault();
    };

    const onTouchCancel = () => resetGesture();

    const onClickCapture = (event: MouseEvent) => {
      if (Date.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener('pointerdown', onPointerDown, { passive: true });
    element.addEventListener('pointermove', onPointerMove, { passive: false });
    element.addEventListener('pointerup', onPointerEnd, { passive: true });
    const onPointerCancel = () => {
      pointerId = null;
      cancelled = true;
    };

    element.addEventListener('pointercancel', onPointerCancel, { passive: true });
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: false });
    element.addEventListener('touchcancel', onTouchCancel, { passive: true });
    element.addEventListener('click', onClickCapture, true);
    return () => {
      element.style.touchAction = previousTouchAction;
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerEnd);
      element.removeEventListener('pointercancel', onPointerCancel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchCancel);
      element.removeEventListener('click', onClickCapture, true);
    };
  }, [axisRatio, threshold]);

  return ref;
};
