import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileRecord } from '@/lib/profileCompat';

export const accountProfileKey = (id?: string) => ['account-profile', id] as const;

/** One source for the photo in the profile, sidebar and account menu. */
export function useAccountProfile() {
  const { user, session } = useAuth();
  return useQuery({
    queryKey: accountProfileKey(user?.id),
    enabled: !!user && !!session,
    queryFn: () => fetchProfileRecord(user!.id, session?.access_token),
    staleTime: 60_000,
  });
}
