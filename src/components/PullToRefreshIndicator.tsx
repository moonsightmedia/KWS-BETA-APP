import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  pullThreshold: number;
}

export const PullToRefreshIndicator = ({ pullDistance, isRefreshing, pullThreshold }: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const shouldTrigger = pullDistance >= pullThreshold;
  const offsetY = Math.min(pullDistance * 0.6, 80);
  const opacity = Math.min(pullDistance / 40, 1);

  return (
    <div
      className="fixed left-0 right-0 z-[9999] flex items-start justify-center pointer-events-none"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        transform: `translateY(${offsetY}px)`,
      }}
    >
      <div 
        className="bg-white rounded-full shadow-xl px-4 py-3 flex items-center gap-3"
        style={{
          opacity: opacity,
          transform: `scale(${Math.min(0.8 + progress * 0.2, 1)})`,
        }}
      >
        {isRefreshing ? (
          <>
            <Loader2 className="w-6 h-6 text-[#36B531] animate-spin flex-shrink-0" />
            <span className="text-sm text-[#36B531] font-semibold whitespace-nowrap">Aktualisiere...</span>
          </>
        ) : (
          <>
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                shouldTrigger
                  ? "border-[#36B531] bg-[#36B531]/10"
                  : "border-gray-300 bg-white"
              )}
              style={{
                transform: `rotate(${progress * 360}deg)`,
              }}
            >
              <svg
                className={cn("w-5 h-5 transition-colors", shouldTrigger ? "text-[#36B531]" : "text-gray-400")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <span className={cn(
              "text-xs font-medium whitespace-nowrap",
              shouldTrigger ? "text-[#36B531] animate-pulse" : "text-gray-500"
            )}>
              {shouldTrigger ? "Loslassen" : `${Math.round(progress * 100)}%`}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
