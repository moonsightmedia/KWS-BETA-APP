// Production Boulder page/navigation; test runner replaces data modules.
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import Boulders from '@/pages/Boulders';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import '@/index.css';
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
// A navigation-only detail destination: exercises the real list's unmount/remount
// without fetching private data or playing a remote video.
function DetailDestination() {
  const navigate = useNavigate();
  return <DashboardPageLayout headerBackTo="/boulders" headerBackLabel="Zurück zur Boulderübersicht"><button onClick={() => navigate(-1)}>Verlauf zurück</button></DashboardPageLayout>;
}
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}><MemoryRouter initialEntries={['/boulders']}><SidebarProvider><Sidebar /><Routes><Route path="/boulders" element={<Boulders />} /><Route path="/boulders/:id" element={<DetailDestination />} /></Routes></SidebarProvider></MemoryRouter></QueryClientProvider>,
);
