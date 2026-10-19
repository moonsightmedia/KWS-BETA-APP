export interface BoulderListPreferences {
  searchQuery: string;
  sectorFilters: string[];
  difficultyFilters: string[];
  colorFilters: string[];
  sortBy: 'name' | 'difficulty' | 'date';
  sortOrder: 'asc' | 'desc';
  showOnlyHanging: boolean;
  showNew: boolean;
  showSaved: boolean;
}

export const defaultBoulderListPreferences = (): BoulderListPreferences => ({
  searchQuery: '', sectorFilters: [], difficultyFilters: [], colorFilters: [],
  sortBy: 'date', sortOrder: 'desc', showOnlyHanging: true, showNew: false, showSaved: false,
});
const key = (scope: string) => `kws:boulder-list:v1:${scope}`;
const memory = new Map<string, BoulderListPreferences>();
const strings = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 200))].slice(0, 100) : [];

export function hasBoulderListPreferences(scope: string) {
  if (memory.has(scope)) return true;
  try { return sessionStorage.getItem(key(scope)) !== null; } catch { return false; }
}

export function readBoulderListPreferences(scope: string): BoulderListPreferences {
  if (memory.has(scope)) return memory.get(scope)!;
  const defaults = defaultBoulderListPreferences();
  try {
    const value = JSON.parse(sessionStorage.getItem(key(scope)) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
    return {
      searchQuery: typeof value.searchQuery === 'string' ? value.searchQuery.slice(0, 1000) : '',
      sectorFilters: strings(value.sectorFilters), difficultyFilters: strings(value.difficultyFilters), colorFilters: strings(value.colorFilters),
      sortBy: ['name', 'difficulty', 'date'].includes(value.sortBy) ? value.sortBy : defaults.sortBy,
      sortOrder: value.sortOrder === 'asc' ? 'asc' : 'desc',
      showOnlyHanging: typeof value.showOnlyHanging === 'boolean' ? value.showOnlyHanging : true,
      showNew: value.showNew === true, showSaved: value.showSaved === true,
    };
  } catch { return defaults; }
}

export function writeBoulderListPreferences(scope: string, value: BoulderListPreferences) {
  memory.set(scope, value);
  try { sessionStorage.setItem(key(scope), JSON.stringify(value)); } catch { /* Navigation still retains the in-memory selection. */ }
}

/** Explicit filter links start a selection; bare overview links restore the session. */
export function boulderPreferencesForRoute(base: BoulderListPreferences, search: string) {
  const params = new URLSearchParams(search);
  if (!['sector', 'show', 'status'].some(name => params.has(name))) return base;
  return {
    ...defaultBoulderListPreferences(), sectorFilters: params.get('sector') ? [params.get('sector')!] : [],
    showNew: params.get('show') === 'new', showSaved: params.get('show') === 'saved', showOnlyHanging: params.get('status') !== 'all',
  };
}
