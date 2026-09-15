import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Send, Loader2, CheckCircle2, AlertTriangle, Smartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sendPushNotification } from '@/services/pushNotifications';
import { readAdminRows } from '@/lib/adminRead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { KwsSurface } from '@/components/ui/kws-surface';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { AdminViewBar } from './AdminViewBar';
import { cn } from '@/lib/utils';

type Device = { platform: string; created_at: string };
type TestResult = { tone: 'success' | 'error' | 'unknown'; title: string; message: string };
const VIEWS = [{ value: 'message', label: 'Nachricht' }, { value: 'devices', label: 'Geräte' }] as const;
const platformName = (platform: string) => ({ ios: 'iPhone / iPad', android: 'Android', web: 'Browser' }[platform] || platform || 'Unbekannte Plattform');

export function PushNotificationTest() {
  const { user, session, loading: authLoading } = useAuth();
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('message');
  const [title, setTitle] = useState('Test-Benachrichtigung');
  const [body, setBody] = useState('Dies ist eine Test-Push-Benachrichtigung');
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['admin-push-test', user?.id],
    enabled: !!user && !!session && !authLoading,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!user || !session) throw new Error('Keine aktive Sitzung');
      const id = encodeURIComponent(user.id);
      const [preferences, devices] = await Promise.all([
        readAdminRows<{ push_enabled: boolean }>('notification_preferences?user_id=eq.' + id + '&select=push_enabled', session.access_token, signal),
        readAdminRows<Device>('push_tokens?user_id=eq.' + id + '&select=platform,created_at&order=created_at.desc', session.access_token, signal),
      ]);
      return { enabled: preferences[0]?.push_enabled === true, devices };
    },
  });
  const disabledReason = authLoading || isLoading ? 'Geräte und Einstellungen werden geprüft …'
    : isError ? 'Gerätestatus nicht verfügbar. Bitte erneut laden.'
    : !user || !session ? 'Bitte melde dich erneut an.'
    : !data?.enabled ? 'Aktiviere Push in deinen Benachrichtigungseinstellungen.'
    : !data.devices.length ? 'Noch kein Gerät registriert. Aktiviere Push in der App auf deinem Gerät.'
    : '';
  const canSend = !disabledReason && !sending && !isFetching && !!title.trim() && !!body.trim();
  const send = async () => {
    if (!canSend || sendLock.current || !user || !session) return;
    sendLock.current = true;
    setSending(true);
    setLastResult(null);
    try {
      const result = await sendPushNotification(user.id, { title: title.trim(), body: body.trim(), data: { test: true, timestamp: new Date().toISOString() }, action_url: '/' }, session);
      if (result.skipped) setLastResult({ tone: 'error', title: 'Nicht gesendet', message: result.skipped === 'disabled' ? 'Push ist inzwischen deaktiviert. Bitte prüfe deine Einstellungen.' : 'Es ist kein Gerät mehr registriert. Bitte aktualisiere den Gerätestatus.' });
      else if (result.accepted && !result.rejected && !result.unconfirmed) setLastResult({ tone: 'success', title: 'Vom Push-Dienst angenommen', message: result.accepted + (result.accepted === 1 ? ' Auftrag bestätigt.' : ' Aufträge bestätigt.') + ' Prüfe jetzt, ob die Nachricht auf deinem Gerät erscheint.' });
      else if (result.accepted) setLastResult({ tone: 'unknown', title: 'Nur teilweise angenommen', message: result.accepted + ' angenommen · ' + result.rejected + ' abgelehnt · ' + result.unconfirmed + ' nicht bestätigt. Prüfe deine Geräte.' });
      else setLastResult({ tone: result.unconfirmed ? 'unknown' : 'error', title: result.unconfirmed ? 'Versand nicht vollständig bestätigt' : 'Vom Push-Dienst abgelehnt', message: result.rejected + ' abgelehnt · ' + result.unconfirmed + ' nicht bestätigt. Es wurde keine erfolgreiche Zustellung bestätigt.' });
    } catch {
      setLastResult({ tone: 'unknown', title: 'Versand nicht bestätigt', message: 'Der Push-Dienst hat keine erfolgreiche Antwort geliefert. Prüfe dein Gerät, bevor du erneut sendest.' });
    } finally { sendLock.current = false; setSending(false); }
  };
  return <div className="space-y-4">
    <AdminViewBar refreshing={isFetching} onRefresh={() => void refetch()} disabled={sending || authLoading}>
      <KwsSegmentedControl<(typeof VIEWS)[number]['value']> value={view} onValueChange={setView} options={VIEWS} ariaLabel="Push-Test-Ansicht" />
    </AdminViewBar>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Nur an dein Konto · kein Rundversand</span>
      <span role="status">{isLoading || authLoading ? 'Geräte werden geprüft …' : isError ? 'Geräte nicht verfügbar' : data ? data.devices.length + ' registrierte Geräte' : 'Nicht angemeldet'}</span>
    </div>
    {disabledReason && <KwsSurface className="space-y-3 p-4" role={isError ? 'alert' : 'status'}><p className="text-sm">{disabledReason}</p>{isError ? <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>Erneut laden</Button> : !isLoading && !authLoading && <Button asChild variant="secondary"><Link to="/profile/notifications">Zu den Einstellungen<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>}</KwsSurface>}
    {view === 'message' ? <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <KwsSurface className="p-4 sm:p-5">
        <form className="space-y-5" onSubmit={event => { event.preventDefault(); void send(); }}>
          <h2 className="text-base font-semibold">Testnachricht</h2>
          <div className="space-y-2"><Label htmlFor="test-title">Titel</Label><Input id="test-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={100} required disabled={sending} placeholder="Titel der Benachrichtigung" aria-describedby="test-title-count" /><p id="test-title-count" className="text-right text-xs text-muted-foreground">{title.length}/100</p></div>
          <div className="space-y-2"><Label htmlFor="test-body">Nachricht</Label><Textarea id="test-body" value={body} onChange={event => setBody(event.target.value)} maxLength={400} required disabled={sending} placeholder="Was soll auf deinem Gerät erscheinen?" aria-describedby="test-body-count" className="min-h-28 resize-y" /><p id="test-body-count" className="text-right text-xs text-muted-foreground">{body.length}/400</p></div>
          <Button type="submit" disabled={!canSend} className="w-full">{sending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}{sending ? 'Wird gesendet …' : 'Test-Benachrichtigung senden'}</Button>
          <p className="text-xs text-muted-foreground">Ein Test geht an alle registrierten Geräte deines Kontos.</p>
        </form>
      </KwsSurface>
      <aside className="min-w-0 space-y-3" aria-label="Nachrichtenvorschau">
        <h2 className="text-sm font-semibold">Vorschau</h2>
        <div className="rounded-kws-card bg-secondary/70 p-4 sm:p-5">
          <KwsSurface className="flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-primary text-primary-foreground"><Bell className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs text-muted-foreground">Kletterwelt Sauerland · jetzt</p><p className="mt-2 break-words text-sm font-semibold">{title.trim() || 'Titel der Nachricht'}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{body.trim() || 'Deine Nachricht erscheint hier.'}</p></div></KwsSurface>
        </div>
        <p className="text-xs text-muted-foreground">Die Darstellung unterscheidet sich je nach Gerät. Die Annahme durch den Dienst bestätigt noch nicht die Anzeige auf dem Handy.</p>
      </aside>
    </div> : <KwsSurface className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4"><h2 className="text-base font-semibold">Deine Geräte</h2><span className={cn('text-xs font-medium', data?.enabled ? 'text-primary-ink' : 'text-muted-foreground')}>{data ? data.enabled ? 'Push aktiviert' : 'Push deaktiviert' : 'Status unbekannt'}</span></div>
      {data?.devices.length ? <ul className="divide-y divide-border/50">{data.devices.map((device, index) => <li key={device.platform + device.created_at + index} className="flex items-start gap-3 p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-secondary"><Smartphone className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-semibold">{platformName(device.platform)}</p><p className="mt-1 text-xs text-muted-foreground">Registriert am {new Date(device.created_at).toLocaleDateString('de-DE')}</p></div></li>)}</ul> : <p className="px-4 pb-5 text-sm text-muted-foreground">{isLoading ? 'Wird geladen …' : isError ? 'Geräte konnten nicht geprüft werden.' : 'Noch keine registrierten Geräte.'}</p>}
      <div className="p-4"><Button asChild variant="secondary"><Link to="/profile/notifications">Benachrichtigungen einstellen<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button></div>
    </KwsSurface>}
    {lastResult && <div role={lastResult.tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-kws-card p-4', lastResult.tone === 'success' ? 'bg-primary/10' : lastResult.tone === 'error' ? 'bg-destructive/10' : 'bg-secondary')}>{lastResult.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}<div><h2 className="text-sm font-semibold">{lastResult.title}</h2><p className="mt-1 text-sm">{lastResult.message}</p></div></div>}
  </div>;
}
