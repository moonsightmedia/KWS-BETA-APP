import { useRef, useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { useNotifications, useMarkAllAsRead, useUnreadCount } from '@/hooks/useNotifications';
import { notificationDay, notificationTopics } from '@/lib/notifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function NotificationList({ onNotificationClick }: { onNotificationClick?: () => void }) {
  const [view, setView] = useState('all'); const [topic, setTopic] = useState('all');
  const query = useNotifications({ unreadOnly: view === 'unread', topic });
  const count = useUnreadCount(); const markAll = useMarkAllAsRead();
  const writing = useIsMutating({ mutationKey: ['notification-read'] }) > 0;
  const [message, setMessage] = useState(''); const [writeError, setWriteError] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const change = (fn: () => void) => { fn(); setMessage(''); setWriteError(''); scroll.current?.scrollTo({ top: 0 }); };
  const refresh = () => { void query.refetch(); void count.refetch(); };
  const mark = async () => {
    setWriteError(''); setMessage('');
    try { await markAll.mutateAsync(); setMessage('Alle bisherigen Mitteilungen sind gelesen.'); }
    catch { setWriteError('Nicht alle Änderungen wurden bestätigt. Bitte erneut versuchen.'); }
  };
  const rows = query.data ?? [];
  const groups = rows.reduce<Array<{ label: string; rows: typeof rows }>>((result, n) => {
    const label = notificationDay(n.created_at); const last = result[result.length - 1];
    if (last?.label === label) last.rows.push(n); else result.push({ label, rows: [n] }); return result;
  }, []);
  return <div className="flex min-h-0 flex-1 flex-col" data-swipe-ignore>
    <div className="shrink-0 space-y-3 px-4 pb-3">
      <KwsSegmentedControl ariaLabel="Mitteilungen filtern" value={view} onValueChange={v => change(() => setView(v))} options={[{ value: 'all', label: 'Alle' }, { value: 'unread', label: 'Ungelesen' }]} />
      <div className="flex items-center gap-2">
        <Select value={topic} onValueChange={v => change(() => setTopic(v))}><SelectTrigger aria-label="Thema auswählen" className="h-11 min-w-0 flex-1 border-0 bg-secondary text-xs"><SelectValue /></SelectTrigger><SelectContent position="popper" className="z-[150]">{notificationTopics.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
        <Button size="icon" variant="ghost" aria-label="Mitteilungen aktualisieren" disabled={query.isFetching || count.isFetching} onClick={refresh} className="h-11 w-11 shrink-0"><RefreshCw className={query.isFetching ? 'h-4 w-4 animate-spin motion-reduce:animate-none' : 'h-4 w-4'} /></Button>
      </div>
    </div>
    <div ref={scroll} data-notification-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {query.isLoading ? <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Mitteilungen werden geladen …</div>
      : query.isError && !query.isFetchNextPageError ? <div role="alert" className="px-6 py-8 text-center"><p className="text-sm font-semibold">Mitteilungen nicht verfügbar</p><p className="mt-2 text-xs text-muted-foreground">Deine Mitteilungen bleiben erhalten. Versuche es erneut.</p><Button variant="secondary" className="mt-4" disabled={query.isFetching} onClick={refresh}>Erneut versuchen</Button></div>
      : !rows.length ? <div className="px-6 py-10 text-center"><Bell className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" /><p className="mt-4 text-sm font-semibold">{view === 'unread' ? topic !== 'all' ? 'Zu diesem Thema ist alles gelesen' : 'Alles gelesen' : topic !== 'all' ? 'Keine Mitteilungen zu diesem Thema' : 'Noch keine Mitteilungen'}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{view === 'unread' ? 'Bereits gelesene Mitteilungen findest du unter Alle.' : 'Neuigkeiten aus der Halle erscheinen hier.'}</p>{(view !== 'all' || topic !== 'all') && <Button variant="secondary" className="mt-4" onClick={() => change(() => { setView('all'); setTopic('all'); })}>Alle Mitteilungen anzeigen</Button>}</div>
      : <>{groups.map(g => <section key={g.label}><h2 className="bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">{g.label}</h2><div className="divide-y divide-border/50">{g.rows.map(n => <NotificationItem key={n.id} notification={n} onClick={onNotificationClick} disabled={writing} />)}</div></section>)}
        {query.isFetchNextPageError && <p role="alert" className="px-4 pt-3 text-xs text-destructive">Ältere Mitteilungen konnten nicht geladen werden.</p>}
        {query.hasNextPage && <div className="p-4"><Button variant="secondary" className="w-full" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Wird geladen …' : 'Ältere Mitteilungen laden'}</Button></div>}
      </>}
    </div>
    <div className="shrink-0 border-t border-border/60 px-4 py-2">
      {count.isError && <p role="status" className="py-2 text-xs text-muted-foreground">Ungelesen-Zähler derzeit nicht verfügbar.</p>}
      {writeError && <p role="alert" className="py-2 text-xs text-destructive">{writeError}</p>}
      {message && <p role="status" className="py-2 text-xs text-primary-ink">{message}</p>}
      <Button variant="ghost" className="min-h-11 w-full gap-2 text-xs" disabled={writing || count.isError || !count.data || query.isError} onClick={() => void mark()}><CheckCheck className="h-4 w-4" aria-hidden="true" />{markAll.isPending ? 'Wird gespeichert …' : 'Alle als gelesen markieren'}</Button>
    </div>
  </div>;
}
