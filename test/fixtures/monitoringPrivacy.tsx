import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MonitoringConsentPrompt, MonitoringPrivacySettings } from '@/components/MonitoringPrivacy';
import { BoulderVideoPlayer } from '@/components/boulder/BoulderVideoPlayer';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { reportMonitoringError, reportMonitoringOperationError, setMonitoringLoadedBoulder, setMonitoringScreen, startMonitoring, stopMonitoring, trackMonitoring } from '@/utils/monitoring';
import AppLegal from '@/pages/AppLegal';
import '@/index.css';

function Fixture() {
  useEffect(() => { setMonitoringScreen('/boulders/00000000-0000-4000-8000-000000000005'); startMonitoring(); return stopMonitoring; }, []);
  return <><Routes><Route path="*" element={<main className="min-h-screen bg-canvas px-4 py-6"><div className="mx-auto max-w-xl space-y-6"><h1 className="font-heading text-4xl">Beta-Diagnose</h1><KwsSurface className="space-y-4 p-4"><p>Isolierte Testoberfläche ohne echte Nutzerdaten.</p><Button onClick={() => reportMonitoringError(new Error('Testbericht test@example.invalid token=fixture-secret'), 'qa')}>Testfehler auslösen</Button><Button variant="secondary" onClick={() => reportMonitoringOperationError('query', new Error('REST fetch failed: 503 private-response-content'))}>Datenfehler testen</Button><div className="h-64"><BoulderVideoPlayer boulderId="00000000-0000-4000-8000-000000000005" betaVideoUrl="/test/fixtures/vertical-player.mp4" /></div></KwsSurface><MonitoringPrivacySettings /></div></main>} /><Route path="/app/privacy" element={<AppLegal />} /></Routes><MonitoringConsentPrompt /></>;
}

function CachedBoulder({ id }: { id: string }) {
  useEffect(() => { const clear = setMonitoringLoadedBoulder(id); trackMonitoring('boulder_detail_view', { screen: 'boulder' }, id); return clear; }, [id]);
  return <p>Geladener Boulder</p>;
}

function CachedNavigation() {
  const [screen, setScreen] = useState('list');
  const id = '00000000-0000-4000-8000-000000000005';
  useEffect(() => { startMonitoring(); return stopMonitoring; }, []);
  useEffect(() => { const selected = screen === 'list' ? null : screen === 'loaded' ? id : '00000000-0000-4000-8000-000000000006'; setMonitoringScreen(selected ? `/boulder/${selected}` : '/boulders', selected); }, [screen]);
  return <main className="space-y-4 p-5"><h1>Cache-Navigation</h1><Button onClick={() => setScreen('loaded')}>Geladenen Boulder öffnen</Button><Button onClick={() => setScreen('missing')}>Nicht geladenen Boulder öffnen</Button><Button onClick={() => setScreen('list')}>Zur Übersicht</Button>{screen === 'loaded' && <CachedBoulder id={id} />}<MonitoringPrivacySettings /><MonitoringConsentPrompt /></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><MemoryRouter>{location.search.includes('cached-navigation') ? <CachedNavigation /> : <Fixture />}</MemoryRouter></StrictMode>);
