import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { BrandWatermark } from '@/components/brand/BrandWatermark';
import { launchDashboardFixture } from './launchMonitoring-data.mjs';
import { adminOverviewFixture } from './adminOverview-data.mjs';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminMobileNavigation } from '@/components/admin/AdminMobileNavigation';
import '@/index.css';

const params = new URLSearchParams(location.search);
const mode = params.get('state');
const fixture = launchDashboardFixture();
const overviewFixture = adminOverviewFixture();
const fixturePerson = { id: '00000000-0000-4000-8000-000000000001', first_name: 'Alexandra', last_name: 'Bergmann', full_name: 'Alexandra Bergmann', email: 'alexandra@example.test', birth_date: null, created_at: new Date().toISOString() };
const now = new Date().toISOString();
window.launchMonitoringQA = { requests: [], writeMode: 'success', readMode: 'success', eventMode: mode === 'reports-error' ? 'fail' : mode === 'reports-empty' ? 'empty' : 'success' };
window.launchMonitoringQA.live = { online: mode === 'empty' ? 0 : 12, accounts: mode === 'empty' ? 0 : 9, guests: mode === 'empty' ? 0 : 3, devices: mode === 'empty' ? 0 : 14, viewing_boulders: mode === 'empty' ? 0 : 7,
  boulders: mode === 'empty' ? [] : [{ id: '00000000-0000-4000-8000-000000000005', name: mode === 'long' ? 'SehrLangerBouldername'.repeat(10) : 'Grüne Kante', viewers: 5 }, { id: '00000000-0000-4000-8000-000000000006', name: 'Über den Dächern', viewers: 2 }] };
