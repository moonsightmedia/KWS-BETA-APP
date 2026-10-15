import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import Guest from '@/pages/Guest';
import BoulderDetail from '@/pages/BoulderDetail';
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import '@/index.css';

const view = new URLSearchParams(location.search).get('view') || 'home';
const boulder = { id: 'b-1', name: 'Volumen-Testboulder', sector: 'Grotte C',
  difficulty: 4 as const, color: 'Grün' as const, color2: 'Weiß' as const,
  volumeOnly: true, createdAt: new Date(), thumbnailUrl: '/src/assets/boulderkarte-original.png' };
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={[view === 'detail' ? '/boulders/b-1' : '/']}>
      <SidebarProvider>
        {view !== 'guest' && view !== 'dialog' && <Sidebar />}
        {view === 'home' ? <Index /> : view === 'guest' ? <Guest /> : view === 'dialog'
          ? <BoulderDetailDialog boulder={boulder} open onOpenChange={() => {}} />
          : <Routes><Route path="/boulders/:id" element={<BoulderDetail />} /></Routes>}
      </SidebarProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);
