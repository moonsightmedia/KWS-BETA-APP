import { Search, Settings, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

export const DashboardHeader = () => {
  const today = new Date();
  
  return (
    <header className="bg-card border-b border-border px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-sidebar-bg rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-primary rounded" />
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-10 w-64 bg-background border-border"
            />
          </div>
        </div>

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
