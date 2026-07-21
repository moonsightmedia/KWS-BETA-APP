import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ExternalLink, Smartphone, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

type SessionRow = {
  device_id: string;
  last_seen_at: string;
  platform: string | null;
  app_version: string | null;
};

type EventRow = {
  name: string;
  boulder_id: string | null;
  created_at: string;
};

type FeedbackRow = { id: string };
type UploadLogRow = { id: string };

async function adminFetch<T>(path: string, accessToken: string): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase config missing');
  }

  const response = await window.fetch(`${supabaseUrl}${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-[#DDE7DF] bg-white p-4 shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
      <div className="flex items-center gap-2 text-[#6E806A]">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="pt-3 text-3xl font-semibold tracking-[-0.04em] text-[#13112B]">{value}</p>
    </div>
  );
}

export function MonitoringDashboard() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const sentryUrl = import.meta.env.VITE_SENTRY_ORG_URL as string | undefined;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-monitoring', accessToken],
    enabled: Boolean(accessToken),
    staleTime: 30_000,
    queryFn: async () => {
      if (!accessToken) throw new Error('Nicht angemeldet');

      const [activeSessions, sessionsToday, feedbackErrors, uploadFails, boulderViews] = await Promise.all([
        adminFetch<SessionRow[]>(
          `/rest/v1/telemetry_sessions?select=device_id,last_seen_at,platform,app_version&last_seen_at=gte.${fiveMinutesAgo}&order=last_seen_at.desc`,
          accessToken,
        ).catch(() => [] as SessionRow[]),
        adminFetch<SessionRow[]>(
          `/rest/v1/telemetry_sessions?select=device_id,last_seen_at&last_seen_at=gte.${dayAgo}`,
          accessToken,
        ).catch(() => [] as SessionRow[]),
        adminFetch<FeedbackRow[]>(
          `/rest/v1/feedback?select=id&type=eq.error&created_at=gte.${dayAgo}`,
          accessToken,
        ).catch(() => [] as FeedbackRow[]),
        adminFetch<UploadLogRow[]>(
          `/rest/v1/upload_logs?select=id&status=eq.failed&updated_at=gte.${dayAgo}`,
          accessToken,
        ).catch(() => [] as UploadLogRow[]),
        adminFetch<EventRow[]>(
          `/rest/v1/telemetry_events?select=name,boulder_id,created_at&name=eq.boulder_view&created_at=gte.${dayAgo}&boulder_id=not.is.null`,
          accessToken,
        ).catch(() => [] as EventRow[]),
      ]);

      const viewsByBoulder = new Map<string, number>();
      for (const event of boulderViews) {
        if (!event.boulder_id) continue;
        viewsByBoulder.set(event.boulder_id, (viewsByBoulder.get(event.boulder_id) || 0) + 1);
      }

      const topBoulders = [...viewsByBoulder.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([boulderId, views]) => ({ boulderId, views }));

      return {
        activeDevices: activeSessions.length,
        sessionsToday: new Set(sessionsToday.map((s) => s.device_id)).size,
        feedbackErrors: feedbackErrors.length,
        uploadFails: uploadFails.length,
        topBoulders,
        activeSessions: activeSessions.slice(0, 20),
      };
    },
  });

  if (isLoading) {
    return <p className="text-sm text-[#6C6A7E]">Monitoring wird geladen…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#E7B7B0] bg-[#FFF4F2] p-4 text-sm text-[#13112B]">
        Monitoring konnte nicht geladen werden. Telemetrie-Tabellen fehlen möglicherweise noch
        (Migration ausführen) oder Telemetrie ist deaktiviert.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#13112B]">Monitoring</h2>
          <p className="pt-1 text-sm text-[#6C6A7E]">
            Aktive Geräte, Boulder-Nutzung und Fehlerübersicht. Stacktraces bleiben in Sentry.
          </p>
        </div>
        {sentryUrl ? (
          <Button asChild variant="outline" className="rounded-xl">
            <a href={sentryUrl} target="_blank" rel="noreferrer">
              Sentry Issues
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aktiv (5 Min)" value={data?.activeDevices ?? 0} icon={Smartphone} />
        <StatCard label="Geräte heute" value={data?.sessionsToday ?? 0} icon={Activity} />
        <StatCard label="Feedback-Fehler 24h" value={data?.feedbackErrors ?? 0} icon={AlertTriangle} />
        <StatCard label="Upload-Fails 24h" value={data?.uploadFails ?? 0} icon={UploadCloud} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DDE7DF] bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6E806A]">
            Top Boulder Views (24h)
          </h3>
          {data?.topBoulders.length ? (
            <ul className="mt-3 space-y-2">
              {data.topBoulders.map((row) => (
                <li key={row.boulderId} className="flex items-center justify-between text-sm text-[#13112B]">
                  <span className="truncate font-mono text-xs">{row.boulderId}</span>
                  <span className="font-semibold">{row.views}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#6C6A7E]">Noch keine View-Events.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#DDE7DF] bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6E806A]">
            Aktive Geräte
          </h3>
          {data?.activeSessions.length ? (
            <ul className="mt-3 space-y-2">
              {data.activeSessions.map((session) => (
                <li key={session.device_id} className="text-sm text-[#13112B]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs">{session.device_id.slice(0, 12)}…</span>
                    <span className="text-xs text-[#6C6A7E]">
                      {session.platform || '?'} · {session.app_version || '?'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#6C6A7E]">Keine aktiven Geräte in den letzten 5 Minuten.</p>
          )}
        </div>
      </div>
    </div>
  );
}
