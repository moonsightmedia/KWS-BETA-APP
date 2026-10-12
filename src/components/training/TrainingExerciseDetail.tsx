import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ExternalLink, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getExercise } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import { cn } from '@/lib/utils';

export default function TrainingExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, addToDraft, replaceExercise, sessions, draft } = useTraining();
  const exercise = getExercise(id ?? '');
  const sessionId = searchParams.get('session');
  const itemId = searchParams.get('item');
  const replacementRequested = Boolean(sessionId || itemId);
  const replacementValid = Boolean(sessionId && itemId && sessions.some(session => session.id === sessionId && session.exercises.some(item => item.id === itemId)));

  if (!exercise) {
    return <KwsSurface className="space-y-3 p-5">
      <h2 className="font-sans text-base font-semibold">Übung nicht gefunden</h2>
      <p className="text-sm text-muted-foreground">Diese Übung ist nicht in der Bibliothek verfügbar.</p>
      <Button asChild variant="secondary"><Link to="/training">Zum Training</Link></Button>
    </KwsSurface>;
  }

  const rehab = exercise.area === 'rehab';
  const favorite = favorites.includes(exercise.id);
  const added = !replacementRequested && draft.exercises.some(item => item.exerciseId === exercise.id);
  const libraryParams = new URLSearchParams();
  ['q', 'topic', 'equipment', 'session', 'item'].forEach(key => {
    const value = searchParams.get(key);
    if (value) libraryParams.set(key, value);
  });
  const librarySuffix = libraryParams.toString();
  const addExercise = () => {
    if (rehab) return;
    if (replacementRequested) {
      if (!replacementValid || !sessionId || !itemId) return;
      replaceExercise(sessionId, itemId, exercise.id);
      navigate(`/training/sessions/${encodeURIComponent(sessionId)}`);
      return;
    }
    if (added) return;
    addToDraft(exercise.id);
  };

  return (
    <div className="space-y-5" data-swipe-ignore>
      <Button asChild variant="ghost" className="-ml-2 px-2"><Link to={`/training/library/${exercise.area}${librarySuffix ? `?${librarySuffix}` : ''}`}><ChevronLeft aria-hidden="true" />Zur Bibliothek</Link></Button>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">{exercise.topic} · {exercise.equipment}</p>
          <h2 className="font-sans text-base font-semibold leading-snug">{exercise.title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{exercise.goal}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={favorite ? 'Aus Favoriten entfernen' : 'Als Favorit merken'} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button>
      </div>

      {!rehab && <div className="flex min-h-24 items-center justify-center rounded-kws-card bg-secondary p-4 text-center text-xs text-muted-foreground" aria-label="Demonstration noch nicht verfügbar">Demonstration folgt · Für diese Vorschau ist noch kein Übungsvideo hinterlegt.</div>}

      {rehab ? <KwsSurface className="space-y-3 p-4 sm:p-5">
        <h3 className="text-base font-semibold">Für deine fachliche Betreuung vorbereitet</h3>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Individuelle Reha-Übungen, Dosierungen und die Wiederaufnahme des Trainings werden mit der behandelnden Fachperson abgestimmt. Hier wird kein Therapieplan erstellt.</p>
      </KwsSurface> : <>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-kws-control bg-secondary px-4 py-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Niveau</dt><dd className="mt-1 font-medium">{exercise.level}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Zeit mit Pausen</dt><dd className="mt-1 font-medium">{exercise.minutes} Minuten</dd></div>
          <div><dt className="text-xs text-muted-foreground">Equipment</dt><dd className="mt-1 font-medium">{exercise.equipment}</dd></div>
        </dl>

        <KwsSurface className="space-y-4 p-4 sm:p-5">
          <h3 className="text-base font-semibold">So gehst du vor</h3>
          <ol className="max-w-2xl space-y-4">
            {exercise.steps.map((step, index) => <li key={`${exercise.id}-${index}`} className="flex gap-3 text-sm leading-relaxed">
              <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-kws-badge bg-secondary text-xs font-semibold">{index + 1}</span>
              <span>{step}</span>
            </li>)}
          </ol>
        </KwsSurface>

        <KwsSurface className="divide-y divide-border/60">
          <div className="space-y-2 p-4 sm:p-5"><h3 className="text-base font-semibold">Umfang & Pausen</h3><p className="max-w-2xl text-sm leading-relaxed">{exercise.dose}</p><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{exercise.rest}</p></div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div className="space-y-2"><h3 className="text-sm font-semibold">Einfacher</h3><p className="text-sm leading-relaxed text-muted-foreground">{exercise.easier}</p></div>
            <div className="space-y-2"><h3 className="text-sm font-semibold">Anspruchsvoller</h3><p className="text-sm leading-relaxed text-muted-foreground">{exercise.harder}</p></div>
          </div>
          <div className="space-y-2 p-4 sm:p-5"><h3 className="text-sm font-semibold">Darauf achten</h3><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{exercise.note}</p></div>
        </KwsSurface>

        <div className="space-y-3">
          {replacementRequested && !replacementValid && <p role="alert" className="text-sm text-destructive">Die zu ersetzende Übung ist nicht mehr verfügbar. Öffne deine Einheit und wähle die Übung erneut.</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="h-auto min-h-11 whitespace-normal py-3" onClick={addExercise} disabled={added || (replacementRequested && !replacementValid)}>{added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{added ? 'In eigener Einheit' : replacementRequested ? 'Übung ersetzen' : 'Zur eigenen Einheit hinzufügen'}</Button>
            {!replacementRequested && <Button asChild variant="secondary"><Link to="/training/sessions/new">Eigene Einheit öffnen</Link></Button>}
          </div>
          {added && <p role="status" className="text-xs text-muted-foreground">Du kannst Umfang und Pausen in deiner eigenen Einheit anpassen.</p>}
        </div>
      </>}

      {exercise.sources.length > 0 && <details className="rounded-kws-control border-t border-border pt-3">
        <summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hintergrund & Quellen</summary>
        <ul className="max-w-2xl space-y-3 pt-2">
          {exercise.sources.map(source => <li key={`${source.url}-${source.label}`} className="space-y-1 text-xs leading-relaxed">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-kws-control text-sm font-medium text-primary-ink underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{source.label}<ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="sr-only"> (öffnet in neuem Tab)</span></a>
            <p className="text-muted-foreground">{source.context}</p>
          </li>)}
        </ul>
      </details>}
    </div>
  );
}
