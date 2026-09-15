// Test-only: Playwright substitutes useColors with local, in-memory hooks.
// Do not use this fixture for production screenshots or access verification.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorManagement } from '@/components/admin/ColorManagement';
import '@/index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><main className="mx-auto min-h-screen max-w-5xl bg-canvas p-4 sm:p-8"><ColorManagement /></main></QueryClientProvider>);
