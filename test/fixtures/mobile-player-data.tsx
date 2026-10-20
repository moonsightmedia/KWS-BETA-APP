import type { Boulder } from '@/types/boulder';
export * from './rating-hooks';
const source = new URLSearchParams(location.search).has('visual')
  ? 'https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0295-feebfeba-cdae-41f5-a084-071fab7ed59f_sd.mp4'
  : '/test/fixtures/vertical-player.mp4';
export const example: Boulder = { id: 'b-1', name: 'Kühner Wurm', difficulty: 6, color: 'Grün', sector: 'Bug A', createdAt: new Date('2026-10-17T10:00:00'), betaVideoUrls: { hd: source + '?quality=hd', sd: source + '?quality=sd', low: source + '?quality=low' } };
if (new URLSearchParams(location.search).has('broken')) { example.betaVideoUrls = undefined; example.betaVideoUrl = '/test/fixtures/missing-mobile-player.mp4'; }
export const useBouldersWithSectors = () => ({ data: [example], isLoading: false });
export const useAuth = () => ({ user: new URLSearchParams(location.search).has('guest') ? null : { id: 'fixture-user', email: 'qa@example.invalid' }, loading: false });
export const ContentSafetyActions = () => null;
export const AccountAvatar = () => <span>QA</span>;
export const UserAvatar = () => <span>QA</span>;
export const Sidebar = () => <nav>Navigation</nav>;
export const DashboardHeader = ({ onBack, backLabel }: { onBack?: () => void; backLabel?: string }) => <header className="p-4"><button onClick={onBack} aria-label={backLabel}>Zurück</button></header>;
export const trackMonitoring = () => false;
export const reportMonitoringError = () => {};
export const setMonitoringLoadedBoulder = () => () => {};
