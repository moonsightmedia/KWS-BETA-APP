// Full production Setter layout and pages. All data/auth modules are isolated by Playwright.
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { UploadOverview } from '@/components/UploadOverview';
import { SetterAreaLayout } from '@/components/setter/SetterAreaLayout';
import Setter from '@/pages/Setter';
import SetterCreatePage from '@/pages/setter/SetterCreatePage';
import SetterEditPage from '@/pages/setter/SetterEditPage';
import SetterStatusPage from '@/pages/setter/SetterStatusPage';
import SetterSchedulePage from '@/pages/setter/SetterSchedulePage';
import { Toaster } from 'sonner';
import '@/index.css';

const route = new URLSearchParams(location.search).get('route') || '/setter/create';
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
if (window.setterQA) window.setterQA.refetch = async () => { await client.refetchQueries({ type: 'active' }); };
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><SidebarProvider>
    <Sidebar />
    <UploadOverview />
    <Routes>
      <Route path="/setter" element={<SetterAreaLayout />}>
        <Route index element={<Setter />} />
        <Route path="create" element={<SetterCreatePage />} />
        <Route path="edit" element={<SetterEditPage />} />
        <Route path="status" element={<SetterStatusPage />} />
        <Route path="schedule" element={<SetterSchedulePage />} />
      </Route>
      <Route path="/" element={<h1>App-Ziel</h1>} />
      <Route path="/auth" element={<h1>Anmeldung</h1>} />
      <Route path="/profile" element={<h1>Profil-Ziel</h1>} />
    </Routes><Toaster />
  </SidebarProvider></MemoryRouter></QueryClientProvider>,
);
