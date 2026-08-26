import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Box, ChevronRight, MapPinned, RefreshCw } from 'lucide-react';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { kwsSurfaceClassName, KwsSurface } from '@/components/ui/kws-surface';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useBoulders } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { countActiveBouldersForSectorIds, groupSectorsByArea } from '@/lib/sectorAreas';

const Sectors = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();
  const { data: sectors, isLoading, error } = useSectorsTransformed(!authLoading);
  const { data: boulders } = useBoulders(!authLoading);
  const sectorAreaGroups = useMemo(() => groupSectorsByArea(sectors || []), [sectors]);

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading) {
    return (
      <DashboardPageLayout headerBackTo="/profile">
        <div className="space-y-5">
          <Skeleton className="h-24 rounded-kws-card" />
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-[22rem] rounded-kws-card" />
            ))}
          </div>
        </div>
      </DashboardPageLayout>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Ein unbekannter Fehler ist aufgetreten.';

    const isNetworkError = errorMessage.toLowerCase().includes('network')
      || errorMessage.toLowerCase().includes('fetch')
      || errorMessage.toLowerCase().includes('auth')
      || errorMessage.toLowerCase().includes('permission');

    return (
      <DashboardPageLayout headerBackTo="/profile" mainClassName="flex items-center justify-center">
        <Alert variant="destructive" className="w-full max-w-md rounded-kws-card bg-white shadow-[0_3px_14px_rgba(19,17,43,0.07)]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
          <AlertDescription className="mt-2">{errorMessage}</AlertDescription>
          {isNetworkError ? (
            <AlertDescription className="mt-2 text-sm">
              Bitte überprüfe deine Internetverbindung und versuche es erneut.
            </AlertDescription>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['sectors'] });
                queryClient.refetchQueries({ queryKey: ['sectors'] });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Erneut versuchen
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Seite neu laden
            </Button>
          </div>
        </Alert>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout headerBackTo="/profile">
      <KwsSurface className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-primary/10 text-primary">
            <MapPinned className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-base font-semibold tracking-[-0.02em] text-[#192436]">
              {sectorAreaGroups.length} Bereiche auf einen Blick
            </h2>
            <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
              Wähle einen Teilbereich von A bis D und öffne direkt die passenden Boulder.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-kws-badge bg-secondary px-2.5 py-1.5 font-sans text-[10px] font-semibold text-muted-foreground">
          {sectorAreaGroups.reduce((total, group) => total + group.subareas.length, 0)} Teilbereiche
        </span>
      </KwsSurface>

      {sectorAreaGroups.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {sectorAreaGroups.map((group) => {
            const imageUrl = group.sectors.find((sector) => sector.imageUrl)?.imageUrl;
            const activeBoulderCount = countActiveBouldersForSectorIds(boulders || [], group.sectorIds);

            return (
              <article key={group.area.slug} className={`${kwsSurfaceClassName} overflow-hidden`}>
                <div className="relative aspect-[16/8] w-full overflow-hidden bg-[#EAF1EB]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={group.area.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        const img = event.currentTarget;
                        const retryCount = parseInt(img.getAttribute('data-retry-count') || '0', 10);
                        if (retryCount < 2) {
                          const delay = 1000 * Math.pow(2, retryCount);
                          img.setAttribute('data-retry-count', String(retryCount + 1));
                          setTimeout(() => {
                            const currentSrc = img.src;
                            img.src = '';
                            img.src = currentSrc;
                          }, delay);
                        } else {
                          img.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <Box className="h-10 w-10 text-[#91A095]" aria-hidden="true" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 -bottom-px h-[62%] bg-gradient-to-t from-white via-white/88 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3.5">
                    <h2 className="min-w-0 truncate font-sans text-lg font-semibold tracking-[-0.03em] text-[#192436]">
                      {group.area.name}
                    </h2>
                    <span className="inline-flex shrink-0 items-center rounded-kws-badge bg-white px-2 py-1 font-sans text-[9px] font-semibold text-[#192436] shadow-[0_2px_8px_rgba(19,17,43,0.10)]">
                      {activeBoulderCount} Boulder
                    </span>
                  </div>
                </div>

                <div className="relative -mt-px bg-white p-3.5">
                  <p className="mb-2.5 px-0.5 font-sans text-[10px] font-semibold text-muted-foreground">
                    Teilbereich auswählen
                  </p>

                  {group.subareas.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2" aria-label={`Teilbereiche ${group.area.name}`}>
                      {group.subareas.map((subarea) => {
                        const subareaBoulderCount = countActiveBouldersForSectorIds(boulders || [], subarea.sectorIds);

                        return (
                          <button
                            key={subarea.code}
                            type="button"
                            onClick={() => handleViewBoulders(subarea.name)}
                            className="group flex min-h-[54px] items-center gap-2.5 rounded-kws-control bg-secondary/75 px-2.5 py-2 text-left transition-[background-color,transform] hover:bg-primary/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                            aria-label={`${subarea.name}, ${subareaBoulderCount} Boulder aktiv`}
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-kws-badge bg-white font-sans text-sm font-semibold text-primary shadow-[0_1px_5px_rgba(19,17,43,0.08)]">
                              {subarea.code}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-sans text-xs font-semibold text-[#192436]">
                                {subareaBoulderCount} Boulder
                              </span>
                              <span className="mt-0.5 block truncate font-sans text-[9px] text-muted-foreground">
                                {subarea.name}
                              </span>
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-kws-control bg-secondary/75 px-3 py-3 font-sans text-xs text-muted-foreground">
                      Noch keine Teilbereiche zugeordnet.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <KwsSurface className="px-4 py-8 text-center">
          <p className="font-sans text-sm font-semibold text-[#192436]">Noch keine Bereiche vorhanden</p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">Sobald Bereiche angelegt sind, erscheinen sie hier.</p>
        </KwsSurface>
      )}
    </DashboardPageLayout>
  );
};

export default Sectors;
