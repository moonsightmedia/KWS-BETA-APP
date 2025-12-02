import {
  LayoutDashboard,
  Mountain,
  Map,
  Hammer,
  UploadCloud,
  Calendar,
  Settings,
  Users,
  Server,
  LucideIcon,
} from 'lucide-react';

export type GroupKey = 'user' | 'setter' | 'admin';

export interface RouteItem {
  path: string;
  title: string;
  icon: LucideIcon;
  group: GroupKey;
  id: string; // pageId analog aus dem HTML
}

export const userNav: RouteItem[] = [
  { path: '/user/dashboard', title: 'DASHBOARD', icon: LayoutDashboard, group: 'user', id: 'dashboard' },
  { path: '/user/boulder', title: 'BOULDER LISTE', icon: Mountain, group: 'user', id: 'boulder' },
  { path: '/user/sektoren', title: 'SEKTOREN', icon: Map, group: 'user', id: 'sektoren' },
];

export const setterNav: RouteItem[] = [
  { path: '/setter/boulder', title: 'BEARBEITEN', icon: Hammer, group: 'setter', id: 'setter-boulder' },
  { path: '/setter/upload', title: 'UPLOAD', icon: UploadCloud, group: 'setter', id: 'upload' },
  { path: '/setter/planung', title: 'ROUTENPLANUNG', icon: Calendar, group: 'setter', id: 'planung' },
];

export const adminNav: RouteItem[] = [
  { path: '/admin/settings', title: 'EINSTELLUNGEN', icon: Settings, group: 'admin', id: 'settings' },
  { path: '/admin/users', title: 'BENUTZER', icon: Users, group: 'admin', id: 'users' },
  { path: '/admin/system', title: 'DESIGN KIT', icon: Server, group: 'admin', id: 'system' },
];

export const allNav: RouteItem[] = [...userNav, ...setterNav, ...adminNav];

export function getGroupFromPath(pathname: string): GroupKey {
  if (pathname.startsWith('/user')) return 'user';
  if (pathname.startsWith('/setter')) return 'setter';
  return 'admin';
}

export function getDefaultPathForGroup(group: GroupKey): string {
  switch (group) {
    case 'user':
      return userNav[0].path;
    case 'setter':
      return setterNav[1].path; // Upload als Standard wie im HTML-Tab
    case 'admin':
    default:
      return adminNav[2].path; // System als Startseite
  }
}

export function getRouteMeta(pathname: string): RouteItem | undefined {
  // exakte Matches
  const exact = allNav.find((r) => r.path === pathname);
  if (exact) return exact;
  // fallback: nach Segmentanfang matchen
  const group = getGroupFromPath(pathname);
  const list = group === 'user' ? userNav : group === 'setter' ? setterNav : adminNav;
  return list[0];
}
