import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Megaphone, MessageSquare, Mountain, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications, useUnreadCount, useMarkAsRead, type Notification } from '@/hooks/useNotifications';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'boulder_new':
      return Mountain;
    case 'competition_update':
    case 'competition_result':
    case 'competition_leaderboard_change':
      return Trophy;
    case 'feedback_reply':
      return MessageSquare;
    case 'admin_announcement':
      return Megaphone;
    case 'schedule_reminder':
      return CalendarDays;
    default:
      return Bell;
  }
};

export const NotificationCenter = ({
  variant = 'default',
}: {
  variant?: 'default' | 'header';
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();

  const visibleNotifications = notifications.slice(0, 8);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    setOpen(false);

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'relative flex-shrink-0 active:scale-95 transition-transform',
            variant === 'header'
              ? 'h-10 w-10 rounded-xl bg-secondary p-0 text-muted-foreground hover:bg-secondary'
              : 'size-icon p-1.5 text-[#13112B]/70',
            unreadCount > 0 && 'text-[#13112B]',
          )}
          aria-label="Benachrichtigungen"
        >
          <Bell className={cn(variant === 'header' ? 'h-4 w-4' : 'h-5 w-5')} />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                'absolute flex items-center justify-center p-0 text-xs font-bold',
                variant === 'header'
                  ? '-right-1 -top-1 h-6 min-w-6 rounded-full border-2 border-background bg-[#E74C3C] px-1 text-white'
                  : '-top-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-[#E74C3C] text-white',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={variant === 'header' ? 'end' : 'center'}
        side="bottom"
        sideOffset={8}
        className="w-80 p-0 rounded-2xl overflow-hidden border border-border bg-card shadow-[0_16px_32px_rgba(19,17,43,0.10)]"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Benachrichtigungen</h3>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/profile/notifications');
            }}
            className="text-[10px] text-primary font-semibold"
          >
            Einstellungen
          </button>
        </div>

        {visibleNotifications.length > 0 ? (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {visibleNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary',
                    !notification.read && 'bg-primary/5',
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{notification.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>

                  {!notification.read ? (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Keine Benachrichtigungen</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
