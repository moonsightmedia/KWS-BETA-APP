import { MonitoringConsentPrompt } from '@/components/MonitoringPrivacy';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Guest from '@/pages/Guest';
import BoulderDetail from '@/pages/BoulderDetail';
import Auth from '@/pages/Auth';
import OnboardingPreview from '@/pages/OnboardingPreview';
import { OnboardingProvider } from '@/components/Onboarding';
import { SidebarProvider } from '@/components/SidebarContext';
import { BoulderRouteContinuity } from '@/components/BoulderRouteContinuity';
import { AppNavigation } from '@/components/AppNavigation';
import '@/index.css';
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
function Layout() {
  const location = useLocation();
  return <OnboardingProvider><SidebarProvider><output hidden data-testid="route">{location.pathname + location.search}</output><AppNavigation/><MonitoringConsentPrompt/><BoulderRouteContinuity/></SidebarProvider></OnboardingProvider>;
}
const start = new URLSearchParams(location.search).get('start') ?? '/guest';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[start]}><Routes><Route element={<Layout/>}>
  <Route path="/guest" element={<Guest/>}/><Route path="/boulders/:id" element={<BoulderDetail/>}/>
  <Route path="/onboarding/:preview" element={<OnboardingPreview/>}/><Route path="/app/register" element={<Auth/>}/><Route path="/app/login" element={<Auth/>}/>
  <Route path="/auth" element={<Auth/>}/><Route path="/boulders" element={<p>Angemeldete Boulderübersicht</p>}/>
</Route></Routes></MemoryRouter></QueryClientProvider>);
