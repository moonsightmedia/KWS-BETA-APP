import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Check, ArrowUpRight, MessageSquare, Megaphone, Trophy, Loader2 } from 'lucide-react';
import { BoulderIcon } from '@/components/icons/BoulderIcon';
import { useMarkAsRead, type Notification } from '@/hooks/useNotifications';
import { notificationDestination } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const icons = { boulder_new: BoulderIcon, schedule_reminder: CalendarDays, feedback_reply: MessageSquare, admin_announcement: Megaphone, competition_update: Trophy, competition_result: Trophy, competition_leaderboard_change: Trophy };
export function NotificationItem({ notification, onClick, disabled = false }: { notification: Notification; onClick?: () => void; disabled?: boolean }) {
  const navigate = useNavigate(); const mark = useMarkAsRead(); const [error, setError] = useState('');
  const Icon = icons[notification.type] || Bell;
  const target = notificationDestination(notification.action_url);
  const act = async (open: boolean) => {
    if (disabled || mark.isPending) return;
    setError('');
    try {
      if (!notification.read) await mark.mutateAsync(notification.id);
      if (open && target) { onClick?.(); navigate(target); }
    } catch { setError('Gelesen-Status nicht gespeichert. Bitte erneut versuchen.'); }
  };
  return <article data-notification-id={notification.id} className={cn('px-4 py-4 transition-colors', !notification.read && 'bg-primary/5')}>
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-kws-control bg-secondary text-muted-foreground"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 break-words font-sans text-sm font-semibold leading-snug text-foreground">{notification.title}</h3>
          {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"><span className="sr-only">Ungelesen</span></span>}
        </div>
        <time dateTime={notification.created_at} className="mt-1 block text-[11px] text-muted-foreground">{new Date(notification.created_at).toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {target && <Button size="sm" variant="secondary" disabled={disabled || mark.isPending} onClick={() => void act(true)} className="min-h-11 gap-1.5 text-xs">Ansehen<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>}
          {!notification.read ? <Button variant="ghost" size="sm" disabled={disabled || mark.isPending} onClick={() => void act(false)} aria-label={'Als gelesen markieren: ' + notification.title} className="min-h-11 gap-1.5 text-xs">{mark.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Check className="h-3.5 w-3.5" />}Als gelesen</Button> : <span className="inline-flex min-h-11 items-center gap-1 text-[11px] text-muted-foreground"><Check className="h-3 w-3" aria-hidden="true" />Gelesen</span>}
        </div>
        {notification.action_url && !target && <p className="text-xs text-muted-foreground">Verknüpfter Inhalt nicht verfügbar.</p>}
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  </article>;
}
