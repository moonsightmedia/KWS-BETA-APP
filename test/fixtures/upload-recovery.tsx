import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { UploadProvider } from '@/contexts/UploadContext';
import { UploadOverview } from '@/components/UploadOverview';
import { Toaster } from 'sonner';
import '@/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/setter/status']}><UploadProvider>
  <main className="min-h-screen bg-muted p-6"><h1 className="text-xl font-semibold">Upload-Prüfung</h1><p className="text-sm text-muted-foreground">Isolierte Testdaten · keine echten Uploads</p></main>
  <UploadOverview /><Toaster />
</UploadProvider></MemoryRouter>);
