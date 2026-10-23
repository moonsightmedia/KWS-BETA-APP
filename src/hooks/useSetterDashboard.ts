import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabaseRestRequest } from '@/lib/supabaseRest';
import { resolveSectorArea, type SectorAreaSource } from '@/lib/sectorAreas';
import type { DashboardRating, DashboardGradeVote, DashboardComment, SetterDashboardData } from '@/lib/setterDashboard';
import { readDashboardRows } from '@/lib/setterDashboardReader';

type BoulderRow = { id: string; name: string; difficulty: number | null; sector_id: string | null; sector_id_2: string | null; thumbnail_url: string | null; created_at?: string };
type SectorRow = SectorAreaSource & { id: string };

export function useSetterDashboard() {
  const { session, user, loading } = useAuth();
  return useQuery({
    queryKey: ['setter-dashboard', user?.id],
    enabled: !loading && !!session && !!user,
    staleTime: 30_000,
    retry: 1,
    queryFn: async ({ signal }): Promise<SetterDashboardData> => {
      const token = session!.access_token;
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
      const timeout = setTimeout(cancel, 20_000);
      try {
        const read = <T extends { id: string }>(path: string) => readDashboardRows<T>(path, pagePath => supabaseRestRequest<T[]>(pagePath, { accessToken: token, signal: controller.signal }));
        const [boulders, sectors, ratings, grades, comments] = await Promise.all([
          read<BoulderRow>('/rest/v1/boulders?select=id,name,difficulty,sector_id,sector_id_2,thumbnail_url,created_at&or=(status.eq.haengt,status.is.null)'),
          read<SectorRow>('/rest/v1/sectors?select=id,name,area_id,subarea_code,area:sector_areas(id,name,slug,sort_order)'),
          read<DashboardRating>('/rest/v1/boulder_ratings?select=id,boulder_id,rating'),
          read<DashboardGradeVote>('/rest/v1/boulder_grade_feedback?select=id,boulder_id,feedback'),
          read<DashboardComment>('/rest/v1/boulder_comments?select=id,boulder_id,comment,created_at&moderation_status=eq.approved'),
        ]);
        const sectorMap = new Map(sectors.map(sector => [sector.id, resolveSectorArea(sector)]));
        const activeIds = new Set(boulders.map(b => b.id));
        return {
          knownAreas: [...new Set([...sectorMap.values()].map(sector => sector.area?.name ?? 'Ohne Bereich'))],
          boulders: boulders.map(boulder => {
            const primary = sectorMap.get(boulder.sector_id ?? '');
            const secondary = sectorMap.get(boulder.sector_id_2 ?? '');
            return { id: boulder.id, name: boulder.name, difficulty: boulder.difficulty,
              sector: [...new Set([primary?.publicName, secondary?.publicName].filter(Boolean))].join(' · ') || 'Ohne Bereich',
              areas: [...new Set([primary?.area?.name ?? 'Ohne Bereich', secondary?.area?.name].filter((name): name is string => !!name))],
              thumbnailUrl: boulder.thumbnail_url ?? undefined, createdAt: boulder.created_at };
          }),
          ratings: ratings.filter(row => activeIds.has(row.boulder_id)),
          grades: grades.filter(row => activeIds.has(row.boulder_id)),
          comments: comments.filter(row => activeIds.has(row.boulder_id)),
        };
      } finally {
        controller.abort();
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
      }
    },
  });
}
