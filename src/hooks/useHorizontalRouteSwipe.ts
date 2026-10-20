import { useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { resolveHorizontalSwipeIntent } from '@/lib/routeSwipe';
import { shouldCommitRouteSwipe } from '@/lib/routeSwipeMotion';
import { RouteSwipeContext, useRouteSwipePreview } from '@/contexts/RouteSwipeContext';
import { useTrainingPreferences } from '@/features/training/trainingPreferences';

export type SwipeRoute = string | { path: string; match?: (pathname: string) => boolean };

export interface HorizontalRouteSwipeOptions {
  /** Routes in visual left-to-right order. A left swipe advances to the next route. */
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
  const [element, setElement] = useState<HTMLElement | null>(null);
  // Rebind when loading/error/ready replaces the gesture surface. A mutable
  // object ref alone would leave listeners attached to the removed element.
  const ref = useCallback((node: HTMLElement | null) => setElement(node), []);
  const location = useLocation();
  const navigate = useNavigate();
  const pager = useContext(RouteSwipeContext);
  const preview = useRouteSwipePreview();
  const { trainingEnabled } = useTrainingPreferences();
  const routesRef = useRef(routes);
  const locationRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  routesRef.current = trainingEnabled ? routes : routes.filter(route => routePath(route) !== '/training' && !routePath(route).startsWith('/training/'));
  locationRef.current = location.pathname;
  navigateRef.current = navigate;

  useLayoutEffect(() => {
    if (!element || preview) return;

    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'pan-y pinch-zoom';

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let pointerId: number | null = null;
    let cancelled = false;
    let horizontalLocked = false;
    let touchTracking = false;
    let suppressClickUntil = 0;
    let lastSample = { x: 0, time: 0 };
    let velocity = 0;

    const currentRouteIndex = () => routesRef.current.findIndex((route) => (
      typeof route === 'string'
        ? locationRef.current === route
        : route.match?.(locationRef.current) ?? locationRef.current === route.path
    ));

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

    const cancelGesture = () => {
      if (horizontalLocked) {
        suppressClickUntil = Date.now() + 450;
        pager?.cancel();
      }
      resetGesture();
    };

    const moveGesture = (clientX: number, clientY: number, event?: Event) => {
      if (cancelled) return;

      lastX = clientX;
      const now = performance.now();
      if (now > lastSample.time) velocity = (clientX - lastSample.x) / (now - lastSample.time);
      lastSample = { x: clientX, time: now };
      const intent = resolveHorizontalSwipeIntent(
        clientX - startX,
        horizontalLocked ? 0 : clientY - startY,
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
        suppressClickUntil = Date.now() + 450;
        const index = currentRouteIndex();
        const neighbor = routesRef.current[index + (clientX < startX ? 1 : -1)];
        pager?.move(element, index < 0 || !neighbor ? null : routePath(neighbor), clientX - startX);
        if (event?.cancelable) event.preventDefault();
      }
    };

    const finishGesture = (clientX: number) => {
      if (cancelled || !horizontalLocked) {
        resetGesture();
        return false;
      }

      const delta = clientX - startX;
      const currentIndex = currentRouteIndex();

      if (currentIndex < 0) {
        cancelGesture();
        return false;
      }

      const nextIndex = currentIndex + (delta < 0 ? 1 : -1);
      const nextRoute = routesRef.current[nextIndex];
      resetGesture();

      suppressClickUntil = Date.now() + 450;
      const releaseVelocity = performance.now() - lastSample.time < 100 ? velocity : 0;
      if (pager) pager.finish(nextRoute ? routePath(nextRoute) : null, delta, releaseVelocity, threshold);
      else if (nextRoute && shouldCommitRouteSwipe(delta, releaseVelocity, element.clientWidth, threshold)) navigateRef.current(routePath(nextRoute));
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
      lastSample = { x: event.clientX, time: performance.now() };
      velocity = 0;
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
      finishGesture(event.clientX);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || shouldIgnore(event.target)) {
        cancelGesture();
        return;
      }

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastSample = { x: touch.clientX, time: performance.now() };
      velocity = 0;
      cancelled = false;
      horizontalLocked = false;
      touchTracking = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchTracking) return;
      if (event.touches.length !== 1) { cancelGesture(); return; }
      const touch = event.touches[0];
      moveGesture(touch.clientX, touch.clientY, event);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchTracking) return;
      const touch = event.changedTouches[0];
      const dragged = horizontalLocked;
      finishGesture(touch?.clientX ?? lastX);
      if (dragged && event.cancelable) event.preventDefault();
    };

    const onTouchCancel = () => cancelGesture();

    const onClickCapture = (event: MouseEvent) => {
      if (Date.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerEnd, { passive: true });
    const onPointerCancel = () => cancelGesture();

    element.addEventListener('pointercancel', onPointerCancel, { passive: true });
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: false });
    element.addEventListener('touchcancel', onTouchCancel, { passive: true });
    element.addEventListener('click', onClickCapture, true);
    window.addEventListener('blur', onPointerCancel);
    return () => {
      pager?.cancel();
      element.style.touchAction = previousTouchAction;
      element.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      element.removeEventListener('pointercancel', onPointerCancel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchCancel);
      element.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('blur', onPointerCancel);
    };
  }, [element, axisRatio, threshold, location.key, pager, preview]);

  return ref;
};
