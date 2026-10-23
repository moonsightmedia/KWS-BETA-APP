// Synthetic dashboard data, only imported by the explicit local QA server.
export const dashboardSectors = ['Bug', 'Couch-Ecke', 'Top-Out', 'Lange Platte', 'Grotte'].map((name, i) => ({
  id: `sector-${i}`, name: `${name} A`, area_id: `area-${i}`, subarea_code: 'A',
  area: { id: `area-${i}`, name, slug: name.toLowerCase(), sort_order: i },
}));
const counts = [5, 9, 16, 24, 28, 18, 11, 4, 3];
const names = ['Grüne Kante', 'Mondlandung', 'Plattenliebe', 'Kleiner Überhang', 'Kompass', 'Komet', 'Waldweg', 'Auf der Welle', 'Zwischen den Linien'];
let index = 0;
export const dashboardBoulders = counts.flatMap((count, grade) => Array.from({ length: count }, () => {
  const i = index++;
  return { id: `boulder-${String(i).padStart(4, '0')}`, name: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
    difficulty: grade === 8 ? null : grade + 1, sector_id: `sector-${i % 5}`, sector_id_2: i % 11 === 0 ? `sector-${(i + 1) % 5}` : null,
    status: 'haengt', thumbnail_url: null };
}));
export const dashboardRatings = dashboardBoulders.slice(0, 92).flatMap((b, i) => Array.from({ length: i % 4 + 1 }, (_, j) => ({
  id: `rating-${String(i).padStart(4, '0')}-${j}`, boulder_id: b.id, rating: [5, 4, 5, 4, 3, 5, 4, 2, 1][(i + j) % 9],
})));
export const dashboardGrades = dashboardBoulders.slice(0, 84).flatMap((b, i) => Array.from({ length: i % 3 + 1 }, (_, j) => ({
  id: `grade-${String(i).padStart(4, '0')}-${j}`, boulder_id: b.id,
  feedback: ['just_right', 'just_right', 'too_hard', 'just_right', 'too_easy'][(i + j) % 5],
})));
export const dashboardComments = dashboardBoulders.slice(0, 38).map((b, i) => ({ id: `comment-${String(i).padStart(4, '0')}`, boulder_id: b.id }));
