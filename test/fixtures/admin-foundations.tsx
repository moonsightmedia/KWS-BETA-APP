// Isolated component QA: fake profiles and intercepted data sources; no production access.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { UserManagement } from '@/components/admin/UserManagement';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { BoulderOperationLogs } from '@/components/admin/BoulderOperationLogs';
import { PushNotificationTest } from '@/components/admin/PushNotificationTest';
import Admin from '@/pages/Admin';
import { ProfileMenu } from '@/components/ProfileMenu';
import { NotificationCenter } from '@/components/NotificationCenter';
import '@/index.css';

const params = new URLSearchParams(location.search);
window.adminQA = {
  profiles: [{ id: 'qa-member', email: 'alexandra@example.test', first_name: 'Alexandra', last_name: 'Bergmann', full_name: 'Alexandra Bergmann', birth_date: '1994-06-12', created_at: '2026-08-01T10:00:00Z' }],
  writes: [], failSources: params.get('state') === 'error' ? ['all'] : params.get('state') === 'partial' ? ['upload_logs'] : [],
  writeMode: 'success', delay: params.get('state') === 'loading' ? 800 : 0,
  roles: [],
};
if (params.has('many')) {
  window.adminQA.profiles.push(...Array.from({ length: 42 }, (_, i) => ({ id: 'qa-' + i, email: 'mitglied' + (i + 1) + '@example.test', first_name: ['Lena', 'Jonas', 'Mia', 'Felix'][i % 4], last_name: 'Berg' + (i + 1), full_name: '', birth_date: null, created_at: '2026-08-01T10:00:00Z' })));
  window.adminQA.roles = [{ user_id: 'qa-member', role: 'setter' }, { user_id: 'qa-0', role: 'admin' }, { user_id: 'qa-1', role: 'setter' }];
}
const realFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
  if (!url.pathname.startsWith('/rest/v1/')) return realFetch(input, init);
  const table = url.pathname.split('/').pop()!;
  window.adminQA.reads = [...(window.adminQA.reads ?? []), url.pathname + url.search];
  if (init?.method && init.method !== 'GET') {
    if (table !== 'user_roles' || !['POST', 'DELETE'].includes(init.method)) throw new Error('Production writes blocked by fixture');
    const row = init.method === 'POST' ? JSON.parse(String(init.body)) : { user_id: url.searchParams.get('user_id')?.slice(3), role: url.searchParams.get('role')?.slice(3) };
    window.adminQA.writes.push({ table, method: init.method, row });
    await new Promise(resolve => setTimeout(resolve, window.adminQA.delay));
    if (window.adminQA.writeMode === 'fail') return new Response('{}', { status: 503 });
    if (window.adminQA.writeMode === 'empty') return new Response('[]');
    window.adminQA.roles = init.method === 'POST' ? [...window.adminQA.roles, row] : window.adminQA.roles.filter(entry => entry.user_id !== row.user_id || entry.role !== row.role);
    return new Response(JSON.stringify([row]));
  }
  if (params.get('state') === 'timeout') return new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }); });
  if (window.adminQA.delay) await new Promise(resolve => setTimeout(resolve, window.adminQA.delay));
  if (window.adminQA.failSources.includes('all') || window.adminQA.failSources.includes(table)) return new Response('{}', { status: 503 });
  let data: unknown[] = table === 'profiles' ? window.adminQA.profiles : table === 'user_roles' ? window.adminQA.roles : [];
  if (params.has('workbench')) {
    const now = new Date().toISOString();
    if (table === 'notification_preferences') data = [{ push_enabled: window.adminQA.pushEnabled !== false }];
    if (table === 'push_tokens') data = window.adminQA.pushDevicesEmpty ? [] : [{ token: 'synthetic-device-a', platform: 'ios', created_at: '2026-09-01T10:00:00Z' }, { token: 'synthetic-device-b', platform: 'android', created_at: '2026-09-12T10:00:00Z' }];
    if (table === 'telemetry_sessions') data = [{ device_id: 'test-device-iphone', last_seen_at: now, platform: 'ios', app_version: '1.0.226', user_id: 'qa-member' }, { device_id: 'test-device-s25', last_seen_at: now, platform: 'android', app_version: '1.0.226', user_id: 'qa-0' }];
    if (table === 'upload_logs') {
      data = ['completed', 'uploading', 'failed'].map((status, i) => ({ id: 'upload-' + i, session_id: 'session-' + i, boulder_id: 'boulder-' + i, user_id: 'qa-member', status, file_type: 'video/mp4', progress: i === 1 ? 64 : i === 0 ? 100 : 12, error: i === 2 ? 'Die Verbindung wurde unterbrochen. Bitte erneut versuchen.' : null, created_at: now, updated_at: now }));
      const status = url.searchParams.get('status')?.slice(3);
      if (status) data = data.filter(row => (row as { status: string }).status === status);
    }
    if (table === 'telemetry_events') data = [{ name: 'upload_done', created_at: now, boulder_id: 'boulder-0', device_id: 'test-device-iphone', props: { session_id: 'session-0' } }];
    if (table === 'boulder_operation_logs') {
      data = [
        { id: 'log-1', boulder_id: 'b-1', operation_type: 'create', user_id: 'qa-member', boulder_name: 'Grüner Pfeil', boulder_data: { name: 'Grüner Pfeil', difficulty: 6, color: 'Grün' }, changes: null, created_at: '2026-09-13T09:00:00Z' },
        { id: 'log-2', boulder_id: 'b-2', operation_type: 'create', user_id: 'qa-member', boulder_name: 'Kleine Kante', boulder_data: { name: 'Kleine Kante', difficulty: 5 }, changes: null, created_at: '2026-09-13T09:12:00Z' },
        { id: 'log-3', boulder_id: 'b-3', operation_type: 'update', user_id: 'qa-0', boulder_name: 'Roter Start', boulder_data: { name: 'Roter Start', difficulty: 7 }, changes: { difficulty: { old: 6, new: 7 } }, created_at: '2026-09-12T14:00:00Z' },
      ];
      const operation = url.searchParams.get('operation_type')?.slice(3);
      if (operation) data = data.filter(row => (row as { operation_type: string }).operation_type === operation);
      const since = url.searchParams.get('created_at')?.slice(4);
      if (since) data = data.filter(row => (row as { created_at: string }).created_at >= since);
    }
  }
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
function Fixture() {
  const current = new URLSearchParams(useLocation().search).get('tab') || 'users';
  const route = useLocation();
  if (params.has('menus')) return <><Sidebar /><div className="p-5 md:ml-64"><div className="flex justify-end gap-4"><NotificationCenter /><div className="md:hidden"><ProfileMenu /></div></div><h1 className="mt-8 font-sans text-xl font-semibold">Menüprüfung</h1><output data-testid="current-route">{route.pathname}{route.search}</output><button type="button" className="mt-8 block p-4">Außerhalb</button></div></>;
  if (params.has('integration')) return <><Sidebar /><output data-testid="current-route" className="sr-only">{route.pathname}{route.search}</output><Admin /></>;
  const title = current === 'monitoring' ? 'Monitoring' : current === 'users' ? 'Benutzer' : current === 'logs' ? 'Protokoll' : 'Push-Test';
  return <><Sidebar /><div className="min-h-screen bg-canvas pb-28 md:ml-64 md:pb-8"><header className="bg-white px-4 py-4 md:px-8"><h1 className="font-teko text-[2.15rem] font-semibold leading-none uppercase">{title}</h1><span className="text-xs text-muted-foreground">UI-Prüfung · ausschließlich Testdaten</span></header><main className="mx-auto max-w-[1244px] p-4 md:p-8">{current === 'users' ? <UserManagement /> : current === 'monitoring' ? <MonitoringDashboard /> : current === 'logs' ? <BoulderOperationLogs /> : current === 'tests' ? <PushNotificationTest /> : <p>Navigation: {current}</p>}</main></div></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[params.has('menus') ? '/' : '/admin?tab=' + (params.get('view') || 'users')]}><SidebarProvider><Fixture /></SidebarProvider></MemoryRouter></QueryClientProvider>);
