import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { Statistics } from '@/types/boulder';

interface DifficultyDistributionChartProps {
  stats: Statistics;
}

export const DifficultyDistributionChart = ({ stats }: DifficultyDistributionChartProps) => {
  const data = Object.entries(stats.difficultyDistribution).map(([difficulty, count]) => ({
    name: `Grad ${difficulty}`,
    value: count,
  }));

  return (
    <Card className="shadow-soft col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold mb-1">Schwierigkeitsverteilung</CardTitle>
            <p className="text-xs text-muted-foreground">Aktuelle Boulder nach Schwierigkeit</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-sidebar-bg flex items-center justify-center hover:bg-sidebar-bg/90 transition-colors">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </button>
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
