import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Sektor A', value: 25, color: 'hsl(var(--chart-orange))' },
  { name: 'Sektor B', value: 22, color: 'hsl(var(--chart-primary))' },
  { name: 'Sektor C', value: 20, color: 'hsl(var(--chart-yellow))' },
  { name: 'Sektor D', value: 18, color: 'hsl(var(--chart-red))' },
  { name: 'Sektor E', value: 15, color: 'hsl(var(--chart-green))' },
];

export const CategoryChart = () => {
  return (
    <Card className="shadow-soft w-full">
      <CardHeader>
        <div>
          <CardTitle className="text-xl font-semibold mb-1">Boulder nach Sektor</CardTitle>
          <p className="text-xs text-muted-foreground">Verteilung dieser Monat</p>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 max-w-full">
          <div className="flex-shrink-0">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 w-full max-w-[200px] space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
                <span className="font-medium flex-shrink-0">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
