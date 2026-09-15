export const ADMIN_TABS = [
  { value: 'users', label: 'Benutzer' },
  { value: 'settings', label: 'Halle' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'logs', label: 'Protokoll' },
  { value: 'tests', label: 'Push-Test' },
] as const;
export type AdminTab = typeof ADMIN_TABS[number]['value'];
export const OPERATIONS_TABS = ADMIN_TABS.slice(3);
export function resolveAdminTab(value: string | null): AdminTab {
  return ADMIN_TABS.find(tab => tab.value === value)?.value || 'users';
}
export const adminTabPath = (tab: AdminTab) => `/admin?tab=${tab}`;
