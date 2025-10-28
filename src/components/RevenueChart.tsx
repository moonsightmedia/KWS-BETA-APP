import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight } from 'lucide-react';

const data = [
  { name: '1 AUG', value: 23000 },
  { name: '2 AUG', value: 9000 },
  { name: '3 AUG', value: 14867 },
  { name: '4 AUG', value: 11000 },
  { name: '5 AUG', value: 15000 },
  { name: '6 AUG', value: 21000 },
  { name: '7 AUG', value: 25000 },
  { name: '8 AUG', value: 20000 },
];

export const RevenueChart = () => {
  return (
    <Card className="shadow-soft col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold mb-1">Revenue</CardTitle>
            <p className="text-xs text-muted-foreground">This month vs last</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-sidebar-bg flex items-center justify-center hover:bg-sidebar-bg/90 transition-colors">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barSize={32}>
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
              tickFormatter={(value) => `$ ${value / 1000}k`}
            />
            <Bar dataKey="value" radius={[12, 12, 12, 12]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 2 ? 'hsl(var(--primary))' : 'hsl(var(--primary))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
