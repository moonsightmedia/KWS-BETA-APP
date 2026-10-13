import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ListPlus } from 'lucide-react';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import TrainingHome from '@/components/training/TrainingHome';
import TrainingLibrary from '@/components/training/TrainingLibrary';
import TrainingExerciseDetail from '@/components/training/TrainingExerciseDetail';
import TrainingPlanner from '@/components/training/TrainingPlanner';
import TrainingWeekPlan from '@/components/training/TrainingWeekPlan';
import TrainingSessions from '@/components/training/TrainingSessions';
import TrainingAssistant from '@/components/training/TrainingAssistant';
import { useHorizontalRouteSwipe } from '@/hooks/useHorizontalRouteSwipe';
import { APP_USER_ROUTES } from '@/features/training/flags';
import { useTraining } from '@/features/training/TrainingContext';
import { useTrainingPreferences } from '@/features/training/trainingPreferences';
import { getExercise, getSessionMinutes } from '@/features/training/data';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function Training() {
  const { pathname, search } = useLocation();
  const { draft, favorites, sessions, plan, storageStatus, clearSavedTraining } = useTraining();
  const { trainingEnabled, kidsEnabled } = useTrainingPreferences();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
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
  const kidsView = pathname === '/training/library/kids' || exercise?.area === 'kids' || (pathname === '/training/favorites' && favorites.length > 0 && favorites.every(id => getExercise(id)?.area === 'kids'));
  const showSelection = !kidsView && draft.exercises.length > 0 && !params.has('session') && !params.has('append') && !returningToSession && (pathname.startsWith('/training/library/') || pathname.startsWith('/training/exercises/') || pathname === '/training/favorites');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [pathname]);
  useEffect(() => { if (!trainingEnabled) setAssistantOpen(false); }, [trainingEnabled]);
  const hiddenKidsRoute = !kidsEnabled && (pathname === '/training/library/kids' || exercise?.area === 'kids');
  if (!trainingEnabled || hiddenKidsRoute) return <DashboardPageLayout headerBackTo="/profile/training" headerBackLabel="Zu den Trainingseinstellungen"><section className="max-w-xl space-y-4 rounded-kws-card bg-card p-5 shadow-soft"><h2 className="text-base font-semibold">{!trainingEnabled ? 'Training ist ausgeblendet' : 'Kinderbouldern ist ausgeblendet'}</h2><p className="text-sm leading-relaxed text-muted-foreground">Du kannst den Bereich in deinen Einstellungen wieder einblenden. Deine gespeicherten Inhalte bleiben erhalten.</p><Button asChild><Link to="/profile/training">Trainingseinstellungen</Link></Button>{trainingEnabled && <Button asChild variant="secondary" className="ml-2"><Link to="/training">Zur Training-Übersicht</Link></Button>}</section></DashboardPageLayout>;
  return <DashboardPageLayout headerBackTo={atHome ? undefined : backTo} headerBackLabel={exercise ? returningToSession ? 'Zur eigenen Einheit' : params.get('from') === 'favorites' ? 'Zur Favoritenliste' : 'Zur Bibliothek' : 'Training-Übersicht'} mainClassName={showSelection ? 'pb-52 md:pb-28' : undefined} rightSlot={<div className="flex items-center gap-1">
    {plan && !kidsView && pathname !== '/training/week' && <Button asChild variant="ghost" size="icon"><Link to="/training/week" aria-label="Mein Plan"><CalendarDays className="h-5 w-5" aria-hidden="true" /></Link></Button>}
    <Popover onOpenChange={() => setConfirmClear(false)}>
    <PopoverTrigger asChild><Button variant="ghost" className="px-2 text-[11px] text-muted-foreground" aria-label="Informationen zur UI-Vorschau">Vorschau</Button></PopoverTrigger>
    <PopoverContent align="end" className="max-w-[calc(100vw-32px)] rounded-kws-card border-0 shadow-medium"><h2 className="font-sans text-sm font-semibold">Training-Vorschau</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Geführter Plan-Assistent mit lokalen Auswahlregeln. Inhalte und Pläne sind noch nicht fachlich freigegeben.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{storageStatus === 'saved' ? 'Plan, Einheiten und Favoriten werden auf diesem Gerät je Konto gespeichert. Angaben zu Alter und Beschwerden werden nicht gespeichert.' : 'Speichern ist in diesem Browser nicht möglich. Änderungen bleiben nur in dieser Sitzung.'}</p><Button variant="ghost" className="mt-3 h-auto min-h-11 whitespace-normal px-0 text-xs text-destructive" onClick={() => confirmClear ? (clearSavedTraining(), setConfirmClear(false)) : setConfirmClear(true)}>{confirmClear ? 'Lokale Trainingsdaten jetzt löschen' : 'Lokale Trainingsdaten zurücksetzen'}</Button></PopoverContent>
  </Popover></div>}>
    <div ref={element => { swipe.current = element; }} data-swipe-ignore={atHome && !assistantOpen ? undefined : true} className="space-y-5">
      <Routes>
        <Route index element={<TrainingHome onOpenAssistant={() => setAssistantOpen(true)} />} />
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
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{draft.exercises.length} {draft.exercises.length === 1 ? 'Übung' : 'Übungen'} im Entwurf</p><p className="mt-0.5 text-xs text-white/80">Umfang anpassen und speichern · {getSessionMinutes(draft) === null ? 'Dauer offen' : `ca. ${getSessionMinutes(draft)} Min.`}</p></div>
        <Button asChild className="shrink-0 px-3 text-xs"><Link to="/training/sessions/new">Einheit öffnen<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
      </aside>}
    </div>
    <TrainingAssistant open={assistantOpen} onOpenChange={setAssistantOpen} />
  </DashboardPageLayout>;
}
