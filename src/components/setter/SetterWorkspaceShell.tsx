import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
            <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">{eyebrow}</p>
            <h2 className="mt-2 text-[2.2rem] font-semibold leading-none tracking-[-0.03em] text-[#13112B] sm:text-[2.7rem]">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#13112B]/68 sm:text-[15px]">
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
              <div key={metric.label} className="rounded-2xl border border-[#DDE7DF] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#13112B]/48">{metric.label}</p>
                <p
                  className={cn(
                    'mt-2 text-lg font-semibold tracking-[-0.03em] text-[#13112B]',
                    metric.tone === 'success' && 'text-[#17641D]',
                    metric.tone === 'muted' && 'text-[#13112B]/60',
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
        'rounded-2xl border border-[#DDE7DF] bg-white p-4 shadow-[0_8px_24px_rgba(19,17,43,0.05)] sm:p-5 lg:p-6',
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
    <div className={cn('rounded-2xl border border-[#E7F0E8] bg-[#FCFEFC] p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {kicker ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6E806A]">{kicker}</p>
          ) : null}
          <h3 className="mt-2 text-[1.45rem] font-semibold leading-none tracking-[-0.02em] text-[#13112B] sm:text-[1.7rem]">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#13112B]/64">{description}</p>
          ) : null}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