if (mode === 'query' || mode === 'reports-error' || mode === 'reports-empty') { fixture.issues[0].title = 'App-Daten konnten nicht geladen werden'; fixture.issues[0].platform = 'web'; fixture.issues[0].release = 'kws-beta-app@1.0.246+5086e1f42b61'; }
if (mode === 'empty') { for (const key of Object.keys(fixture.summary)) fixture.summary[key] = 0; for (const key of ['issues', 'activity', 'top_boulders', 'daily', 'deliveries']) fixture[key] = []; fixture.sources.collector.state = 'empty'; fixture.sources.issues.state = 'empty'; fixture.sources.notifications.state = 'empty'; }
if (mode === 'partial') { fixture.sources.collector.state = 'error'; fixture.sources.collector.detail = 'Collector vorübergehend nicht erreichbar. Fehlende Daten sind keine Nullwerte.'; }
if (mode === 'stale') { fixture.generated_at = new Date(Date.now() - 3600_000).toISOString(); fixture.sources.collector.state = 'stale'; fixture.activity[0].last_seen_at = fixture.generated_at; }
if (mode === 'external') { fixture.issues[0].regression = true; fixture.issues.push({ ...fixture.issues[1], fingerprint: 'sentry:fixture', title: 'Sentry-Testproblem', source: 'sentry', status: 'unresolved', permalink: 'https://sentry.example.test/issues/fixture', occurrences: 300, affected_devices: 8 }); }
if (mode === 'workspace') {
  fixture.issues[0].title = 'App-Daten konnten nicht geladen werden'; fixture.issues[0].platform = 'web'; fixture.issues[0].release = 'kws-beta-app@1.0.246+5086e1f42b61';
  fixture.issues.push(
    { ...fixture.issues[0], fingerprint: 'sentry:abort', title: 'AbortError (JAVASCRIPT-REACT-J)', source: 'sentry', status: 'unresolved', platform: null, release: null, affected_devices: 0, occurrences: 300, last_seen_at: new Date(Date.now() - 3600_000).toISOString(), permalink: 'https://sentry.example.test/issues/abort' },
    { ...fixture.issues[0], fingerprint: 'sentry:fixed', title: 'Sentry-Problem (JAVASCRIPT-REACT-H)', source: 'sentry', status: 'resolved', affected_devices: 0, occurrences: 1, permalink: 'https://sentry.example.test/issues/fixed' },
    { ...fixture.issues[1], fingerprint: 'fixture-regression', title: 'Video nach bestätigter Korrektur erneut ausgefallen', regression: true, status: 'open', fixed_release: 'android@1.0.66' },
    { ...fixture.issues[0], fingerprint: 'fixture-ignored', title: 'Bewusst ignorierter Testfall', status: 'ignored' },
  );
}
if (mode === 'issues-error') fixture.sources.issues.state = 'error';
if (mode === 'limit') fixture.issues = Array.from({ length: 200 }, (_, index) => ({ ...fixture.issues[0], fingerprint: `fixture-limit-${index}`, title: `Video-Problem ${index + 1}` }));
if (mode === 'long') { fixture.issues[0].title = 'UnunterbrocheneTechnischeFehlermeldung'.repeat(8); fixture.issues[0].release = 'android@build-'.repeat(10); fixture.top_boulders[0].name = 'SehrLangerBouldername'.repeat(10); fixture.activity[0].release = 'android@build-'.repeat(10); fixture.releases.push(fixture.issues[0].release); }
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
  if (!requestUrl.pathname.startsWith('/qa/rest/v1/')) return realFetch(input, init);
  const payload = init?.body ? JSON.parse(String(init.body)) : {};
  window.launchMonitoringQA.requests.push({ path: requestUrl.pathname, query: requestUrl.search, payload });
  if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 60_000));
  if (mode === 'error' || window.launchMonitoringQA.readMode === 'fail') return new Response('', { status: 503 });
  if (mode === 'unconfigured') return new Response('', { status: 404 });
  if (requestUrl.pathname.endsWith('/kws_admin_availability')) {
    if (mode === 'availability-error') return new Response('', { status: 503 });
    if (mode === 'availability-unconfigured') return Response.json({ schema_version: 1, server_time: new Date().toISOString(), state: 'unconfigured', snapshot: null });
    const observed = new Date(Date.now() - (mode === 'availability-stale' ? 600000 : 10000)).toISOString();
    return Response.json({ schema_version: 1, server_time: new Date().toISOString(), state: mode === 'availability-stale' ? 'stale' : 'ready', snapshot: { schema_version: 1, generated_at: observed,
      services: ['app', 'api', 'video'].map(id => ({ id, state: mode === 'availability-outage' && id === 'api' ? 'outage' : 'operational', checked_at: observed, latency_ms: 40, alert_mode: 'live' })),
      incidents: [{ service: 'api', state: mode === 'availability-outage' ? 'open' : 'resolved', started_at: new Date(Date.now() - 3600000).toISOString(), ended_at: mode === 'availability-outage' ? null : new Date(Date.now() - 1800000).toISOString(), cause: 'timeout' }] } });
  }
  if (requestUrl.pathname.endsWith('/kws_monitoring_live')) {
    if (window.launchMonitoringQA.liveError) return new Response('', { status: 503 });
    return Response.json({ schema_version: 1, generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 45000).toISOString(), ...window.launchMonitoringQA.live });
  }
  if (requestUrl.pathname.endsWith('/kws_monitoring_dashboard')) {
    const response = structuredClone(fixture);
    if (payload.p_platform !== 'all' || payload.p_release !== 'all') {
      response.summary.new_accounts = null; response.summary.confirmed_accounts = null;
      response.issues = response.issues.filter(issue => issue.source !== 'sentry' && (payload.p_platform === 'all' || issue.platform === payload.p_platform) && (payload.p_release === 'all' || issue.release === payload.p_release));
    }
    return new Response(JSON.stringify(response));
  }
  if (requestUrl.pathname.endsWith('/kws_admin_overview')) {
    if (mode === 'overview-unconfigured') return new Response('', { status: 404 });
    if (mode === 'overview-denied') return new Response('', { status: 403 });
    if (mode === 'overview-stale') {
      overviewFixture.generated_at = new Date(Date.now() - 600000).toISOString();
      overviewFixture.period_end = overviewFixture.generated_at;
      overviewFixture.period_start = new Date(Date.now() - 600000 - 86400000).toISOString();
    }
    if (mode === 'overview-empty') for (const group of ['users', 'hall', 'moderation', 'feedback', 'monitoring', 'uploads', 'notifications']) for (const key of Object.keys(overviewFixture[group])) if (typeof overviewFixture[group][key] === 'number') overviewFixture[group][key] = 0;
    return Response.json(overviewFixture);
  }
  if (requestUrl.pathname.endsWith('/profiles')) return Response.json(mode === 'profile-missing' || requestUrl.searchParams.has('id') && requestUrl.searchParams.get('id') !== `eq.${fixturePerson.id}` ? [] : [fixturePerson]);
  if (requestUrl.pathname.endsWith('/user_roles')) return Response.json([]);
  if (requestUrl.pathname.endsWith('/kws_admin_issue_events') && mode === 'actor-unavailable') return new Response('', { status: 404 });
  if (requestUrl.pathname.endsWith('/kws_monitoring_issue_events') || requestUrl.pathname.endsWith('/kws_admin_issue_events')) {
    if (window.launchMonitoringQA.eventMode === 'fail') return new Response('', { status: 503 });
    if (window.launchMonitoringQA.eventMode === 'empty') return new Response('[]');
    const actor = mode === 'actor-unavailable' ? undefined : mode === 'actor-guest' ? { state: 'guest', user_id: null, display_name: null, email: null } : mode === 'actor-unassigned' ? { state: 'unassigned', user_id: null, display_name: null, email: null } : { state: 'account', user_id: fixturePerson.id, display_name: fixturePerson.full_name, email: fixturePerson.email };
    return new Response(JSON.stringify([{ event_id: 'fixture-event-82', occurred_at: now, received_at: now, platform: 'android', release: 'android@1.0.67', installation_ref: 'fixture-3a9f', user_ref: null, session_ref: 'fixture-session', actor, props: { code: mode === 'query' || mode === 'reports-error' || mode === 'reports-empty' ? 'QueryNetwork' : 'VideoPlaybackError', component: mode === 'query' || mode === 'reports-error' || mode === 'reports-empty' ? 'query' : 'video_player', error_code: 'playback_failed', private_note: 'do-not-export' } }]));
  }
  if (requestUrl.pathname.endsWith('/kws_monitoring_issue_status')) {
    if (window.launchMonitoringQA.writeMode === 'fail') return new Response('', { status: 503 });
    const issue = fixture.issues.find(row => row.fingerprint === payload.p_fingerprint);
    issue.status = payload.p_status; issue.fixed_release = payload.p_fixed_release;
    return new Response(JSON.stringify({ fingerprint: issue.fingerprint, status: issue.status, fixed_release: issue.fixed_release }));
  }
  return new Response('[]');
};
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const initialParams = new URLSearchParams({ tab: params.get('page') === 'overview' ? 'overview' : params.get('page') === 'user' ? 'users' : 'monitoring' });
for (const key of ['userId', 'monitoringView', 'monitoringDays']) if (params.has(key)) initialParams.set(key, params.get(key)!);
const initialRoute = '/admin?' + initialParams.toString();
function FixturePage() {
  const route = useLocation();
  const tab = new URLSearchParams(route.search).get('tab');
  return <><output data-testid="fixture-route" className="sr-only">{route.pathname}{route.search}</output>{tab === 'overview' ? <AdminOverview connection={{ url: 'http://127.0.0.1:4191/qa', key: 'isolated-fixture-public', token: 'fixture-only' }} accountId="fixture-admin" /> : tab === 'users' ? <UserManagement /> : tab === 'monitoring' ? <MonitoringDashboard /> : <p>Bereich: {tab}</p>}<AdminMobileNavigation /></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[initialRoute]}><main className="relative isolate min-h-screen bg-canvas px-4 pb-28 md:px-8 md:pb-12"><BrandWatermark /><div className="relative mx-auto max-w-[1180px]"><header className="flex min-h-20 items-center justify-between gap-3"><h1 className="font-heading text-[2.15rem] font-semibold">{params.get('page') === 'overview' ? 'Übersicht' : params.get('page') === 'user' ? 'Benutzer' : 'Monitoring'}</h1><span className="text-xs text-muted-foreground">Isolierte Beispieldaten</span></header><FixturePage /></div></main></MemoryRouter></QueryClientProvider>);
declare global { interface Window { launchMonitoringQA: { requests: Array<{ path: string; query?: string; payload: Record<string, unknown> }>; writeMode: 'success' | 'fail'; readMode: 'success' | 'fail'; eventMode: 'success' | 'fail' | 'empty'; live?: { online: number; accounts: number; guests: number; devices: number; viewing_boulders: number; boulders: Array<{ id: string; name: string; viewers: number }> }; liveError?: boolean; liveDisconnected?: boolean } } }
