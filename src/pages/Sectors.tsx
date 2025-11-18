import { useEffect, useState, useRef } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useBoulders } from '@/hooks/useBoulders';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Box, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Sectors = () => {
  const navigate = useNavigate();
  const { data: sectors, isLoading, error } = useSectorsTransformed();
  const { data: boulders } = useBoulders();
  const { data: schedule } = useSectorSchedule();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const loadedImagesRef = useRef<Set<string>>(new Set()); // Track which images are already loaded

  // Preload images in background, but don't block page display
  // Page will show immediately when data is loaded, images will load progressively
  useEffect(() => {
    // If still loading data, wait
    if (isLoading) {
      setImagesLoaded(false);
      return;
    }

    // If no sectors data yet, wait
    if (!sectors) {
      setImagesLoaded(false);
      return;
    }

    // Show page immediately when data is loaded - don't wait for images
    setImagesLoaded(true);

    // If sectors array is empty, nothing to do
    if (sectors.length === 0) {
      return;
    }

    // Extract image URLs
    const imageUrls = sectors
      .map(s => s.imageUrl)
      .filter((url): url is string => !!url);
    
    // If no images to load, nothing to do
    if (imageUrls.length === 0) {
      return;
    }

    // Check which images are already loaded (from previous visits)
    const imagesToLoad = imageUrls.filter(url => !loadedImagesRef.current.has(url));
    
    // If all images are already loaded, nothing to do
    if (imagesToLoad.length === 0) {
      console.log('[Sectors] All images already loaded from previous visit');
      return;
    }

    // Start loading images in background (non-blocking)
    // Images will load progressively and display as they become available
    let loadedCount = imageUrls.length - imagesToLoad.length;
    let errorCount = 0;
    const totalImages = imageUrls.length;

    const checkAllLoaded = () => {
      if (loadedCount + errorCount >= totalImages) {
        console.log(`[Sectors] All images loaded: ${loadedCount} successful, ${errorCount} errors`);
      }
    };

    // Load only images that aren't already loaded
    // If images are already cached, onload fires synchronously
    imagesToLoad.forEach((imageUrl) => {
      const img = new Image();
      let handled = false;
      
      const handleLoad = () => {
        if (handled) return;
        handled = true;
        loadedImagesRef.current.add(imageUrl); // Mark as loaded
        loadedCount++;
        checkAllLoaded();
      };
      
      const handleError = () => {
        if (handled) return;
        handled = true;
        errorCount++;
        checkAllLoaded();
      };
      
      // Set up handlers BEFORE setting src
      img.onload = handleLoad;
      img.onerror = handleError;
      
      // Set src to start loading
      img.src = imageUrl;
      
      // Check if image is already loaded (cached) - this must be checked immediately after setting src
      // If the image was preloaded, it should be in the browser cache and img.complete will be true
      // We check both immediately and in the next tick to catch all cases
      if (img.complete && img.naturalWidth > 0) {
        // Image is already in cache and fully loaded - call immediately
        handleLoad();
      } else {
        // Also check in next tick in case the image loads very quickly
        // Use requestIdleCallback if available, otherwise setTimeout
        const checkCached = () => {
          if (img.complete && img.naturalWidth > 0 && !handled) {
            handleLoad();
          }
        };
        
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(checkCached, { timeout: 100 });
        } else {
          setTimeout(checkCached, 0);
        }
      }
    });
  }, [sectors, isLoading]);

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  // Show loading state only while data is loading
  // Images will load progressively and display as they become available
  if (isLoading || !imagesLoaded) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8">
            <div className="mb-8">
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-20 mb-20 md:mb-0">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler beim Laden der Daten</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'}
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
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
                      className="w-full h-full object-cover transition-opacity duration-300"
                      loading="eager"
                      decoding="async"
                      fetchpriority="high"
                      onLoad={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onError={(e) => {
                        console.error('[Sectors] Image load error for sector:', sector.name, 'URL:', e.currentTarget.src);
                        e.currentTarget.style.display = 'none';
                      }}
                      style={{ opacity: 0 }}
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
