import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BoulderInfoTab } from '@/components/boulder/BoulderDetailSections';
import { personalBoulders } from './personal-hooks';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter>
    <main className="mx-auto max-w-lg p-4"><BoulderInfoTab boulder={personalBoulders[0]} /></main><Toaster />
  </MemoryRouter></QueryClientProvider>,
);
