import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { useHoverMenu } from '@/hooks/useHoverMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadCount } from '@/hooks/useNotifications';
import { NotificationList } from '@/components/NotificationList';

export function NotificationCenter({ variant = 'default' }: { variant?: 'default' | 'header' }) {
  const menu = useHoverMenu(); const mobile = useIsMobile(); const titleId = useId();
  const navigate = useNavigate(); const count = useUnreadCount();
  const trigger = <Button variant="ghost" aria-label="Benachrichtigungen" className={'relative h-10 w-10 shrink-0 rounded-kws-control p-0 text-muted-foreground hover:bg-secondary data-[state=open]:bg-primary/10 data-[state=open]:text-foreground ' + (variant === 'header' ? 'bg-secondary' : '')}>
    <Bell className="h-5 w-5" aria-hidden="true" />
    {!count.isError && !!count.data && <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-kws-badge bg-primary px-1 text-[10px] font-semibold leading-5 text-primary-foreground">{count.data > 99 ? '99+' : count.data}</span>}
    <span className="sr-only">{count.isError ? 'Anzahl nicht verfügbar' : count.data === undefined ? 'Anzahl wird geladen' : count.data + ' ungelesen'}</span>
  </Button>;
  const content = <>
    <div className="flex shrink-0 items-start justify-between gap-2 px-4 pb-4 pt-5">
      <div className="min-w-0">{mobile ? <DialogTitle>Benachrichtigungen</DialogTitle> : <h2 id={titleId} className="font-sans text-base font-semibold">Benachrichtigungen</h2>}
        {mobile ? <DialogDescription className="mt-1 text-xs">{count.isError ? 'Anzahl nicht verfügbar' : count.data === undefined ? 'Wird geladen …' : count.data + ' ungelesen'}</DialogDescription> : <p className="mt-1 text-xs text-muted-foreground">{count.isError ? 'Anzahl nicht verfügbar' : count.data === undefined ? 'Wird geladen …' : count.data + ' ungelesen'}</p>}
      </div>
      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Benachrichtigungen schließen" onClick={() => menu.onOpenChange(false)}><X className="h-5 w-5" /></Button>
    </div>
    <NotificationList onNotificationClick={() => menu.onOpenChange(false)} />
    <div className="shrink-0 border-t border-border/60 px-4 py-2"><Button variant="ghost" className="min-h-11 w-full gap-2 text-xs" onClick={() => { menu.onOpenChange(false); navigate('/profile/notifications'); }}><Settings2 className="h-4 w-4" />Einstellungen</Button></div>
  </>;
  if (mobile) return <Dialog open={menu.open} onOpenChange={menu.onOpenChange}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent scrollLayout="contained" className="flex flex-col p-0 bg-card">{content}</DialogContent></Dialog>;
  return <Popover open={menu.open} onOpenChange={menu.onOpenChange}><PopoverTrigger asChild {...menu.triggerProps}>{trigger}</PopoverTrigger>
    <PopoverContent {...menu.contentProps} onPointerDownCapture={menu.pin} align="end" sideOffset={8} collisionPadding={16} aria-labelledby={titleId} className={kwsPopoverClassName + ' z-[120] flex h-[min(42rem,var(--radix-popover-content-available-height))] w-[26rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0'}>{content}</PopoverContent>
  </Popover>;
}
