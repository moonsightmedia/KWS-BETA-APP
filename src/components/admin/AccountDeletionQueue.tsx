import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getPendingAccountDeletions, formatDeletionDeadline } from '@/lib/accountDeletion';

export function AccountDeletionQueue({ enabled, names }: { enabled: boolean; names: Record<string, string> }) {
  const queue = useQuery({ queryKey: ['admin-account-deletions'], queryFn: getPendingAccountDeletions, enabled, refetchInterval: 60_000 });
  return <KwsSurface className="p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-semibold">Kontolöschungen</h2>
      <Button type="button" variant="ghost" disabled={!enabled || queue.isFetching} onClick={() => void queue.refetch()}>Aktualisieren</Button>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">Marketing übernimmt die vollständige Löschung innerhalb von sieben Tagen.</p>
    {queue.isError ? <p role="alert" className="mt-3 text-sm text-destructive">Löschanträge konnten nicht geladen werden. Bitte erneut versuchen.</p> : !queue.data ? <p className="mt-3 text-sm text-muted-foreground" role="status">Löschanträge werden geladen …</p> : queue.data.length === 0 ? <p className="mt-3 text-sm text-muted-foreground" role="status">Keine offenen Löschanträge.</p> : <ul className="mt-3 divide-y divide-border/50">
      {queue.data.map(request => <li key={request.id} className="space-y-1 py-3">
        <p className="break-words text-sm font-medium">{request.user_id ? names[request.user_id] || 'Kontodaten werden geladen' : 'Kontodaten werden geprüft'}</p>
        <p className={`text-sm ${new Date(request.due_at).getTime() < Date.now() ? 'text-destructive' : 'text-muted-foreground'}`}>Löschen bis {formatDeletionDeadline(request.due_at)} · {request.status === 'processing' ? 'In Bearbeitung' : 'Offen'}</p>
        <p className="break-all text-xs text-muted-foreground">Vorgang {request.id}</p>
      </li>)}
    </ul>}
  </KwsSurface>;
}
