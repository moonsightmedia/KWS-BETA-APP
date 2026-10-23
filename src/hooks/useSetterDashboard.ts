import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabaseRestRequest } from '@/lib/supabaseRest';
import { loadSetterDashboard } from '@/lib/loadSetterDashboard';

export function useSetterDashboard() {
  const { session, user, loading } = useAuth();
  return useQuery({
    queryKey: ['setter-dashboard', user?.id],
    enabled: !loading && !!session && !!user,
    staleTime: 30_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const token = session!.access_token;
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
      const timeout = setTimeout(cancel, 20_000);
      try {
        return await loadSetterDashboard(<T>(path: string) => supabaseRestRequest<T[]>(path, {
          accessToken: token, signal: controller.signal,
        }));
      } finally {
        controller.abort();
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
      }
    },
  });
}
