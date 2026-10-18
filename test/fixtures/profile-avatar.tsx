import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ProfileMenu } from '@/components/ProfileMenu';
import Profile from '@/pages/Profile';
import ProfileEdit from '@/pages/ProfileEdit';
import '@/index.css';
function Fixture() {
  const navigate = useNavigate();
  return <><div className="flex items-center justify-between bg-secondary px-4 py-2 text-xs"><span>Lokale Profilprüfung · Testdaten</span><div data-testid="account-photo"><ProfileMenu /></div></div><Toaster />
    <nav aria-label="Testnavigation" className="flex gap-2 p-2"><button onClick={() => navigate('/profile')}>Zum Profil</button><button onClick={() => navigate(-1)}>Verlauf zurück</button></nav>
    <Routes><Route path="/profile/edit" element={<ProfileEdit />} /><Route path="*" element={<Profile />} /></Routes></>;
}
const router = createMemoryRouter([{ path: '*', element: <Fixture /> }], { initialEntries: ['/profile', '/profile/edit'] });
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><RouterProvider router={router} /></QueryClientProvider>);
