import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSubmitCompetitionResult } from '@/hooks/useCompetitionResults';
import { CheckCircle, XCircle, MinusCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultInputProps {
  boulderNumber: number;
  boulderColor: string;
  participantId: string;
  currentResult?: {
    result_type: 'flash' | 'top' | 'zone' | 'none';
    attempts: number | null;
  } | null;
  onClose: () => void;
}

export const ResultInput = ({
  boulderNumber,
  boulderColor,
  participantId,
  currentResult,
  onClose,
}: ResultInputProps) => {
  const [selectedType, setSelectedType] = useState<'flash' | 'top' | 'zone' | 'none'>(
    currentResult?.result_type || 'none'
  );
  const [attempts, setAttempts] = useState<string>(
    currentResult?.attempts?.toString() || '2'
  );
  const submitResult = useSubmitCompetitionResult();

  const handleSubmit = async () => {
    // Ensure attempts is at least 2 for 'top' results
    const attemptsValue = selectedType === 'top' 
      ? Math.max(2, parseInt(attempts) || 2) 
      : null;
    
    await submitResult.mutateAsync({
      participant_id: participantId,
      boulder_number: boulderNumber,
      result_type: selectedType,
      attempts: attemptsValue,
    });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Boulder {boulderNumber} - {boulderColor}
          </DialogTitle>
          <DialogDescription>
            Wähle dein Ergebnis für diesen Boulder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Result Type Buttons */}
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

          {/* Attempts Input for Top */}
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

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitResult.isPending}
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            {submitResult.isPending ? 'Speichere...' : 'Ergebnis speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

