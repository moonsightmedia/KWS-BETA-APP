import { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle, MinusCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompetitionBoulders } from '@/hooks/useCompetitionBoulders';

interface ParticipantDetailsProps {
  participant: LeaderboardEntry;
  onClose: () => void;
  isAdmin?: boolean;
}

const RESULT_ICONS = {
  flash: Zap,
  top: CheckCircle,
  zone: MinusCircle,
  none: XCircle,
};

const RESULT_COLORS = {
  flash: 'bg-green-100 text-green-800 border-green-300',
  top: 'bg-blue-100 text-blue-800 border-blue-300',
  zone: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  none: 'bg-gray-100 text-gray-800 border-gray-300',
};

const RESULT_LABELS = {
  flash: 'Flash',
  top: 'Top',
  zone: 'Zone',
  none: 'Nicht geschafft',
};

export const ParticipantDetails = ({ participant, onClose, isAdmin }: ParticipantDetailsProps) => {
  const { data: competitionBoulders } = useCompetitionBoulders();
  const maxBoulderNumber = competitionBoulders?.length 
    ? Math.max(...competitionBoulders.map(cb => cb.boulder_number))
    : 20;
  
  // Create a map of results by boulder number
  const resultsMap = new Map(
    participant.results.map((r) => [r.boulder_number, r])
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-full max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{participant.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Gesamtpunkte</div>
                  <div className="text-2xl font-bold text-primary">{participant.total_points}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Boulder abgeschlossen</div>
                  <div className="text-2xl font-bold">
                    {participant.results.filter((r) => r.result_type !== 'none').length} / {maxBoulderNumber}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Boulder Results */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Boulder-Ergebnisse</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: maxBoulderNumber }, (_, i) => i + 1).map((boulderNum) => {
                const result = resultsMap.get(boulderNum);
                const Icon = result ? RESULT_ICONS[result.result_type] : XCircle;
                const colorClass = result ? RESULT_COLORS[result.result_type] : RESULT_COLORS.none;
                const label = result ? RESULT_LABELS[result.result_type] : 'Nicht eingetragen';

                return (
                  <Card key={boulderNum} className={cn('p-3', !result && 'opacity-50')}>
                    <CardContent className="p-0">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-semibold text-muted-foreground">
                          #{boulderNum}
                        </div>
                        <Icon className={cn('h-6 w-6', result ? 'text-primary' : 'text-muted')} />
                        <Badge variant="outline" className={cn('text-xs', colorClass)}>
                          {label}
                        </Badge>
                        {result?.result_type === 'top' && result.attempts && (
                          <div className="text-xs text-muted-foreground">
                            {result.attempts} Versuch{result.attempts > 1 ? 'e' : ''}
                          </div>
                        )}
                        {result && (
                          <div className="text-xs font-semibold">{result.points} Pkt.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

