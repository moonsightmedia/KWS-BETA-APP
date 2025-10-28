import { Settings, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

export const DashboardHeader = () => {
  const today = new Date();
  
  return (
    <header className="bg-card border-b border-border px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Center: Date */}
        <div className="text-sm font-medium text-primary">
          {formatDate(today, 'EEEE, dd MMM', { locale: de })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
