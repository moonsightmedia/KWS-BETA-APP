import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { SetterAreaLayout } from '@/components/setter/SetterAreaLayout';
import SetterDashboardPage from '@/pages/setter/SetterDashboardPage';
import { SetterDashboardV4 } from '../../docs/design/setter-dashboard/v4/SetterDashboardV4';
import { SetterDashboardV3 } from '../../docs/design/setter-dashboard/v3/SetterDashboardV3';
import { SetterDashboardV2 } from '../../docs/design/setter-dashboard/v2/SetterDashboardV2';
import { useSetterDashboard } from '@/hooks/useSetterDashboard';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/index.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const design = new URLSearchParams(location.search).get('design');
const v2 = design === 'v2';
const v3 = design === 'v3';
const v4 = design === 'v4';
function V2Page() {
  const query = useSetterDashboard();
  const Dashboard = v4 ? SetterDashboardV4 : v3 ? SetterDashboardV3 : SetterDashboardV2;
  return <Dashboard data={query.data} loading={query.isLoading} refreshing={query.isFetching} error={!!query.error} updatedAt={query.dataUpdatedAt} onRefresh={() => { void query.refetch(); }} />;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><TooltipProvider><MemoryRouter initialEntries={['/setter/dashboard']}><SidebarProvider>
  <Sidebar />
  <Routes><Route path="/setter" element={<SetterAreaLayout />}><Route path="dashboard" element={<>{!v3 && !v4 && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{v3 ? 'UI-Entwurf 3' : v2 ? 'Entwurf 2' : 'Entwurf 1'} · Beispieldaten · unveröffentlicht</span><a className="inline-flex min-h-11 items-center rounded-kws-control bg-secondary px-3 font-medium text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={v3 ? '?design=v2' : '?design=v3'}>{v3 ? 'Vorher vergleichen' : 'UI-Entwurf 3 ansehen'}</a></div>}{v2 || v3 || v4 ? <V2Page /> : <SetterDashboardPage />}</>} /><Route path="*" element={<p>Bestehender Setter-Arbeitsbereich</p>} /></Route></Routes>
</SidebarProvider></MemoryRouter></TooltipProvider></QueryClientProvider>);
