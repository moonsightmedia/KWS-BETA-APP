import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Statistics from '@/pages/Statistics';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import Boulders from '@/pages/Boulders';
import Profile from '@/pages/Profile';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/index.css';

function CrashTest() {
  const [crash, setCrash] = useState(false);
  if (crash) throw new Error('Isolierter Testfehler');
  return <div className="p-8 md:ml-64"><button onClick={() => setCrash(true)}>Testfehler auslösen</button></div>;
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}, mutations:{retry:false}}})}>
    <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('route') || '/statistics']}>
      <SidebarProvider><ErrorBoundary><Sidebar /><Routes>
        <Route path="/statistics" element={<Statistics />} /><Route path="/" element={<Index />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/boulders" element={<Boulders />} /><Route path="/boulders/:id" element={<p>Boulder-Detail geöffnet</p>} />
        <Route path="/test-error" element={<CrashTest />} /><Route path="*" element={<NotFound />} />
      </Routes></ErrorBoundary></SidebarProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);
