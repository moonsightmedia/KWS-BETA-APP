import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Auth from '@/pages/Auth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { RequireAuth } from '@/components/RequireAuth';
import '@/index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Workspace() {
  const { loading, authTransition } = useAuth();
  if (loading || authTransition) return <LoadingScreen state={authTransition ?? 'app'} />;
  return <MemoryRouter initialEntries={['/auth']}><Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<RequireAuth><p data-testid="protected-home">Angemeldeter Nutzerbereich</p></RequireAuth>} />
    <Route path="/guest" element={<p data-testid="guest-home">Gastbereich</p>} />
  </Routes></MemoryRouter>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={queryClient}><AuthProvider><Workspace /></AuthProvider></QueryClientProvider>);
