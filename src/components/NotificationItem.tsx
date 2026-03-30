import { Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Bell,
  Mountain,
  Trophy,
  MessageSquare,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMarkAsRead } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

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
      return Calendar;
    default:
      return Bell;
  }
};

const getNotificationIconColor = (type: Notification['type']) => {
  switch (type) {
    case 'boulder_new':
      return 'bg-[#E8EEFF] text-[#4F68E8]';
    case 'competition_update':
    case 'competition_result':
    case 'competition_leaderboard_change':
      return 'bg-[#FFF4D9] text-[#C99B12]';
    case 'feedback_reply':
      return 'bg-[#E8F6E8] text-[#4AA45A]';
    case 'admin_announcement':
      return 'bg-[#F0E9FF] text-[#8C63D8]';
    case 'schedule_reminder':
      return 'bg-[#FFF0E4] text-[#D78239]';
    default:
      return 'bg-[#EEF2EA] text-[#6C6A7E]';
  }
};

export const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const Icon = getNotificationIcon(notification.type);

  const handleClick = () => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    if (onClick) {
      onClick();
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full rounded-2xl border bg-white px-5 py-5 text-left shadow-[0_8px_24px_rgba(19,17,43,0.04)] transition-colors',
        notification.read
          ? 'border-[#E5EAE2]'
          : 'border-[#D9E7D0] bg-[#FCFDFC]',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl',
            getNotificationIconColor(notification.type),
          )}
        >
          <Icon className="h-8 w-8" strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-[0.98rem] font-semibold tracking-[-0.02em] text-[#13112B]">
                {notification.title}
              </h4>
              <p className="pt-3 text-[1rem] leading-[1.45] text-[#6C6A7E]">
                {notification.message}
              </p>
            </div>
            {!notification.read ? (
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#68B63E]" />
            ) : null}
          </div>

          <p className="pt-5 text-[0.92rem] text-[#8A8FA1]">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: de,
            })}
          </p>
        </div>
      </div>
    </button>
  );
};
