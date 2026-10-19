import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpload } from '@/contexts/UploadContext';
import { isReviewEnvironment, switchBackendEnvironment } from '@/lib/backendConfig';

/** Visible to every demo user; never detect or conceal store-review traffic. */
export function ReviewEnvironmentNotice() {
  const { user, signOut } = useAuth();
  const { isUploading } = useUpload();
  const [error, setError] = useState('');
  const notice = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!isReviewEnvironment || !notice.current) return;
    const root = document.documentElement;
    root.dataset.kwsReview = 'true';
    const update = () => root.style.setProperty('--kws-review-notice-height', `${notice.current?.getBoundingClientRect().height ?? 0}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(notice.current);
    return () => { observer.disconnect(); delete root.dataset.kwsReview; root.style.removeProperty('--kws-review-notice-height'); };
  }, []);
  if (!isReviewEnvironment) return null;
  return <aside ref={notice} aria-label="Demoumgebung" className="kws-review-notice sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-secondary px-4 pb-2 pt-[calc(0.5rem+var(--app-safe-area-top))] text-xs text-foreground">
    <span><strong>Demo · Beispieldaten</strong> · Änderungen betreffen nur die Prüfumgebung.</span>
    <Button type="button" variant="ghost" size="sm" disabled={isUploading} onClick={() => {
      if (user) { void signOut(); return; }
      try { switchBackendEnvironment('production'); } catch { setError('Der Wechsel ist gerade nicht möglich. Bitte erneut versuchen.'); }
    }}>{user ? 'Zum Wechsel abmelden' : 'Zur Kletterwelt'}</Button>
    {error && <p role="alert" className="w-full text-destructive">{error}</p>}
  </aside>;
}
