import * as React from 'react';

import { cn } from '@/lib/utils';

export const kwsSurfaceClassName =
  'rounded-kws-card bg-white shadow-[0_3px_14px_rgba(19,17,43,0.07)]';

export const kwsPopoverClassName =
  'rounded-kws-card border-0 bg-white text-foreground shadow-[0_5px_18px_rgba(19,17,43,0.08)]';

export const KwsSurface = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(kwsSurfaceClassName, className)} {...props} />
  ),
);

KwsSurface.displayName = 'KwsSurface';
