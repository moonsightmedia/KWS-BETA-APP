import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistics } from '@/types/boulder';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ColorDistributionProps {
  stats: Statistics;
}

const COLORS: Record<string, string> = {
  'Grün': '#22c55e',
  'Gelb': '#eab308',
  'Blau': '#3b82f6',
  'Orange': '#f97316',
  'Rot': '#ef4444',
  'Schwarz': '#1f2937',
  'Weiß': '#e5e7eb',
  'Lila': '#a855f7',
};

export const ColorDistribution = ({ stats }: ColorDistributionProps) => {
  const data = Object.entries(stats.colorDistribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: key,
      value: value,
    }));

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Farbverteilung</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
