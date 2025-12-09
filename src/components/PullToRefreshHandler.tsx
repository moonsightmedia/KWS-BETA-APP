import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { refreshAllData } from '@/utils/cacheUtils';

const PULL_THRESHOLD = 80; // Distance in pixels to trigger refresh
const MAX_PULL_DISTANCE = 120; // Maximum pull distance for visual feedback

interface TouchState {
  startY: number;
  currentY: number;
  isPulling: boolean;
  hasTriggered: boolean;
}

export const PullToRefreshHandler = () => {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStateRef = useRef<TouchState>({
    startY: 0,
    currentY: 0,
    isPulling: false,
    hasTriggered: false,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh if we're at the top of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 10) {
        return; // Don't trigger if not at top
      }

      // Prevent pull-to-refresh if already refreshing
      if (isRefreshing) {
        return;
      }

      touchStateRef.current = {
        startY: e.touches[0].clientY,
        currentY: e.touches[0].clientY,
        isPulling: true,
        hasTriggered: false,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchStateRef.current;
      if (!state.isPulling) return;

      // Prevent default scrolling if we're pulling down
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - state.startY;

      if (deltaY > 0) {
        // Pulling down - prevent default scroll
        e.preventDefault();
        
        state.currentY = currentY;
        const distance = Math.min(deltaY, MAX_PULL_DISTANCE);
        setPullDistance(distance);

        // Trigger refresh if threshold reached and not already triggered
        if (distance >= PULL_THRESHOLD && !state.hasTriggered) {
          state.hasTriggered = true;
        }
      } else {
        // Pulling up - reset
        setPullDistance(0);
        state.isPulling = false;
      }
    };

    const handleTouchEnd = async () => {
      const state = touchStateRef.current;
      if (!state.isPulling) return;

      const shouldRefresh = state.hasTriggered && pullDistance >= PULL_THRESHOLD;

      // Reset pull state
      state.isPulling = false;
      state.hasTriggered = false;
      setPullDistance(0);

      if (shouldRefresh && !isRefreshing) {
        console.log('[PullToRefresh] Triggering refresh...');
        setIsRefreshing(true);

        try {
          // Use optimized refresh function that refetches sequentially
          await refreshAllData(queryClient);
          console.log('[PullToRefresh] ✅ Refresh completed');
        } catch (error) {
          console.error('[PullToRefresh] ❌ Refresh failed:', error);
        } finally {
          // Small delay before hiding indicator for better UX
          setTimeout(() => {
            setIsRefreshing(false);
          }, 300);
        }
      }
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [queryClient, pullDistance, isRefreshing]);

  // Invisible container that captures touch events
  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{ touchAction: 'pan-y' }}
      />
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        pullThreshold={PULL_THRESHOLD}
      />
    </>
  );
};

