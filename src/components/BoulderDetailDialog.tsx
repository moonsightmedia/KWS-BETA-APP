import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Boulder } from '@/types/boulder';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Palette, FileText } from 'lucide-react';

interface BoulderDetailDialogProps {
  boulder: Boulder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const difficultyColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-green-600',
  3: 'bg-yellow-500',
  4: 'bg-yellow-600',
  5: 'bg-orange-500',
  6: 'bg-orange-600',
  7: 'bg-red-500',
  8: 'bg-red-700',
};

export const BoulderDetailDialog = ({ boulder, open, onOpenChange }: BoulderDetailDialogProps) => {
  if (!boulder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between mb-2">
            <DialogTitle className="text-2xl">{boulder.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${difficultyColors[boulder.difficulty]} text-white border-0`}>
                Schwierigkeit {boulder.difficulty}
              </Badge>
              <Badge variant="secondary">{boulder.color}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Section */}
          {boulder.betaVideoUrl && (
            <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
              <video 
                controls 
                className="w-full h-full"
                poster="/placeholder.svg"
              >
                <source src={boulder.betaVideoUrl} type="video/mp4" />
                Dein Browser unterstützt keine Videos.
              </video>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Sektor</p>
                <p className="font-medium">{boulder.sector}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Palette className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Farbe</p>
                <p className="font-medium">{boulder.color}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Erstellt am</p>
                <p className="font-medium">
                  {formatDate(boulder.createdAt, 'dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className={`w-5 h-5 rounded ${difficultyColors[boulder.difficulty]}`} />
              <div>
                <p className="text-sm text-muted-foreground">Schwierigkeit</p>
                <p className="font-medium">{boulder.difficulty} / 8</p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {boulder.note && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Notizen</p>
                  <p className="text-muted-foreground">{boulder.note}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
