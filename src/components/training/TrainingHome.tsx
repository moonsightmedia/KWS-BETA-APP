import { ArrowRight, CalendarDays, Dumbbell, Footprints, Heart, ListPlus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { TRAINING_AREAS, WEEKDAYS } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';

const icons = { strength: Dumbbell, boulder: Footprints, rehab: Heart };
export default function TrainingHome() {
  const { plan, sessions, favorites, draft } = useTraining();
  const next = plan?.entries.filter(entry => !entry.completed).sort((a, b) => a.day - b.day)[0];
  const nextSession = sessions.find(session => session.id === next?.sessionId);
  return <div className="space-y-6">
    <section aria-labelledby="training-library-heading">
      <div className="mb-4"><h2 id="training-library-heading" className="font-sans text-base font-semibold">Woran möchtest du arbeiten?</h2><p className="mt-1 text-sm text-muted-foreground">Wähle Übungen aus oder stelle dir eine Einheit zusammen.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        {TRAINING_AREAS.map(area => { const Icon = icons[area.id]; return <Link key={area.id} to={`/training/library/${area.id}`} className="group flex min-h-24 items-center gap-4 rounded-kws-card bg-card p-4 shadow-soft transition-shadow hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-40 md:flex-col md:items-start md:gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-secondary text-primary-ink"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{area.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{area.description}</span></span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 md:self-end" aria-hidden="true" />
        </Link>; })}
      </div>
    </section>
    <section aria-labelledby="training-week-heading">
      <h2 id="training-week-heading" className="mb-3 font-sans text-base font-semibold">Mein Wochenplan</h2>
      <KwsSurface className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" /><div>
            <h3 className="font-sans text-sm font-semibold">{plan ? nextSession ? `${WEEKDAYS[next!.day]} · ${nextSession.title}` : 'Deine Beispielwoche ist abgeschlossen' : 'Eine Woche, die zu dir passt'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan ? plan.summary : 'Ziele, Erfahrung und Zeit auswählen. Anschließend die Planvorschau ansehen.'}</p>
          </div></div>
          <Button asChild className="shrink-0"><Link to={plan ? '/training/week' : '/training/plan'}>{plan ? 'Wochenplan öffnen' : 'Plan erstellen'}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
        </div>
      </KwsSurface>
    </section>
    <section aria-labelledby="training-own-heading">
      <h2 id="training-own-heading" className="mb-3 font-sans text-base font-semibold">Deine Sammlung</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/training/sessions" className="flex min-h-20 items-center gap-3 rounded-kws-card bg-card p-4 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ListPlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold">Eigene Einheiten</span><span className="block text-xs text-muted-foreground">{sessions.filter(session => !session.id.startsWith('preview-')).length} zusammengestellt{draft.exercises.length ? ` · ${draft.exercises.length} Übungen im Entwurf` : ''}</span></span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <Link to="/training/favorites" className="flex min-h-20 items-center gap-3 rounded-kws-card bg-card p-4 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Star className="h-5 w-5 text-muted-foreground" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold">Favoriten</span><span className="block text-xs text-muted-foreground">{favorites.length ? `${favorites.length} gemerkte Übungen` : 'Deine gemerkten Übungen findest du hier.'}</span></span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>
  </div>;
}
