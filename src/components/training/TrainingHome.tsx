import { ArrowRight, CalendarDays, Dumbbell, Footprints, Heart, ListPlus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { WEEKDAYS } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';

const areas = [
  { id: 'strength', title: 'Krafttraining', short: 'Kraft', subtitle: 'Muskeln & Kraft', icon: Dumbbell },
  { id: 'boulder', title: 'Boulderübungen', short: 'Bouldern', subtitle: 'Bewegung & Technik', icon: Footprints },
  { id: 'rehab', title: 'Reha-Ideen', short: 'Reha', subtitle: 'Körperregionen', icon: Heart },
];
const shortcuts = [
  { title: 'Fußtechnik', description: 'Tritte präzise nutzen', area: 'boulder', icon: Footprints },
  { title: 'Brust', description: 'Druckbewegungen aufbauen', area: 'strength', icon: Dumbbell },
];

export default function TrainingHome() {
  const { plan, sessions, favorites, draft } = useTraining();
  const next = plan?.entries.filter(entry => !entry.completed).sort((a, b) => a.day - b.day)[0];
  const nextSession = sessions.find(session => session.id === next?.sessionId);
  const ownCount = sessions.filter(session => !session.id.startsWith('preview-')).length;
  return <div className="space-y-7">
    <section aria-labelledby="training-library-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 id="training-library-heading" className="font-sans text-base font-semibold">Übungen entdecken</h2><Link to="/training/favorites" className="inline-flex min-h-11 items-center gap-2 rounded-kws-control px-2 text-xs font-medium text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Star className="h-4 w-4" aria-hidden="true" />Favoriten{favorites.length > 0 ? ` (${favorites.length})` : ''}</Link></div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {areas.map(area => <Link key={area.id} to={`/training/library/${area.id}`} aria-label={area.title} className="group flex min-h-28 flex-col items-start justify-between rounded-kws-card bg-card p-3 shadow-soft transition-shadow hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-32 sm:p-4">
          <area.icon className="h-6 w-6 text-primary-ink" strokeWidth={1.7} aria-hidden="true" />
          <span className="mt-4 flex w-full items-center justify-between gap-1"><span className="text-sm font-semibold sm:hidden">{area.short}</span><span className="hidden text-sm font-semibold sm:block">{area.title}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></span>
          <span className="mt-1 hidden text-xs text-muted-foreground sm:block">{area.subtitle}</span>
        </Link>)}
      </div>
      <div className="grid gap-0 divide-y divide-border sm:grid-cols-2 sm:gap-5 sm:divide-y-0">
        {shortcuts.map(shortcut => <Link key={shortcut.title} to={`/training/library/${shortcut.area}?q=${encodeURIComponent(shortcut.title)}`} className="group flex min-h-16 items-center gap-3 rounded-kws-control px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <shortcut.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-medium">{shortcut.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{shortcut.description} · 5 Übungen</span></span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-ink" aria-hidden="true" />
        </Link>)}
      </div>
    </section>
    <section aria-labelledby="training-week-heading" className="space-y-3">
      <h2 id="training-week-heading" className="font-sans text-base font-semibold">Mein Training</h2>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <KwsSurface className="flex flex-col justify-between gap-5 bg-foreground p-5 text-white sm:p-6">
          <div className="flex items-start gap-3"><CalendarDays className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div>
            <p className="text-xs font-medium text-white/80">{plan && next ? `Nächster Termin · ${WEEKDAYS[next.day]}` : 'Dein Wochenplan'}</p>
            <h3 className="mt-2 font-sans text-lg font-semibold leading-snug">{plan ? nextSession?.title ?? 'Woche abgeschlossen' : 'Kraft und Technik in deiner Woche'}</h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-white/80">{plan ? plan.summary : 'Ziel, Boulderstand und verfügbare Tage auswählen. Deine Woche anschließend anpassen.'}</p>
          </div></div>
          <Button asChild className="self-start"><Link to={plan ? '/training/week' : '/training/plan'}>{plan ? 'Wochenplan öffnen' : 'Plan erstellen'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
        </KwsSurface>
        <KwsSurface className="flex flex-col justify-center p-4 sm:p-5">
          <ListPlus className="h-5 w-5 text-primary-ink" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold">Eigene Einheiten</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{draft.exercises.length ? `${draft.exercises.length} Übungen in deinem Entwurf. Lege Reihenfolge, Umfang und Pausen fest.` : ownCount ? `${ownCount} Einheiten zusammengestellt. Kraft und Technik in deiner Reihenfolge.` : 'Kraft und Technik selbst kombinieren. Wähle Übungen aus den Bibliotheken.'}</p>
          <Link to={draft.exercises.length ? '/training/sessions/new' : '/training/sessions'} className="mt-3 inline-flex min-h-11 items-center justify-between gap-3 rounded-kws-control text-sm font-semibold text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{draft.exercises.length ? 'Entwurf fortsetzen' : 'Meine Einheiten'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </KwsSurface>
      </div>
    </section>
  </div>;
}
