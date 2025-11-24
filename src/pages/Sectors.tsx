import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useBoulders } from '@/hooks/useBoulders';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Box, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

const Sectors = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sectors, isLoading, error } = useSectorsTransformed();
  const { data: boulders } = useBoulders();
  const { data: schedule } = useSectorSchedule();

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Lade Sektoren...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    // Get more detailed error information
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Ein unbekannter Fehler ist aufgetreten.';
    
    // Check if it's a network/auth error
    const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                         errorMessage.toLowerCase().includes('fetch') ||
                         errorMessage.toLowerCase().includes('auth') ||
                         errorMessage.toLowerCase().includes('permission');
    
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
            <div className="w-full max-w-md">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
                <AlertDescription className="mt-2">
                  {errorMessage}
                </AlertDescription>
                {isNetworkError && (
                  <AlertDescription className="mt-2 text-sm">
                    Bitte überprüfe deine Internetverbindung und versuche es erneut.
                  </AlertDescription>
                )}
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Refetch sectors data
                      queryClient.invalidateQueries({ queryKey: ['sectors'] });
                      queryClient.refetchQueries({ queryKey: ['sectors'] });
                    }}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
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
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 font-teko tracking-wide">Sektoren</h1>
            <p className="text-muted-foreground">Übersicht aller Kletterbereiche</p>
          </div>

          {!sectors || sectors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Keine Sektoren gefunden.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sectors.map((sector) => (
              <Card key={sector.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                {sector.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img 
                      src={sector.imageUrl} 
                      alt={sector.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      decoding="async"
                      fetchpriority="high"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const img = e.currentTarget;
                        // Retry loading the image
                        const retryCount = parseInt(img.getAttribute('data-retry-count') || '0');
                        if (retryCount < 2) {
                          const delay = 1000 * Math.pow(2, retryCount);
                          img.setAttribute('data-retry-count', String(retryCount + 1));
                          setTimeout(() => {
                            const newSrc = img.src;
                            img.src = '';
                            img.src = newSrc;
                          }, delay);
                        } else {
                          img.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted flex items-center justify-center">
                    <Box className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{sector.name}</CardTitle>
                      <CardDescription>{sector.description}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      <Box className="w-3 h-3 mr-1" />
                      {(() => {
                        const count = (boulders || [])
                          .filter(b => b.sector_id === sector.id)
                          .filter((b: any) => (b as any).status === 'haengt')
                          .length;
                        return count;
                      })()}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Letzter Schraubtermin:</span>
                      <span className="font-medium text-foreground">
                        {sector.lastSchraubtermin && formatDate(sector.lastSchraubtermin, 'dd. MMM yyyy', { locale: de })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Nächster Schraubtermin:</span>
                      <span className="font-medium text-primary">
                        {(() => {
                          const next = (schedule || [])
                            .filter(s => s.sector_id === sector.id && new Date(s.scheduled_at) > new Date())
                            .sort((a,b)=> new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
                          return next ? formatDate(new Date(next.scheduled_at), 'dd. MMM yyyy', { locale: de }) : '';
                        })()}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleViewBoulders(sector.name)}
                  >
                    Boulder anzeigen
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Sectors;
