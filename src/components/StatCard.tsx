import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
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
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className={cn(
            "text-sm font-medium",
            variant === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {title}
          </h3>
          
          {variant === 'default' && (
            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              <ArrowUpRight className="w-4 h-4 text-foreground" />
            </button>
          )}
          
          {variant === 'primary' && (
            <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className={cn(
              "text-3xl font-bold mb-1",
              variant === 'primary' ? "text-primary-foreground" : "text-foreground"
            )}>
              {value}
            </div>
            {change !== undefined && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs px-2 py-0.5",
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
          </div>
        </div>

        {subtitle && (
          <p className={cn(
            "text-xs mt-3",
            variant === 'primary' ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
