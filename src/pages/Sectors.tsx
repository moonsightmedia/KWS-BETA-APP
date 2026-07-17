import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useBoulders } from '@/hooks/useBoulders';
import { Box, AlertCircle, RefreshCw, Mountain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/components/SidebarContext';
import { cn } from '@/lib/utils';

const Sectors = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();
  const { isExpanded } = useSidebar();
  const { data: sectors, isLoading, error } = useSectorsTransformed(!authLoading);
  const { data: boulders } = useBoulders(!authLoading);

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#F9FAF9]">
        <div
          className={cn(
            'flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]',
            isExpanded ? 'md:ml-64' : 'md:ml-20',
          )}
        >
          <DashboardHeader />
          <main className="flex flex-1 items-center justify-center p-4 md:p-8">
            <div className="text-center">
              <p className="text-muted-foreground">Lade Sektoren...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Ein unbekannter Fehler ist aufgetreten.';

    const isNetworkError = errorMessage.toLowerCase().includes('network')
      || errorMessage.toLowerCase().includes('fetch')
      || errorMessage.toLowerCase().includes('auth')
      || errorMessage.toLowerCase().includes('permission');

    return (
      <div className="flex min-h-screen bg-[#F9FAF9]">
        <div
          className={cn(
            'flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]',
            isExpanded ? 'md:ml-64' : 'md:ml-20',
          )}
        >
          <DashboardHeader />
          <main className="flex flex-1 items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-md">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
                <AlertDescription className="mt-2">{errorMessage}</AlertDescription>
                {isNetworkError ? (
                  <AlertDescription className="mt-2 text-sm">
                    Bitte überprüfe deine Internetverbindung und versuche es erneut.
                  </AlertDescription>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['sectors'] });
                      queryClient.refetchQueries({ queryKey: ['sectors'] });
                    }}
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Erneut versuchen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    Seite neu laden
                  </Button>
                </div>
              </Alert>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9FAF9]">
      <div
        className={cn(
          'flex-1 flex flex-col mb-20 md:mb-0 w-full min-w-0 bg-[#F9FAF9]',
          isExpanded ? 'md:ml-64' : 'md:ml-20',
        )}
      >
        <DashboardHeader />

        <main className="flex-1 p-4 md:p-8">
          {!sectors || sectors.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Keine Sektoren gefunden.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sectors.map((sector) => {
                const activeBoulderCount = (boulders || [])
                  .filter((b) => b.sector_id === sector.id)
                  .filter((b: any) => (b as any).status === 'haengt')
                  .length;

                return (
                  <button
                    key={sector.id}
                    type="button"
                    className="group overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white text-left shadow-[0_12px_32px_rgba(19,17,43,0.06)] transition-transform active:scale-[0.995]"
                    onClick={() => handleViewBoulders(sector.name)}
                  >
                    <div className="relative aspect-[16/9] w-full bg-[#EEF2EA]">
                      {sector.imageUrl ? (
                        <img
                          src={sector.imageUrl}
                          alt={sector.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const img = e.currentTarget;
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
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Box className="h-12 w-12 text-[#AAB4A1]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-4 px-5 py-5">
                      <div className="min-w-0">
                        <div className="mb-4">
                          <span className="inline-flex max-w-full rounded-xl bg-[#68B63E] px-4 py-2 font-heading text-[1.35rem] uppercase tracking-[0.03em] text-white">
                            {sector.name}
                          </span>
                        </div>
                        <span className="inline-flex rounded-xl border border-[#DDE7DF] bg-white px-4 py-2 text-[0.95rem] font-semibold text-[#13112B]">
                          {activeBoulderCount} Boulder aktiv
                        </span>
                      </div>

                      <span
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#DDE7DF] bg-white px-4 py-3 text-[0.95rem] font-medium text-[#13112B] transition-colors group-active:bg-[#F5F8F1]"
                        aria-hidden="true"
                      >
                        <Mountain className="h-4.5 w-4.5" strokeWidth={1.8} />
                        Boulder
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Sectors;
