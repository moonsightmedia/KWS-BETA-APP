import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { UploadProvider, useUpload } from '@/contexts/UploadContext';
import '@/index.css';

const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
function Workspace() {
  const { session, loading } = useAuth();
  const { uploads, startUpload, resumeUpload } = useUpload();
  const [draft,setDraft] = useState('Nicht verlieren');
  const [started,setStarted] = useState(false);
  const [error,setError] = useState('');
  const start = async () => {
    setStarted(true);
    try {
      await startUpload('boulder-fixture',new File([new Uint8Array(5*1024*1024+32)],'fixture.mp4',{type:'video/mp4'}),'video','fixture-sector');
      await startUpload('boulder-fixture',new File(['fixture-image'],'fixture.jpg',{type:'image/jpeg'}),'thumbnail','fixture-sector');
    } catch (e) { setError(e instanceof Error ? e.message : 'Fehler'); }
  };
  return <main>
    <h1>Upload-Authentifizierung · isolierte Testdaten</h1>
    <p data-testid="auth-state">{loading?'Prüfung':session?'Angemeldet':'Gast'}</p>
    <label>Entwurf<input aria-label="Entwurf" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
    <button disabled={loading||!session||started} onClick={()=>void start()}>Test-Uploads starten</button>
    <p role="status">{error}</p>
    {uploads.map(upload=><section key={upload.sessionId} data-testid={`upload-${upload.type}`}>
      <p data-testid={`status-${upload.type}`}>{upload.status}</p>
      <p data-testid={`file-${upload.type}`}>{upload.file ? 'Original erhalten' : 'Original fehlt'}</p>
      <p>{upload.error}</p>
      <button disabled={upload.status!=='error'||!upload.file} onClick={()=>void resumeUpload(upload.sessionId,upload.file!).catch(e=>setError(e.message))}>Fortsetzen {upload.type}</button>
    </section>)}
  </main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><AuthProvider><UploadProvider><Workspace/></UploadProvider></AuthProvider></QueryClientProvider>);
