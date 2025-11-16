import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Statistics } from '@/types/boulder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useState, useMemo } from 'react';

interface DifficultyDistributionChartProps {
  stats: Statistics;
  avgDifficulty: string;
}

export const DifficultyDistributionChart = ({ stats, avgDifficulty }: DifficultyDistributionChartProps) => {
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const { data: boulders } = useBouldersWithSectors();
  const { data: sectors } = useSectorsTransformed();
  
  // Filtere Boulder nach Sektor und Status (nur hängende)
  const filteredBoulders = useMemo(() => {
    if (!boulders) return [];
    // Zuerst nur hängende Boulder filtern
    const hangingBoulders = boulders.filter(b => b.status === 'haengt');
    // Dann nach Sektor filtern (Boulder erscheint, wenn er in einem der beiden Sektoren ist)
    if (selectedSector === 'all') {
      return hangingBoulders;
    }
    return hangingBoulders.filter(b => {
      const inSector1 = b.sector === selectedSector;
      const inSector2 = b.sector2 === selectedSector;
      return inSector1 || inSector2;
    });
  }, [boulders, selectedSector]);
  
  // Berechne Verteilung für gefilterte Boulder - immer alle 1-8 + "?" anzeigen
  const filteredDistribution = useMemo(() => {
    const distribution: Record<number | null, number> = {
      null: filteredBoulders.filter(b => b.difficulty === null).length, // "?" (unbewertet)
    };
    for (let i = 1; i <= 8; i++) {
      distribution[i] = filteredBoulders.filter(b => b.difficulty === i).length;
    }
    return distribution;
  }, [filteredBoulders]);
  
  // Berechne durchschnittliche Schwierigkeit für gefilterte Boulder (ignoriere "?" = null)
  const filteredAvg = useMemo(() => {
    const ratedBoulders = filteredBoulders.filter(b => b.difficulty !== null);
    if (ratedBoulders.length === 0) return '0.0';
    return (ratedBoulders.reduce((sum, b) => sum + (b.difficulty || 0), 0) / ratedBoulders.length).toFixed(1);
  }, [filteredBoulders]);
  
  // Stelle sicher, dass alle Schwierigkeiten "?" + 1-8 angezeigt werden, auch wenn count = 0
  const data = [
    {
      name: '?',
      value: filteredDistribution[null] || 0,
    },
    ...Array.from({ length: 8 }, (_, i) => {
      const difficulty = i + 1;
      return {
        name: String(difficulty),
        value: filteredDistribution[difficulty] || 0,
      };
    }),
  ];

  return (
    <Card className="shadow-soft lg:col-span-2 w-full">
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold mb-1">
              Schwierigkeitsverteilung
              <span className="ml-2 md:ml-3 text-sm font-normal text-muted-foreground">
                Ø {selectedSector === 'all' ? avgDifficulty : filteredAvg}
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {filteredBoulders.length} Boulder nach Schwierigkeit
            </p>
          </div>
          
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Alle Sektoren</SelectItem>
              {sectors?.map((sector) => (
                <SelectItem key={sector.id} value={sector.name}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-hidden">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barSize={48} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              allowDecimals={false}
            />
            <Bar dataKey="value" radius={[12, 12, 12, 12]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill="hsl(var(--primary))"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
