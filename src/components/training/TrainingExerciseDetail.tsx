import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Check, Clock3, ExternalLink, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getExercise } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import { cn } from '@/lib/utils';
import TrainingExerciseArt from './TrainingExerciseArt';
import TrainingTopicIcon from './TrainingTopicIcon';

export default function TrainingExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const { favorites, toggleFavorite, addToDraft, addToSession, replaceExercise, sessions, draft } = useTraining();
  const exercise = getExercise(id ?? '');
  const sessionId = searchParams.get('session');
  const itemId = searchParams.get('item');
  const appendId = searchParams.get('append');
  const appendSession = appendId ? sessions.find(session => session.id === appendId) : undefined;
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
  const kids = exercise.area === 'kids';
  const kitaContext = kids && searchParams.get('age') === 'kita';
  const orientation = !kids && (rehab || exercise.contentKind === 'orientation');
  const title = rehab ? exercise.topic : exercise.title;
  const orientationReady = rehab && !exercise.goal.startsWith('So könnte');
  const favorite = favorites.includes(exercise.id);
  const kidsSchoolSteps = kids && <ol className="divide-y divide-border/60">{exercise.steps.map((step, index) => <li key={`${exercise.id}-${index}`} className="flex gap-3 py-4 text-sm leading-relaxed first:pt-0 last:pb-0"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-kws-badge bg-secondary text-xs font-semibold tabular-nums">{index + 1}</span><span>{step}</span></li>)}</ol>;
  const added = !replacementRequested && (appendId ? appendSession?.exercises : draft.exercises)?.some(item => item.exerciseId === exercise.id);
  const addExercise = () => {
    if (kids || orientation || !exercise.defaultDose) return;
    if (replacementRequested) {
      if (!replacementValid || !sessionId || !itemId) return;
      replaceExercise(sessionId, itemId, exercise.id);
      navigate(`/training/sessions/${encodeURIComponent(sessionId)}`);
      return;
    }
    if (added) return;
    if (appendId) {
      if (appendSession) addToSession(appendId, exercise.id);
    } else addToDraft(exercise.id);
    setNotice(appendSession ? `${title}: zu „${appendSession.title}“ hinzugefügt.` : `${title}: zum Einheitsentwurf hinzugefügt. Du kannst die Einheit anschließend speichern.`);
  };

  return (
    <div className="space-y-4" data-swipe-ignore>
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      {kids ? <>
        <KwsSurface className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
          <figure className="space-y-2"><TrainingExerciseArt exerciseId={exercise.id} title={title} className="mx-auto w-full max-w-64 lg:max-w-none" /><figcaption className="text-xs text-muted-foreground">Spielmotiv · Aufbau und Betreuung vor Ort prüfen</figcaption></figure>
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-primary-ink"><span>{exercise.topic} · Kinderspiel</span></div><Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={`${title}: ${favorite ? 'aus Favoriten entfernen' : 'als Favorit merken'}`} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button></div>
            <div className="max-w-2xl space-y-2"><h2 className="font-sans text-lg font-semibold leading-snug">{title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.goal}</p></div>
            {exercise.kidsGuide && <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Alter zur Orientierung</dt><dd className="mt-1 font-medium">{exercise.kidsGuide.ageLabel ?? exercise.kidsGuide.ages}</dd></div><div><dt className="text-xs text-muted-foreground">Personen</dt><dd className="mt-1 font-medium">{exercise.kidsGuide.playersLabel ?? exercise.kidsGuide.players}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Spieldauer zur Orientierung</dt><dd className="mt-1 font-medium">{exercise.kidsGuide.durationLabel ?? exercise.kidsGuide.duration}</dd></div></dl>
              <div className="space-y-2 border-t border-border pt-3"><h2 className="font-sans text-sm font-semibold">Betreuung</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.kidsGuide.supervision}</p></div>
            </>}
          </div>
        </KwsSurface>
        {exercise.kidsGuide?.audience === 'both' && exercise.kidsGuide.preschoolVariant && <KwsSurface className="space-y-2 p-4 sm:p-5"><h2 className="font-sans text-sm font-semibold">Für Kitakinder vereinfachen</h2><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{exercise.kidsGuide.preschoolVariant}</p></KwsSurface>}
        {kitaContext && exercise.kidsGuide?.audience !== 'both' && <KwsSurface className="p-4 text-sm leading-relaxed text-muted-foreground">Dieses Spiel ist als Idee für Schulkinder eingeordnet. Wähle im Kinderbereich eine passende Kita-Spielidee.</KwsSurface>}
        {exercise.kidsGuide && <KwsSurface className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3"><div className="space-y-2"><h2 className="font-sans text-sm font-semibold">Alter passend einschätzen</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.kidsGuide.ages}</p></div><div className="space-y-2"><h2 className="font-sans text-sm font-semibold">Gruppe organisieren</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.kidsGuide.players}</p></div><div className="space-y-2"><h2 className="font-sans text-sm font-semibold">Zeit flexibel halten</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.kidsGuide.duration}</p></div></KwsSurface>}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <KwsSurface className="space-y-5 p-4 sm:p-5 lg:col-span-2">
            {exercise.setupRequirements?.length ? <div className="space-y-2 border-b border-border pb-4"><h2 className="font-sans text-sm font-semibold">Aufbau</h2><ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">{exercise.setupRequirements.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
            {kitaContext ? <details><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Spielablauf für Schulkinder</summary><div className="pt-3">{kidsSchoolSteps}</div></details> : <div><h2 className="mb-4 font-sans text-sm font-semibold">Spielablauf für Schulkinder</h2>{kidsSchoolSteps}</div>}
          </KwsSurface>
          <KwsSurface className="space-y-2 p-4 sm:p-5"><h2 className="font-sans text-sm font-semibold">Darauf achten</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.note}</p></KwsSurface>
        </div>
        {(exercise.cues?.length || exercise.mistakes?.length) ? <details className="rounded-kws-control border-t border-border pt-1"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hinweise für die Betreuung</summary><div className="grid gap-4 pb-3 pt-2 sm:grid-cols-2">{exercise.cues?.length ? <div className="space-y-2"><h3 className="text-xs font-semibold">Hilfreiche Hinweise</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">{exercise.cues.map(item => <li key={item}>{item}</li>)}</ul></div> : null}{exercise.mistakes?.length ? <div className="space-y-2"><h3 className="text-xs font-semibold">Missverständnisse vermeiden</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">{exercise.mistakes.map(item => <li key={item}>{item}</li>)}</ul></div> : null}</div></details> : null}
        <details className="rounded-kws-control border-t border-border pt-1"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Spiel passend gestalten</summary><div className="grid gap-4 pb-3 pt-2 sm:grid-cols-2"><div className="space-y-1"><h3 className="text-xs font-semibold">Einfacher</h3><p className="text-sm leading-relaxed text-muted-foreground">{exercise.easier}</p></div><div className="space-y-1"><h3 className="text-xs font-semibold">Weitere Variante</h3><p className="text-sm leading-relaxed text-muted-foreground">{exercise.harder}</p></div></div></details>
      </> : orientation ? <KwsSurface className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><TrainingTopicIcon topic={exercise.topic} exerciseId={exercise.id} className="h-6 w-6 text-primary-ink" /><span className="rounded-kws-badge bg-secondary px-2 py-1 text-xs font-semibold">Orientierung</span><Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={`${title}: ${favorite ? 'aus Favoriten entfernen' : 'als Favorit merken'}`} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button></div>
        <div className="max-w-2xl space-y-2"><h2 className="font-sans text-lg font-semibold">{title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{orientationReady || !rehab ? exercise.goal : 'Beobachtungen sammeln und das Gespräch mit einer behandelnden Fachperson vorbereiten.'}</p></div>
        {!rehab && <TrainingExerciseArt exerciseId={exercise.id} title={title} className="w-full max-w-64" />}
        {(orientationReady || !rehab) && <div className="max-w-2xl space-y-3"><h3 className="text-sm font-semibold">{rehab ? 'Für dein Gespräch' : 'Vor dem Fingertraining'}</h3><ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">{exercise.steps.map(step => <li key={step}>{step}</li>)}</ol>{exercise.cues?.map(cue => <p key={cue} className="text-sm font-medium leading-relaxed">{cue}</p>)}</div>}
        <p className="max-w-2xl border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">{orientationReady || !rehab ? exercise.note : 'Übungen für deinen Wiedereinstieg und die Wiederaufnahme des Trainings stimmen behandelnde Fachpersonen mit dir ab.'}</p>
      </KwsSurface> : <>
        <KwsSurface className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
          <figure className="space-y-2"><TrainingExerciseArt exerciseId={exercise.id} title={title} className="mx-auto w-full max-w-64 lg:max-w-none" /><figcaption className="text-xs text-muted-foreground">Schematische Illustration · Orientierung zur Übung</figcaption>{exercise.cues?.length ? <p className="text-sm font-medium leading-relaxed">{exercise.cues[0]}</p> : null}</figure>
          <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-ink">{exercise.format === 'game' && exercise.topic === 'Spiele' ? 'Boulderspiel' : exercise.topic}{exercise.format === 'game' && exercise.topic !== 'Spiele' && ' · Spiel'}<span className="font-normal text-muted-foreground">· {exercise.level}</span></div><Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={`${title}: ${favorite ? 'aus Favoriten entfernen' : 'als Favorit merken'}`} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button></div>
          <div className="max-w-2xl space-y-2"><h2 className="font-sans text-lg font-semibold leading-snug">{title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.goal}</p></div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-4 w-4" />{exercise.minutes} Min. mit Pausen</span><span>{exercise.equipment}</span></div>
          {replacementRequested && !replacementValid && <p role="alert" className="text-sm text-destructive">Die zu ersetzende Übung ist nicht mehr verfügbar. Öffne deine Einheit und wähle die Übung erneut.</p>}
          {!replacementRequested && appendId && !appendSession && <p role="alert" className="text-xs leading-relaxed text-destructive">Diese Einheit ist nicht mehr verfügbar. Öffne deine Einheiten erneut.</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant={added ? 'secondary' : 'default'} className="h-auto min-h-11 whitespace-normal py-3 sm:min-w-48" aria-disabled={added || undefined} onClick={addExercise} disabled={(replacementRequested && !replacementValid) || (!replacementRequested && Boolean(appendId) && !appendSession)}>{added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{added ? appendSession ? 'In dieser Einheit' : 'Im Einheitsentwurf' : replacementRequested ? 'Übung ersetzen' : 'Zur Einheit hinzufügen'}</Button>
            {added && <Button asChild variant="secondary"><Link to={appendId ? `/training/sessions/${encodeURIComponent(appendId)}` : '/training/sessions/new'}>{appendId ? 'Einheit ansehen' : 'Entwurf öffnen'}</Link></Button>}
          </div>
          {(!appendId || appendSession) && (!replacementRequested || replacementValid) && <p role={added ? 'status' : undefined} className="text-xs leading-relaxed text-muted-foreground">{replacementRequested ? 'Der Ersatz wird direkt in deiner gewählten Einheit gespeichert.' : appendSession ? `Hinzufügen ergänzt direkt „${appendSession.title}“. Umfang und Pausen dort anpassen; die Woche bei Bedarf wählen.` : added ? 'Im Einheitsentwurf gesammelt. Öffne den Entwurf, speichere deine Einheit und plane sie bei Bedarf in deine Woche ein.' : 'Hinzufügen sammelt diese Übung im Einheitsentwurf. Dort kannst du die Einheit speichern und bei Bedarf in deine Woche einplanen.'}</p>}
          {exercise.selectionReason && <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{exercise.selectionReason}</p>}
          </div>
        </KwsSurface>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <KwsSurface className="p-4 sm:p-5 lg:col-span-2">
            {exercise.setupRequirements?.length ? <div className="mb-5 space-y-2 border-b border-border pb-4"><h2 className="font-sans text-sm font-semibold">Vorbereiten</h2><ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">{exercise.setupRequirements.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
            <h2 className="mb-4 font-sans text-sm font-semibold">{exercise.format === 'game' ? 'So läuft das Spiel' : 'Ausführung'}</h2>
            <ol className="divide-y divide-border/60">
              {exercise.steps.map((step, index) => <li key={`${exercise.id}-${index}`} className="flex gap-3 py-4 first:pt-0 last:pb-0 text-sm leading-relaxed"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-kws-badge bg-secondary text-xs font-semibold tabular-nums">{String(index + 1).padStart(2, '0')}</span><span>{step}</span></li>)}
            </ol>
          </KwsSurface>
          <div className="space-y-4">
            <KwsSurface className="space-y-3 p-4 sm:p-5"><h2 className="font-sans text-sm font-semibold">Umfang & Pausen</h2><p className="text-sm font-medium leading-relaxed">{exercise.dose}</p><p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{exercise.rest}</p></KwsSurface>
            <KwsSurface className="p-4 sm:p-5"><h2 className="mb-2 font-sans text-sm font-semibold">Darauf achten</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.note}</p></KwsSurface>
          </div>
        </div>
        {(exercise.cues?.length || exercise.mistakes?.length) ? <details className="rounded-kws-control border-t border-border pt-1"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Bewegung verstehen</summary><div className="grid gap-4 pb-3 pt-2 sm:grid-cols-2">{exercise.cues?.length ? <div className="space-y-2"><h3 className="text-xs font-semibold">Merksätze</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">{exercise.cues.map(item => <li key={item}>{item}</li>)}</ul></div> : null}{exercise.mistakes?.length ? <div className="space-y-2"><h3 className="text-xs font-semibold">Typische Fehler erkennen</h3><ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">{exercise.mistakes.map(item => <li key={item}>{item}</li>)}</ul></div> : null}</div></details> : null}
        <details className="rounded-kws-control border-t border-border pt-1"><summary className="min-h-11 cursor-pointer rounded-kws-control py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Übung anpassen</summary><div className="grid gap-4 pb-3 pt-2 sm:grid-cols-2"><div className="space-y-1"><h3 className="text-xs font-semibold">Einfacher</h3><p className="text-sm leading-relaxed text-muted-foreground">{exercise.easier}</p></div><div className="space-y-1"><h3 className="text-xs font-semibold">Anspruchsvoller</h3><p className="text-sm leading-relaxed text-muted-foreground">{exercise.harder}</p></div></div></details>
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
