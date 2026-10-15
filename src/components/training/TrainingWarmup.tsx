import { getSessionWarmup } from '@/features/training/data';
import type { TrainingSession } from '@/features/training/types';

export default function TrainingWarmup({ session }: { session: TrainingSession }) {
  const warmup = getSessionWarmup(session);
  if (!warmup) return null;
  return <section aria-label="Aufwärmen" className="space-y-3 rounded-kws-card bg-card p-4 shadow-soft">
    <h3 className="text-sm font-semibold">Aufwärmen · ca. {warmup.minutes} Min.</h3>
    <ol className="divide-y divide-border/60" aria-label="Aufwärmübungen">{warmup.steps.map((step, index) => <li key={step.id} className="flex gap-3 py-3 first:pt-0 last:pb-0"><span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-kws-badge bg-secondary text-xs font-semibold">{index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><h4 className="text-sm font-medium">{step.title}</h4><span className="text-xs text-muted-foreground">ca. {step.minutes} Min.</span></div><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.instruction}</p></div></li>)}</ol>
  </section>;
}
