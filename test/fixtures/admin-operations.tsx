import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackManagement } from '@/components/admin/FeedbackManagement';
import { BoulderOperationLogs } from '@/components/admin/BoulderOperationLogs';
import '@/index.css';

const params = new URLSearchParams(location.search);
let feedback = [
  { id: 'feedback-1', type: 'bug', title: 'Video lädt nicht', description: 'Die Beta bleibt beim Laden stehen.', user_id: 'qa-member', user_email: 'alex@example.test', status: 'open', priority: 'high', browser_info: null, url: '/boulders/1', screenshot_url: null, error_details: null, metadata: null, created_at: '2026-09-12T10:00:00Z', updated_at: '2026-09-12T10:00:00Z', resolved_at: null, resolved_by: null },
  { id: 'feedback-2', type: 'feature', title: 'Sortierung merken', description: 'Filter sollen beim Wechsel erhalten bleiben.', user_id: 'qa-member', user_email: 'alex@example.test', status: 'resolved', priority: 'medium', browser_info: null, url: null, screenshot_url: null, error_details: null, metadata: null, created_at: '2026-09-11T09:00:00Z', updated_at: '2026-09-11T09:00:00Z', resolved_at: '2026-09-11T12:00:00Z', resolved_by: 'qa-admin' },
  { id: 'feedback-3', type: 'general', title: 'Öffnungszeiten', description: 'Kurze allgemeine Rückmeldung.', user_id: null, user_email: null, status: 'in_progress', priority: 'low', browser_info: null, url: null, screenshot_url: null, error_details: null, metadata: null, created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:00:00Z', resolved_at: null, resolved_by: null },
];
if (params.has('large')) {
  feedback = [...feedback, ...Array.from({ length: 1105 }, (_, index) => ({ ...feedback[0], id: `error-${String(index).padStart(5, '0')}`, type: 'error', title: index === 1104 ? 'Fehler: Ältester Sonderfall' : "Fehler: Cannot read properties of undefined (reading 'replace')", description: index === 1104 ? 'Suche [100%], exakt' : 'Automatisch gemeldeter Fehler', url: 'https://beta.example.test/boulders', priority: index === 1104 ? 'critical' : 'medium', created_at: new Date(Date.UTC(2026, 8, 12) - index * 60000).toISOString() }))];
}
const logs = [
  { id: 'log-1', boulder_id: 'b-1', operation_type: 'create', user_id: 'qa-admin', boulder_name: 'Grüner Pfeil', boulder_data: { name: 'Grüner Pfeil', difficulty: '6a', color: 'green' }, changes: null, created_at: '2026-09-13T09:00:00Z' },
  { id: 'log-2', boulder_id: 'b-2', operation_type: 'create', user_id: 'qa-admin', boulder_name: 'Kleine Kante', boulder_data: { name: 'Kleine Kante', difficulty: '5c', color: 'blue' }, changes: null, created_at: '2026-09-13T09:12:00Z' },
  { id: 'log-3', boulder_id: 'b-3', operation_type: 'update', user_id: 'qa-member', boulder_name: 'Roter Start', boulder_data: { name: 'Roter Start', difficulty: '6b' }, changes: { difficulty: { old: '6a', new: '6b' } }, created_at: '2026-09-12T14:00:00Z' },
];

window.adminOperationsQA = { writes: [], writeMode: 'success' };
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
  const method = init?.method ?? 'GET';
  if (!requestUrl.pathname.startsWith('/rest/v1/')) return realFetch(input, init);
  if ((method === 'GET' || method === 'HEAD') && window.adminOperationsQA.readMode === 'fail') return new Response('', { status: 503 });
  if (method !== 'GET' && method !== 'HEAD') {
    window.adminOperationsQA.writes.push({ method, url: requestUrl.pathname, payload: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (window.adminOperationsQA.writeMode === 'slow') await new Promise(resolve => setTimeout(resolve, 1200));
    if (window.adminOperationsQA.writeMode === 'partial_second' && window.adminOperationsQA.writes.length === 2) return new Response('', { status: 503 });
    if (window.adminOperationsQA.writeMode === 'fail') return new Response('Fixture failure', { status: 503 });
    if (window.adminOperationsQA.writeMode === 'empty') return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (requestUrl.pathname.endsWith('/feedback')) {
      const idParam = requestUrl.searchParams.get('id') ?? '';
      const ids = idParam.startsWith('in.(')
        ? idParam.slice(4, -1).split(',').map(id => id.replace(/^"|"$/g, '')).filter(Boolean)
        : idParam.startsWith('eq.') ? [idParam.slice(3)] : [];
      const patch = init?.body ? JSON.parse(String(init.body)) : {};
      const version = requestUrl.searchParams.get('updated_at')?.slice(3);
      const matching = feedback.filter(row => ids.includes(row.id) && (!version || row.updated_at === version));
      const result = matching.map(row => ({ ...row, ...patch }));
      if (method === 'DELETE') feedback = feedback.filter(row => !ids.includes(row.id));
      else feedback = feedback.map(row => result.find(resultRow => resultRow.id === row.id) || row);
      return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 204 });
  }
  const table = requestUrl.pathname.split('/').pop();
  if (table === 'feedback') {
    const status = requestUrl.searchParams.get('status')?.replace('eq.', '');
    const type = requestUrl.searchParams.get('type');
    const priority = requestUrl.searchParams.get('priority')?.slice(3);
    const id = requestUrl.searchParams.get('id')?.slice(3);
    let rows = feedback.filter(row => (!status || row.status === status) && (!priority || row.priority === priority) && (!type || (type.startsWith('neq.') ? row.type !== type.slice(4) : row.type === type.slice(3))) && (!id || row.id === id));
    const search = requestUrl.searchParams.get('or')?.match(/title\.imatch\.("(?:\\.|[^"\\])*")/);
    if (search) {
      const pattern = new RegExp(JSON.parse(search[1]), 'i');
      rows = rows.filter(row => pattern.test([row.title, row.description, row.user_email].join(' ')));
    }
    for (const bound of requestUrl.searchParams.getAll('created_at')) rows = rows.filter(row => bound.startsWith('lte.') ? row.created_at <= bound.slice(4) : row.created_at >= bound.slice(4));
    const total = rows.length;
    if (method === 'HEAD') return new Response(null, { headers: { 'Content-Range': `*/${total}` } });
    const cursor = requestUrl.searchParams.get('and')?.match(/created_at\.lt\.([^,]+),and\(created_at\.eq\.[^,]+,id\.lt\."([^"]+)"/);
    if (cursor) rows = rows.filter(row => row.created_at < cursor[1] || (row.created_at === cursor[1] && row.id < cursor[2]));
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    rows = rows.slice(0, Math.min(Number(requestUrl.searchParams.get('limit') || 1000), 200));
    const columns = requestUrl.searchParams.get('select');
    return new Response(JSON.stringify(columns && columns !== '*' ? rows.map(row => ({ id: row.id, title: row.title, type: row.type, status: row.status, priority: row.priority, created_at: row.created_at, url: row.url })) : rows), { headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${total}` } });
  }
  if (table === 'boulder_operation_logs') return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
  if (table === 'profiles') return new Response(JSON.stringify([{ id: 'qa-admin', email: 'admin@example.test', first_name: 'Alex', full_name: 'Alex Admin' }, { id: 'qa-member', email: 'alex@example.test', first_name: 'Alexandra', full_name: 'Alexandra Member' }]), { headers: { 'Content-Type': 'application/json' } });
  return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
};

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
function Fixture() {
  const view = params.get('view') ?? 'feedback';
  return <main className="min-h-screen overflow-x-clip bg-canvas p-4 md:p-8"><div className="mx-auto max-w-[1180px]">{view === 'logs' ? <BoulderOperationLogs /> : <FeedbackManagement />}</div></main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/admin']}><Fixture /></MemoryRouter></QueryClientProvider>);
