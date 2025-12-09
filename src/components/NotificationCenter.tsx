import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnreadCount, useMarkAllAsRead } from '@/hooks/useNotifications';
import { NotificationList } from './NotificationList';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0, isLoading, error } = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();

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
        className="w-[calc(100vw-1rem)] sm:w-[400px] p-0 border-[#E7F7E9] rounded-xl z-[150] bg-white mx-auto flex flex-col overflow-hidden"
        align="center"
        side="bottom"
        sideOffset={8}
        style={{
          height: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 12rem)',
          maxHeight: '600px',
          marginBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="p-4 border-b border-[#E7F7E9] flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#13112B]">Benachrichtigungen</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-[#13112B]/60 mt-1">
                  {unreadCount} ungelesen{unreadCount !== 1 ? 'e' : ''}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="h-10 text-xs px-3 touch-manipulation flex-shrink-0"
              >
                <Check className="w-4 h-4 mr-1.5" />
                <span className="text-xs">Alle gelesen</span>
              </Button>
            )}
          </div>
        </div>
        <NotificationList onNotificationClick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};

