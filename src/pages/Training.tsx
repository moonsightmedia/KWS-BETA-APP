import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowRight, ListPlus } from 'lucide-react';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import TrainingHome from '@/components/training/TrainingHome';
import TrainingLibrary from '@/components/training/TrainingLibrary';
import TrainingExerciseDetail from '@/components/training/TrainingExerciseDetail';
import TrainingPlanner from '@/components/training/TrainingPlanner';
import TrainingWeekPlan from '@/components/training/TrainingWeekPlan';
import TrainingSessions from '@/components/training/TrainingSessions';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { APP_USER_ROUTES } from '@/features/training/flags';
import { useTraining } from '@/features/training/TrainingContext';
import { getExercise, getSessionMinutes } from '@/features/training/data';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function Training() {
  const { pathname, search } = useLocation();
  const { draft, sessions } = useTraining();
  const swipe = useHorizontalRouteSwipe({ routes: APP_USER_ROUTES });
  const atHome = pathname === '/training';
  const exercise = pathname.startsWith('/training/exercises/') ? getExercise(pathname.split('/').at(-1) ?? '') : undefined;
  const params = new URLSearchParams(search);
  const returnSession = params.get('returnSession');
  const returningToSession = Boolean(returnSession && (returnSession === 'new' || sessions.some(session => session.id === returnSession)));
  const libraryParams = new URLSearchParams(params);
  libraryParams.delete('from');
  libraryParams.delete('returnSession');
  const librarySearch = libraryParams.size ? `?${libraryParams}` : '';
  const backTo = exercise ? returningToSession ? `/training/sessions/${encodeURIComponent(returnSession!)}` : params.get('from') === 'favorites' ? `/training/favorites${librarySearch}` : `/training/library/${exercise.area}${librarySearch}` : pathname.startsWith('/training/sessions/') ? '/training/sessions' : '/training';
  const showSelection = draft.exercises.length > 0 && !params.has('session') && !params.has('append') && !returningToSession && (pathname.startsWith('/training/library/') || pathname.startsWith('/training/exercises/') || pathname === '/training/favorites');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [pathname]);
  return <DashboardPageLayout headerBackTo={atHome ? undefined : backTo} headerBackLabel={exercise ? returningToSession ? 'Zur eigenen Einheit' : params.get('from') === 'favorites' ? 'Zur Favoritenliste' : 'Zur Bibliothek' : 'Training-Übersicht'} mainClassName={showSelection ? 'pb-52 md:pb-28' : undefined} rightSlot={<Popover>
    <PopoverTrigger asChild><Button variant="ghost" className="px-2 text-[11px] text-muted-foreground" aria-label="Informationen zur UI-Vorschau">Vorschau</Button></PopoverTrigger>
    <PopoverContent align="end" className="max-w-[calc(100vw-32px)] rounded-kws-card border-0 shadow-medium"><h2 className="font-sans text-sm font-semibold">UI-Vorschau</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Beispieldaten zum Ausprobieren. Inhalte und Pläne sind noch nicht fachlich freigegeben. Beim Neuladen werden deine Auswahl und Änderungen zurückgesetzt.</p></PopoverContent>
  </Popover>}>
    <div ref={element => { swipe.current = element; }} data-swipe-ignore={atHome ? undefined : true} className="space-y-5">
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
      {showSelection && <aside aria-label="Deine Übungsauswahl" className="fixed inset-x-4 bottom-[calc(6.25rem+var(--app-safe-area-bottom))] z-20 mx-auto flex max-w-[440px] items-center gap-3 rounded-kws-card bg-foreground p-3 text-white shadow-medium md:sticky md:inset-x-auto md:bottom-4 md:max-w-none md:p-4">
        <ListPlus className="hidden h-5 w-5 shrink-0 text-primary sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{draft.exercises.length} {draft.exercises.length === 1 ? 'Übung' : 'Übungen'} ausgewählt</p><p className="mt-0.5 text-xs text-white/80">Eigene Einheit · ca. {getSessionMinutes(draft)} Min.</p></div>
        <Button asChild className="shrink-0 px-3 text-xs"><Link to="/training/sessions/new">Einheit ansehen<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
      </aside>}
    </div>
  </DashboardPageLayout>;
}
