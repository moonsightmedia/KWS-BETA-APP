import { AlertTriangle, Check, ChevronRight, Circle } from 'lucide-react';
import type { LaunchIssue } from '@/lib/launchMonitoring';
import { issueListPresentation } from '@/lib/monitoringIssueWorkspace';
import { cn } from '@/lib/utils';

const severityNames: Record<string, string> = { fatal: 'Kritisch', critical: 'Kritisch', error: 'Fehler', high: 'Hoch', warning: 'Warnung', info: 'Hinweis' };
const statusNames: Record<string, string> = { open: 'Offen', unresolved: 'Offen', acknowledged: 'In Bearbeitung', resolved: 'Behoben', regressed: 'Erneut aufgetreten', ignored: 'Ignoriert' };
const dateTime = (value: string) => new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function LaunchIssueList({ issues, onSelect, headings = false }: { issues: LaunchIssue[]; onSelect: (issue: LaunchIssue) => void; headings?: boolean }) {
  return <>
    {headings && <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_190px_120px_20px] gap-5 border-b border-border/50 bg-secondary/40 px-5 py-3 text-xs font-medium text-muted-foreground lg:grid"><span>Problem / Plattform</span><span>Umfang</span><span>Zuletzt gemeldet</span><span /></div>}
    <ul aria-label="Fehlerliste" className="divide-y divide-border/50">{issues.map(issue => {
      const display = issueListPresentation(issue);
      const resolved = issue.status === 'resolved';
      const urgent = !resolved && (issue.regression || ['fatal', 'critical', 'high'].includes(issue.severity));
      const Icon = resolved ? Check : issue.status === 'ignored' ? Circle : AlertTriangle;
      return <li key={issue.fingerprint}>
        <button type="button" onClick={() => onSelect(issue)} className="group grid w-full grid-cols-[minmax(0,1fr)_16px] gap-x-3 gap-y-3 px-4 py-4 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[minmax(0,1fr)_190px_120px_20px] lg:items-center lg:gap-5 lg:px-5">
          <span className="min-w-0">
            <span className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className={cn('inline-flex items-center gap-1 font-medium', resolved ? 'text-primary-ink' : urgent ? 'text-destructive' : 'text-muted-foreground')}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{resolved ? 'Behoben' : severityNames[issue.severity] || 'Fehler'}</span>
              {!resolved && <span className={cn('text-muted-foreground', issue.regression && 'font-semibold text-destructive')}>{issue.regression ? 'Erneut aufgetreten' : statusNames[issue.status] || issue.status}</span>}
            </span>
            <span className="line-clamp-2 block break-words text-sm font-semibold [overflow-wrap:anywhere]">{display.title}</span>
            <span className="mt-1 block break-words text-xs leading-relaxed text-muted-foreground">{display.context}</span>
            <span className="mt-1 block break-words text-xs text-muted-foreground">{display.platform} · {display.version}</span>
          </span>
          <span className="col-start-1 flex flex-wrap gap-x-2 text-xs leading-relaxed lg:col-start-auto lg:block">
            <span className="font-medium lg:block">{display.reach}</span>
            <span className="text-muted-foreground lg:block">{display.volume}</span>
            {issue.source === 'sentry' && <span className="block w-full text-muted-foreground">{display.basis}</span>}
          </span>
          <span className="col-start-1 block text-xs text-muted-foreground lg:col-start-auto"><span className="lg:hidden">Zuletzt </span><time dateTime={issue.last_seen_at}>{dateTime(issue.last_seen_at)}</time></span>
          <ChevronRight className="col-start-2 row-start-1 h-4 w-4 self-center text-muted-foreground group-hover:text-foreground lg:col-start-auto lg:row-start-auto" aria-hidden="true" />
        </button>
      </li>;
    })}</ul>
  </>;
}
