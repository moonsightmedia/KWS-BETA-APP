import { useNotifications, Notification } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NotificationListProps {
  onNotificationClick?: () => void;
}

export const NotificationList = ({ onNotificationClick }: NotificationListProps) => {
  const { data: notifications = [], isLoading, error } = useNotifications();
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center border-b border-[#E3ECD9] px-4 py-5">
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="h-[56px] w-full max-w-[520px] rounded-xl border-[3px] border-[#68B63E] bg-white px-5 text-[1rem] text-[#34424B] shadow-none focus:ring-0 focus:ring-offset-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[50vh] rounded-xl border border-[#DDE7DF]">
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="unread">Ungelesen ({unreadCount})</SelectItem>
            <SelectItem value="boulder_new">Neue Boulder</SelectItem>
            <SelectItem value="feedback_reply">Feedback</SelectItem>
            <SelectItem value="admin_announcement">Admin</SelectItem>
            <SelectItem value="schedule_reminder">Termine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-5">
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
