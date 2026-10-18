import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useModerationQueues } from '@/hooks/useModerationQueues';
import { Button } from '@/components/ui/button';
import { adminTabPath } from '@/lib/adminNavigation';

export function ModerationNotice() {
  const { user } = useAuth();
  const { comments, reports } = useModerationQueues(user?.id);
  const commentCount = comments.data?.length ?? 0;
  const reportCount = reports.data?.length ?? 0;
  if (!commentCount && !reportCount) return null;
  const description = [
    commentCount ? `${commentCount} ${commentCount === 1 ? 'Kommentar wartet' : 'Kommentare warten'} auf Freigabe` : '',
    reportCount ? `${reportCount} offene ${reportCount === 1 ? 'Inhaltsmeldung' : 'Inhaltsmeldungen'}` : '',
  ].filter(Boolean).join(' · ');
  return <aside aria-label="Offene Moderationsaufgaben" className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-kws-control bg-secondary px-3 py-1">
    <p className="text-sm" role="status">{description}{(comments.isError || reports.isError) && <span className="ml-2 text-xs text-muted-foreground">Stand teilweise nicht aktuell</span>}</p>
    <Button asChild variant="ghost" className="text-xs"><Link to={`${adminTabPath('moderation')}&moderationView=${commentCount ? 'comments' : 'reports'}`}>Moderation öffnen</Link></Button>
  </aside>;
}
