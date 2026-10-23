import type { summarizeDashboard } from '@/lib/setterDashboard';
import type { SetterDashboardData } from '@/lib/setterDashboard';

type Summary = ReturnType<typeof summarizeDashboard>;
export const MIN_REVIEW_VOTES = 5;
export function dashboardAreas(data?: SetterDashboardData) {
  return [...new Set([...(data?.knownAreas ?? []),
    ...[...new Set(data?.boulders.flatMap(b => b.areas) ?? [])].sort((a, b) => a.localeCompare(b, 'de'))])];
}
export type ReviewSignal = { kind: 'grade' | 'rating' | 'missing'; label: string; evidence: string };

/** Read-only review hints; thresholds are explained in the dashboard's data dialog. */
export function reviewDashboard(summary: Summary, now: number) {
  const rows = summary.rows.map(row => {
    const created = row.createdAt ? Date.parse(row.createdAt) : NaN;
    const ageDays = Number.isFinite(created) && created <= now ? Math.floor((now - created) / 86_400_000) : null;
    const signals: ReviewSignal[] = [];
    if (row.gradeCount >= MIN_REVIEW_VOTES) {
      const direction = row.votes.too_hard >= row.votes.too_easy ? 'too_hard' : 'too_easy';
      if (row.votes[direction] / row.gradeCount >= 0.6) signals.push({
        kind: 'grade', label: 'Grad prüfen',
        evidence: `${row.votes[direction]} von ${row.gradeCount} finden ihn ${direction === 'too_hard' ? 'zu schwer' : 'zu leicht'}`,
      });
    }
    if (row.ratingCount >= MIN_REVIEW_VOTES && row.average !== null && row.average <= 2.5) signals.push({
      kind: 'rating', label: 'Bewertung ansehen',
      evidence: `Ø ${row.average.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} aus ${row.ratingCount} Bewertungen`,
    });
    if (!row.feedbackCount && ageDays !== null && ageDays >= 7) signals.push({
      kind: 'missing', label: 'Feedback fehlt', evidence: `Vor ${ageDays} Tagen angelegt · noch ohne Rückmeldung`,
    });
    return { ...row, ageDays, signals };
  });
  const priority = { grade: 0, rating: 1, missing: 2 };
  const attention = rows.filter(row => row.signals.some(signal => signal.kind !== 'missing')).sort((a, b) =>
    priority[a.signals[0].kind] - priority[b.signals[0].kind]
    || b.gradeCount - a.gradeCount || b.ratingCount - a.ratingCount
    || (b.ageDays ?? 0) - (a.ageDays ?? 0) || a.name.localeCompare(b.name, 'de'));
  return { ...summary, rows, attention,
    missingFeedback: rows.filter(row => row.signals.some(signal => signal.kind === 'missing')).length,
    totalFeedback: summary.ratingCount + summary.gradeCount + summary.comments,
    withoutFeedback: rows.filter(row => !row.feedbackCount).length,
    newCount: rows.filter(row => row.ageDays !== null && row.ageDays < 7).length,
  };
}

export type ReviewRow = ReturnType<typeof reviewDashboard>['rows'][number];
export type ReviewView = 'all' | 'review' | 'none';
export type ReviewSort = 'feedback' | 'best' | 'grade' | 'oldest';

export function selectDashboardRows(rows: ReviewRow[], options: { view: ReviewView; grade: number | null | 'all'; search: string; sort: ReviewSort }) {
  const search = options.search.trim().toLocaleLowerCase('de');
  return rows.filter(row =>
    (options.view === 'all' || (options.view === 'review' ? row.signals.some(signal => signal.kind !== 'missing') : row.feedbackCount === 0))
    && (options.grade === 'all' || row.difficulty === options.grade)
    && (!search || `${row.name} ${row.sector}`.toLocaleLowerCase('de').includes(search))
    && (options.sort !== 'best' || row.ratingCount >= MIN_REVIEW_VOTES))
    .sort((a, b) => {
      const difference = options.sort === 'best' ? (b.average ?? -1) - (a.average ?? -1) || b.ratingCount - a.ratingCount
        : options.sort === 'grade' ? (a.difficulty ?? 99) - (b.difficulty ?? 99)
        : options.sort === 'oldest' ? (b.ageDays ?? -1) - (a.ageDays ?? -1)
        : b.feedbackCount - a.feedbackCount;
      return difference || a.name.localeCompare(b.name, 'de');
    });
}
