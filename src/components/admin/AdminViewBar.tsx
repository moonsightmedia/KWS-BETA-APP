import type { ReactNode } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shared order: view selection, search/filter tools, result count, content. */
export function AdminViewBar({ children, refreshing, onRefresh, disabled = false }: {
  children: ReactNode; refreshing: boolean; onRefresh: () => void; disabled?: boolean;
}) {
  return <div className="flex items-center justify-between gap-2 sm:gap-4">
    <div className="min-w-0 w-full max-w-[480px] [&_button]:px-2 sm:[&_button]:px-3">{children}</div>
    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Aktualisieren" title="Aktualisieren" disabled={refreshing || disabled} onClick={onRefresh}>
      <RefreshCcw className={cn('h-4 w-4', refreshing && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
    </Button>
  </div>;
}
