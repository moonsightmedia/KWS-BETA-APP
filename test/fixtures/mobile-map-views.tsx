import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {SidebarProvider} from '@/components/SidebarContext';
import {HallMapManagement} from '@/components/admin/HallMapManagement';
import TvSchedule from '@/pages/TvSchedule';
import '@/index.css';
const mode=new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><SidebarProvider>
 <p className="p-4 text-sm">Isolierte Kartenprüfung · Beispieldaten</p>{mode==='tv'?<TvSchedule/>:<HallMapManagement/>}
</SidebarProvider></MemoryRouter></QueryClientProvider>);
