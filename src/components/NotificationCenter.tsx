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
  Settings2,
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

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'competition_update':
    case 'competition_result':
    case 'competition_leaderboard_change':
      return 'bg-[#FFF4D8] text-[#A96C00]';
    case 'feedback_reply':
      return 'bg-[#EAF2FF] text-[#3569A8]';
    case 'admin_announcement':
      return 'bg-[#F4ECFF] text-[#7650A8]';
    case 'schedule_reminder':
      return 'bg-[#FFF0E8] text-[#B65B2B]';
    default:
      return 'bg-primary/10 text-primary';
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
              ? 'h-10 w-10 rounded-kws-control bg-secondary p-0 text-[#314438] hover:bg-primary/10 hover:text-[#19371F]'
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
        className="w-[min(25rem,calc(100vw-1rem))] overflow-hidden rounded-[22px] border border-white/70 bg-[#F3F7F3] p-0 shadow-[0_24px_60px_rgba(19,36,24,0.20)]"
      >
        <div className="flex items-center justify-between gap-3 bg-sidebar-bg px-4 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-white/10 text-primary ring-1 ring-white/10">
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="font-sans text-sm font-semibold tracking-[-0.01em]">Benachrichtigungen</h3>
              <p className="mt-0.5 truncate font-sans text-[10px] text-white/55">
                {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'neuer Hinweis' : 'neue Hinweise'}` : 'Alles auf dem neuesten Stand'}
              </p>
            </div>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-kws-control bg-white/10 px-2.5 font-sans text-[10px] font-semibold text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Alle gelesen</span>
            </button>
          ) : null}
        </div>

        {visibleNotifications.length > 0 ? (
          <div className="kws-scrollbar max-h-[min(26rem,62vh)] space-y-1 overflow-y-auto p-2">
            {visibleNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'relative flex w-full items-start gap-3 overflow-hidden rounded-kws-control px-3 py-3 text-left transition-[background-color,transform,box-shadow] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55',
                    notification.read
                      ? 'bg-transparent hover:bg-white/80'
                      : 'bg-white shadow-[0_5px_16px_rgba(19,36,24,0.07)] before:absolute before:bottom-3 before:left-0 before:top-3 before:w-0.5 before:rounded-full before:bg-primary',
                  )}
                >
                  <div className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-kws-control', getNotificationColor(notification.type), notification.read && 'saturate-[0.65] opacity-75')}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 line-clamp-1 font-sans text-xs font-semibold leading-5 text-[#192436]">{notification.title}</p>
                      {!notification.read ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_rgba(54,181,49,0.12)]">
                          <span className="sr-only">Ungelesen</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 font-sans text-[10px] leading-[1.55] text-[#657069]">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 font-sans text-[9px] font-medium text-[#7B857E]">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>

                  {notification.action_url ? <ChevronRight className="mt-3 h-3.5 w-3.5 shrink-0 text-[#89928C]" /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-9 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCheck className="h-5 w-5" />
            </div>
            <p className="mt-3 font-sans text-sm font-semibold text-[#192436]">Gerade nichts Neues</p>
            <p className="mt-1 font-sans text-[10px] leading-relaxed text-[#68736C]">Sobald es Neuigkeiten aus der Halle gibt, erscheinen sie hier.</p>
          </div>
        )}

        <div className="border-t border-[#DFE8E0] bg-white/75 p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/profile/notifications');
            }}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-kws-control font-sans text-[10px] font-semibold text-[#34503A] transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Einstellungen öffnen
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
