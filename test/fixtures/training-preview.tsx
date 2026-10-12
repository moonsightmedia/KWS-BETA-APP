import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigationType, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { TrainingProvider } from '@/features/training/TrainingContext';
import Training from '@/pages/Training';
import { useAuth } from './training-preview-hooks';
import '@/index.css';

function Preview() {
  const { user } = useAuth();
  const location = useLocation();
  const navigation = useNavigationType();
  useEffect(() => { if (navigation !== 'POP') window.scrollTo(0, 0); }, [location.pathname, navigation]);
  return <SidebarProvider><Sidebar /><TrainingProvider key={user.id}><Routes>
    <Route path="/training/*" element={<Training />} />
    <Route path="/" element={<Navigate to="/training" replace />} />
    <Route path="*" element={<DashboardPageLayout><div className="space-y-4"><h2 className="font-sans text-base font-semibold">Lokale Training-Vorschau</h2><p className="text-sm text-muted-foreground">Die übrigen Appbereiche werden in dieser isolierten Vorschau nicht geladen.</p><Button asChild><Link to="/training">Training öffnen</Link></Button></div></DashboardPageLayout>} />
  </Routes></TrainingProvider></SidebarProvider>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview /></BrowserRouter>);
