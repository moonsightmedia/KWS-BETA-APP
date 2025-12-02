import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  variant?: 'default' | 'primary';
  subtitle?: string;
}

export const StatCard = ({ title, value, change, variant = 'default', subtitle }: StatCardProps) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className={cn(
      "shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-white border border-[#E7F7E9]",
      variant === 'primary' && "bg-[#36B531] border-0"
    )}>
      <CardContent className="pt-6 pb-6 flex flex-col h-full min-h-[120px]">
        <h3 className={cn(
          "text-sm font-medium mb-auto font-sans",
          variant === 'primary' ? "text-white/80" : "text-[#13112B]/60"
        )}>
          {title}
        </h3>

        <div className="mt-auto">
          <div className={cn(
            "text-3xl font-bold font-heading",
            variant === 'primary' ? "text-white" : "text-[#13112B]"
          )}>
            {value}
          </div>
          {change !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2 py-0.5 mt-1",
                isPositive && "bg-success/10 text-success hover:bg-success/20",
                isNegative && "bg-destructive/10 text-destructive hover:bg-destructive/20",
                variant === 'primary' && "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3 mr-1 inline" />}
              {isNegative && <TrendingDown className="w-3 h-3 mr-1 inline" />}
              {Math.abs(change)}%
            </Badge>
          )}

          {subtitle && (
            <p className={cn(
              "text-xs mt-2 font-sans",
              variant === 'primary' ? "text-white/70" : "text-[#13112B]/60"
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
