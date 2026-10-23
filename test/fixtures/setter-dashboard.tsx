import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { SetterAreaLayout } from '@/components/setter/SetterAreaLayout';
import SetterDashboardPage from '@/pages/setter/SetterDashboardPage';
import { SetterDashboardV2 } from '../../docs/design/setter-dashboard/v2/SetterDashboardV2';
import { useSetterDashboard } from '@/hooks/useSetterDashboard';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/index.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const v2 = new URLSearchParams(location.search).get('design') === 'v2';
function V2Page() {
  const query = useSetterDashboard();
  return <SetterDashboardV2 data={query.data} loading={query.isLoading} refreshing={query.isFetching} error={!!query.error} updatedAt={query.dataUpdatedAt} onRefresh={() => { void query.refetch(); }} />;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><TooltipProvider><MemoryRouter initialEntries={['/setter/dashboard']}><SidebarProvider>
  <Sidebar />
  <Routes><Route path="/setter" element={<SetterAreaLayout />}><Route path="dashboard" element={<><div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{v2 ? 'Entwurf 2' : 'Entwurf 1'} · Beispieldaten · unveröffentlicht</span><a className="inline-flex min-h-11 items-center rounded-kws-control bg-secondary px-3 font-medium text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={v2 ? '?design=v1' : '?design=v2'}>{v2 ? 'Entwurf 1 vergleichen' : 'Entwurf 2 ansehen'}</a></div>{v2 ? <V2Page /> : <SetterDashboardPage />}</>} /><Route path="*" element={<p>Bestehender Setter-Arbeitsbereich</p>} /></Route></Routes>
</SidebarProvider></MemoryRouter></TooltipProvider></QueryClientProvider>);
