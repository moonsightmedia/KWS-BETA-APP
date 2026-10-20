import type { Boulder } from '@/types/boulder';
const source = '/test/fixtures/vertical-player.mp4';
const poster = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><rect width="540" height="960" fill="#192436"/><text x="270" y="460" fill="white" text-anchor="middle" font-size="28">Boulder QA</text></svg>');
export const boulders: Boulder[] = [
  { id: 'feed-a', name: 'Kühner Wurm', difficulty: 6, color: 'Grün', sector: 'Grotte A', sectorId: 'grotte', status: 'haengt', createdAt: new Date('2026-10-19T10:00:00'), thumbnailUrl: poster, betaVideoUrls: { hd: source + '?q=hd', sd: source + '?q=sd', low: source + '?q=low' } },
  { id: 'feed-b', name: 'Süßer Panther', difficulty: 5, color: 'Weiß', volumeOnly: true, sector: 'Bug B', sectorId: 'bug', status: 'haengt', createdAt: new Date('2026-10-18T10:00:00'), thumbnailUrl: poster, betaVideoUrl: source },
  { id: 'feed-c', name: 'Ohne Beta', difficulty: 4, color: 'Rot', sector: 'Bug B', sectorId: 'bug', status: 'haengt', createdAt: new Date('2026-10-17T10:00:00'), thumbnailUrl: poster },
  { id: 'feed-d', name: 'Archiv Beta', difficulty: 3, color: 'Gelb', sector: 'Grotte A', sectorId: 'grotte', status: 'abgeschraubt', createdAt: new Date('2026-10-16T10:00:00'), thumbnailUrl: poster, betaVideoUrl: source },
];
if (new URLSearchParams(location.search).has('sortcases')) boulders.push(
  { ...boulders[0], id: 'sort-c', name: 'Grad Eins Grotte', difficulty: 1, createdAt: new Date('2026-10-17T10:00:00') },
  { ...boulders[1], id: 'sort-d', name: 'Grad Zwei Bug', difficulty: 2, createdAt: new Date('2026-10-20T10:00:00') },
  { ...boulders[1], id: 'sort-e', name: 'Grad Eins Bug', difficulty: 1, createdAt: new Date('2026-10-16T10:00:00') },
  { ...boulders[0], id: 'sort-f', name: 'Grad Zwei Grotte', difficulty: 2, createdAt: new Date('2026-10-21T10:00:00') },
);
const user = new URLSearchParams(location.search).has('guest') ? null : { id: 'feed-user', email: 'qa@example.invalid', user_metadata: { full_name: 'QA' } };
if (new URLSearchParams(location.search).has('external')) boulders.unshift({ ...boulders[0], id: 'feed-external', name: 'Externe Beta', createdAt: new Date('2026-10-20T10:00:00'), betaVideoUrls: undefined, betaVideoUrl: 'https://www.youtube.com/watch?v=fixture0000' });
export const useAuth = () => ({ user, session: user ? { access_token: 'fixture-only' } : null, loading: false });
export const useBouldersWithSectors = () => ({ data: boulders, isLoading: false, error: null });
const sectors = [{ id: 'grotte', name: 'Grotte A' }, { id: 'bug', name: 'Bug B' }];
const colors = [{ id: 'green', name: 'Grün', hex: '#36B531', is_active: true }];
export const useSectorsTransformed = () => ({ data: sectors, isLoading: false, error: null });
export const useColors = () => ({ data: colors, isPending: false, isError: false, refetch: async () => ({}) });
export const useMonitoringFilters = () => {};
export const useBoulderNotification = () => ({ data: null, isPending: false });
export const ProfileMenu = () => <span>QA</span>;
export const ContentSafetyActions = () => null;
export const BoulderMapPanel = () => null;
export const trackMonitoring = () => {};
export const getUsageConsent = () => 'denied' as const;
export const isMonitoringEnabled = () => false;
export const setUsageConsent = () => {};
export const reportMonitoringError = () => {};
export const setMonitoringLoadedBoulder = () => () => {};
export const backendConfig = { supabaseUrl: location.origin + '/__feed-api', publicKey: 'fixture-only', environment: 'production' };
export const backendStorageKey = (key: string) => key;
