import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Boulder } from '@/types/boulder';
import { Video, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoulderCardProps {
  boulder: Boulder;
  onVideoClick?: (url: string) => void;
}

const difficultyLabels = {
  beginner: 'Anfänger',
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
  expert: 'Experte',
  elite: 'Elite',
};

const difficultyColors = {
  beginner: 'bg-difficulty-beginner text-white',
  easy: 'bg-difficulty-easy text-white',
  medium: 'bg-difficulty-medium text-white',
  hard: 'bg-difficulty-hard text-white',
  expert: 'bg-difficulty-expert text-white',
  elite: 'bg-difficulty-elite text-white',
};

export const BoulderCard = ({ boulder, onVideoClick }: BoulderCardProps) => {
  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-300 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">{boulder.name}</span>
          <Badge className={cn('text-xs px-3 py-1', difficultyColors[boulder.difficulty])}>
            {difficultyLabels[boulder.difficulty]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Sektor:</span>
          <span className="font-medium">{boulder.sector}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Farbe:</span>
          <Badge variant="outline" className="font-medium">
            {boulder.color}
          </Badge>
        </div>

        {boulder.note && (
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{boulder.note}</p>
          </div>
        )}

        {boulder.betaVideoUrl && (
          <Button
            variant="outline"
            className="w-full gap-2 hover:bg-primary hover:text-primary-foreground transition-smooth"
            onClick={() => onVideoClick?.(boulder.betaVideoUrl!)}
          >
            <Video className="w-4 h-4" />
            Beta Video ansehen
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
