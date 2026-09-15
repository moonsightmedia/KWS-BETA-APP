import { useQuery } from '@tanstack/react-query';

async function readRows(resource: string) {
  const response = await fetch(`/__guest_test__/${resource}`);
  if (!response.ok) throw new Error('Isolated test: request failed');
  return response.json();
}
export const useAuth = () => ({ loading: false });
export const useColors = () => ({ data: [], isPending: false, isError: false, refetch: async () => {} });
export const useSectorsTransformed = (enabled = true) => useQuery({
  queryKey: ['sectors'], enabled, queryFn: () => readRows('sectors'),
});
export const useBouldersWithSectors = (enabled = true) => {
  const boulders = useQuery({ queryKey: ['boulders'], enabled, queryFn: () => readRows('boulders') });
  const sectors = useSectorsTransformed(enabled);
  return {
    data: boulders.data?.map((boulder: Record<string, unknown>) => ({ ...boulder, createdAt: new Date('2026-01-01') })),
    error: boulders.error || sectors.error,
    isLoading: boulders.isLoading || sectors.isLoading,
  };
};
