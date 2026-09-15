// Production Boulder page/navigation; test runner replaces data modules.
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Boulders from '@/pages/Boulders';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import '@/index.css';
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}><MemoryRouter initialEntries={['/boulders']}><SidebarProvider><Sidebar /><Boulders /></SidebarProvider></MemoryRouter></QueryClientProvider>,
);
