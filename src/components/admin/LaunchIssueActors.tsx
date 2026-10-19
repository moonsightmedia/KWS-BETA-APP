import { ExternalLink, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LaunchIssueEvent } from '@/lib/launchMonitoring';
import { adminUserPath } from '@/lib/adminNavigation';
import { monitoringPlatformName } from '@/lib/monitoringIssueGuide';

const dateTime = (value: string) => new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function LaunchIssueActors({ events, external, loading, failed, refreshing, onRetry }: { events: LaunchIssueEvent[] | undefined; external: boolean; loading: boolean; failed: boolean; refreshing: boolean; onRetry: () => void }) {
  return <section aria-label="Nutzerzuordnung" className="space-y-2">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4" aria-hidden="true" />Wer war betroffen?</h3>
    {external ? <p className="text-xs leading-relaxed text-muted-foreground">Für diese Sentry-Meldung liegt keine sichere Zuordnung zu einem App-Konto vor. Externe Referenzen werden nicht mit Nutzerprofilen verknüpft.</p>
      : loading ? <p role="status" className="text-xs text-muted-foreground">Zuordnung wird geprüft …</p>
        : failed ? <div role="alert" className="space-y-2"><p className="text-xs text-muted-foreground">Die Nutzerzuordnung konnte nicht geprüft werden.</p><Button variant="secondary" disabled={refreshing} onClick={onRetry}>Zuordnung erneut prüfen</Button></div>
          : !events?.length ? <p className="text-xs text-muted-foreground">Keine Einzelberichte für eine sichere Zuordnung verfügbar.</p>
            : <>
              {events.some(event => !event.actor) && <p role="status" className="text-xs text-muted-foreground">Die Nutzerzuordnung ist für diese Berichte auf dem Server noch nicht verfügbar.</p>}
              <ul className="divide-y divide-border/50 rounded-kws-control bg-secondary/40">{events.map(event => <li key={event.event_id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{event.actor?.state === 'account' ? event.actor.display_name || 'Angemeldetes Konto' : event.actor?.state === 'guest' ? 'Ohne Konto gemeldet' : 'Nicht zugeordnet'}</p>
                    {event.actor?.state === 'account' && event.actor.email && <p className="mt-1 break-all text-xs text-muted-foreground">{event.actor.email}</p>}
                    <p className="mt-1 text-xs text-muted-foreground"><time dateTime={event.occurred_at}>{dateTime(event.occurred_at)}</time> · {monitoringPlatformName(event.platform)}</p>
                  </div>
                  {event.actor?.state === 'account' && event.actor.user_id && <Button asChild variant="ghost" className="shrink-0 px-2 text-xs"><a href={adminUserPath(event.actor.user_id)} target="_blank" rel="noopener noreferrer" aria-label="Nutzerprofil öffnen (neuer Tab)">Nutzerprofil<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></Button>}
                </div>
              </li>)}</ul>
              <p className="text-xs leading-relaxed text-muted-foreground">Zuordnung je Einzelmeldung, bis zu 50 letzte Berichte. Eine Fehlergruppe kann mehrere Nutzer betreffen. „Ohne Konto“ kann auch bedeuten, dass die Anmeldung beim App-Start noch nicht bereit war.</p>
            </>}
  </section>;
}
