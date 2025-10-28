import { Card, CardContent } from '@/components/ui/card';
import { Calendar, ArrowUpRight } from 'lucide-react';
import { Sector } from '@/types/boulder';
import { formatDate, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface NextSchraubterminCardProps {
  sector: Sector;
}

export const NextSchraubterminCard = ({ sector }: NextSchraubterminCardProps) => {
  const daysUntil = sector.nextSchraubtermin 
    ? differenceInDays(sector.nextSchraubtermin, new Date())
    : null;

  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-300">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          
          <button className="w-10 h-10 rounded-full bg-sidebar-bg flex items-center justify-center hover:bg-sidebar-bg/90 transition-colors">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Nächster Schraubtermin</div>
          <div className="text-2xl font-bold">{sector.name.split(' - ')[0]}</div>
          {sector.nextSchraubtermin && (
            <p className="text-sm text-muted-foreground">
              {formatDate(sector.nextSchraubtermin, 'dd. MMMM yyyy', { locale: de })}
              {daysUntil !== null && (
                <span className="ml-2 text-primary font-medium">
                  ({daysUntil === 0 ? 'Heute' : daysUntil === 1 ? 'Morgen' : `in ${daysUntil} Tagen`})
                </span>
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
