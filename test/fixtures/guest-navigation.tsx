import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { AppNavigation } from '@/components/AppNavigation';
import { SidebarProvider } from '@/components/SidebarContext';
import Auth from '@/pages/Auth';
import { isAuthPage } from '@/lib/authRoutes';
import '@/index.css';

// The regression runner stubs account hooks. No account operation or live data.
function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <AppNavigation />
    {isAuthPage(location.pathname) ? <Auth /> : <main><h1>Boulderübersicht</h1></main>}
    <output data-testid="route" className="sr-only">{location.pathname}</output>
    <div className="fixed right-0 top-0 z-[200] flex gap-2">
      <button onClick={() => navigate(-1)}>Verlauf zurück</button>
      <button onClick={() => navigate(1)}>Verlauf vorwärts</button>
    </div>
  </>;
}
const route = new URLSearchParams(location.search).get('route') || '/guest';
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[route]}><SidebarProvider><Workspace /></SidebarProvider></MemoryRouter>,
);
