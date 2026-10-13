import { useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Dumbbell, Footprints, ListPlus, MessageCircle, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isKwsExerciseAvailable, TRAINING_EXERCISES, WEEKDAYS } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';

const areas = [
  { id: 'strength', title: 'Krafttraining', short: 'Kraft', subtitle: 'Muskeln & Kraft', position: '0%' },
  { id: 'boulder', title: 'Boulderübungen', short: 'Bouldern', subtitle: 'Bewegung & Technik', position: '50%' },
  { id: 'rehab', title: 'Reha-Ideen', short: 'Reha', subtitle: 'Körperregionen', position: '100%' },
];
const shortcuts = [
  { title: 'Fußtechnik', description: 'Tritte präzise nutzen', area: 'boulder', icon: Footprints },
  { title: 'Brust', description: 'Druckbewegungen aufbauen', area: 'strength', icon: Dumbbell },
];

export default function TrainingHome({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const { plan, sessions, favorites, draft, storageStatus } = useTraining();
  const [showChatHint, setShowChatHint] = useState(true);
  const next = plan?.entries.filter(entry => !entry.completed).sort((a, b) => a.day - b.day)[0];
  const nextSession = sessions.find(session => session.id === next?.sessionId);
  const ownCount = sessions.filter(session => !session.id.startsWith('preview-')).length;
  return <div className="space-y-6 pb-24 md:pb-20">
    {plan && <Link to="/training/week" className="flex min-h-24 items-center gap-4 rounded-kws-card bg-foreground p-4 text-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CalendarDays className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Mein Wochenplan</span><span className="mt-1 block text-xs text-white/80">{plan.status === 'needs-review' ? 'Angaben zur fachlichen Besprechung' : nextSession ? `${WEEKDAYS[next!.day]} · ${nextSession.title}` : 'Alle Termine erledigt'}</span></span><ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link>}
    <section aria-labelledby="training-library-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 id="training-library-heading" className="font-sans text-base font-semibold">Übungen entdecken</h2><Link to="/training/favorites" className="inline-flex min-h-11 items-center gap-2 rounded-kws-control px-2 text-xs font-medium text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Star className="h-4 w-4" aria-hidden="true" />Favoriten{favorites.length > 0 ? ` (${favorites.length})` : ''}</Link></div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {areas.map(area => <Link key={area.id} to={`/training/library/${area.id}`} aria-label={area.title} className="group overflow-hidden rounded-kws-card bg-card shadow-soft transition-shadow hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span aria-hidden="true" className="block aspect-square w-full bg-secondary" style={{ backgroundImage: 'url(/training/areas.png?v=isolated-3)', backgroundSize: '300% 100%', backgroundPosition: `${area.position} center` }} />
          <span className="block px-3 pb-3 pt-2 sm:px-4 sm:py-3"><span className="flex items-center justify-between gap-1"><span className="text-sm font-semibold sm:hidden">{area.short}</span><span className="hidden text-sm font-semibold sm:block">{area.title}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></span><span className="mt-1 hidden text-xs text-muted-foreground sm:block">{area.subtitle}</span></span>
        </Link>)}
      </div>
      <div className="space-y-1 pt-2"><p className="text-xs font-medium text-muted-foreground">Direkt zu einem Thema</p><div className="grid gap-0 divide-y divide-border sm:grid-cols-2 sm:gap-5 sm:divide-y-0">
        {shortcuts.map(shortcut => {
          const count = TRAINING_EXERCISES.filter(exercise => exercise.area === shortcut.area && exercise.topic === shortcut.title && isKwsExerciseAvailable(exercise)).length;
          return <Link key={shortcut.title} to={`/training/library/${shortcut.area}?q=${encodeURIComponent(shortcut.title)}`} className="group flex min-h-16 items-center gap-3 rounded-kws-control px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <shortcut.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-medium">{shortcut.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{shortcut.description} · {count} {count === 1 ? 'Übung' : 'Übungen'}</span></span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-ink" aria-hidden="true" />
          </Link>;
        })}
      </div></div>
    </section>
    <Link to={draft.exercises.length ? '/training/sessions/new' : '/training/sessions'} className="flex min-h-16 items-center gap-3 rounded-kws-control border-y border-border px-1 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ListPlus className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">Eigene Einheiten</span><span className="mt-0.5 block text-xs text-muted-foreground">{draft.exercises.length ? `Entwurf fortsetzen · ${draft.exercises.length} Übungen` : ownCount ? `${ownCount} ${ownCount === 1 ? 'Einheit' : 'Einheiten'} in deiner Sammlung` : 'Optional selbst zusammenstellen'}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
    <aside aria-label="Plan-Assistent" className="pointer-events-none fixed bottom-[calc(var(--mobile-nav-floating-offset)+0.75rem)] right-4 z-40 flex items-end gap-2 md:bottom-6 md:right-6" data-swipe-ignore>
      {showChatHint && <div className="pointer-events-auto relative max-w-[min(15rem,calc(100vw-6rem))] rounded-kws-card bg-card py-3 pl-3 pr-11 shadow-medium">
        <p className="text-xs font-medium leading-relaxed">{plan ? 'Gemeinsam deinen Plan weiterentwickeln?' : 'Gemeinsam deinen Plan erstellen?'}</p>
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label="Chat-Hinweis schließen" onClick={() => setShowChatHint(false)}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
      </div>}
      <Button type="button" size="icon" onClick={onOpenAssistant} className="pointer-events-auto h-14 w-14 shrink-0 rounded-full shadow-medium hover:shadow-soft" aria-label="Trainingschat öffnen" title="Plan-Assistent"><MessageCircle className="h-6 w-6" aria-hidden="true" /></Button>
    </aside>
    {plan && <p className="text-xs text-muted-foreground">{storageStatus === 'saved' ? 'Auf diesem Gerät gespeichert · jederzeit über Mein Plan erreichbar' : 'Speichern nicht verfügbar · Plan bleibt nur in dieser Sitzung'}</p>}
  </div>;
}
