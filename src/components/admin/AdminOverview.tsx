import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { LiveMonitoringPanel } from '@/components/admin/LiveMonitoringPanel';
import { loadAdminOverview, type AdminOverviewData, type AdminOverviewSource } from '@/lib/adminOverview';
import { defaultLaunchFilters, LaunchMonitoringError, type MonitoringConnection } from '@/lib/launchMonitoring';

const links = {
  users: '/admin?tab=users', hall: '/admin?tab=settings', deletions: '/admin?tab=users&usersView=deletions',
  comments: '/admin?tab=moderation&moderationView=comments', reports: '/admin?tab=moderation&moderationView=reports',
  feedback: '/admin?tab=feedback', errors: '/admin?tab=monitoring&monitoringView=errors&monitoringDays=30',
  uploads: '/admin?tab=monitoring&monitoringView=uploads', notifications: '/admin?tab=monitoring&monitoringView=notifications',
  activity: '/admin?tab=monitoring&monitoringView=activity', monitoring: '/admin?tab=monitoring',
};
const sourceNames = { collector: 'App-Diagnose', sentry: 'Native Fehler · Sentry', alerts: 'Fehleralarme', stores: 'Offizielle Storezahlen' };
const sourceStates = { ready: 'Bereit', empty: 'Noch keine Daten', unconfigured: 'Nicht eingerichtet', stale: 'Veraltet', error: 'Nicht verfügbar' };
const number = (value: number | null) => value === null ? 'Nicht verfügbar' : value.toLocaleString('de-DE');
const dateTime = (value: string) => new Date(value).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

function OverviewLink({ to, children, label }: { to: string; children: ReactNode; label?: string }) {
  return <Link to={to} aria-label={label} className="inline-flex min-h-11 items-center gap-2 rounded-kws-control text-sm font-medium text-foreground hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{children}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>;
}

