import { useMemo, useState } from 'react';
import { useBouldersWithSectors as useBaseBoulders } from './setter-hooks';
import { useColors as useBaseColors } from './filter-colors';
export * from './setter-hooks';
export const useIsAdmin = () => ({ isAdmin: true, loading: false });
export const useHasRole = () => ({ hasRole: true, loading: false });
export const useMyTrackedBoulders = () => ({ data: [{ tick: { boulder_id: 'b-0', is_favorite: true } }, { tick: { boulder_id: 'b-1', is_favorite: true } }] });
export const useBoulderRatingSummaries = () => ({ data: [] });
export function useBouldersWithSectors() {
  const query = useBaseBoulders();
  const data = useMemo(() => query.data?.map((b, index) => ({ ...b, difficulty: index === 11 ? null : b.difficulty, createdAt: new Date('2026-09-14T08:00:00Z') })), [query.data]);
  return { ...query, data };
}
export function useColors() {
  const query = useBaseColors();
  const [mode, setMode] = useState(new URLSearchParams(location.search).get('colorState'));
  return mode ? { ...query, data: mode === 'empty' ? [] : undefined, isPending: mode === 'loading', isError: mode === 'error', refetch: async () => setMode(null) } : query;
}
