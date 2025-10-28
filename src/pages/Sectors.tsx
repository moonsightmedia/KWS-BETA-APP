import { DashboardHeader } from '@/components/DashboardHeader';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockSectors } from '@/data/mockData';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Box, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Sectors = () => {
  const navigate = useNavigate();

  const handleViewBoulders = (sectorName: string) => {
    navigate(`/boulders?sector=${encodeURIComponent(sectorName)}`);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Sektoren</h1>
            <p className="text-muted-foreground">Übersicht aller Kletterbereiche</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockSectors.map((sector) => (
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
                      {sector.boulderCount}
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
                        {sector.nextSchraubtermin && formatDate(sector.nextSchraubtermin, 'dd. MMM yyyy', { locale: de })}
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
        </main>
      </div>
    </div>
  );
};

export default Sectors;
