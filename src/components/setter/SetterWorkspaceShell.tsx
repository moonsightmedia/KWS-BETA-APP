import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { kwsSurfaceClassName } from '@/components/ui/kws-surface';

interface MetricItem {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'muted';
}

export function SetterWorkspaceShell({
  eyebrow,
  title,
  description,
  metrics = [],
  primarySlot,
  secondarySlot,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: MetricItem[];
  primarySlot?: ReactNode;
  secondarySlot?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6 md:space-y-8', className)}>
      <section className="space-y-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-2 font-sans text-lg font-semibold leading-snug text-foreground">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          </div>
          {(primarySlot || secondarySlot) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {secondarySlot}
              {primarySlot}
            </div>
          )}
        </div>

        {metrics.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-kws-control bg-secondary p-4">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p
                  className={cn(
                    'mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground',
                    metric.tone === 'success' && 'text-primary-ink',
                    metric.tone === 'muted' && 'text-muted-foreground',
                  )}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {children}
    </div>
  );
}

export function SetterSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        kwsSurfaceClassName,
        'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SetterSubsection({
  kicker,
  title,
  description,
  children,
  aside,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-kws-control bg-secondary/60 p-4', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {kicker ? (
            <p className="text-xs font-medium text-muted-foreground">{kicker}</p>
          ) : null}
          <h3 className="mt-1 font-sans text-base font-semibold leading-snug text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
