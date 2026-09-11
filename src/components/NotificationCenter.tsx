import { useId } from 'react';
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
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { useHoverMenu } from '@/hooks/useHoverMenu';
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
  const menu = useHoverMenu();
  const headingId = useId();
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [], isLoading, isError, refetch } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const visibleNotifications = notifications.slice(0, 8);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    menu.onOpenChange(false);

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <Popover open={menu.open} onOpenChange={menu.onOpenChange}>
      <PopoverTrigger asChild {...menu.triggerProps}>
        <Button
          variant="ghost"
          className={cn(
            'relative flex-shrink-0 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-foreground focus-visible:ring-2 focus-visible:ring-primary/45',
            variant === 'header'
              ? 'h-10 w-10 rounded-kws-control bg-secondary p-0'
              : 'size-icon rounded-kws-control p-1.5',
          )}
          aria-label="Benachrichtigungen"
        >
          <Bell className={cn(variant === 'header' ? 'h-4 w-4' : 'h-5 w-5')} />
          {unreadCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-kws-badge bg-primary px-1 font-sans text-[10px] font-semibold leading-5 text-foreground"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        {...menu.contentProps}
        align={variant === 'header' ? 'end' : 'center'}
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        aria-labelledby={headingId}
        className={cn(kwsPopoverClassName, 'z-[120] flex max-h-[min(34rem,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden p-0')}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-4">
          <div className="min-w-0">
            <div className="min-w-0">
              <h3 id={headingId} className="font-sans text-sm font-semibold">Benachrichtigungen</h3>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                {isLoading ? 'Wird geladen …' : isError ? 'Laden fehlgeschlagen' : unreadCount > 0 ? `${unreadCount} ungelesen` : 'Keine ungelesenen Mitteilungen'}
              </p>
            </div>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              aria-label="Alle als gelesen markieren"
              title="Alle als gelesen markieren"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-2">
        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Mitteilungen werden geladen …
          </div>
        ) : isError ? (
          <div role="alert" className="px-4 py-6 text-center">
            <AlertCircle className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Mitteilungen konnten nicht geladen werden.</p>
            <button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 rounded-kws-control bg-secondary px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">Erneut versuchen</button>
          </div>
        ) : visibleNotifications.length > 0 ? (
          <div className="space-y-1">
            {visibleNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'relative flex w-full items-start gap-3 rounded-kws-badge px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55',
                    notification.read
                      ? 'hover:bg-secondary'
                      : 'bg-primary/5 hover:bg-primary/10',
                  )}
                >
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-kws-control bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 font-sans text-xs font-semibold leading-5 text-foreground">{notification.title}</p>
                      {!notification.read ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary">
                          <span className="sr-only">Ungelesen</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 font-sans text-xs leading-relaxed text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 font-sans text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>

                  {notification.action_url ? <ChevronRight className="mt-3 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-9 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-kws-control bg-secondary text-muted-foreground">
              <CheckCheck className="h-5 w-5" />
            </div>
            <p className="mt-3 font-sans text-sm font-semibold text-foreground">Noch keine Mitteilungen</p>
            <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">Neuigkeiten aus der Halle erscheinen hier.</p>
          </div>
        )}
        </div>

        <div className="shrink-0 border-t border-border/60 p-2">
          <button
            type="button"
            onClick={() => {
              menu.onOpenChange(false);
              navigate('/profile/notifications');
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-kws-badge font-sans text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
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
