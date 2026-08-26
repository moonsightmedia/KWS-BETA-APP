import { ArrowDown, RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  pullThreshold: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  pullThreshold,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const visibleDistance = isRefreshing ? pullThreshold : pullDistance;
  const progress = Math.min(visibleDistance / pullThreshold, 1);
  const isReady = pullDistance >= pullThreshold;
  const translateY = isRefreshing ? 0 : -64 + Math.min(visibleDistance * 0.9, 64);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[9999] flex justify-center px-4"
      style={{
        top: 'calc(var(--app-safe-area-top) + 0.75rem)',
        transform: `translate3d(0, ${translateY}px, 0)`,
        opacity: Math.min(visibleDistance / 24, 1),
      }}
      role="status"
      aria-live="polite"
      aria-label={isRefreshing ? 'Daten werden aktualisiert' : isReady ? 'Zum Aktualisieren loslassen' : 'Weiter nach unten ziehen'}
    >
      <div className="flex min-h-[3.75rem] w-full max-w-[22rem] items-center gap-3 rounded-kws-card bg-white p-3 pr-4 text-[#192436] shadow-[0_8px_30px_rgba(25,36,54,0.14)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-kws-control bg-[#E7F7E9] text-[#287E2B]">
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <ArrowDown
              className={cn('h-4 w-4 transition-transform duration-150', isReady && 'rotate-180')}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[13px] font-semibold leading-5">
            {isRefreshing ? 'Inhalte werden aktualisiert' : isReady ? 'Jetzt loslassen' : 'Zum Aktualisieren ziehen'}
          </span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-kws-badge bg-[#E7EEE8]">
            <span
              className={cn('block h-full origin-left bg-primary', isRefreshing && 'kws-refresh-progress')}
              style={{ transform: isRefreshing ? undefined : `scaleX(${progress})` }}
            />
          </span>
        </span>
      </div>
    </div>
  );
};
