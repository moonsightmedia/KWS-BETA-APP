import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { boulderPreferencesForRoute, defaultBoulderListPreferences, hasBoulderListPreferences, readBoulderListPreferences, writeBoulderListPreferences, type BoulderListPreferences } from '@/lib/boulderListPreferences';

export function useBoulderListPreferences(accountScope: string, search: string, routeKey: string, notificationVisit: string | null = null) {
  const visitScope = `${accountScope}:visit:${routeKey}:${search}`;
  const scope = notificationVisit === null ? visitScope : `${accountScope}:notification:${notificationVisit}`;
  const initial = () => notificationVisit === null
    ? hasBoulderListPreferences(visitScope) ? readBoulderListPreferences(visitScope)
      : boulderPreferencesForRoute(readBoulderListPreferences(accountScope), search) : defaultBoulderListPreferences();
  const [snapshot, setSnapshot] = useState(() => ({ scope, value: initial() }));
  // A retained route can change accounts or enter/leave a notification without unmounting.
  if (snapshot.scope !== scope) setSnapshot({ scope, value: initial() });
  useEffect(() => {
    if (snapshot.scope === scope && notificationVisit === null) {
      writeBoulderListPreferences(accountScope, snapshot.value);
      writeBoulderListPreferences(visitScope, snapshot.value);
    }
  }, [accountScope, scope, visitScope, notificationVisit, snapshot]);
  const setField = useCallback(<K extends keyof BoulderListPreferences>(field: K, action: SetStateAction<BoulderListPreferences[K]>) => {
    setSnapshot(current => {
      const next = typeof action === 'function' ? (action as (previous: BoulderListPreferences[K]) => BoulderListPreferences[K])(current.value[field]) : action;
      return Object.is(next, current.value[field]) ? current : { ...current, value: { ...current.value, [field]: next } };
    });
  }, []);
  const setters = useMemo(() => ({
    setSearchQuery: (value: SetStateAction<string>) => setField('searchQuery', value),
    setSectorFilters: (value: SetStateAction<string[]>) => setField('sectorFilters', value),
    setDifficultyFilters: (value: SetStateAction<string[]>) => setField('difficultyFilters', value),
    setColorFilters: (value: SetStateAction<string[]>) => setField('colorFilters', value),
    setSortBy: (value: SetStateAction<BoulderListPreferences['sortBy']>) => setField('sortBy', value),
    setSortOrder: (value: SetStateAction<BoulderListPreferences['sortOrder']>) => setField('sortOrder', value),
    setShowOnlyHanging: (value: SetStateAction<boolean>) => setField('showOnlyHanging', value),
    setShowNew: (value: SetStateAction<boolean>) => setField('showNew', value),
    setShowSaved: (value: SetStateAction<boolean>) => setField('showSaved', value),
  }), [setField]);
  return { ...snapshot.value, ...setters };
}
