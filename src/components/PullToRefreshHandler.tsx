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

  // Helper function to check if we're truly at the top and cannot scroll up
  const isAtTopAndCannotScrollUp = (): boolean => {
    // Check both window.scrollY and document.documentElement.scrollTop
    // Some browsers use one, others use the other
    const scrollTop = Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );
    
    // Must be at top (scrollTop <= 1px tolerance for rounding errors)
    // If scrollTop is 0 or very close to 0, we cannot scroll up further
    return scrollTop <= 1;
  };

  useEffect(() => {
    // CRITICAL: Use capture phase to intercept events before other handlers
    // This ensures pull-to-refresh works even with other touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      // CRITICAL: Check if there's an active switch interaction
      if ((window as any).__switchInteraction) {
        console.log('[PullToRefresh] TouchStart - cancelled, switch interaction active');
        touchStateRef.current.isPulling = false;
        return;
      }
      
      // CRITICAL: Don't interfere with interactive elements (buttons, switches, inputs)
      const target = e.target as HTMLElement;
      if (target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('[role="switch"]') ||
        target.closest('label') ||
        target.closest('.switch') ||
        target.closest('[data-radix-switch]') ||
        target.closest('[data-state]') || // Radix UI switches have data-state attribute
        target.closest('[class*="switch"]') || // Any element with "switch" in class name
        target.closest('[data-radix-switch-root]') // Radix UI switch root element
      )) {
        // Don't interfere with button/switch clicks
        console.log('[PullToRefresh] TouchStart - cancelled, interactive element:', target.tagName, target.closest('[role="switch"]') ? 'switch' : 'other');
        touchStateRef.current.isPulling = false;
        return;
      }

      // STRICT CHECK: Only allow pull-to-refresh if we're EXACTLY at the top
      if (!isAtTopAndCannotScrollUp()) {
        // Reset state if not at top - user can still scroll up
        touchStateRef.current.isPulling = false;
        return; // Don't trigger if not at top
      }

      // Prevent pull-to-refresh if already refreshing
      if (isRefreshing) {
        return;
      }

      // Mark pull-to-refresh as active to prevent other handlers from interfering
      (window as any).__pullToRefreshActive = true;

      touchStateRef.current = {
        startY: e.touches[0].clientY,
        currentY: e.touches[0].clientY,
        isPulling: true,
        hasTriggered: false,
      };
      
      console.log('[PullToRefresh] TouchStart - isPulling:', true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchStateRef.current;
      if (!state.isPulling) return;

      // CRITICAL: Check if there's an active switch interaction
      if ((window as any).__switchInteraction) {
        console.log('[PullToRefresh] TouchMove - cancelled, switch interaction active');
        setPullDistance(0);
        state.isPulling = false;
        (window as any).__pullToRefreshActive = false;
        return;
      }

      // CRITICAL: Check if target is an interactive element BEFORE preventing default
      const target = e.target as HTMLElement;
      if (target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('[role="switch"]') ||
        target.closest('label') ||
        target.closest('.switch') ||
        target.closest('[data-radix-switch]') ||
        target.closest('[data-state]') || // Radix UI switches have data-state attribute
        target.closest('[data-radix-switch-root]') // Radix UI switch root element
      )) {
        // Don't prevent default on interactive elements
        console.log('[PullToRefresh] TouchMove - cancelled, interactive element');
        setPullDistance(0);
        state.isPulling = false;
        (window as any).__pullToRefreshActive = false;
        return;
      }

      // STRICT CHECK: Cancel immediately if we're no longer at the top
      if (!isAtTopAndCannotScrollUp()) {
        // User scrolled away from top - cancel pull-to-refresh immediately
        console.log('[PullToRefresh] TouchMove - cancelled, not at top');
        setPullDistance(0);
        state.isPulling = false;
        (window as any).__pullToRefreshActive = false;
        return;
      }

      // Prevent default scrolling if we're pulling down
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - state.startY;

      // Only activate if pulling down (more than 5px)
      // This prevents accidental activation when scrolling up
      if (deltaY > 5) {
        // Pulling down - prevent default scroll ONLY if we're still at top
        if (isAtTopAndCannotScrollUp()) {
          e.preventDefault();
          e.stopPropagation(); // Prevent other handlers from interfering
          
          state.currentY = currentY;
          const distance = Math.min(deltaY, MAX_PULL_DISTANCE);
          setPullDistance(distance);

          // Trigger refresh if threshold reached and not already triggered
          if (distance >= PULL_THRESHOLD && !state.hasTriggered) {
            state.hasTriggered = true;
            console.log('[PullToRefresh] TouchMove - threshold reached, will refresh');
          }
        } else {
          // No longer at top - cancel immediately
          console.log('[PullToRefresh] TouchMove - cancelled, no longer at top');
          setPullDistance(0);
          state.isPulling = false;
          (window as any).__pullToRefreshActive = false;
        }
      } else if (deltaY < -2) {
        // Pulling up even slightly (more than 2px) - cancel pull-to-refresh immediately
        console.log('[PullToRefresh] TouchMove - cancelled, pulling up');
        setPullDistance(0);
        state.isPulling = false;
        (window as any).__pullToRefreshActive = false;
        // Don't prevent default - allow normal scrolling
      }
    };

    const handleTouchEnd = async () => {
      const state = touchStateRef.current;
      
      // Always clear the marker
      (window as any).__pullToRefreshActive = false;
      
      if (!state.isPulling) return;

      // FINAL CHECK: Only refresh if we're still at the top
      if (!isAtTopAndCannotScrollUp()) {
        // User scrolled away - cancel refresh
        state.isPulling = false;
        state.hasTriggered = false;
        setPullDistance(0);
        return;
      }

      // Get current pullDistance from state (use ref to avoid stale closure)
      const currentPullDistance = pullDistance;
      const shouldRefresh = state.hasTriggered && currentPullDistance >= PULL_THRESHOLD;

      console.log('[PullToRefresh] TouchEnd - shouldRefresh:', shouldRefresh, 'pullDistance:', currentPullDistance, 'hasTriggered:', state.hasTriggered);

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
          
          // Show success feedback
          const { toast } = await import('sonner');
          toast.success('Daten aktualisiert', {
            duration: 2000,
          });
        } catch (error) {
          console.error('[PullToRefresh] ❌ Refresh failed:', error);
          // Show error feedback
          const { toast } = await import('sonner');
          toast.error('Fehler beim Aktualisieren', {
            duration: 3000,
          });
        } finally {
          // Small delay before hiding indicator for better UX
          setTimeout(() => {
            setIsRefreshing(false);
          }, 500);
        }
      }
    };

    // CRITICAL: Use capture phase (true) to intercept events before other handlers
    // This ensures pull-to-refresh works even with other touch handlers
    document.body.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    document.body.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.body.addEventListener('touchend', handleTouchEnd, { capture: true });

    return () => {
      document.body.removeEventListener('touchstart', handleTouchStart, { capture: true } as any);
      document.body.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
      document.body.removeEventListener('touchend', handleTouchEnd, { capture: true } as any);
      // Clean up marker
      (window as any).__pullToRefreshActive = false;
    };
  }, [queryClient, isRefreshing, pullDistance]); // Added pullDistance back but use ref in handler to avoid stale closure

  // No container needed - events are attached to document.body
  return (
    <PullToRefreshIndicator
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      pullThreshold={PULL_THRESHOLD}
    />
  );
};

