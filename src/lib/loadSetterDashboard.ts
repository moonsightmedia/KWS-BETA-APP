import { resolveSectorArea, type SectorAreaSource } from '@/lib/sectorAreas';
import { readDashboardRows } from '@/lib/setterDashboardReader';
import type { DashboardComment, DashboardGradeVote, DashboardRating, SetterDashboardData } from '@/lib/setterDashboard';

type BoulderRow = {
  id: string;
  name: string;
  difficulty: number | null;
  sector_id: string | null;
  sector_id_2: string | null;
  thumbnail_url?: string | null;
  created_at?: string;
};
type AreaRow = { id: string; name: string; sort_order?: number };
type SectorRow = SectorAreaSource & { id: string };
export type DashboardRequest = <T>(path: string) => Promise<T[]>;

/** Fetch only community feedback for the current inventory. A failed source rejects the whole result. */
export async function loadSetterDashboard(request: DashboardRequest): Promise<SetterDashboardData> {
  const read = <T extends { id: string }>(path: string) => readDashboardRows<T>(path, request<T>);
  const [boulders, sectors, areas] = await Promise.all([
    read<BoulderRow>('/rest/v1/boulders?select=id,name,difficulty,sector_id,sector_id_2&or=(status.eq.haengt,status.is.null)'),
    read<SectorRow>('/rest/v1/sectors?select=id,name,area_id,subarea_code,area:sector_areas(id,name,slug,sort_order)'),
    read<AreaRow>('/rest/v1/sector_areas?select=id,name,sort_order'),
  ]);
  const ratings: DashboardRating[] = [];
  const grades: DashboardGradeVote[] = [];
  const comments: DashboardComment[] = [];
  const ids = [...new Set(boulders.map(boulder => boulder.id))];

  // Keep URLs below common gateway limits and cap concurrency to three paginated readers.
  for (let offset = 0; offset < ids.length; offset += 100) {
    const filter = `&boulder_id=in.(${ids.slice(offset, offset + 100).map(encodeURIComponent).join(',')})`;
    const [ratingPage, gradePage, commentPage] = await Promise.all([
      read<DashboardRating>(`/rest/v1/boulder_ratings?select=id,boulder_id,rating${filter}`),
      read<DashboardGradeVote>(`/rest/v1/boulder_grade_feedback?select=id,boulder_id,feedback${filter}`),
      read<DashboardComment>(`/rest/v1/boulder_comments?select=id,boulder_id,comment,created_at&moderation_status=eq.approved${filter}`),
    ]);
    ratings.push(...ratingPage);
    grades.push(...gradePage);
    comments.push(...commentPage);
  }

  const sectorMap = new Map(sectors.map(sector => [sector.id, resolveSectorArea(sector)]));
  const activeIds = new Set(ids);
  return {
    knownAreas: [...new Set([...[...areas].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      || a.name.localeCompare(b.name, 'de')).map(area => area.name.trim()).filter(Boolean),
      ...[...sectorMap.values()].map(sector => sector.area?.name ?? 'Ohne Bereich')])],
    boulders: boulders.map(boulder => {
      const primary = sectorMap.get(boulder.sector_id ?? '');
      const secondary = sectorMap.get(boulder.sector_id_2 ?? '');
      const resolved = [primary, secondary].filter((sector): sector is NonNullable<typeof sector> => !!sector);
      const boulderAreas = [...new Set(resolved.map(sector => sector.area?.name ?? 'Ohne Bereich'))];
      return {
        id: boulder.id,
        name: boulder.name,
        difficulty: boulder.difficulty,
        sector: [...new Set(resolved.map(sector => sector.publicName))].join(' · ') || 'Ohne Bereich',
        areas: boulderAreas.length ? boulderAreas : ['Ohne Bereich'],
        // Optional fields preserve historical, isolated review fixtures; the live query does not request them.
        thumbnailUrl: boulder.thumbnail_url ?? undefined,
        createdAt: boulder.created_at,
      };
    }),
    ratings: ratings.filter(row => activeIds.has(row.boulder_id)),
    grades: grades.filter(row => activeIds.has(row.boulder_id)),
    comments: comments.filter(row => activeIds.has(row.boulder_id)),
  };
}
