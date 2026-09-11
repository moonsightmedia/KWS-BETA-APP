import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  Info,
  Megaphone,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import {
  deletePushTokensForUser,
  getPushPermissionStatus,
  initializePushNotifications,
  requestPermission,
  resetPushInitializationState,
  unregisterPushOnDevice,
} from '@/utils/pushNotifications';
import { getVersionInfo } from '@/utils/version';

const NotificationRow = ({
  icon,
  title,
  subtitle,
  checked,
  disabled,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void | Promise<void>;
}) => (
  <div className="group flex min-h-[76px] items-center justify-between border-b border-[#E4ECE5] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-secondary/35 sm:px-5">
    <div className="mr-4 flex flex-1 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-primary/10 transition-colors group-hover:bg-primary/15">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-sans text-xs font-semibold text-[#192436] sm:text-sm">{title}</p>
        <p className="mt-0.5 max-w-lg font-sans text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">{subtitle}</p>
      </div>
    </div>
    <Switch aria-label={title} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
  </div>
);

const SettingsSectionHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-3 px-1">
    <h2 className="font-sans text-sm font-semibold text-[#192436]">{title}</h2>
    <p className="mt-0.5 font-sans text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">{description}</p>
  </div>
);

const NotificationSettings = () => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const versionInfo = getVersionInfo();
  const isNativePlatform = Capacitor.isNativePlatform();
  const { data: notificationPreferences } = useNotificationPreferences();
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const [pushPermissionStatus, setPushPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | null>(null);

  useEffect(() => {
    if (!isNativePlatform) return;
    getPushPermissionStatus().then(setPushPermissionStatus);
  }, [isNativePlatform]);

  const { data: pushTokensList } = useQuery({
    queryKey: ['push_tokens', user?.id],
    queryFn: async () => {
      if (!user || !session) return [];
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !supabaseKey) return [];

      const response = await fetch(
        `${supabaseUrl}/rest/v1/push_tokens?user_id=eq.${user.id}&select=id,platform,created_at`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && !!session && isNativePlatform,
  });

  const notificationTypes = [
    {
      key: 'schedule_reminder' as const,
      icon: <CalendarDays className="h-4 w-4 text-primary" strokeWidth={1.9} />,
      title: 'Schraubtermine',
      subtitle: 'Erinnerung vor neuen Schraubterminen',
    },
    {
      key: 'boulder_new' as const,
      icon: <Bell className="h-4 w-4 text-primary" strokeWidth={1.9} />,
      title: 'Neue Boulder',
      subtitle: 'Benachrichtigung wenn neue Boulder geschraubt wurden',
    },
    {
      key: 'feedback_reply' as const,
      icon: <MessageSquare className="h-4 w-4 text-primary" strokeWidth={1.9} />,
      title: 'Feedback-Antworten',
      subtitle: 'Antworten auf dein Feedback',
    },
    {
      key: 'admin_announcement' as const,
      icon: <Megaphone className="h-4 w-4 text-primary" strokeWidth={1.9} />,
      title: 'Ankündigungen',
      subtitle: 'Allgemeine Neuigkeiten und Updates der Halle',
    },
  ];

  return (
    <DashboardPageLayout headerBackTo="/profile">
      <div className="mx-auto max-w-3xl space-y-6">
        <KwsSurface className="relative overflow-hidden bg-sidebar-bg px-5 py-5 text-white sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-white/10 text-primary ring-1 ring-white/10">
                <BellRing className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold">Bleib auf dem Laufenden</p>
                <p className="mt-1 max-w-md font-sans text-[10px] leading-relaxed text-white/60 sm:text-[11px]">
                  Bestimme selbst, welche Neuigkeiten aus der Halle dich erreichen dürfen.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 font-sans text-[9px] font-semibold text-white/70 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {(notificationPreferences?.in_app_enabled ?? true) ? 'In-App aktiv' : 'In-App aus'}
            </span>
          </div>
        </KwsSurface>

        <section>
          <SettingsSectionHeader title="Kanäle" description="Lege fest, wo Benachrichtigungen erscheinen dürfen." />
          <KwsSurface className="overflow-hidden">
          <NotificationRow
            icon={<Bell className="h-4 w-4 text-primary" strokeWidth={1.9} />}
            title="In-App Benachrichtigungen"
            subtitle="Benachrichtigungen innerhalb der App"
            checked={notificationPreferences?.in_app_enabled ?? true}
            onCheckedChange={(checked) => updateNotificationPreferences.mutate({ in_app_enabled: checked })}
          />

          {isNativePlatform ? (
            <NotificationRow
            icon={<BellOff className="h-4 w-4 text-primary" strokeWidth={1.9} />}
            title="Push-Benachrichtigungen"
            subtitle="Benachrichtigungen auch wenn die App geschlossen ist"
            checked={notificationPreferences?.push_enabled ?? false}
            disabled={updateNotificationPreferences.isPending}
            onCheckedChange={async (checked) => {
              if (updateNotificationPreferences.isPending) return;

              if (checked) {
                try {
                  const granted = await requestPermission();
                  if (!granted) {
                    toast.error('Push-Benachrichtigungen wurden nicht erlaubt');
                    return;
                  }

                  await updateNotificationPreferences.mutateAsync({ push_enabled: true });
                  toast.success('Push-Benachrichtigungen aktiviert');

                  if (isNativePlatform) {
                    await initializePushNotifications(
                      session ? { access_token: session.access_token, user: { id: user!.id } } : undefined,
                    );
                    queryClient.invalidateQueries({ queryKey: ['push_tokens', user?.id] });
                  }
                } catch (error) {
                  toast.error('Fehler beim Aktivieren der Push-Benachrichtigungen', {
                    description: error instanceof Error ? error.message : String(error),
                  });
                }
              } else {
                await updateNotificationPreferences.mutateAsync({ push_enabled: false });
                await unregisterPushOnDevice();
                resetPushInitializationState();

                if (user?.id && session?.access_token) {
                  try {
                    await deletePushTokensForUser(user.id, session.access_token);
                  } catch {
                    // Ignore token cleanup failures here; UI state should still update.
                  }
                  queryClient.invalidateQueries({ queryKey: ['push_tokens', user.id] });
                }

                toast.success('Push-Benachrichtigungen deaktiviert');
              }
            }}
            />
          ) : null}
          </KwsSurface>
        </section>

        <section>
          <SettingsSectionHeader title="Mitteilungen" description="Wähle die Themen aus, die für dich relevant sind." />
          <KwsSurface className="overflow-hidden">
          {notificationTypes.map((item) => (
            <NotificationRow
              key={item.key}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              checked={notificationPreferences?.[item.key] ?? true}
              onCheckedChange={(checked) => updateNotificationPreferences.mutate({ [item.key]: checked })}
            />
          ))}
          </KwsSurface>
        </section>

        {!isNativePlatform ? (
          <KwsSurface className="flex items-start gap-3 border border-primary/10 bg-primary/[0.045] px-4 py-4 font-sans text-[10px] leading-relaxed text-[#526158] shadow-none sm:px-5 sm:text-[11px]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-kws-control bg-white text-primary shadow-[0_3px_10px_rgba(19,36,24,0.06)]">
              <Info className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-[#294231]">Hinweis zur Web-Version</p>
              <p className="mt-0.5">Browser-Push ist in der Web-Beta deaktiviert. In-App-Benachrichtigungen bleiben aktiv.</p>
            </div>
          </KwsSurface>
        ) : null}

        {isNativePlatform ? (
          <KwsSurface className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Push-Status</p>
              <button
                type="button"
                onClick={async () => {
                  const status = await getPushPermissionStatus();
                  setPushPermissionStatus(status);
                  queryClient.invalidateQueries({ queryKey: ['push_tokens', user?.id] });
                  toast.success('Status aktualisiert');
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-kws-control bg-secondary px-2.5 font-sans text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Aktualisieren
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>App-Version:</strong> {versionInfo.version} ({versionInfo.buildDate})</p>
              <p><strong>Plattform:</strong> {Capacitor.getPlatform()}</p>
              <p>
                <strong>Push-Berechtigung:</strong>{' '}
                {pushPermissionStatus === 'granted'
                  ? 'Erlaubt'
                  : pushPermissionStatus === 'denied'
                    ? 'Verweigert'
                    : pushPermissionStatus === 'prompt'
                      ? 'Noch nicht gefragt'
                      : '–'}
              </p>
              <p><strong>Push in Einstellungen:</strong> {notificationPreferences?.push_enabled ? 'Aktiviert' : 'Deaktiviert'}</p>
              <p><strong>Registrierte Geräte:</strong> {pushTokensList?.length ?? 0}</p>
            </div>
          </KwsSurface>
        ) : null}

        <p className="px-1 font-sans text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
          Benachrichtigungen werden auf diesem Gerät und in deinem Konto gespeichert.
        </p>
      </div>
    </DashboardPageLayout>
  );
};

export default NotificationSettings;
