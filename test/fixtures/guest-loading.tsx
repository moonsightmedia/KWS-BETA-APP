// Real Guest page; data hooks are replaced only by the isolated e2e test routes.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Guest from '@/pages/Guest';
import '@/index.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}><MemoryRouter><Guest /></MemoryRouter></QueryClientProvider>,
);
