import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowUpRight } from 'lucide-react';

const data = [
  { name: 'Sektor A', value: 25, color: 'hsl(var(--chart-orange))' },
  { name: 'Sektor B', value: 22, color: 'hsl(var(--chart-primary))' },
  { name: 'Sektor C', value: 20, color: 'hsl(var(--chart-yellow))' },
  { name: 'Sektor D', value: 18, color: 'hsl(var(--chart-red))' },
  { name: 'Sektor E', value: 15, color: 'hsl(var(--chart-green))' },
];

export const CategoryChart = () => {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold mb-1">Boulder nach Sektor</CardTitle>
            <p className="text-xs text-muted-foreground">Verteilung dieser Monat</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-sidebar-bg flex items-center justify-center hover:bg-sidebar-bg/90 transition-colors">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
