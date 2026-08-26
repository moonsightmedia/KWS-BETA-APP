import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { kwsSurfaceClassName } from '@/components/ui/kws-surface';
import { cn } from '@/lib/utils';

export type KwsMetricItem = {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
};

export const KwsMetricStrip = ({
  items,
  onItemClick,
  className,
}: {
  items: KwsMetricItem[];
  onItemClick?: (item: KwsMetricItem) => void;
  className?: string;
}) => (
  <div
    className={cn(
      kwsSurfaceClassName,
      'grid divide-x divide-border/70 overflow-hidden',
      items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4',
      className,
    )}
  >
    {items.map((item) => {
      const Icon = item.icon;
      const content = (
        <>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-kws-control bg-primary/10">
            <Icon className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-lg font-semibold leading-none tracking-[-0.04em] text-[#192436]">
              {item.value}
            </span>
            <span className="block truncate pt-1 font-sans text-[9px] font-medium text-muted-foreground">
              {item.label}
            </span>
          </span>
        </>
      );

      return onItemClick ? (
        <button
          key={item.label}
          type="button"
          onClick={() => onItemClick(item)}
          className="flex min-h-[68px] min-w-0 items-center gap-2.5 px-3 py-3 transition-colors hover:bg-secondary/55 active:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
          aria-label={`${item.label}: ${String(item.value)}`}
        >
          {content}
        </button>
      ) : (
        <div key={item.label} className="flex min-h-[68px] min-w-0 items-center gap-2.5 px-3 py-3">
          {content}
        </div>
      );
    })}
  </div>
);
