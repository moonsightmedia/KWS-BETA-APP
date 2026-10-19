import { useLayoutEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Copy, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadLaunchIssueEvents, safeMonitoringLink, updateLaunchIssueStatus, type LaunchIssue, type MonitoringConnection } from '@/lib/launchMonitoring';
import { monitoringIssueGuide, monitoringPlatformName, monitoringSupportReport, monitoringVersionName } from '@/lib/monitoringIssueGuide';
import { LaunchIssueActors } from './LaunchIssueActors';

const dateTime = (value: string) => new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const statusNames: Record<string, string> = { open: 'Offen', unresolved: 'Offen', acknowledged: 'In Bearbeitung', resolved: 'Behoben', ignored: 'Ignoriert' };

export function LaunchIssueDetail({ issue, connection, onClose, onSaved, onCloseAutoFocus, onDirtyChange, onBusyChange }: { issue: LaunchIssue; connection: MonitoringConnection; onClose: () => void; onSaved: () => void; onCloseAutoFocus: () => void; onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void }) {
  const [status, setStatus] = useState(['open', 'acknowledged', 'resolved'].includes(issue.status) ? issue.status : 'open');
  const [fixedRelease, setFixedRelease] = useState(issue.fixed_release || '');
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [confirmed, setConfirmed] = useState({ status: ['open', 'acknowledged', 'resolved'].includes(issue.status) ? issue.status : 'open', fixedRelease: issue.fixed_release || '', regression: issue.regression });
  const dirty = issue.source === 'app' && (status !== confirmed.status || fixedRelease !== confirmed.fixedRelease);
  useLayoutEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useLayoutEffect(() => { onBusyChange(saving); }, [saving, onBusyChange]);
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['admin-issue-events', issue.fingerprint, connection.token], queryFn: ({ signal }) => loadLaunchIssueEvents(connection, issue.fingerprint, signal), enabled: issue.source === 'app' && Boolean(connection.token), retry: false, gcTime: 0, staleTime: 0 });
  const guide = monitoringIssueGuide(issue, data);
  const supportReport = monitoringSupportReport(issue, data);
  const permalink = safeMonitoringLink(issue.permalink);
  const validFix = /\d+\.\d+\.\d+/.test(fixedRelease);
  const save = async () => {
    setSaving(true); setWriteError(''); setSaved(false);
    try {
      const confirmedFixed = status === 'resolved' ? fixedRelease.trim() : '';
      await updateLaunchIssueStatus(connection, issue.fingerprint, status, status === 'resolved' ? confirmedFixed : null);
      setFixedRelease(confirmedFixed); setConfirmed({ status, fixedRelease: confirmedFixed, regression: false }); setSaved(true); onSaved();
    }
    catch (failure) { setWriteError(failure instanceof Error ? failure.message : 'Status konnte nicht gespeichert werden.'); }
    finally { setSaving(false); }
  };
  const copy = async () => {
    setCopied(false); setCopyFailed(false);
    try { await navigator.clipboard.writeText(supportReport); setCopied(true); }
    catch { setCopyFailed(true); }
  };
  return <DialogContent scrollLayout="contained" className="flex max-h-[88dvh] flex-col gap-0 p-0 md:max-w-2xl" onCloseAutoFocus={event => { event.preventDefault(); onCloseAutoFocus(); }} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onInteractOutside={event => { if (saving) event.preventDefault(); }}>
    <DialogHeader className="shrink-0 border-b border-border/50 p-4 text-left sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{issue.source === 'sentry' ? 'Externer Fehlerbericht' : 'Automatisch gemeldet'}</span><span>·</span><span className={confirmed.regression ? 'font-semibold text-destructive' : 'font-semibold text-foreground'}>{confirmed.regression ? 'Erneut aufgetreten' : statusNames[issue.source === 'sentry' ? issue.status : confirmed.status] || 'Status unbekannt'}</span></p>
          <DialogTitle>{guide.heading}</DialogTitle>
          {['fatal', 'critical', 'high'].includes(issue.severity) && <p className="text-xs font-semibold text-destructive">Kritischer Fehler · zeitnah an die Technik weitergeben</p>}
          <DialogDescription>Zuletzt gemeldet am {dateTime(issue.last_seen_at)}</DialogDescription>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label="Fehleransicht schließen" disabled={saving} onClick={onClose}><X className="h-5 w-5" aria-hidden="true" /></Button>
      </div>
    </DialogHeader>
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
      <section aria-labelledby="issue-meaning" className="space-y-2">
        <h3 id="issue-meaning" className="text-sm font-semibold">Was bedeutet das?</h3>
        <p className="text-sm leading-relaxed">{guide.impact}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{guide.reason}</p>
      </section>
      <section aria-label="Umfang des Problems" className="rounded-kws-control bg-secondary/60 p-3">
        <p className="mb-3 text-xs text-muted-foreground">{issue.source === 'sentry' ? 'Gesamter Problemverlauf in Sentry' : 'Im gewählten Zeitraum'}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {[[issue.source === 'sentry' ? 'Nutzerreferenzen in Sentry' : 'Betroffene Geräte', issue.affected_devices.toLocaleString('de-DE')], ['Fehlermeldungen', issue.occurrences.toLocaleString('de-DE')], ['Plattform', monitoringPlatformName(issue.platform)], ['App-Version', monitoringVersionName(issue.release)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}
        </dl>
      </section>
      <LaunchIssueActors events={error ? undefined : data} external={issue.source === 'sentry'} loading={isLoading} failed={Boolean(error)} refreshing={isFetching} onRetry={() => void refetch()} />
      <section aria-labelledby="issue-next-step" className="space-y-3">
        <h3 id="issue-next-step" className="text-sm font-semibold">Das kannst du tun</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed marker:text-muted-foreground">{guide.steps.map(step => <li key={step} className="pl-1">{step}</li>)}</ol>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" aria-hidden="true" />Bericht für Technik kopieren</Button>
        {copied && <p role="status" className="text-xs text-primary-ink">Bericht kopiert. Du kannst ihn jetzt an die Technik weitergeben.</p>}
        {copyFailed && <div role="alert" className="space-y-2"><p className="text-xs text-destructive">Kopieren war nicht möglich. Markiere und kopiere den Bericht hier:</p><textarea aria-label="Bericht manuell kopieren" readOnly value={supportReport} rows={6} className="w-full rounded-kws-control border border-border bg-card p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>}
      </section>
      {issue.source === 'sentry' ? <section className="space-y-3 border-t border-border/50 pt-4"><h3 className="text-sm font-semibold">Bearbeitung durch die Technik</h3><p className="text-xs leading-relaxed text-muted-foreground">Dieses Problem wird in Sentry bearbeitet. Der Status wird von dort übernommen. Nutzerreferenzen sind keine bestätigte Anzahl unterschiedlicher Personen.</p>{permalink && <Button asChild variant="secondary"><a href={permalink} target="_blank" rel="noreferrer">In Sentry öffnen<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button>}</section> : <section className="space-y-3 border-t border-border/50 pt-4">
        <div className="space-y-1"><h3 className="text-sm font-semibold">Bearbeitung festhalten</h3><p className="text-xs leading-relaxed text-muted-foreground">Der Status dokumentiert die Bearbeitung. Er repariert die App nicht.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="launch-issue-status">Status</Label><Select value={status} onValueChange={value => { setStatus(value); setSaved(false); }} disabled={saving}><SelectTrigger id="launch-issue-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Offen</SelectItem><SelectItem value="acknowledged">In Bearbeitung</SelectItem><SelectItem value="resolved">Behoben</SelectItem></SelectContent></Select></div>
          {status === 'resolved' && <div className="space-y-1.5"><Label htmlFor="launch-fixed-release">Behoben ab App-Version</Label><Input id="launch-fixed-release" value={fixedRelease} onChange={event => { setFixedRelease(event.target.value); setSaved(false); }} maxLength={120} disabled={saving} placeholder="z. B. 1.0.248" aria-describedby="launch-fixed-release-help" aria-invalid={Boolean(fixedRelease && !validFix)} /><p id="launch-fixed-release-help" className="text-xs leading-relaxed text-muted-foreground">Nur mit von der Technik bestätigter Fixversion. Eine Versionsnummer genügt.</p></div>}
        </div>
        {writeError && <p role="alert" className="text-sm text-destructive">{writeError}</p>}
        {saved && <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary-ink" aria-hidden="true" />Status gespeichert.</p>}
      </section>}
      <details className="border-t border-border/50 pt-1">
        <summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Technische Details</summary>
        <dl className="space-y-3 pb-4 text-xs">{[['Originalmeldung', issue.title], ['Vollständiger Release', issue.release || 'Nicht angegeben'], [issue.source === 'sentry' ? 'Erste Meldung in Sentry' : 'Erste Meldung im Zeitraum', dateTime(issue.first_seen_at)], ['Fehlergruppe', issue.fingerprint]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
        {issue.source === 'app' && <section className="space-y-2"><h3 className="text-sm font-semibold">Letzte Einzelberichte</h3><p className="text-xs text-muted-foreground">Bis zu 50 Meldungen, auch außerhalb des gewählten Zeitraums.</p>{isLoading ? <p role="status" className="text-sm text-muted-foreground">Berichte werden geladen …</p> : error ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">Einzelberichte konnten nicht geladen werden.</p><Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>Erneut laden</Button></div> : data?.length ? <ul className="divide-y divide-border/50">{data.map(event => <li key={event.event_id}><details><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{dateTime(event.occurred_at)} · {monitoringPlatformName(event.platform)} · {monitoringVersionName(event.release)}</summary><dl className="space-y-2 pb-3 text-xs">{[['Supportreferenz', event.event_id], ['Servereingang', dateTime(event.received_at)], ['Installation', event.installation_ref || 'Nicht zugeordnet'], ['Konto', event.user_ref || 'Nicht zugeordnet'], ['Sitzung', event.session_ref || 'Nicht zugeordnet'], ['Vollständiger Release', event.release]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}</dl><pre className="mb-3 whitespace-pre-wrap break-all rounded-kws-control bg-secondary/60 p-3 text-xs">{JSON.stringify(event.props, null, 2)}</pre></details></li>)}</ul> : <p className="text-sm text-muted-foreground">Keine Einzelberichte mehr verfügbar.</p>}</section>}
      </details>
      {issue.source === 'app' && error && <p role="alert" className="text-xs text-destructive">Technische Einzelberichte konnten nicht geladen werden. Unter „Technische Details“ kannst du es erneut versuchen.</p>}
    </div>
    <DialogFooter className="grid shrink-0 grid-cols-2 gap-3 border-t border-border/50 p-4 sm:flex sm:space-x-0"><Button variant="secondary" disabled={saving} onClick={onClose}>Schließen</Button>{issue.source === 'app' && <Button onClick={() => void save()} disabled={saving || !dirty || (status === 'resolved' && !validFix)}>{saving ? 'Wird gespeichert …' : 'Status speichern'}</Button>}</DialogFooter>
  </DialogContent>;
}
