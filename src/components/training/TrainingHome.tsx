import { useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, ListPlus, MessageCircle, RotateCcw, Star, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { isKwsExerciseAvailable, TRAINING_EXERCISES, WEEKDAYS } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import TrainingTopicIcon from './TrainingTopicIcon';
import { useTrainingPreferences } from '@/features/training/trainingPreferences';
import { cn } from '@/lib/utils';

const areas = [
  { id: 'strength', title: 'Krafttraining', short: 'Kraft', position: '0%' },
  { id: 'boulder', title: 'Boulderübungen', short: 'Bouldern', position: '50%' },
  { id: 'mobility', title: 'Mobilität', short: 'Mobilität', position: '100%' },
  { id: 'kids', title: 'Kinderbouldern', short: 'Kinderbouldern', position: '0%' },
];
const completionDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const availableCounts = Object.fromEntries(areas.map(area => [area.id, TRAINING_EXERCISES.filter(exercise => exercise.area === area.id && isKwsExerciseAvailable(exercise)).length]));

export default function TrainingHome({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const { plan, sessions, favorites, draft, storageStatus, history, repeatCompletion } = useTraining();
  const { kidsEnabled } = useTrainingPreferences();
  const visibleAreas = areas.filter(area => area.id !== 'kids' || kidsEnabled);
  const visibleFavorites = favorites.filter(id => kidsEnabled || TRAINING_EXERCISES.find(exercise => exercise.id === id)?.area !== 'kids');
  const navigate = useNavigate();
  const [showChatHint, setShowChatHint] = useState(true);
  const [kidsArtAvailable, setKidsArtAvailable] = useState(true);
  const [repeatError, setRepeatError] = useState('');
  const next = plan?.entries.filter(entry => !entry.completed).sort((a, b) => a.day - b.day)[0];
  const nextSession = sessions.find(session => session.id === next?.sessionId);
  const ownCount = sessions.filter(session => !session.id.startsWith('preview-')).length;
  return <div className="space-y-6 pb-24 md:pb-20">
    {plan && <Link to="/training/week" className="flex min-h-24 items-center gap-4 rounded-kws-card bg-foreground p-4 text-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CalendarDays className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Mein Wochenplan</span><span className="mt-1 block break-words text-xs text-white/80">{plan.status === 'needs-review' ? 'Angaben zur fachlichen Besprechung' : nextSession ? `${WEEKDAYS[next!.day]} · ${nextSession.title}` : 'Alle Termine erledigt'}</span></span><ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link>}
    <section aria-labelledby="training-library-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 id="training-library-heading" className="font-sans text-base font-semibold">Übungen entdecken</h2><Link to="/training/favorites" className="inline-flex min-h-11 items-center gap-2 rounded-kws-control px-2 text-xs font-medium text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Star className="h-4 w-4" aria-hidden="true" />Favoriten{visibleFavorites.length > 0 ? ` (${visibleFavorites.length})` : ''}</Link></div>
      <div className={cn('grid grid-cols-2 gap-3', kidsEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        {visibleAreas.map(area => <Link data-training-tour={area.id === 'strength' ? 'areas' : undefined} key={area.id} to={`/training/library/${area.id}`} aria-label={area.title} className="group overflow-hidden rounded-kws-card bg-card shadow-soft transition-shadow hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {area.id === 'kids' ? <span aria-hidden="true" className="grid aspect-square w-full place-items-center bg-secondary">{kidsArtAvailable ? <img src="/training/kids-area-v2.png" alt="" decoding="async" className="aspect-square h-full w-full object-cover" onError={() => setKidsArtAvailable(false)} /> : <TrainingTopicIcon topic="Kinderbouldern" className="h-16 w-16 text-primary-ink" />}</span> : <span aria-hidden="true" className="block aspect-square w-full bg-secondary" style={{ backgroundImage: 'url(/training/areas.png?v=isolated-3)', backgroundSize: '300% 100%', backgroundPosition: `${area.position} center` }} />}
          <span className="block px-3 pb-3 pt-2 sm:px-4 sm:py-3"><span className="flex items-center justify-between gap-1"><span className="text-sm font-semibold sm:hidden">{area.short}</span><span className="hidden text-sm font-semibold sm:block">{area.title}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></span><span className="mt-1 block text-xs text-muted-foreground">{availableCounts[area.id]} {area.id === 'mobility' ? 'Übungen · Bewegen & Dehnen' : area.id === 'boulder' ? 'Aufgaben' : area.id === 'kids' ? 'Spiele' : 'Karten'}</span>{area.id === 'kids' && <span className="mt-1 block text-xs leading-4 text-muted-foreground">Spiele im Kinderboulderbereich · mit Betreuung</span>}</span>
        </Link>)}
      </div>
    </section>
    <section aria-labelledby="training-history-heading" className="space-y-3">
      <h2 id="training-history-heading" className="font-sans text-base font-semibold">Zuletzt trainiert</h2>
      {history.length ? <div className="grid gap-3 sm:grid-cols-2">{history.slice(0, 2).map(completion => <KwsSurface key={completion.id} className="space-y-3 p-4">
        <div><p className="text-xs text-muted-foreground"><time dateTime={completion.completedAt}>{completionDate.format(new Date(completion.completedAt))}</time> · {completion.session.exercises.length} {completion.session.exercises.length === 1 ? 'Übung' : 'Übungen'}</p><h3 className="mt-2 break-words text-sm font-semibold">{completion.session.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Fokus: {completion.session.focus}</p></div>
        <Button type="button" variant="ghost" className="h-auto min-h-11 justify-start whitespace-normal px-0 text-left text-xs text-primary-ink" aria-label={`Erneut zusammenstellen: ${completion.session.title}`} onClick={() => { const sessionId = repeatCompletion(completion.id); if (sessionId) { setRepeatError(''); navigate(`/training/sessions/${sessionId}`); } else setRepeatError('Diese Einheit konnte nicht übernommen werden. Öffne deinen Trainingsverlauf erneut.'); }}><RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />Erneut zusammenstellen<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Button>
      </KwsSurface>)}</div> : <p className="text-sm leading-relaxed text-muted-foreground">Hier erscheinen Einheiten, die du als trainiert markierst.</p>}
      {repeatError && <p role="alert" className="text-sm text-destructive">{repeatError}</p>}
    </section>
    <Link data-training-tour="units" to={draft.exercises.length ? '/training/sessions/new' : '/training/sessions'} className="flex min-h-16 items-center gap-3 rounded-kws-control border-y border-border px-1 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-xl">
      <ListPlus className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Eigene Einheiten</span><span className="mt-0.5 block text-xs text-muted-foreground">{draft.exercises.length ? `Entwurf fortsetzen · ${draft.exercises.length} Übungen` : ownCount ? `${ownCount} ${ownCount === 1 ? 'Einheit' : 'Einheiten'} in deiner Sammlung` : 'Optional selbst zusammenstellen'}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
    <aside aria-label="Plan-Assistent" className="pointer-events-none fixed bottom-[calc(var(--mobile-nav-floating-offset)+0.75rem)] right-4 z-40 flex items-end gap-2 md:bottom-6 md:right-6" data-swipe-ignore>
      {showChatHint && <div className="pointer-events-auto relative max-w-[min(15rem,calc(100vw-6rem))] rounded-kws-card bg-card py-3 pl-3 pr-11 shadow-medium">
        <p className="text-xs font-medium leading-relaxed">{plan ? 'Gemeinsam deinen Plan weiterentwickeln?' : 'Gemeinsam deinen Plan erstellen?'}</p>
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label="Chat-Hinweis schließen" onClick={() => setShowChatHint(false)}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
      </div>}
      <Button type="button" size="icon" onClick={onOpenAssistant} className="pointer-events-auto h-14 w-14 shrink-0 rounded-full shadow-medium hover:shadow-soft" data-training-tour="assistant" aria-label="Trainingschat öffnen" title="Plan-Assistent"><MessageCircle className="h-6 w-6" aria-hidden="true" /></Button>
    </aside>
    {plan && <p className="text-xs text-muted-foreground">{storageStatus === 'saved' ? 'Auf diesem Gerät gespeichert · jederzeit über Mein Plan erreichbar' : 'Speichern nicht verfügbar · Plan bleibt nur in dieser Sitzung'}</p>}
  </div>;
}
