import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ProfileMenu } from '@/components/ProfileMenu';
import Profile from '@/pages/Profile';
import ProfileEdit from '@/pages/ProfileEdit';
import '@/index.css';
function Fixture() {
  return <><div className="flex items-center justify-between bg-secondary px-4 py-2 text-xs"><span>Lokale Profilprüfung · Testdaten</span><div data-testid="account-photo"><ProfileMenu /></div></div><Toaster />
    <Routes><Route path="/profile/edit" element={<ProfileEdit />} /><Route path="*" element={<Profile />} /></Routes></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter initialEntries={['/profile/edit']}><Fixture /></MemoryRouter></QueryClientProvider>);
