import { useQuery } from '@tanstack/react-query';
import { getPendingAccountDeletions } from '@/lib/accountDeletion';

export function usePendingAccountDeletions(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-account-deletions'],
    queryFn: getPendingAccountDeletions,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
