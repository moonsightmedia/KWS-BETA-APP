import { dashboardBoulders, dashboardSectors as baseSectors } from './setter-dashboard-data';
export const dashboardSectors = [...baseSectors, { id: 'sector-empty', name: 'Kurze Platte A', area_id: 'area-empty', subarea_code: 'A', area: { id: 'area-empty', name: 'Kurze Platte', slug: 'kurze-platte', sort_order: 6 } }];
const now = Date.parse('2026-10-23T12:00:00Z');
const names: Record<number, string> = { 42: 'Plattenliebe', 62: 'Komet', 80: 'Zwischen den Linien', 96: 'Grüne Kante' };
export const v2Boulders = dashboardBoulders.map((b, i) => ({ ...b, name: names[i] ?? b.name,
  created_at: new Date(now - (i === 96 ? 28 : i % 9 === 0 ? 2 : 8 + i % 42) * 86_400_000).toISOString(),
}));
export const v2Ratings = v2Boulders.slice(0, 92).flatMap((b, i) => {
  const count = i === 62 ? 16 : i === 42 ? 12 : i === 80 ? 1 : i % 16 + 1;
  return Array.from({ length: count }, (_, j) => ({ id: `rating-${String(i).padStart(4, '0')}-${String(j).padStart(2, '0')}`,
    boulder_id: b.id, rating: i === 42 ? [2, 2, 3][j % 3] : i === 80 ? 5 : [5, 4, 4, 5, 3, 4, 5][(i + j) % 7] }));
});
export const v2Grades = v2Boulders.slice(0, 85).flatMap((b, i) => {
  const count = i === 62 ? 12 : i === 42 ? 8 : i % 9 + 1;
  return Array.from({ length: count }, (_, j) => ({ id: `grade-${String(i).padStart(4, '0')}-${String(j).padStart(2, '0')}`,
    boulder_id: b.id, feedback: i === 62 ? j < 9 ? 'too_hard' : 'just_right'
      : i === 42 ? j < 5 ? 'too_easy' : 'just_right' : ['just_right', 'just_right', 'too_hard', 'just_right', 'too_easy', 'just_right'][j % 6] }));
});
export const v2Comments = v2Boulders.slice(0, 38).map((b, i) => ({ id: `comment-${String(i).padStart(4, '0')}`, boulder_id: b.id,
  comment: ['Schöner Bewegungsablauf, besonders der letzte Zug.', 'Der Einstieg fühlt sich deutlich schwerer an als der Rest.', 'Hat Spaß gemacht. Eine gute Ergänzung in diesem Bereich.'][i % 3],
  created_at: new Date(now - i * 3_600_000).toISOString(),
})).concat([
  { id: 'comment-spotlight-1', boulder_id: v2Boulders[62].id, comment: 'Für eine 5 fühlt sich der Zug an der Kante ziemlich schwer an. Der Rest passt für mich.', created_at: '2026-10-23T09:20:00Z' },
  { id: 'comment-spotlight-2', boulder_id: v2Boulders[62].id, comment: 'Tolle Idee, aber am Einstieg fehlt mir eine leichtere Lösung.', created_at: '2026-10-22T16:40:00Z' },
]);
