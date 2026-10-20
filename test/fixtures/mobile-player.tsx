import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BoulderRouteContinuity } from '@/components/BoulderRouteContinuity';
import { SidebarProvider } from '@/components/SidebarContext';
import { AppNavigation } from '@/components/AppNavigation';
import BoulderDetail from '@/pages/BoulderDetail';
import { boulderNavigationState } from '@/lib/boulderNavigation';
import '@/index.css';
function Overview() {
  const location = useLocation(), navigate = useNavigate();
  return <button onClick={() => navigate('/boulders/b-1', { state: boulderNavigationState(location) })}>Kühner Wurm öffnen</button>;
}
function Layout() {
  const location = useLocation();
  return <><output hidden data-testid="route">{location.pathname}</output><AppNavigation /><Routes><Route element={<BoulderRouteContinuity />}><Route path="/boulders/:id" element={<BoulderDetail />} /><Route path="/boulders" element={<Overview />} /><Route path="/guest" element={<Overview />} /></Route></Routes></>;
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const initial = new URLSearchParams(location.search).get('start') || '/boulders/b-1';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[initial]}><SidebarProvider><Layout /></SidebarProvider></MemoryRouter></QueryClientProvider>);
