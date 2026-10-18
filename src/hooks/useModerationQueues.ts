import { useQuery } from '@tanstack/react-query';
import { getOpenReports, getPendingComments } from '@/lib/communitySafety';

export function useModerationQueues(userId?: string) {
  const options = { enabled: !!userId, staleTime: 30_000, refetchInterval: 60_000 };
  const comments = useQuery({ queryKey: ['pending-comments', userId], queryFn: getPendingComments, ...options });
  const reports = useQuery({ queryKey: ['content-reports', userId], queryFn: getOpenReports, ...options });
  return { comments, reports };
}
