import { CheckCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LaunchIssue } from '@/lib/launchMonitoring';
import { defaultIssueWorkspace, filterWorkspaceIssues, issueMatchesStatus, issueStatusOptions, type IssueSort, type IssueSourceFilter, type IssueStatusFilter, type IssueWorkspaceState } from '@/lib/monitoringIssueWorkspace';
import { cn } from '@/lib/utils';
import { AdminSearchField } from './AdminSearchField';
import { LaunchIssueList } from './LaunchIssueList';

export function LaunchErrorWorkspace({ issues, value, onChange, onSelect, sourceUnavailable, providerHidden, onClearScope }: { issues: LaunchIssue[]; value: IssueWorkspaceState; onChange: (value: IssueWorkspaceState) => void; onSelect: (issue: LaunchIssue) => void; sourceUnavailable: boolean; providerHidden: boolean; onClearScope: () => void }) {
  const { search, source, status, sort } = value;
  const setSearch = (search: string) => onChange({ ...value, search });
  const setStatus = (status: IssueStatusFilter) => onChange({ ...value, status });
  const setSource = (source: IssueSourceFilter) => onChange({ ...value, source });
  const setSort = (sort: IssueSort) => onChange({ ...value, sort });
  const matching = filterWorkspaceIssues(issues, { search, source, sort, status: 'all' });
  const visible = matching.filter(issue => issueMatchesStatus(issue, status));
  const customFilter = Boolean(search || source !== 'all' || status !== 'active');
  const reset = () => onChange({ ...defaultIssueWorkspace, sort });
  return <section aria-label="Fehler bearbeiten" className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold">Fehler bearbeiten</h2><p className="hidden text-xs text-muted-foreground sm:block">Öffnen → prüfen → Bearbeitung dokumentieren</p></div>
    {providerHidden && <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-kws-control bg-secondary px-3 py-1 text-xs"><p>Sentry ist mit Plattform- oder Versionsfilter ausgeblendet.</p><Button variant="ghost" onClick={onClearScope}>Diese Filter aufheben</Button></div>}
    <KwsSurface className="overflow-hidden">
      <div className="border-b border-border/50 p-4 lg:px-5">
        <div role="group" aria-label="Fehlerstatus" className="mb-3 hidden flex-wrap gap-1 lg:flex">{issueStatusOptions.map(option => <Button key={option.value} variant="ghost" aria-pressed={status === option.value} onClick={() => setStatus(option.value)} className={cn('px-3', status === option.value && 'bg-primary/10 font-semibold text-primary-ink')}>
          {option.label}<span className="text-xs tabular-nums opacity-75">{sourceUnavailable ? '–' : matching.filter(issue => issueMatchesStatus(issue, option.value)).length}</span>
        </Button>)}</div>
        <div className="mb-3 lg:hidden"><Select value={status} onValueChange={value => setStatus(value as IssueStatusFilter)}><SelectTrigger aria-label="Fehlerstatus"><SelectValue /></SelectTrigger><SelectContent>{issueStatusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}{!sourceUnavailable && ` (${matching.filter(issue => issueMatchesStatus(issue, option.value)).length})`}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_165px_205px]">
          <AdminSearchField value={search} onChange={setSearch} placeholder="Probleme suchen …" label="Fehlergruppen filtern" />
          <div className="grid grid-cols-2 gap-2 lg:contents">
            <Select value={source} onValueChange={value => setSource(value as IssueSourceFilter)}><SelectTrigger aria-label="Fehlerquelle" className="h-12 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alle Quellen</SelectItem><SelectItem value="app">App-Diagnose</SelectItem><SelectItem value="sentry">Sentry</SelectItem></SelectContent></Select>
            <Select value={sort} onValueChange={value => setSort(value as IssueSort)}><SelectTrigger aria-label="Fehler sortieren" className="h-12 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">Nach Priorität</SelectItem><SelectItem value="latest">Zuletzt aufgetreten</SelectItem><SelectItem value="oldest">Zuerst aufgetreten</SelectItem></SelectContent></Select>
          </div>
        </div>
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 px-4 py-1 text-xs text-muted-foreground lg:px-5"><p role="status">{sourceUnavailable ? 'Fehlerquelle derzeit nicht verfügbar' : `${visible.length} von ${issues.length} geladenen Problemen`}</p>{customFilter && <Button variant="ghost" className="px-2 text-xs" onClick={reset}>Filter zurücksetzen</Button>}</div>
      {sourceUnavailable ? <div className="space-y-1 border-t border-border/50 p-5"><p className="text-sm font-semibold">Keine verlässliche Fehlerübersicht</p><p className="text-sm text-muted-foreground">Die Fehlerdiagnose konnte nicht abgefragt werden. Bitte oben erneut aktualisieren.</p></div>
        : visible.length ? <LaunchIssueList issues={visible} onSelect={onSelect} headings />
          : <div className="space-y-2 border-t border-border/50 px-5 py-8"><span className="flex items-center gap-2 text-sm font-semibold">{customFilter || matching.length ? <Search className="h-4 w-4" aria-hidden="true" /> : <CheckCheck className="h-4 w-4 text-primary-ink" aria-hidden="true" />}{customFilter ? 'Keine Fehlergruppen für diesen Filter.' : matching.length ? 'Keine aktiven Probleme in dieser Auswahl' : providerHidden ? 'Keine App-Probleme in dieser Auswahl' : 'Keine Probleme gemeldet'}</span><p className="text-sm text-muted-foreground">{customFilter ? 'Suche oder Filter anpassen, um andere Probleme zu sehen.' : 'Gilt für den gewählten Zeitraum und die verfügbaren Messquellen.'}</p></div>}
    </KwsSurface>
    <details className="text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Wie werden Liste und Priorität ermittelt?</summary><div className="max-w-3xl space-y-2 pb-3 leading-relaxed"><p>Aktiv zeigt offene Probleme und laufende Bearbeitung. Behobene und ignorierte Probleme findest du unter Alle. Anzahlen gelten für die geladenen Probleme und deine Auswahl, nicht für sämtliche Fehler seit App-Start.</p><p>Priorität: erneut aufgetretene Probleme zuerst, dann gemeldeter Schweregrad und letzter Eingang. Das ist eine Sortierhilfe, keine bestätigte Diagnose.</p><p>App-Diagnosen zählen Geräte und Meldungen im Zeitraum. Sentry zählt den gesamten Problemverlauf; Nutzerreferenzen sind keine Gerätezahl. Fehlende Angaben bedeuten nicht null betroffene Nutzer.</p><p>Bis zu 200 Problemgruppen werden geladen. Statusänderungen dokumentieren die Bearbeitung und reparieren die App nicht. Technische Details und Weitergabe findest du nach dem Öffnen eines Problems.</p></div></details>
    {issues.length >= 200 && <p role="alert" className="rounded-kws-control bg-secondary p-3 text-xs">Die Ladegrenze von 200 Problemen ist erreicht. Zeitraum, Plattform oder Version eingrenzen; diese Liste ist nicht vollständig.</p>}
  </section>;
}
