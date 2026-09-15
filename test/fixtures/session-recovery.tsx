import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useSectorSchedule } from '@/hooks/useSectorSchedule';
import { useActiveHallMap } from '@/hooks/useHallMaps';
import { supabase } from './session-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import '@/index.css';

const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
function Workspace() {
  const { session, loading } = useAuth();
  const schedule = useSectorSchedule();
  const map = useActiveHallMap(session?.access_token, !loading && !!session);
  const [draft,setDraft] = useState('');
  const [status,setStatus] = useState('Bereit');
  const [editor,setEditor] = useState(false);
  return <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
    <h1>Sitzungsprüfung</h1>
    <p>Isolierte Testdaten · keine echten Uploads</p>
    <p data-testid="auth-state">{loading?'Prüfung':session?'Angemeldet':'Gast'}</p>
    <p data-testid="token-state">{session && JSON.parse(atob(session.access_token.split('.')[1])).version===2?'Erneuert':'Ursprünglich'}</p>
    <p data-testid="read-state">Planung: {schedule.isSuccess?'geladen':'offen'} · Karte: {map.isSuccess?'geladen':'offen'}</p>
    <label className="block">Entwurf<Input aria-label="Entwurf" value={draft} onChange={e=>setDraft(e.target.value)} /></label>
    <div className="flex flex-wrap gap-3">
      <Button onClick={async()=>{setStatus('Erneuere');const {error}=await supabase.auth.refreshSession();setStatus(error?'Abgelaufen':'Erneuerung abgeschlossen');}}>Token erneuern</Button>
      <Button onClick={async()=>{await supabase.auth.getSession();setStatus('Sitzung geprüft');}}>Sitzung prüfen</Button>
      <Button onClick={()=>void Promise.all([schedule.refetch(),map.refetch()])}>Seiten erneut laden</Button>
      <Button onClick={()=>setEditor(true)}>Editor öffnen</Button>
    </div>
    <p role="status">{status}</p>
    <Dialog open={editor} onOpenChange={setEditor}><DialogContent className="p-5 md:!max-w-lg"><DialogTitle>Boulder-Entwurf</DialogTitle><Input aria-label="Editor-Entwurf" value={draft} onChange={e=>setDraft(e.target.value)}/><Button onClick={()=>setEditor(false)}>Editor schließen</Button></DialogContent></Dialog>
  </main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><AuthProvider><Workspace /></AuthProvider></QueryClientProvider>);
