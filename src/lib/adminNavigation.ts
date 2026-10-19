export const ADMIN_TABS = [
  { value: 'overview', label: 'Übersicht' },
  { value: 'users', label: 'Benutzer' },
  { value: 'settings', label: 'Halle' },
  { value: 'moderation', label: 'Moderation' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'logs', label: 'Protokoll' },
  { value: 'tests', label: 'Push-Test' },
] as const;
export type AdminTab = typeof ADMIN_TABS[number]['value'];
export const MOBILE_ADMIN_TABS = ADMIN_TABS.filter(tab => ['overview', 'users', 'settings', 'moderation'].includes(tab.value));
export const OPERATIONS_TABS = ADMIN_TABS.filter(tab => ['monitoring', 'logs', 'tests'].includes(tab.value));
export const MORE_ADMIN_TABS = ADMIN_TABS.filter(tab => ['feedback', 'monitoring', 'logs', 'tests'].includes(tab.value));
export function resolveAdminTab(value: string | null): AdminTab {
  return ADMIN_TABS.find(tab => tab.value === value)?.value || 'overview';
}
export const adminTabPath = (tab: AdminTab) => `/admin?tab=${tab}`;
export const ACCOUNT_DELETIONS_PATH = '/admin?tab=users&usersView=deletions';
export function adminUserId(value: string | null): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}
export function adminUserPath(id: string): string {
  const userId = adminUserId(id);
  if (!userId) throw new Error('Ungültige Kontoreferenz');
  return `/admin?tab=users&userId=${userId}`;
}
