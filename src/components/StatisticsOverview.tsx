import { Calendar, TrendingUp, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Statistics } from '@/types/boulder';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface StatisticsOverviewProps {
  stats: Statistics;
}

export const StatisticsOverview = ({ stats }: StatisticsOverviewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-stat">
              <Hash className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Aktive Boulder</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalBoulders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-stat">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Letztes Update</p>
              <p className="text-xl font-bold text-foreground">
                {formatDistanceToNow(stats.lastUpdate, { addSuffix: true, locale: de })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-stat">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Neue Boulder</p>
              <p className="text-3xl font-bold text-primary">{stats.newBouldersCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
