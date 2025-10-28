import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistics } from '@/types/boulder';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DifficultyChartProps {
  stats: Statistics;
}

const difficultyLabels = {
  beginner: 'Anfänger',
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
  expert: 'Experte',
  elite: 'Elite',
};

export const DifficultyChart = ({ stats }: DifficultyChartProps) => {
  const data = Object.entries(stats.difficultyDistribution).map(([key, value]) => ({
    name: difficultyLabels[key as keyof typeof difficultyLabels],
    anzahl: value,
  }));

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Schwierigkeitsverteilung</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Bar 
              dataKey="anzahl" 
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
