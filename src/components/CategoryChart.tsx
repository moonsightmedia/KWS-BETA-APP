import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Farbpalette für die Sektoren
const CHART_COLORS = [
  'hsl(var(--chart-orange))',
  'hsl(var(--chart-primary))',
  'hsl(var(--chart-yellow))',
  'hsl(var(--chart-red))',
  'hsl(var(--chart-green))',
  'hsl(var(--chart-blue))',
  'hsl(var(--chart-purple))',
  'hsl(var(--chart-pink))',
];

export const CategoryChart = () => {
  const { data: boulders, isLoading: isLoadingBoulders } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsTransformed();
  const isLoading = isLoadingBoulders || isLoadingSectors;

  // Berechne Verteilung der Boulder nach Sektoren
  const chartData = useMemo(() => {
    if (!boulders || !sectors || boulders.length === 0) {
      return [];
    }

    // Gruppiere Boulder nach Sektoren
    const sectorCounts: Record<string, number> = {};
    boulders.forEach(boulder => {
      sectorCounts[boulder.sector] = (sectorCounts[boulder.sector] || 0) + 1;
    });

    // Sortiere Sektoren nach Anzahl der Boulder (absteigend)
    const sortedSectors = sectors
      .filter(sector => sectorCounts[sector.name] > 0) // Nur Sektoren mit Bouldern
      .map(sector => ({
        name: sector.name,
        count: sectorCounts[sector.name] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const total = boulders.length;

    // Erstelle Chart-Daten mit Prozentwerten
    return sortedSectors.map((sector, index) => {
      const percentage = total > 0 ? Math.round((sector.count / total) * 100) : 0;
      return {
        name: sector.name,
        value: percentage,
        count: sector.count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [boulders, sectors]);

  if (isLoading) {
    return (
      <Card className="shadow-soft w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
            <Skeleton className="w-48 h-48 rounded-full" />
            <div className="flex-1 w-full xl:max-w-[220px] space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Wenn keine Daten vorhanden
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="shadow-soft w-full">
        <CardHeader>
          <div>
            <CardTitle className="text-xl font-semibold mb-1">Boulder nach Sektor</CardTitle>
            <p className="text-xs text-muted-foreground">Aktuelle Verteilung</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft w-full">
      <CardHeader>
        <div>
          <CardTitle className="text-xl font-semibold mb-1">Boulder nach Sektor</CardTitle>
          <p className="text-xs text-muted-foreground">Aktuelle Verteilung</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col xl:flex-row items-center xl:items-center justify-between gap-6 xl:gap-8 max-w-full">
          <div className="flex-shrink-0 mx-auto w-[180px]">
            <ResponsiveContainer width="100%" aspect={1}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 w-full xl:max-w-[220px] space-y-3">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-medium">{item.value}%</span>
                  <span className="text-xs text-muted-foreground">({item.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