function Metrics({ rows }: { rows: Array<[string, number | null]> }) {
  return <dl className="divide-y divide-border/50">{rows.map(([label, value]) => <div key={label} className="flex min-h-10 items-center justify-between gap-4 py-2"><dt className="min-w-0 text-sm text-muted-foreground">{label}</dt><dd className="max-w-[50%] shrink-0 break-words text-right text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{number(value)}</dd></div>)}</dl>;
}

function OverviewSection({ title, to, children, note }: { title: string; to: string; children: ReactNode; note?: string }) {
  return <KwsSurface className="flex min-w-0 flex-col p-4"><div className="mb-1 flex flex-wrap items-center justify-between gap-x-3"><h2 className="text-base font-semibold">{title}</h2><OverviewLink to={to} label={`${title} öffnen`}>Öffnen</OverviewLink></div>{children}{note && <p className="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>}</KwsSurface>;
}

function WorkQueue({ data, stale }: { data: AdminOverviewData; stale: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const work = [
    { label: 'Überfällige Löschanträge', count: data.users.deletions_overdue, to: links.deletions, urgent: true },
    { label: 'Weitere Löschanträge', count: Math.max(0, data.users.deletions_pending - data.users.deletions_overdue), to: links.deletions },
    { label: 'Kommentare zur Freigabe', count: data.moderation.comments_pending, to: links.comments },
    { label: 'Offene Inhaltsmeldungen', count: data.moderation.reports_open, to: links.reports },
    { label: 'Aktive Rückmeldungen', count: data.feedback.people_active, to: links.feedback },
    { label: 'Aktive App-Fehlergruppen', count: data.monitoring.app_active, to: links.errors },
    { label: 'Aktive Sentry-Probleme', count: data.monitoring.sentry_active, to: links.errors },
    { label: 'Fehlgeschlagene Uploadversuche · 24 Std.', count: data.uploads.failed_24h, to: links.uploads },
    { label: 'Videos mit Fehlerstatus', count: data.uploads.video_failed_now, to: links.uploads },
    { label: 'Vom Push-Dienst abgelehnte Versuche · 24 Std.', count: data.notifications.provider_rejected_24h, to: links.notifications },
    { label: 'Fehlgeschlagene Mitteilungsversuche · 24 Std.', count: data.notifications.failed_24h, to: links.notifications },
  ].filter(item => item.count !== null && item.count > 0);
  return <KwsSurface className="min-w-0 overflow-hidden" data-testid="admin-work-queue"><div className="px-4 pb-2 pt-4"><h2 className="text-base font-semibold">Handlungsbedarf</h2><p className="mt-1 text-xs text-muted-foreground">{stale ? 'Letzter geladener Stand · zuerst aktualisieren.' : 'Offene Arbeit, direkt im zuständigen Bereich.'}</p></div>
    {work.length ? <><ul className="divide-y divide-border/50">{work.slice(0, expanded ? undefined : 5).map(item => <li key={item.label}><Link to={item.to} className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className={`min-w-0 flex-1 break-words text-sm ${item.urgent ? 'font-semibold text-destructive' : ''}`}>{item.label}</span><span className={`min-w-7 rounded-kws-badge px-2 py-1 text-center text-sm font-semibold tabular-nums ${item.urgent ? 'bg-destructive/10 text-destructive' : 'bg-secondary'}`}>{number(item.count)}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link></li>)}</ul>{work.length > 5 && <div className="px-4 pb-3"><Button variant="ghost" className="h-auto min-h-11 whitespace-normal text-left" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Weniger anzeigen' : `${work.length - 5} weitere Aufgabenbereiche`}<ChevronDown className={`h-4 w-4 shrink-0 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" /></Button></div>}</> : <p className="flex items-start gap-2 px-4 pb-4 pt-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />{stale ? 'Im letzten Stand waren keine offenen Aufgaben erfasst.' : 'In den verfügbaren Bereichen sind keine offenen Aufgaben erfasst.'}</p>}
    {data.monitoring.sentry_active === null && <p className="border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">Sentry konnte nicht bestätigt werden und ist hier nicht mitgezählt.</p>}
  </KwsSurface>;
}

function SourceRow({ name, source }: { name: string; source: AdminOverviewSource }) {
  return <div className="py-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><dt className="font-medium">{name}</dt><dd className={source.state === 'error' || source.state === 'stale' ? 'text-destructive' : 'text-muted-foreground'}>{sourceStates[source.state]}</dd></div>{source.last_success_at && <p className="mt-1 text-xs text-muted-foreground">Zuletzt bestätigt {dateTime(source.last_success_at)}</p>}</div>;
}

export function AdminOverview({ connection, accountId }: { connection: MonitoringConnection; accountId: string }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now);
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-overview', accountId], queryFn: ({ signal }) => loadAdminOverview(connection, signal),
    enabled: Boolean(connection.token && accountId), retry: false, staleTime: 30_000,
    refetchInterval: 60_000, refetchIntervalInBackground: false,
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const denied = !connection.token || !accountId || error instanceof LaunchMonitoringError && error.kind === 'permission';
  const snapshot = denied ? undefined : data;
  const stale = Boolean(snapshot && (now - Date.parse(snapshot.generated_at) > 120_000 || error));
  const errorMessage = denied ? 'Bitte erneut als Administrator anmelden.' : error instanceof LaunchMonitoringError && error.kind === 'unconfigured'
    ? 'Die Admin-Übersicht ist auf diesem Server noch nicht eingerichtet. Es werden keine Nullwerte als Ersatz angezeigt.'
    : error instanceof Error ? error.message : 'Die Admin-Übersicht konnte nicht geladen werden. Bitte erneut versuchen.';
  return <div className="space-y-5" data-testid="admin-overview">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground" role="status">{denied ? 'Anmeldung erforderlich' : isFetching ? snapshot ? 'Wird aktualisiert …' : 'Übersicht wird geladen …' : snapshot ? `Stand ${dateTime(snapshot.generated_at)} · Aktualisierung jede Minute` : 'Noch kein bestätigter Stand'}</p></div><Button variant="secondary" onClick={() => void refetch()} disabled={isFetching || denied} aria-label="Admin-Übersicht aktualisieren"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />Aktualisieren</Button></div>
    {(error || denied) && <KwsSurface role="alert" className="space-y-2 p-4"><p className="text-sm font-semibold">{snapshot ? 'Aktualisierung fehlgeschlagen' : 'Übersicht nicht verfügbar'}</p><p className="text-sm text-muted-foreground">{errorMessage}</p>{snapshot && <p className="text-xs text-muted-foreground">Die angezeigten Zahlen stammen aus dem letzten erfolgreichen Abruf.</p>}{!denied && <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Erneut versuchen</Button>}</KwsSurface>}
    {!snapshot && !error && !denied && <KwsSurface role="status" aria-label="Admin-Kennzahlen werden geladen" className="space-y-4 p-4"><div className="h-4 w-40 rounded-kws-badge bg-secondary motion-safe:animate-pulse" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{['Konten', 'Halle', 'Offene Aufgaben'].map(label => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 h-6 w-16 rounded-kws-badge bg-secondary motion-safe:animate-pulse" /></div>)}</div></KwsSurface>}
    {snapshot && <>
      {stale && !error && <p role="alert" className="rounded-kws-control bg-secondary p-3 text-sm">Dieser Stand ist älter als zwei Minuten. Bitte aktualisieren, bevor du Aufgaben beurteilst.</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><LiveMonitoringPanel connection={connection} accountId={accountId} filters={defaultLaunchFilters} compact onShowAll={() => navigate(links.activity)} /><WorkQueue data={snapshot} stale={stale} /></div>
      <section aria-labelledby="admin-key-figures" className="space-y-3"><div><h2 id="admin-key-figures" className="text-base font-semibold">Alle Bereiche im Blick</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Bestände und offene Aufgaben: aktueller Stand. Angaben mit „24 Std.“: letzte 24 Stunden bis {dateTime(snapshot.period_end)}.</p></div>
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OverviewSection title="Konten" to={links.users} note="Neue Konten sind Registrierungen – keine Store-Downloads."><Metrics rows={[
            ['Konten insgesamt', snapshot.users.total], ['Neue Konten · 24 Std.', snapshot.users.new_24h], ['Administratoren', snapshot.users.admins], ['Setter', snapshot.users.setters], ['Offene Löschanträge', snapshot.users.deletions_pending],
          ]} /></OverviewSection>
          <OverviewSection title="Halle" to={links.hall}><Metrics rows={[
            ['Hängende Boulder', snapshot.hall.boulders_hanging], ['Abgeschraubte Boulder', snapshot.hall.boulders_removed], ['Aktive Hallenbereiche', snapshot.hall.areas_active], ['Aktive Sektoren', snapshot.hall.sectors_active], ['Geplante Sektorarbeiten', snapshot.hall.scheduled_resets],
          ]} /></OverviewSection>
          <OverviewSection title="Rückmeldungen & Moderation" to={links.feedback}><Metrics rows={[
            ['Aktive Rückmeldungen', snapshot.feedback.people_active], ['Ältere automatische Fehler', snapshot.feedback.legacy_errors_active], ['Kommentare zur Freigabe', snapshot.moderation.comments_pending], ['Offene Inhaltsmeldungen', snapshot.moderation.reports_open],
          ]} /><div className="flex flex-wrap gap-x-4"><OverviewLink to={links.comments}>Kommentare</OverviewLink><OverviewLink to={links.reports}>Meldungen</OverviewLink></div></OverviewSection>
          <OverviewSection title="Fehler & Uploads" to={links.errors} note="Aktive Fehler zählen über den gesamten Bestand; die Fehlerliste startet mit 30 Tagen. Fehlergruppen sind keine Nutzerzahlen, Uploadversuche keine Dateien."><Metrics rows={[
            ['Aktive App-Fehlergruppen', snapshot.monitoring.app_active], ['Aktive Sentry-Probleme', snapshot.monitoring.sentry_active], ['Uploadfehler · 24 Std.', snapshot.uploads.failed_24h], ['Videos in Vorbereitung', snapshot.uploads.processing_now], ['Videos mit Fehlerstatus', snapshot.uploads.video_failed_now],
          ]} /><OverviewLink to={links.uploads}>Uploads prüfen</OverviewLink></OverviewSection>
          <OverviewSection title="Mitteilungen" to={links.notifications} note="Gezählt werden gespeicherte Versandschritte, nicht einzelne Mitteilungen. Vom Push-Dienst angenommen heißt nicht zugestellt oder auf dem Gerät angezeigt. Öffnungen werden getrennt erfasst."><Metrics rows={[
            ['Versandversuche gestartet · 24 Std.', snapshot.notifications.created_24h], ['Vom Push-Dienst angenommen · 24 Std.', snapshot.notifications.provider_accepted_24h], ['Vom Push-Dienst abgelehnt · 24 Std.', snapshot.notifications.provider_rejected_24h], ['Fehlgeschlagene Versuche · 24 Std.', snapshot.notifications.failed_24h], ['Öffnungen erfasst · 24 Std.', snapshot.notifications.opened_24h],
          ]} /></OverviewSection>
          <OverviewSection title="Datenquellen" to={links.monitoring} note="Nicht verfügbare Quellen sind keine Nullwerte. Offizielle Storezahlen werden nicht aus App-Starts oder Registrierungen geschätzt."><dl className="divide-y divide-border/50">{(Object.keys(sourceNames) as Array<keyof typeof sourceNames>).map(key => <SourceRow key={key} name={sourceNames[key]} source={snapshot.sources[key]} />)}</dl></OverviewSection>
        </div>
      </section>
    </>}
  </div>;
}
