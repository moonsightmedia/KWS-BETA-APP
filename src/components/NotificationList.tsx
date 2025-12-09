import { useNotifications, Notification } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { useMarkAllAsRead } from '@/hooks/useNotifications';
import { Check, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NotificationListProps {
  onNotificationClick?: () => void;
}

export const NotificationList = ({ onNotificationClick }: NotificationListProps) => {
  const { data: notifications = [], isLoading, error } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();
  const [filter, setFilter] = useState<'all' | 'unread' | Notification['type']>('all');

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#13112B]/60" />
      </div>
    );
  }

  if (error) {
    console.error('[NotificationList] Error loading notifications:', error);
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-[#E74C3C] mb-2">Fehler beim Laden der Benachrichtigungen</p>
        <p className="text-xs text-[#13112B]/60">{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
      </div>
    );
  }

  if (filteredNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-[#13112B]/60">
          {filter === 'unread' 
            ? 'Keine ungelesenen Benachrichtigungen' 
            : 'Keine Benachrichtigungen'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header with filter */}
      <div className="flex items-center justify-center p-3 border-b border-[#E7F7E9] flex-shrink-0">
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="w-full max-w-[200px] h-10 text-xs touch-manipulation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[50vh]">
            <SelectItem value="all" className="text-xs">Alle</SelectItem>
            <SelectItem value="unread" className="text-xs">Ungelesen ({unreadCount})</SelectItem>
            <SelectItem value="boulder_new" className="text-xs">Neue Boulder</SelectItem>
            {/* <SelectItem value="competition_update">Wettkampf</SelectItem> */}
            <SelectItem value="feedback_reply" className="text-xs">Feedback</SelectItem>
            <SelectItem value="admin_announcement" className="text-xs">Admin</SelectItem>
            <SelectItem value="schedule_reminder" className="text-xs">Termine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notification list - scrollable area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={onNotificationClick}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

