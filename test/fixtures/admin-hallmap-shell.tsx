// Real Admin/Header/MobileNavigation composition; test runner isolates data hooks.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/SidebarContext';
import { AdminMobileNavigation } from '@/components/admin/AdminMobileNavigation';
import Admin from '@/pages/Admin';
import '@/index.css';
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin?tab=settings&settingsTab=hallMap']}><SidebarProvider><AdminMobileNavigation /><Admin /></SidebarProvider></MemoryRouter></QueryClientProvider>);
