import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigationType, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Button } from '@/components/ui/button';
import { TrainingProvider } from '@/features/training/TrainingContext';
import Training from '@/pages/Training';
import TrainingSettings from '@/pages/TrainingSettings';
import { APP_USER_ROUTES } from '@/features/training/flags';
import { useTrainingPreferences } from '@/features/training/trainingPreferences';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { useAuth } from './training-preview-hooks';
import '@/index.css';

export function PreviewMainPage() {
  const swipe = useHorizontalRouteSwipe({ routes: APP_USER_ROUTES });
  return <DashboardPageLayout><div ref={element => { swipe.current = element; }} className="min-h-[60dvh] space-y-4"><h2 className="font-sans text-base font-semibold">Lokale Hauptseiten-Vorschau</h2><p className="text-sm text-muted-foreground">Die übrigen Appdaten werden in dieser isolierten Vorschau nicht geladen.</p><Button asChild variant="secondary"><Link to="/profile/training">Trainingseinstellungen</Link></Button></div></DashboardPageLayout>;
}

export function Preview() {
  const { user } = useAuth();
  const { trainingEnabled } = useTrainingPreferences();
  const location = useLocation();
  const navigation = useNavigationType();
  useEffect(() => { if (navigation !== 'POP') window.scrollTo(0, 0); }, [location.pathname, navigation]);
  return <SidebarProvider><Sidebar /><TrainingProvider key={user.id} accountId={user.id}><Routes>
    <Route path="/training/*" element={<Training />} />
    <Route path="/profile/training" element={<TrainingSettings />} />
    <Route path="/profile" element={<DashboardPageLayout><Button asChild variant="secondary"><Link to="/profile/training">Trainingseinstellungen</Link></Button></DashboardPageLayout>} />
    <Route path="/statistics" element={<PreviewMainPage />} />
    <Route path="/boulders" element={<PreviewMainPage />} />
    <Route path="/" element={trainingEnabled ? <Navigate to="/training" replace /> : <PreviewMainPage />} />
    <Route path="*" element={<DashboardPageLayout><div className="space-y-4"><h2 className="font-sans text-base font-semibold">Lokale Training-Vorschau</h2><p className="text-sm text-muted-foreground">Die übrigen Appbereiche werden in dieser isolierten Vorschau nicht geladen.</p><Button asChild><Link to="/training">Training öffnen</Link></Button></div></DashboardPageLayout>} />
  </Routes></TrainingProvider></SidebarProvider>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview /></BrowserRouter>);
