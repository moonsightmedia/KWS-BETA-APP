import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePendingAccountDeletions } from '@/hooks/usePendingAccountDeletions';
import { ACCOUNT_DELETIONS_PATH } from '@/lib/adminNavigation';

/** Only a confirmed nonempty queue belongs at the admin entry. */
export function AccountDeletionNotice() {
  const queue = usePendingAccountDeletions(true);
  const count = queue.data?.length ?? 0;
  if (count === 0) return null;

  return <aside aria-label="Offene Kontolöschanträge" className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-kws-control bg-secondary px-3 py-1">
    <p className="text-sm" role="status">
      {count === 1 ? '1 offener Löschantrag' : `${count} offene Löschanträge`}
      {queue.isError && <span className="ml-2 text-xs text-muted-foreground">Stand nicht aktuell</span>}
    </p>
    <Button asChild variant="ghost" className="text-xs"><Link to={ACCOUNT_DELETIONS_PATH}>Anträge ansehen</Link></Button>
  </aside>;
}
