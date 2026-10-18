import { KwsSurface } from '@/components/ui/kws-surface';
import { Skeleton } from '@/components/ui/skeleton';

const placeholder = 'rounded-kws-badge bg-secondary motion-reduce:animate-none';

export function HomeBoulderSkeletons() {
  return <>{Array.from({ length: 6 }, (_, index) => <div key={index} className="relative aspect-[4/5] overflow-hidden rounded-kws-card bg-secondary" aria-hidden="true">
    <Skeleton className="absolute left-2 top-2 h-6 w-6 rounded-kws-badge bg-card motion-reduce:animate-none" />
    <div className="absolute inset-x-2 bottom-3 space-y-1.5">
      <Skeleton className="h-2.5 w-3/4 rounded-kws-badge bg-card motion-reduce:animate-none" />
      <Skeleton className="h-2 w-2/5 rounded-kws-badge bg-card motion-reduce:animate-none" />
    </div>
  </div>)}</>;
}

export function HomeRowSkeleton({ projects = false }: { projects?: boolean }) {
  return <div role="status" aria-busy="true" className={projects ? 'space-y-2.5' : undefined}>
    <span className="sr-only">{projects ? 'Deine Projekte werden geladen …' : 'Schraubplan wird geladen …'}</span>
    {Array.from({ length: projects ? 2 : 1 }, (_, index) => <KwsSurface key={index} className="flex min-h-[76px] items-center gap-3 p-4" aria-hidden="true">
      <Skeleton className={`${placeholder} h-11 w-11 shrink-0 rounded-kws-control`} />
      <div className="flex-1 space-y-2"><Skeleton className={`${placeholder} h-4 w-1/2`} /><Skeleton className={`${placeholder} h-3 w-3/4`} /></div>
    </KwsSurface>)}
  </div>;
}
