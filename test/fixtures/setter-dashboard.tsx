import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { SetterAreaLayout } from '@/components/setter/SetterAreaLayout';
import SetterDashboardPage from '@/pages/setter/SetterDashboardPage';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/index.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><TooltipProvider><MemoryRouter initialEntries={['/setter/dashboard']}><SidebarProvider>
  <Sidebar />
  <Routes><Route path="/setter" element={<SetterAreaLayout />}><Route path="dashboard" element={<><div className="mb-4 rounded-kws-control bg-secondary px-3 py-2 text-xs text-muted-foreground">Entwurf · Beispieldaten · Noch nicht veröffentlicht</div><SetterDashboardPage /></>} /><Route path="*" element={<p>Bestehender Setter-Arbeitsbereich</p>} /></Route></Routes>
</SidebarProvider></MemoryRouter></TooltipProvider></QueryClientProvider>);
