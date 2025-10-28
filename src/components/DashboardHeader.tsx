import { Search, Settings, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
export const DashboardHeader = () => {
  const today = new Date();
  return <header className="bg-card border-b border-border px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-6">
          
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-10 w-64 bg-background border-border" />
          </div>
        </div>

        {/* Center: Date */}
        <div className="text-sm font-medium text-primary">
          {formatDate(today, 'EEEE, dd MMM', {
          locale: de
        })}
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5" />
          </Button>

          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-primary-foreground">KS</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>;
};