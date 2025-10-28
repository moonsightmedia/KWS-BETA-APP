import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Statistics } from '@/types/boulder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockBoulders, mockSectors } from '@/data/mockData';
import { useState } from 'react';

interface DifficultyDistributionChartProps {
  stats: Statistics;
  avgDifficulty: string;
}

export const DifficultyDistributionChart = ({ stats, avgDifficulty }: DifficultyDistributionChartProps) => {
  const [selectedSector, setSelectedSector] = useState<string>('all');
  
  // Filtere Boulder nach Sektor
  const filteredBoulders = selectedSector === 'all' 
    ? mockBoulders 
    : mockBoulders.filter(b => b.sector === selectedSector);
  
  // Berechne Verteilung für gefilterte Boulder
  const filteredDistribution: Record<number, number> = {};
  for (let i = 1; i <= 8; i++) {
    filteredDistribution[i] = filteredBoulders.filter(b => b.difficulty === i).length;
  }
  
  // Berechne durchschnittliche Schwierigkeit für gefilterte Boulder
  const filteredAvg = filteredBoulders.length > 0
    ? (filteredBoulders.reduce((sum, b) => sum + b.difficulty, 0) / filteredBoulders.length).toFixed(1)
    : '0.0';
  
  const data = Object.entries(filteredDistribution).map(([difficulty, count]) => ({
    name: `Grad ${difficulty}`,
    value: count,
  }));

  return (
    <Card className="shadow-soft col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold mb-1">
              Schwierigkeitsverteilung
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                Ø {selectedSector === 'all' ? avgDifficulty : filteredAvg}
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {filteredBoulders.length} Boulder nach Schwierigkeit
            </p>
          </div>
          
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Sektoren</SelectItem>
              {mockSectors.map((sector) => (
                <SelectItem key={sector.id} value={sector.name}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barSize={48}>
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
