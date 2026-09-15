import { useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Skeleton } from '@/components/ui/skeleton';

export function PersonalDataState({ loading, onRetry }: { loading?: boolean; onRetry: () => Promise<unknown> }) {
  const [retrying, setRetrying] = useState(false);
  return <KwsSurface className="space-y-3 p-5" role="status">
    {loading ? <>
      <p className="text-sm text-muted-foreground">Dein Fortschritt wird geladen …</p>
      <Skeleton className="h-12 w-full" /><Skeleton className="h-5 w-2/3" />
    </> : <>
      <CloudOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-semibold">Fortschritt gerade nicht verfügbar</h2>
      <p className="text-sm text-muted-foreground">Deine Einträge konnten nicht vollständig geladen werden. Bitte prüfe deine Verbindung und versuche es erneut.</p>
      <Button variant="secondary" disabled={retrying} onClick={async () => {
        setRetrying(true);
        try { await onRetry(); } catch { /* The query keeps its error state. */ }
        finally { setRetrying(false); }
      }}><RefreshCw className={retrying ? 'animate-spin' : ''} aria-hidden="true" />{retrying ? 'Lädt …' : 'Erneut versuchen'}</Button>
    </>}
  </KwsSurface>;
}
