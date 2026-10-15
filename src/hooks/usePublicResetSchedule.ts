import { useQuery } from '@tanstack/react-query';
import { publicRestRequest } from './usePublicTvSchedule';
import type { ResetScheduleRow } from '@/lib/resetSchedule';

/** Read-only catalogue. No personal creator fields or authenticated writes. */
export function usePublicResetSchedule() {
  return useQuery({
    queryKey: ['public', 'sector_schedule'],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      const since = encodeURIComponent(new Date().toISOString());
      const rows: ResetScheduleRow[] = [];
      const limit = 500;
      for (let offset = 0; ; offset += limit) {
        const page = await publicRestRequest<ResetScheduleRow[]>(
          `sector_schedule?select=id,sector_id,scheduled_at,note&scheduled_at=gte.${since}&order=scheduled_at.asc,id.asc&limit=${limit}&offset=${offset}`,
        );
        if (!Array.isArray(page) || page.some(row => !row || typeof row.id !== 'string'
          || typeof row.sector_id !== 'string' || typeof row.scheduled_at !== 'string'
          || !Number.isFinite(Date.parse(row.scheduled_at))
          || (row.note !== null && typeof row.note !== 'string'))) {
          throw new Error('Termindaten konnten nicht gelesen werden.');
        }
        rows.push(...page);
        if (page.length < limit) return rows;
      }
    },
  });
}
