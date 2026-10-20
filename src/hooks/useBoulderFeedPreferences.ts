import { useEffect, useState } from 'react';
import { backendStorageKey } from '@/lib/backendConfig';

export type FeedDoubleTapAction = 'off' | 'project' | 'layout';
const key = backendStorageKey('boulder_feed_double_tap_v1');
const read = (): FeedDoubleTapAction => {
  try {
    const value = localStorage.getItem(key);
    return value === 'project' || value === 'layout' ? value : 'off';
  } catch { return 'off'; }
};

/** A device preference; never inferred from older, always-on gesture behavior. */
export function useBoulderFeedPreferences() {
  const [doubleTapAction, setAction] = useState<FeedDoubleTapAction>(read);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setAction(read()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const setDoubleTapAction = (value: FeedDoubleTapAction) => {
    setAction(value);
    try { localStorage.setItem(key, value); } catch { /* Keep the choice for this visit. */ }
  };
  return { doubleTapAction, setDoubleTapAction };
}
