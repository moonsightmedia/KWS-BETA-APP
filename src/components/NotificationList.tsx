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
    <div className="flex flex-col h-full">
      {/* Header with filter and mark all as read */}
      <div className="flex items-center justify-between p-4 border-b border-[#E7F7E9]">
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="w-32 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="unread">Ungelesen ({unreadCount})</SelectItem>
            <SelectItem value="boulder_new">Neue Boulder</SelectItem>
            <SelectItem value="competition_update">Wettkampf</SelectItem>
            <SelectItem value="feedback_reply">Feedback</SelectItem>
            <SelectItem value="admin_announcement">Admin</SelectItem>
            <SelectItem value="schedule_reminder">Termine</SelectItem>
          </SelectContent>
        </Select>
        
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="h-9 text-xs"
          >
            <Check className="w-4 h-4 mr-1" />
            Alle gelesen
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
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

