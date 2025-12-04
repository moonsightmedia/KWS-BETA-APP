import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompetitionBoulders } from '@/hooks/useCompetitionBoulders';
import { useCompetitionResults } from '@/hooks/useCompetitionResults';
import { useSubmitCompetitionResult } from '@/hooks/useCompetitionResults';
import { CheckCircle, XCircle, MinusCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminResultEditDialogProps {
  participant: LeaderboardEntry;
  onClose: () => void;
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

export const AdminResultEditDialog = ({ participant, onClose }: AdminResultEditDialogProps) => {
  const { data: competitionBoulders } = useCompetitionBoulders();
  const { data: results, refetch } = useCompetitionResults(participant.participant_id);
  const submitResult = useSubmitCompetitionResult();
  const [editingBoulder, setEditingBoulder] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'flash' | 'top' | 'zone' | 'none'>('none');
  const [attempts, setAttempts] = useState<string>('2');

  const maxBoulderNumber = competitionBoulders?.length
    ? Math.max(...competitionBoulders.map(cb => cb.boulder_number))
    : 0;

  const resultsMap = new Map(
    results?.map((r) => [r.boulder_number, r]) || []
  );

  const handleBoulderClick = (boulderNum: number) => {
    const existingResult = resultsMap.get(boulderNum);
    setEditingBoulder(boulderNum);
    if (existingResult) {
      setSelectedType(existingResult.result_type);
      setAttempts(existingResult.attempts?.toString() || '2');
    } else {
      setSelectedType('none');
      setAttempts('2');
    }
  };

  const handleSave = async () => {
    if (!editingBoulder) return;

    try {
      // Ensure attempts is at least 2 for 'top' results
      const attemptsValue = selectedType === 'top' 
        ? Math.max(2, parseInt(attempts) || 2) 
        : null;
      
      await submitResult.mutateAsync({
        participant_id: participant.participant_id,
        boulder_number: editingBoulder,
        result_type: selectedType,
        attempts: attemptsValue,
      });
      await refetch();
      setEditingBoulder(null);
      toast.success('Ergebnis aktualisiert');
    } catch (error: any) {
      toast.error('Fehler beim Speichern: ' + error.message);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-full max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Ergebnisse bearbeiten: {participant.name}</DialogTitle>
          <DialogDescription>
            Klicke auf einen Boulder, um das Ergebnis zu bearbeiten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {editingBoulder ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Boulder {editingBoulder} bearbeiten</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingBoulder(null)}>
                  Abbrechen
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Ergebnis wählen</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedType === 'flash' ? 'default' : 'outline'}
                    size="lg"
                    className={cn(
                      'h-16 flex flex-col items-center justify-center gap-1',
                      selectedType === 'flash' && 'bg-green-600 hover:bg-green-700'
                    )}
                    onClick={() => setSelectedType('flash')}
                  >
                    <Zap className="h-6 w-6" />
                    <span className="text-sm font-medium">Flash</span>
                    <span className="text-xs opacity-80">11 Punkte</span>
                  </Button>

                  <Button
                    variant={selectedType === 'top' ? 'default' : 'outline'}
                    size="lg"
                    className={cn(
                      'h-16 flex flex-col items-center justify-center gap-1',
                      selectedType === 'top' && 'bg-blue-600 hover:bg-blue-700'
                    )}
                    onClick={() => setSelectedType('top')}
                  >
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-sm font-medium">Top</span>
                    <span className="text-xs opacity-80">10 - 0.5/Versuch</span>
                  </Button>

                  <Button
                    variant={selectedType === 'zone' ? 'default' : 'outline'}
                    size="lg"
                    className={cn(
                      'h-16 flex flex-col items-center justify-center gap-1',
                      selectedType === 'zone' && 'bg-yellow-600 hover:bg-yellow-700'
                    )}
                    onClick={() => setSelectedType('zone')}
                  >
                    <MinusCircle className="h-6 w-6" />
                    <span className="text-sm font-medium">Zone</span>
                    <span className="text-xs opacity-80">3 Punkte</span>
                  </Button>

                  <Button
                    variant={selectedType === 'none' ? 'default' : 'outline'}
                    size="lg"
                    className={cn(
                      'h-16 flex flex-col items-center justify-center gap-1',
                      selectedType === 'none' && 'bg-gray-600 hover:bg-gray-700'
                    )}
                    onClick={() => setSelectedType('none')}
                  >
                    <XCircle className="h-6 w-6" />
                    <span className="text-sm font-medium">Nicht geschafft</span>
                    <span className="text-xs opacity-80">0 Punkte</span>
                  </Button>
                </div>
              </div>

              {selectedType === 'top' && (
                <div className="space-y-2">
                  <Label htmlFor="attempts" className="text-base font-semibold">
                    Anzahl Versuche
                  </Label>
                  <Input
                    id="attempts"
                    type="number"
                    min="2"
                    value={attempts}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Ensure minimum is 2
                      if (value && parseInt(value) < 2) {
                        setAttempts('2');
                      } else {
                        setAttempts(value);
                      }
                    }}
                    className="h-12 text-lg"
                    inputMode="numeric"
                    placeholder="1"
                  />
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={submitResult.isPending}
                size="lg"
                className="w-full h-12 text-base font-semibold"
              >
                {submitResult.isPending ? 'Speichere...' : 'Ergebnis speichern'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: maxBoulderNumber }, (_, i) => i + 1).map((boulderNum) => {
                const result = resultsMap.get(boulderNum);
                const Icon = result ? RESULT_ICONS[result.result_type] : XCircle;
                const colorClass = result ? RESULT_COLORS[result.result_type] : RESULT_COLORS.none;
                const label = result ? RESULT_LABELS[result.result_type] : 'Nicht eingetragen';

                return (
                  <Card
                    key={boulderNum}
                    className={cn('p-3 cursor-pointer hover:bg-muted/50 transition-colors', !result && 'opacity-50')}
                    onClick={() => handleBoulderClick(boulderNum)}
                  >
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

