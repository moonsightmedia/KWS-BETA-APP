import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnreadCount } from '@/hooks/useNotifications';
import { NotificationList } from './NotificationList';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  console.log('[NotificationCenter] Component rendered, open:', open);
  const { data: unreadCount = 0, isLoading, error } = useUnreadCount();
  console.log('[NotificationCenter] useUnreadCount result:', { unreadCount, isLoading, error: error?.message });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative p-1.5 text-[#13112B]/70 active:scale-95 transition-transform flex-shrink-0",
            unreadCount > 0 && "text-[#13112B]"
          )}
          aria-label="Benachrichtigungen"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold",
                "bg-[#E74C3C] text-white border-2 border-white rounded-full"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 border-[#E7F7E9] rounded-xl z-[150] bg-white"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col h-[500px] max-h-[80vh]">
          <div className="p-4 border-b border-[#E7F7E9]">
            <h3 className="text-lg font-semibold text-[#13112B]">Benachrichtigungen</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-[#13112B]/60 mt-1">
                {unreadCount} ungelesen{unreadCount !== 1 ? 'e' : ''}
              </p>
            )}
          </div>
          <NotificationList onNotificationClick={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

