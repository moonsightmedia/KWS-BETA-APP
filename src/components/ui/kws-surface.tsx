import * as React from 'react';

import { cn } from '@/lib/utils';

export const kwsSurfaceClassName =
  'rounded-kws-card bg-card shadow-soft';

export const kwsPopoverClassName =
  'rounded-kws-card border-0 bg-card text-foreground shadow-medium duration-150 motion-reduce:animate-none';

export const KwsSurface = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(kwsSurfaceClassName, className)} {...props} />
  ),
);

KwsSurface.displayName = 'KwsSurface';
