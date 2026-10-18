import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { BrandWatermark } from '@/components/brand/BrandWatermark';
import { launchDashboardFixture } from './launchMonitoring-data.mjs';
import '@/index.css';

const params = new URLSearchParams(location.search);
const mode = params.get('state');
const fixture = launchDashboardFixture();
const now = new Date().toISOString();
window.launchMonitoringQA = { requests: [], writeMode: 'success', readMode: 'success', eventMode: mode === 'reports-error' ? 'fail' : mode === 'reports-empty' ? 'empty' : 'success' };
window.launchMonitoringQA.live = { online: mode === 'empty' ? 0 : 12, accounts: mode === 'empty' ? 0 : 9, guests: mode === 'empty' ? 0 : 3, devices: mode === 'empty' ? 0 : 14, viewing_boulders: mode === 'empty' ? 0 : 7,
  boulders: mode === 'empty' ? [] : [{ id: '00000000-0000-4000-8000-000000000005', name: mode === 'long' ? 'SehrLangerBouldername'.repeat(10) : 'Grüne Kante', viewers: 5 }, { id: '00000000-0000-4000-8000-000000000006', name: 'Über den Dächern', viewers: 2 }] };
if (mode === 'query' || mode === 'reports-error' || mode === 'reports-empty') { fixture.issues[0].title = 'App-Daten konnten nicht geladen werden'; fixture.issues[0].platform = 'web'; fixture.issues[0].release = 'kws-beta-app@1.0.246+5086e1f42b61'; }
if (mode === 'empty') { for (const key of Object.keys(fixture.summary)) fixture.summary[key] = 0; for (const key of ['issues', 'activity', 'top_boulders', 'daily', 'deliveries']) fixture[key] = []; fixture.sources.collector.state = 'empty'; fixture.sources.issues.state = 'empty'; fixture.sources.notifications.state = 'empty'; }
if (mode === 'partial') { fixture.sources.collector.state = 'error'; fixture.sources.collector.detail = 'Collector vorübergehend nicht erreichbar. Fehlende Daten sind keine Nullwerte.'; }
if (mode === 'stale') { fixture.generated_at = new Date(Date.now() - 3600_000).toISOString(); fixture.sources.collector.state = 'stale'; fixture.activity[0].last_seen_at = fixture.generated_at; }
if (mode === 'external') { fixture.issues[0].regression = true; fixture.issues.push({ ...fixture.issues[1], fingerprint: 'sentry:fixture', title: 'Sentry-Testproblem', source: 'sentry', status: 'unresolved', permalink: 'https://sentry.example.test/issues/fixture', occurrences: 300, affected_devices: 8 }); }
if (mode === 'long') { fixture.issues[0].title = 'UnunterbrocheneTechnischeFehlermeldung'.repeat(8); fixture.issues[0].release = 'android@build-'.repeat(10); fixture.top_boulders[0].name = 'SehrLangerBouldername'.repeat(10); fixture.activity[0].release = 'android@build-'.repeat(10); fixture.releases.push(fixture.issues[0].release); }
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
  if (!requestUrl.pathname.startsWith('/qa/rest/v1/')) return realFetch(input, init);
  const payload = init?.body ? JSON.parse(String(init.body)) : {};
  window.launchMonitoringQA.requests.push({ path: requestUrl.pathname, payload });
  if (mode === 'loading') await new Promise(resolve => setTimeout(resolve, 60_000));
  if (mode === 'error' || window.launchMonitoringQA.readMode === 'fail') return new Response('', { status: 503 });
  if (mode === 'unconfigured') return new Response('', { status: 404 });
  if (requestUrl.pathname.endsWith('/kws_monitoring_live')) {
    if (window.launchMonitoringQA.liveError) return new Response('', { status: 503 });
    return Response.json({ schema_version: 1, generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 45000).toISOString(), ...window.launchMonitoringQA.live });
  }
  if (requestUrl.pathname.endsWith('/kws_monitoring_dashboard')) {
    const response = structuredClone(fixture);
    if (payload.p_platform !== 'all' || payload.p_release !== 'all') { response.summary.new_accounts = null; response.summary.confirmed_accounts = null; }
    return new Response(JSON.stringify(response));
  }
  if (requestUrl.pathname.endsWith('/kws_monitoring_issue_events')) {
    if (window.launchMonitoringQA.eventMode === 'fail') return new Response('', { status: 503 });
    if (window.launchMonitoringQA.eventMode === 'empty') return new Response('[]');
    return new Response(JSON.stringify([{ event_id: 'fixture-event-82', occurred_at: now, received_at: now, platform: 'android', release: 'android@1.0.67', installation_ref: 'fixture-3a9f', user_ref: null, session_ref: 'fixture-session', props: { code: mode === 'query' || mode === 'reports-error' || mode === 'reports-empty' ? 'QueryNetwork' : 'VideoPlaybackError', component: mode === 'query' || mode === 'reports-error' || mode === 'reports-empty' ? 'query' : 'video_player', error_code: 'playback_failed', private_note: 'do-not-export' } }]));
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
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter><main className="relative isolate min-h-screen bg-canvas px-4 pb-12 md:px-8"><BrandWatermark /><div className="relative mx-auto max-w-[1180px]"><header className="flex min-h-20 items-center justify-between gap-3"><h1 className="font-heading text-[2.15rem] font-semibold">Monitoring</h1><span className="text-xs text-muted-foreground">Isolierte Beispieldaten</span></header><MonitoringDashboard /></div></main></MemoryRouter></QueryClientProvider>);
declare global { interface Window { launchMonitoringQA: { requests: Array<{ path: string; payload: Record<string, unknown> }>; writeMode: 'success' | 'fail'; readMode: 'success' | 'fail'; eventMode: 'success' | 'fail' | 'empty'; live?: { online: number; accounts: number; guests: number; devices: number; viewing_boulders: number; boulders: Array<{ id: string; name: string; viewers: number }> }; liveError?: boolean; liveDisconnected?: boolean } } }
