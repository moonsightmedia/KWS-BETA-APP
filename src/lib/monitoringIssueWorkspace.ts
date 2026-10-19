import type { LaunchIssue } from './launchMonitoring';
import { monitoringPlatformName, monitoringVersionName } from './monitoringIssueGuide';

export type IssueStatusFilter = 'active' | 'open' | 'acknowledged' | 'regressed' | 'resolved' | 'all';
export type IssueSourceFilter = 'all' | 'app' | 'sentry';
export type IssueSort = 'priority' | 'latest' | 'oldest';
export type IssueWorkspaceState = { search: string; source: IssueSourceFilter; status: IssueStatusFilter; sort: IssueSort };
export const defaultIssueWorkspace: IssueWorkspaceState = { search: '', source: 'all', status: 'active', sort: 'priority' };

export const issueStatusOptions = [
  { value: 'active', label: 'Aktiv' },
  { value: 'open', label: 'Neu & offen' },
  { value: 'acknowledged', label: 'In Arbeit' },
  { value: 'regressed', label: 'Erneut aufgetreten' },
  { value: 'resolved', label: 'Behoben' },
  { value: 'all', label: 'Alle' },
] as const;

export function issueMatchesStatus(issue: LaunchIssue, status: IssueStatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'active') return !['resolved', 'ignored'].includes(issue.status);
  if (status === 'regressed') return issue.regression;
  if (status === 'open') return ['open', 'unresolved', 'regressed'].includes(issue.status);
  return issue.status === status;
}

export function issueListPresentation(issue: LaunchIssue) {
  let title = issue.title;
  let context = issue.source === 'sentry' ? 'Sentry' : 'App-Diagnose';
  if (/^AbortError\b/i.test(title)) {
    title = 'Abgebrochener Vorgang gemeldet';
    context += ' · Auswirkung noch ungeklärt';
  } else if (/^Sentry-Problem\b/i.test(title) || /^[A-Za-z]+(?:Error|Exception)\b/.test(title) || title.length > 160) {
    title = 'Technischer Fehler gemeldet';
    context += ' · Details zur Einordnung öffnen';
  }
  const platform = monitoringPlatformName(issue.platform);
  const version = monitoringVersionName(issue.release);
  const devices = issue.affected_devices.toLocaleString('de-DE');
  const occurrences = issue.occurrences.toLocaleString('de-DE');
  return {
    title,
    context,
    platform: platform === 'Nicht eindeutig zugeordnet' ? 'Plattform nicht gemeldet' : platform,
    version: version === 'Nicht angegeben' ? 'Version nicht gemeldet' : `Version ${version}`,
    reach: issue.source === 'sentry'
      ? issue.affected_devices > 0 ? `${devices} Nutzerreferenzen` : 'Betroffene Geräte unbekannt'
      : `${devices} ${issue.affected_devices === 1 ? 'betroffenes Gerät' : 'betroffene Geräte'}`,
    volume: `${occurrences} ${issue.occurrences === 1 ? 'Meldung' : 'Meldungen'}`,
    basis: issue.source === 'sentry' ? 'Gesamter Problemverlauf' : 'Gewählter Zeitraum',
  };
}

export function filterWorkspaceIssues(issues: LaunchIssue[], options: IssueWorkspaceState): LaunchIssue[] {
  const words = options.search.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
  const severityRank: Record<string, number> = { fatal: 6, critical: 6, high: 5, error: 4, warning: 3, info: 2 };
  const priority = (issue: LaunchIssue) => (issue.regression ? 20 : 0) + (severityRank[issue.severity] || 1);
  return issues.filter(issue => {
    if (options.source !== 'all' && issue.source !== options.source) return false;
    if (!issueMatchesStatus(issue, options.status)) return false;
    const display = issueListPresentation(issue);
    const searchable = [issue.title, issue.fingerprint, issue.platform, issue.release, display.title, display.platform, display.version, display.context].join(' ').toLocaleLowerCase('de');
    return words.every(word => searchable.includes(word));
  }).sort((first, second) => {
    if (options.sort === 'priority') {
      const difference = priority(second) - priority(first);
      if (difference) return difference;
    }
    const difference = options.sort === 'oldest'
      ? Date.parse(first.first_seen_at) - Date.parse(second.first_seen_at)
      : Date.parse(second.last_seen_at) - Date.parse(first.last_seen_at);
    return difference || first.fingerprint.localeCompare(second.fingerprint);
  });
}
