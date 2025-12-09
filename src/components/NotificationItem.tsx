import { Notification } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
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
  TrendingUp,
  Award
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

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'boulder_new':
      return 'bg-blue-100 text-blue-600';
    case 'competition_update':
    case 'competition_result':
    case 'competition_leaderboard_change':
      return 'bg-yellow-100 text-yellow-600';
    case 'feedback_reply':
      return 'bg-green-100 text-green-600';
    case 'admin_announcement':
      return 'bg-purple-100 text-purple-600';
    case 'schedule_reminder':
      return 'bg-orange-100 text-orange-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  const handleClick = () => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    
    if (onClick) {
      onClick();
    }

    // Navigate to action_url if provided
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:bg-[#F9FAF9] active:bg-[#F0F9FF] border-l-4 touch-manipulation",
        "min-h-[72px] w-full", // Ensure minimum touch target size and full width
        !notification.read && "bg-[#F0F9FF] border-l-[#36B531] border-l-4",
        notification.read && "border-l-transparent"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={cn("p-2 rounded-lg flex-shrink-0", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2 w-full">
            <h4 className={cn(
              "text-sm font-semibold text-[#13112B] leading-tight flex-1",
              !notification.read && "font-bold"
            )}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-[#36B531] rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-[#13112B]/70 mt-1.5 line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {notification.message}
          </p>
          <p className="text-xs text-[#13112B]/50 mt-2">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: de,
            })}
          </p>
        </div>
      </div>
    </Card>
  );
};

