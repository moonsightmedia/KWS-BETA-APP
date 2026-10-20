import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { PullToRefreshHandler } from '@/components/PullToRefreshHandler';
import { Toaster } from '@/components/ui/sonner';
import '@/index.css';

let reads = 0;
const failRefresh = new URLSearchParams(location.search).has('failure');
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
function Contents() {
  const { data } = useQuery({ queryKey: ['boulders', 'refresh-fixture'], queryFn: async () => {
    const read = ++reads;
    await new Promise(resolve => setTimeout(resolve, 120));
    if (failRefresh && read > 1) throw new Error('Isolierter Verbindungsfehler');
    return read;
  } });
  return <><header className="border-b bg-white px-5 py-5"><h1 className="font-heading text-2xl text-brand-ink">Boulder</h1></header>
    <main className="mx-auto min-h-[75vh] max-w-3xl px-5 py-8" aria-label="Boulderübersicht für Aktualisierung">
      <p className="text-muted-foreground">Zum Aktualisieren nach unten ziehen.</p>
      <div className="mt-5 rounded-kws-card bg-white p-5 shadow-soft"><h2 className="font-semibold">Aktuelle Boulder</h2><p data-testid="read-count">Datenstand {data ?? 'lädt'}</p></div>
    </main><PullToRefreshHandler /><Toaster /></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><MemoryRouter><Contents /></MemoryRouter></QueryClientProvider>);
