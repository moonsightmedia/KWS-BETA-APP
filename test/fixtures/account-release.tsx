import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from '@/pages/Auth';
import ProfileEdit from '@/pages/ProfileEdit';
import { AccountDeletionQueue } from '@/components/admin/AccountDeletionQueue';
import { BoulderManagement } from '@/components/admin/BoulderManagement';
import '@/index.css';

function Fixture() {
  const view = new URLSearchParams(location.search).get('view') || 'auth';
  const [action, setAction] = useState('Keine Kontoaktion ausgeführt');
  useEffect(() => { const listener = (event: Event) => setAction((event as CustomEvent<string>).detail); document.addEventListener('qa-account-action', listener); return () => document.removeEventListener('qa-account-action', listener); }, []);
  return <><div className="bg-secondary px-4 py-2 text-xs text-muted-foreground" role="note">Lokale Funktionsprüfung · ausschließlich Testdaten</div>
    {view === 'auth' ? <Auth /> : view === 'profile' ? <ProfileEdit /> : <main className="mx-auto max-w-5xl p-4 md:p-8">{view === 'queue' ? <AccountDeletionQueue enabled names={{ 'f0000000-0000-4000-8000-000000000016': 'qa@example.invalid' }} /> : <BoulderManagement />}</main>}
    <output className="block bg-secondary p-3 text-xs" aria-label="Testaktion">{action}</output>
  </>;
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const router = createMemoryRouter([{ path: '*', element: <Fixture /> }], { initialEntries: ['/auth/register'] });
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
