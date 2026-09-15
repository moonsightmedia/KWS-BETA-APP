import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, BellRing, CalendarDays, Check, MessageSquare, Megaphone, RefreshCw, Smartphone, Trophy } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { BoulderIcon } from '@/components/icons/BoulderIcon';
import { useAuth } from '@/hooks/useAuth';
import { defaultNotificationPreferences, useNotificationPreferences, useUpdateNotificationPreferences, type PreferenceKey } from '@/hooks/useNotificationPreferences';
import { notificationRequest } from '@/lib/notificationRequest';
import { getPushDeviceId, getPushPermissionStatus, initializePushNotifications, requestPermission, unregisterPushOnDevice } from '@/utils/pushNotifications';

function SettingRow({ icon, title, description, checked, disabled, onChange }: { icon: ReactNode; title: string; description: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-20 items-center gap-3 px-4 py-4 hover:bg-secondary/30">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-secondary text-muted-foreground">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></span>
    <Switch aria-label={title} checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </label>;
}
const topics: Array<{ key: PreferenceKey; title: string; description: string; icon: ReactNode }> = [
  { key: 'boulder_new', title: 'Neue Boulder', description: 'Neue Linien und Betas aus der Halle.', icon: <BoulderIcon className="h-5 w-5" /> },
  { key: 'schedule_reminder', title: 'Schraubtermine', description: 'Hinweise zu geplanten Schraubterminen.', icon: <CalendarDays className="h-5 w-5" /> },
  { key: 'feedback_reply', title: 'Feedback-Antworten', description: 'Wenn es eine Antwort auf deine Rückmeldung gibt.', icon: <MessageSquare className="h-5 w-5" /> },
  { key: 'admin_announcement', title: 'Hallennews', description: 'Wichtige Neuigkeiten der Kletterwelt.', icon: <Megaphone className="h-5 w-5" /> },
  { key: 'competition_update', title: 'Wettkämpfe', description: 'Mitteilungen zu deinen Wettkämpfen.', icon: <Trophy className="h-5 w-5" /> },
];
export default function NotificationSettings() {
  const { user, session, loading } = useAuth(); const client = useQueryClient();
  const preferences = useNotificationPreferences(); const update = useUpdateNotificationPreferences();
  const native = Capacitor.isNativePlatform();
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const device = useQuery({
    queryKey: ['notification-device', user?.id], enabled: native && !loading && !!user && !!session,
    queryFn: async ({ signal }) => {
      const q = new URLSearchParams({ user_id: 'eq.' + user!.id, device_id: 'eq.' + getPushDeviceId(), select: 'id,platform', limit: '1' });
      const [permission, response] = await Promise.all([getPushPermissionStatus(), notificationRequest('/rest/v1/push_tokens?' + q, session?.access_token, { signal })]);
      if (!Array.isArray(response.data)) throw new Error('Gerätestatus nicht verfügbar.');
      return { permission, registered: response.data.length > 0 };
    }, staleTime: 0, retry: 1,
  });
  const refetchDevice = device.refetch;
  useEffect(() => {
    if (!native) return;
    const check = () => { if (document.visibilityState === 'visible') void refetchDevice(); };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [native, refetchDevice]);
  const save = async (key: PreferenceKey, value: boolean) => {
    if (lock.current || !session || !user) return;
    lock.current = true; setBusy(true); setMessage(''); setError('');
    try {
      if (key === 'push_enabled' && value) {
        if (!await requestPermission()) throw new Error('Push ist auf diesem Gerät nicht erlaubt. Aktiviere Mitteilungen in den Systemeinstellungen.');
        if (!await initializePushNotifications(session, true)) throw new Error('Push-Berechtigung fehlt.');
      }
      await update.mutateAsync(key === 'in_app_enabled' && !value ? { in_app_enabled: false, push_enabled: false } : { [key]: value });
      if (native && !value && (key === 'push_enabled' || key === 'in_app_enabled')) {
        try { await unregisterPushOnDevice(); } catch { setError('Im Konto deaktiviert. Die Geräteverbindung konnte noch nicht getrennt werden.'); }
      }
      setMessage('Einstellung gespeichert.');
      if (native) void device.refetch();
    } catch (e) { setError(e instanceof Error ? e.message : 'Änderung nicht gespeichert. Bitte erneut versuchen.'); if (native) void device.refetch(); }
    finally { lock.current = false; setBusy(false); }
  };
  const reconnect = async () => {
    if (lock.current || !session) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (!await requestPermission() || !await initializePushNotifications(session, true)) throw new Error('Push ist auf diesem Gerät nicht erlaubt. Bitte prüfe die Systemeinstellungen.');
      setMessage('Dieses Gerät ist verbunden. Die tatsächliche Zustellung hängt vom Push-Dienst ab.');
      await device.refetch(); void client.invalidateQueries({ queryKey: ['push_tokens', user?.id] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Gerät konnte nicht verbunden werden.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const prefs = preferences.data;
  const configure = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await update.mutateAsync(defaultNotificationPreferences); setMessage('Mitteilungen eingerichtet. Passe deine Themen unten an.'); }
    catch { setError('Mitteilungen konnten nicht eingerichtet werden. Bitte erneut versuchen.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const unavailable = loading || preferences.isLoading || preferences.isError || !prefs;
  const deviceLabel = device.isError ? 'Status nicht verfügbar' : device.isFetching && !device.data ? 'Gerät wird geprüft …' : device.data?.permission === 'denied' ? 'In den Systemeinstellungen blockiert' : device.data?.permission !== 'granted' ? 'Erlaubnis noch ausstehend' : device.data.registered ? 'Dieses Gerät ist registriert' : 'Gerät noch nicht verbunden';
  return <DashboardPageLayout headerBackTo="/profile">
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="px-1"><h2 className="text-base font-semibold">Deine Mitteilungen</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Du entscheidest, was dich erreicht. Deine bisherigen Mitteilungen bleiben erhalten.</p></div>
      {unavailable ? <KwsSurface className="p-6" role={preferences.isError ? 'alert' : 'status'}><p className="text-sm font-semibold">{preferences.isError ? 'Einstellungen nicht verfügbar' : 'Einstellungen werden geladen …'}</p>{preferences.isError && <><p className="mt-2 text-xs text-muted-foreground">Es wurden keine Einstellungen geändert.</p><Button variant="secondary" className="mt-4" disabled={preferences.isFetching} onClick={() => void preferences.refetch()}>Erneut versuchen</Button></>}</KwsSurface> : !prefs.updated_at ? <KwsSurface className="p-5"><p className="text-sm font-semibold">Bleib auf dem Laufenden</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Aktiviere Mitteilungen in der App. Danach wählst du deine Themen. Push bleibt zunächst aus.</p><Button className="mt-4" disabled={busy} onClick={() => void configure()}>Mitteilungen einrichten</Button></KwsSurface> : <>
        <KwsSurface className="divide-y divide-border/60 overflow-hidden">
          <SettingRow icon={<Bell className="h-5 w-5" />} title="Mitteilungen empfangen" description="Neue Mitteilungen in der App – und optional als Push." checked={prefs.in_app_enabled} disabled={busy} onChange={v => void save('in_app_enabled', v)} />
          {native ? <SettingRow icon={<BellRing className="h-5 w-5" />} title="Push im Konto" description="Auch bei geschlossener App. Gilt für deine registrierten Geräte." checked={prefs.push_enabled} disabled={busy || !prefs.in_app_enabled} onChange={v => void save('push_enabled', v)} />
          : <div className="flex items-start gap-3 px-4 py-4"><Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" /><div><p className="text-sm font-semibold">Push in der iPhone- & Android-App</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Im Browser ist Push deaktiviert. Mitteilungen findest du hier über die Glocke.</p></div></div>}
        </KwsSurface>
        <section><h2 className="mb-3 px-1 text-sm font-semibold">Deine Themen</h2>{!prefs.in_app_enabled && <p className="mb-3 px-1 text-xs text-muted-foreground">Mitteilungen sind pausiert. Deine Themenauswahl bleibt gespeichert.</p>}<KwsSurface className="divide-y divide-border/60 overflow-hidden">{topics.map(item => <SettingRow key={item.key} icon={item.icon} title={item.title} description={item.description} checked={prefs[item.key]} disabled={busy || !prefs.in_app_enabled} onChange={v => void save(item.key, v)} />)}</KwsSurface></section>
      </>}
      <div aria-live="polite" className="px-1">{busy ? <p role="status" className="text-xs text-muted-foreground">Änderung wird gespeichert …</p> : error ? <p role="alert" className="text-xs text-destructive">{error}</p> : message ? <p role="status" className="flex items-start gap-2 text-xs text-primary-ink"><Check className="h-4 w-4 shrink-0" />{message}</p> : null}</div>
      {native && <section><h2 className="mb-3 px-1 text-sm font-semibold">Dieses Gerät</h2><KwsSurface className="space-y-3 p-4"><div className="flex items-center gap-3"><Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" /><p className="text-sm font-semibold">{deviceLabel}</p></div><p className="text-xs leading-relaxed text-muted-foreground">{device.data?.permission === 'denied' ? 'Öffne die Systemeinstellungen und erlaube Mitteilungen für die KWS-App. Prüfe den Status danach erneut.' : 'Registriert bedeutet nicht automatisch zugestellt. Berechtigung, Konto und Push-Dienst müssen aktiv sein.'}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || device.isFetching} onClick={() => void device.refetch()} className="gap-2 text-xs"><RefreshCw className="h-4 w-4" />Status prüfen</Button>{prefs?.in_app_enabled && prefs.push_enabled && <Button disabled={busy} onClick={() => void reconnect()} className="text-xs">Gerät neu verbinden</Button>}</div></KwsSurface></section>}
    </div>
  </DashboardPageLayout>;
}
