import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import TrainingHome from '@/components/training/TrainingHome';
import TrainingLibrary from '@/components/training/TrainingLibrary';
import TrainingExerciseDetail from '@/components/training/TrainingExerciseDetail';
import TrainingPlanner from '@/components/training/TrainingPlanner';
import TrainingWeekPlan from '@/components/training/TrainingWeekPlan';
import TrainingSessions from '@/components/training/TrainingSessions';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { APP_USER_ROUTES } from '@/features/training/flags';

export default function Training() {
  const { pathname } = useLocation();
  const swipe = useHorizontalRouteSwipe({ routes: APP_USER_ROUTES });
  const atHome = pathname === '/training';
  const backTo = pathname.startsWith('/training/exercises/') ? '/training' : pathname.startsWith('/training/sessions/') ? '/training/sessions' : '/training';
  return <DashboardPageLayout headerBackTo={atHome ? undefined : backTo} headerBackLabel="Zurück im Training">
    <div ref={element => { swipe.current = element; }} data-swipe-ignore={atHome ? undefined : true} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border pb-3"><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">UI-Vorschau</span> · Beispieldaten, keine freigegebenen Trainingspläne.</p>{!atHome && <Link to="/training" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary-ink">Training-Übersicht</Link>}</div>
      <Routes>
        <Route index element={<TrainingHome />} />
        <Route path="library/:area" element={<TrainingLibrary />} />
        <Route path="favorites" element={<TrainingLibrary favoritesOnly />} />
        <Route path="exercises/:id" element={<TrainingExerciseDetail />} />
        <Route path="sessions" element={<TrainingSessions />} />
        <Route path="sessions/:id" element={<TrainingSessions />} />
        <Route path="plan" element={<TrainingPlanner />} />
        <Route path="week" element={<TrainingWeekPlan />} />
        <Route path="*" element={<div className="py-6"><h2 className="font-sans text-base font-semibold">Diese Trainingsansicht gibt es nicht.</h2><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary-ink" to="/training">Zur Training-Übersicht</Link></div>} />
      </Routes>
    </div>
  </DashboardPageLayout>;
}
