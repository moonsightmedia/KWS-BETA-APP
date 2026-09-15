import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationCenter } from '@/components/NotificationCenter';
import NotificationSettings from '@/pages/NotificationSettings';
import { SidebarProvider } from '@/components/SidebarContext';
import { useNotificationRuntime } from '@/hooks/useNotificationRuntime';
import '@/index.css';
export function Runtime() { useNotificationRuntime(); const location = useLocation(); return <><output className="sr-only" data-testid="route">{location.pathname + location.search}</output><Toaster /></>; }

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={[new URLSearchParams(location.search).get('route') || '/']}><SidebarProvider><Runtime />
      <Routes><Route path="/profile/notifications" element={<NotificationSettings />} />
        <Route path="*" element={<main className="min-h-screen bg-background p-4 md:p-8"><header className="mx-auto flex max-w-5xl items-center justify-between"><h1 className="font-heading text-4xl">Home</h1><NotificationCenter variant="header" /></header><div className="mx-auto mt-8 max-w-5xl"><h2 className="text-base font-semibold">Für deine nächste Session</h2><Link className="mt-4 inline-block text-sm" to="/profile/notifications">Mitteilungen einstellen</Link></div></main>} /></Routes>
    </SidebarProvider></MemoryRouter>
  </QueryClientProvider>,
);
