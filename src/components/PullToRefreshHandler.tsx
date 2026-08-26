import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import {
  getResistedPullDistance,
  PULL_THRESHOLD,
  resolvePullIntent,
} from '@/lib/pullToRefresh';
import { refreshAllData } from '@/utils/cacheUtils';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

type GesturePhase = 'idle' | 'tracking' | 'pulling';

interface TouchState {
  startX: number;
  startY: number;
  phase: GesturePhase;
}

const TOP_TOLERANCE = 3;
const MIN_REFRESH_VISIBILITY_MS = 650;
const DISABLED_ROUTES = ['/auth', '/auth/callback', '/competition'];

const isDocumentAtTop = () => {
  const scrollingElement = document.scrollingElement;
  return Math.max(
    window.scrollY || 0,
    scrollingElement?.scrollTop || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  ) <= TOP_TOLERANCE;
};

const shouldIgnoreTouchTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(target.closest([
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="slider"]',
    '[role="switch"]',
    '[role="dialog"]',
    '[data-pull-to-refresh="ignore"]',
    '[data-vaul-drawer]',
  ].join(',')));
};

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

export const PullToRefreshHandler = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const gestureRef = useRef<TouchState>({ startX: 0, startY: 0, phase: 'idle' });

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    const disabled = DISABLED_ROUTES.some((route) => location.pathname.startsWith(route));
    if (disabled) return;

    const resetGesture = () => {
      gestureRef.current.phase = 'idle';
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1
        || isRefreshingRef.current
        || !isDocumentAtTop()
        || document.querySelector('[role="dialog"]')
        || shouldIgnoreTouchTarget(event.target)
      ) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        phase: 'tracking',
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      if (gesture.phase === 'idle' || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (gesture.phase === 'tracking') {
        const intent = resolvePullIntent(deltaX, deltaY);
        if (intent === 'cancel') {
          resetGesture();
          return;
        }
        if (intent === 'pending') return;
        if (!isDocumentAtTop()) {
          resetGesture();
          return;
        }
        gesture.phase = 'pulling';
      }

      if (gesture.phase !== 'pulling') return;
      if (deltaY <= 0 || !isDocumentAtTop()) {
        resetGesture();
        return;
      }

      event.preventDefault();
      const nextDistance = getResistedPullDistance(deltaY);
      pullDistanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    };

    const runRefresh = async () => {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      const startedAt = Date.now();

      try {
        const result = await refreshAllData(queryClient);
        const remainingVisibility = Math.max(0, MIN_REFRESH_VISIBILITY_MS - (Date.now() - startedAt));
        if (remainingVisibility) await wait(remainingVisibility);

        if (result.failedQueries > 0) {
          toast.warning('Nicht alle Daten konnten aktualisiert werden.');
        } else {
          toast.success('Daten sind aktuell.');
        }
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error);
        toast.error('Aktualisieren fehlgeschlagen. Bitte erneut versuchen.');
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        resetGesture();
      }
    };

    const handleTouchEnd = () => {
      const shouldRefresh = gestureRef.current.phase === 'pulling'
        && pullDistanceRef.current >= PULL_THRESHOLD
        && !isRefreshingRef.current;

      gestureRef.current.phase = 'idle';
      if (shouldRefresh) {
        void runRefresh();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchCancel = () => resetGesture();

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [location.pathname, queryClient]);

  return (
    <PullToRefreshIndicator
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      pullThreshold={PULL_THRESHOLD}
    />
  );
};
