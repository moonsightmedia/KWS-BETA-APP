import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sector } from '@/types/boulder';
import { MapPin } from 'lucide-react';

interface SectorCardProps {
  sector: Sector;
}

export const SectorCard = ({ sector }: SectorCardProps) => {
  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-lg">{sector.name}</span>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {sector.boulderCount} Boulder
          </Badge>
        </CardTitle>
      </CardHeader>
      {sector.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{sector.description}</p>
        </CardContent>
      )}
    </Card>
  );
};
