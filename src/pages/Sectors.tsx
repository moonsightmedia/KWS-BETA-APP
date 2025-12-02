import { DashboardHeader } from '@/components/DashboardHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useBoulders } from '@/hooks/useBoulders';
import { Box, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

const Sectors = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sectors, isLoading, error } = useSectorsTransformed();
  const { data: boulders } = useBoulders();

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAF9] flex">
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
      <div className="min-h-screen bg-[#F9FAF9] flex">
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
                    <RefreshCw className="w-5 h-5 mr-2" />
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
    <div className="min-h-screen bg-[#F9FAF9] flex">
      <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 md:p-8">
          {!sectors || sectors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Keine Sektoren gefunden.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {sectors.map((sector) => {
                const activeBoulderCount = (boulders || [])
                  .filter(b => b.sector_id === sector.id)
                  .filter((b: any) => (b as any).status === 'haengt')
                  .length;

                return (
                <Card 
                  key={sector.id} 
                  className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewBoulders(sector.name)}
                >
                  {sector.imageUrl ? (
                    <div className="aspect-video w-full bg-gray-200 relative overflow-hidden">
                      <img 
                        src={sector.imageUrl} 
                        alt={sector.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-3 left-4 text-white font-heading text-xl">{sector.name.toUpperCase()}</div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gray-200 relative flex items-center justify-center">
                      <Box className="w-12 h-12 text-gray-400" />
                      <div className="absolute bottom-3 left-4 text-[#13112B] font-heading text-xl">{sector.name.toUpperCase()}</div>
                    </div>
                  )}
                  
                  <div className="p-3 flex justify-between items-center">
                    <Badge variant="secondary" className="text-xs">
                      <Box className="w-3 h-3 mr-1" />
                      {activeBoulderCount} Boulder aktiv
                    </Badge>
                    <button 
                      className="text-xs bg-[#F9FAF9] border border-[#E7F7E9] px-2 py-1 rounded-md text-[#13112B] hover:bg-[#E7F7E9] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewBoulders(sector.name);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </Card>
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
