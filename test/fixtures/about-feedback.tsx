import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { ProfileMenu } from '@/components/ProfileMenu';
import { SidebarProvider } from '@/components/SidebarContext';
import AboutApp from '@/pages/AboutApp';
import '@/index.css';
function Fixture() {
  const route = useLocation();
  return <><p className="bg-secondary px-4 py-1 text-xs">Isolierte App-Info-Prüfung · Beispieldaten</p><Toaster /><Routes>
    <Route path="/profile/about" element={<AboutApp />} />
    <Route path="*" element={<DashboardPageLayout><p>Beispielinhalt</p><div className="hidden md:block"><ProfileMenu /></div></DashboardPageLayout>} />
  </Routes><output className="block px-4 py-3 text-xs" data-testid="route">{route.pathname}{route.search}</output></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[new URLSearchParams(location.search).get('route') || '/profile/about']}><SidebarProvider><Fixture /></SidebarProvider></MemoryRouter></QueryClientProvider>);
