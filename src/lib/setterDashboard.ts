import type { BoulderGradeFeedback } from '@/types/community';

export type DashboardBoulder = {
  id: string;
  name: string;
  difficulty: number | null;
  sector: string;
  areas: string[];
  thumbnailUrl?: string;
};
export type DashboardRating = { id: string; boulder_id: string; rating: number };
export type DashboardGradeVote = { id: string; boulder_id: string; feedback: BoulderGradeFeedback };
export type DashboardComment = { id: string; boulder_id: string };
export type SetterDashboardData = {
  boulders: DashboardBoulder[];
  ratings: DashboardRating[];
  grades: DashboardGradeVote[];
  comments: DashboardComment[];
};

export function summarizeDashboard(data: SetterDashboardData, area = 'all') {
  const boulders = [...new Map(data.boulders.map(b => [b.id, b])).values()]
    .filter(b => area === 'all' || b.areas.includes(area));
  const rows = boulders.map(boulder => ({ ...boulder, ratingCount: 0, ratingSum: 0, commentCount: 0,
    votes: { too_easy: 0, just_right: 0, too_hard: 0 } }));
  const index = new Map(rows.map(row => [row.id, row]));
  const stars = [0, 0, 0, 0, 0];
  for (const vote of data.ratings) {
    const row = index.get(vote.boulder_id);
    if (!row || !Number.isInteger(vote.rating) || vote.rating < 1 || vote.rating > 5) continue;
    row.ratingCount++; row.ratingSum += vote.rating; stars[vote.rating - 1]++;
  }
  for (const vote of data.grades) {
    const row = index.get(vote.boulder_id);
    if (row && Object.prototype.hasOwnProperty.call(row.votes, vote.feedback)) row.votes[vote.feedback]++;
  }
  for (const comment of data.comments) {
    const row = index.get(comment.boulder_id);
    if (row) row.commentCount++;
  }
  const enriched = rows.map(row => {
    const gradeCount = Object.values(row.votes).reduce((a, b) => a + b, 0);
    return { ...row, gradeCount, feedbackCount: row.ratingCount + row.commentCount + gradeCount,
      average: row.ratingCount ? row.ratingSum / row.ratingCount : null };
  });
  const ratingCount = stars.reduce((a, b) => a + b, 0);
  const gradeCounts = { too_easy: 0, just_right: 0, too_hard: 0 };
  enriched.forEach(row => { for (const key of Object.keys(gradeCounts) as BoulderGradeFeedback[]) gradeCounts[key] += row.votes[key]; });
  return { rows: enriched, stars, ratingCount, gradeCounts,
    average: ratingCount ? enriched.reduce((sum, row) => sum + row.ratingSum, 0) / ratingCount : null,
    covered: enriched.filter(row => row.feedbackCount > 0).length,
    comments: enriched.reduce((sum, row) => sum + row.commentCount, 0),
    gradeCount: Object.values(gradeCounts).reduce((a, b) => a + b, 0),
    distribution: [...Array.from({ length: 8 }, (_, i) => i + 1), null].map(grade => ({
      grade, count: enriched.filter(row => row.difficulty === grade).length,
    })),
  };
}
