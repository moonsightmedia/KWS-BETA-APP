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
      "shadow-soft hover:shadow-medium transition-all duration-300 relative overflow-hidden",
      variant === 'primary' && "bg-gradient-primary border-0"
    )}>
      <CardContent className="pt-6 pb-6 flex flex-col h-full min-h-[120px]">
        <h3 className={cn(
          "text-sm font-medium mb-auto",
          variant === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {title}
        </h3>

        <div className="mt-auto">
          <div className={cn(
            "text-3xl font-bold",
            variant === 'primary' ? "text-primary-foreground" : "text-foreground"
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
                variant === 'primary' && "bg-white/20 text-primary-foreground hover:bg-white/30"
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3 mr-1 inline" />}
              {isNegative && <TrendingDown className="w-3 h-3 mr-1 inline" />}
              {Math.abs(change)}%
            </Badge>
          )}

          {subtitle && (
            <p className={cn(
              "text-xs mt-2",
              variant === 'primary' ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
