import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { BoulderInfoTab } from '@/components/boulder/BoulderDetailSections';
import { accountProfileKey } from '@/hooks/useAccountProfile';
import type { Boulder } from '@/types/boulder';
import '@/index.css';
const owner = '11111111-1111-4111-8111-111111111111';
function Fixture() {
  const client = useQueryClient();
  return <main className="mx-auto max-w-3xl p-4 md:p-8"><h1 className="mb-4 font-sans text-base font-semibold">Lokale Kommentarprüfung · Testdaten</h1>
    <button className="mb-4 min-h-11 rounded-kws-control bg-secondary px-4 text-xs" onClick={() => client.setQueryData(accountProfileKey(owner), {full_name:'Alex Berg',avatar_url:'/qa-comment-new.svg'})}>Gespeichertes Foto aktualisieren</button>
    <BoulderInfoTab boulder={{id:'33333333-3333-4333-8333-333333333333'} as Boulder} /></main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><Fixture /></MemoryRouter></QueryClientProvider>);
