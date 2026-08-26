import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Megaphone,
  MessageSquare,
  Mountain,
  Trophy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
  type Notification,
} from '@/hooks/useNotifications';

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
  const markAllAsRead = useMarkAllAsRead();

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
            'relative flex-shrink-0 transition-[background-color,color,transform] active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/45',
            variant === 'header'
              ? 'h-10 w-10 rounded-kws-control bg-secondary p-0 text-[#192436]/65 hover:bg-[#E8EEE8] hover:text-[#192436]'
              : 'size-icon rounded-kws-control p-1.5 text-[#192436]/65',
            unreadCount > 0 && 'text-[#192436]',
          )}
          aria-label="Benachrichtigungen"
        >
          <Bell className={cn(variant === 'header' ? 'h-4 w-4' : 'h-5 w-5')} />
          {unreadCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-kws-badge bg-[#C6453A] px-1 font-sans text-[9px] font-bold leading-5 text-white shadow-[0_2px_7px_rgba(198,69,58,0.28)]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={variant === 'header' ? 'end' : 'center'}
        side="bottom"
        sideOffset={12}
        className="w-[min(23rem,calc(100vw-1rem))] overflow-hidden rounded-kws-card border-0 bg-white p-2 shadow-[0_18px_44px_rgba(19,17,43,0.15)]"
      >
        <div className="flex items-start justify-between gap-3 px-2 pb-2 pt-1.5">
          <div className="min-w-0">
            <h3 className="font-sans text-base font-semibold tracking-[-0.02em] text-[#192436]">Benachrichtigungen</h3>
            <p className="mt-0.5 font-sans text-[11px] text-[#646C71]">
              {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'ungelesene Nachricht' : 'ungelesene Nachrichten'}` : 'Du bist auf dem neuesten Stand'}
            </p>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-kws-control bg-[#F1F5F1] px-2.5 font-sans text-[10px] font-semibold text-[#192436] transition-colors hover:bg-[#E7EDE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Alle gelesen
            </button>
          ) : null}
        </div>

        {visibleNotifications.length > 0 ? (
          <div className="max-h-[min(24rem,60vh)] space-y-1.5 overflow-y-auto rounded-kws-control bg-[#F7F9F7] p-1.5">
            {visibleNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-kws-control bg-white px-3 py-3 text-left shadow-[0_2px_9px_rgba(19,17,43,0.045)] transition-[background-color,transform,box-shadow] hover:shadow-[0_4px_13px_rgba(19,17,43,0.08)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                    !notification.read && 'bg-[#EFF8EF]',
                  )}
                >
                  <div className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-kws-control', notification.read ? 'bg-[#EEF1EE] text-[#646C71]' : 'bg-white text-primary')}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-sans text-xs font-semibold text-[#192436]">{notification.title}</p>
                      {!notification.read ? (
                        <span className="shrink-0 rounded-kws-badge bg-primary px-1.5 py-0.5 font-sans text-[8px] font-bold uppercase tracking-[0.08em] text-white">Neu</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 font-sans text-[11px] leading-relaxed text-[#646C71]">
                      {notification.message}
                    </p>
                    <p className="mt-1 font-sans text-[9px] font-medium text-[#646C71]/75">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>

                  {notification.action_url ? <ChevronRight className="mt-2.5 h-3.5 w-3.5 shrink-0 text-[#646C71]/65" /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-kws-control bg-[#F7F9F7] px-5 py-7 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-kws-control bg-white text-[#646C71] shadow-[0_2px_9px_rgba(19,17,43,0.05)]">
              <Bell className="h-4 w-4" />
            </div>
            <p className="mt-3 font-sans text-sm font-semibold text-[#192436]">Alles ruhig</p>
            <p className="mt-1 font-sans text-[11px] text-[#646C71]">Neue Hinweise findest du später hier.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate('/profile/notifications');
          }}
          className="mt-1 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-kws-control font-sans text-[11px] font-semibold text-[#192436] transition-colors hover:bg-[#F1F5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          Benachrichtigungen verwalten
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverContent>
    </Popover>
  );
};
