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

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  if (isLoading) {
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
                {sector.imageUrl && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={sector.imageUrl} 
                      alt={sector.name}
                      className="w-full h-full object-cover"
                    />
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
