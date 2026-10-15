import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetSchedule from '@/pages/ResetSchedule';
import Index from '@/pages/Index';
import Profile from '@/pages/Profile';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { TrainingProvider } from '@/features/training/TrainingContext';
import '@/index.css';
function BoulderDestination() { const location = useLocation(); return <DashboardPageLayout><h2>Boulder-Auswahl</h2><p>{new URLSearchParams(location.search).get('sector')}</p><Link to="/schedule" className="inline-flex min-h-11 items-center rounded-kws-control bg-secondary px-3">Zum Schraubplan</Link></DashboardPageLayout>; }
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('route') || '/schedule']}><TrainingProvider accountId="reset-fixture"><SidebarProvider><Sidebar /><Routes>
    <Route path="/schedule" element={<ResetSchedule />} /><Route path="/" element={<Index />} /><Route path="/profile" element={<Profile />} />
    <Route path="/guest" element={<p>Gastansicht geöffnet</p>} /><Route path="/boulders" element={<BoulderDestination />} />
  </Routes></SidebarProvider></TrainingProvider></MemoryRouter>
</QueryClientProvider>);
