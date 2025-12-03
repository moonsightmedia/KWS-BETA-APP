import { useState } from 'react';
import { useCompetitionBoulders, useCreateCompetitionBoulder, useUpdateCompetitionBoulder, useDeleteCompetitionBoulder } from '@/hooks/useCompetitionBoulders';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { useColors } from '@/hooks/useColors';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';

export const CompetitionBoulderManagement = () => {
  const { data: competitionBoulders, isLoading } = useCompetitionBoulders();
  const { data: allBoulders } = useBouldersWithSectors();
  const { data: colors } = useColors();
  const createBoulder = useCreateCompetitionBoulder();
  const updateBoulder = useUpdateCompetitionBoulder();
  const deleteBoulder = useDeleteCompetitionBoulder();

  const [showDialog, setShowDialog] = useState(false);
  const [editingBoulder, setEditingBoulder] = useState<number | null>(null);
  const [boulderNumber, setBoulderNumber] = useState<string>('');
  const [selectedBoulderId, setSelectedBoulderId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  const handleCreate = () => {
    setEditingBoulder(null);
    setBoulderNumber('');
    setSelectedBoulderId('');
    setSelectedColor('');
    setShowDialog(true);
  };

  const handleEdit = (boulderNumber: number) => {
    const cb = competitionBoulders?.find((cb) => cb.boulder_number === boulderNumber);
    if (cb) {
      setEditingBoulder(boulderNumber);
      setBoulderNumber(cb.boulder_number.toString());
      setSelectedBoulderId(cb.boulder_id || '');
      setSelectedColor(cb.color);
      setShowDialog(true);
    }
  };

  const handleSubmit = async () => {
    const num = parseInt(boulderNumber);
    if (!num || num < 1) {
      alert('Boulder-Nummer muss mindestens 1 sein');
      return;
    }

    // Check if boulder number already exists (only if not editing the same boulder)
    const existingBoulder = competitionBoulders?.find(
      (cb) => cb.boulder_number === num && (!editingBoulder || cb.boulder_number !== editingBoulder)
    );
    if (existingBoulder) {
      alert(`Boulder-Nummer ${num} existiert bereits`);
      return;
    }

    if (!selectedColor) {
      alert('Bitte wähle eine Farbe');
      return;
    }

    if (editingBoulder) {
      const cb = competitionBoulders?.find((cb) => cb.boulder_number === editingBoulder);
      if (cb) {
        await updateBoulder.mutateAsync({
          id: cb.id,
          updates: {
            boulder_number: num,
            boulder_id: selectedBoulderId || null,
            color: selectedColor,
          },
        });
      }
    } else {
      await createBoulder.mutateAsync({
        boulder_number: num,
        boulder_id: selectedBoulderId || null,
        color: selectedColor,
      });
    }

    setShowDialog(false);
    setEditingBoulder(null);
    setBoulderNumber('');
    setSelectedBoulderId('');
    setSelectedColor('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Wettkampf-Boulder wirklich löschen?')) return;
    await deleteBoulder.mutateAsync(id);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
        <h2 className="text-2xl font-heading font-bold text-[#13112B]">Wettkampf-Boulder verwalten</h2>
        <Button 
          onClick={handleCreate} 
          className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Boulder hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : !competitionBoulders || competitionBoulders.length === 0 ? (
        <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center text-[#13112B]/60">
            <p>Noch keine Wettkampf-Boulder vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitionBoulders.map((cb) => {
            const boulder = allBoulders?.find((b) => b.id === cb.boulder_id);

            return (
              <Card key={cb.id} className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={getColorBackgroundStyle(cb.color, colors || [])}
                      >
                        {cb.boulder_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#13112B]">Boulder {cb.boulder_number}</div>
                        <div className="text-sm text-[#13112B]/60">{cb.color}</div>
                        {boulder && (
                          <div className="text-xs text-[#13112B]/60 truncate">
                            {boulder.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cb.boulder_number)}
                        className="h-9 w-9 rounded-xl hover:bg-[#E7F7E9]"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cb.id)}
                        className="h-9 w-9 rounded-xl hover:bg-red-50 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-heading font-bold text-[#13112B]">
              {editingBoulder ? 'Boulder bearbeiten' : 'Neuen Boulder hinzufügen'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="boulder-number" className="text-sm font-medium text-[#13112B]">
                Boulder-Nummer (min. 1) *
              </Label>
              <Input
                id="boulder-number"
                type="number"
                min="1"
                value={boulderNumber}
                onChange={(e) => setBoulderNumber(e.target.value)}
                className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                inputMode="numeric"
                placeholder="z.B. 1, 2, 3..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="boulder-select" className="text-sm font-medium text-[#13112B]">Boulder auswählen (optional)</Label>
              <Select value={selectedBoulderId || "none"} onValueChange={(value) => setSelectedBoulderId(value === "none" ? "" : value)}>
                <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9]">
                  <SelectValue placeholder="Boulder wählen" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E7F7E9]">
                  <SelectItem value="none">Kein Boulder</SelectItem>
                  {allBoulders?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} - {b.sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color-select" className="text-sm font-medium text-[#13112B]">Farbe *</Label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {colors?.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    className={cn(
                      "h-11 rounded-xl border-2 transition-all flex items-center justify-center",
                      selectedColor === c.name
                        ? "border-[#36B531] shadow-lg scale-110 ring-2 ring-[#36B531] ring-offset-2"
                        : "border-[#E7F7E9] hover:border-[#36B531]/50 hover:scale-105"
                    )}
                    style={getColorBackgroundStyle(c.name, colors)}
                    title={c.name}
                  >
                    {selectedColor === c.name && (
                      <div className="w-3 h-3 rounded-xl bg-white/90 shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-0 border-t border-[#E7F7E9]">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="flex-1 h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createBoulder.isPending || updateBoulder.isPending}
              className="flex-1 h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
            >
              {editingBoulder ? 'Aktualisieren' : 'Hinzufügen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

