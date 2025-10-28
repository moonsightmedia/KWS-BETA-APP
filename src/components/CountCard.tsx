import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Users, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountCardProps {
  type: 'orders' | 'customers';
  count: number;
  subtitle: string;
}

export const CountCard = ({ type, count, subtitle }: CountCardProps) => {
  const Icon = type === 'orders' ? CheckCircle2 : Users;
  const label = type === 'orders' ? 'orders' : 'customers';

  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between mb-8">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            type === 'orders' ? "bg-muted" : "bg-sidebar-bg"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              type === 'orders' ? "text-foreground" : "text-white"
            )} />
          </div>
          
          <button className="w-10 h-10 rounded-full bg-sidebar-bg flex items-center justify-center hover:bg-sidebar-bg/90 transition-colors">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{count}</span>
            <span className="text-xl text-muted-foreground">{label}</span>
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
};
