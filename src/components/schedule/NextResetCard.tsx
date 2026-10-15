import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, RefreshCw } from 'lucide-react';
import { useResetPlan } from '@/hooks/useResetPlan';
import { formatHallDate, relativeResetDay } from '@/lib/resetSchedule';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function NextResetCard() {
  const plan = useResetPlan();
  const next = plan.appointments[0];
  return <KwsSurface className="min-w-0 p-4">
    {plan.pending ? <div role="status" className="space-y-2">
      <span className="sr-only">Schraubplan wird geladen …</span>
      <Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" />
    </div> : plan.failed ? <div role="status" className="space-y-2">
      <p className="text-sm text-muted-foreground">Schraubplan gerade nicht verfügbar.</p>
      <Button variant="secondary" disabled={plan.fetching} onClick={() => void plan.retry()}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />{plan.fetching ? 'Wird geladen …' : 'Erneut versuchen'}
      </Button>
    </div> : <Link to="/schedule" className="flex min-h-11 items-center gap-3 rounded-kws-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-primary/10 text-primary-ink"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold [overflow-wrap:anywhere]">{next ? next.sectors.map(sector => sector.name).join(' · ') : 'Noch kein Termin geplant'}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{next
          ? `${relativeResetDay(next.day, plan.now) ?? formatHallDate(next.when, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatHallDate(next.when, { hour: '2-digit', minute: '2-digit' })} Uhr`
          : 'Zum Schraubplan'}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>}
  </KwsSurface>;
}
