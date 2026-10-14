import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Index from '@/pages/Index';
import Boulders from '@/pages/Boulders';
import Guest from '@/pages/Guest';
import BoulderDetail from '@/pages/BoulderDetail';
import { BoulderRouteContinuity } from '@/components/BoulderRouteContinuity';
import { SidebarProvider } from '@/components/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import '@/index.css';
const client = new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="route">{location.pathname + location.search}</output><output hidden data-testid="origin-scroll">{location.state?.boulderOrigin?.scrollTop}</output><button onClick={() => navigate(-1)}>Verlauf zurück</button><button onClick={() => navigate(1)}>Verlauf vor</button><Sidebar/><BoulderRouteContinuity/></>;
}
const initial = new URLSearchParams(location.search).get('start') ?? '/';
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[initial]}><SidebarProvider><Routes><Route element={<Layout/>}><Route path="/" element={<Index/>}/><Route path="/boulders" element={<Boulders/>}/><Route path="/guest" element={<Guest/>}/><Route path="/boulders/:id" element={<BoulderDetail/>}/><Route path="/statistics" element={<p>Statistiken</p>}/></Route></Routes></SidebarProvider></MemoryRouter></QueryClientProvider>);
