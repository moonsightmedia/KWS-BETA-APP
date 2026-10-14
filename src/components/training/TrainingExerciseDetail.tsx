import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getExercise } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import { cn } from '@/lib/utils';
import TrainingExerciseArt from './TrainingExerciseArt';
import TrainingBodyRegionIcon from './TrainingBodyRegionIcon';
import type { TrainingExercise } from '@/features/training/types';

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group border-t border-border/70"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-kws-control py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">{title}<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary><div className="space-y-3 pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div></details>;
}
function Steps({ steps }: { steps: string[] }) {
  const [single, setSingle] = useState(false);
  const [step, setStep] = useState(0);
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">So geht’s</h3><Button type="button" variant="ghost" className="px-2 text-xs" aria-pressed={single} onClick={() => { setSingle(!single); setStep(0); }}>{single ? 'Alle Schritte' : 'Schrittweise'}</Button></div>
    {single ? <section aria-label="Einzelner Übungsschritt" className="space-y-4 rounded-kws-control bg-secondary/60 p-4"><p className="text-xs font-medium text-muted-foreground">Schritt {step + 1} von {steps.length}</p><p aria-live="polite" className="min-h-20 text-base font-medium leading-relaxed">{steps[step]}</p><div className="flex justify-between gap-3"><Button type="button" variant="ghost" className="px-2" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft aria-hidden="true" />Zurück</Button><Button type="button" variant="secondary" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Nächster Schritt<ChevronRight aria-hidden="true" /></Button></div></section> : <ol aria-label="Übungsschritte" className="space-y-3">{steps.map((text, index) => <li key={index} className="flex gap-3 text-sm leading-relaxed"><span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-kws-badge bg-secondary text-xs font-semibold tabular-nums">{index + 1}</span><span>{text}</span></li>)}</ol>}
  </div>;
}
function Facts({ items }: { items: { label: string; value: string }[] }) {
  return <dl className="grid grid-cols-3 gap-3 rounded-kws-control bg-secondary/60 p-3">{items.map(item => <div key={item.label} className="min-w-0"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="mt-1 break-words text-sm font-semibold leading-snug">{item.value}</dd></div>)}</dl>;
}
function Setup({ exercise }: { exercise: TrainingExercise }) {
  return exercise.setupRequirements?.length ? <Fold title="Vorbereitung"><ul className="space-y-2">{exercise.setupRequirements.map(text => <li key={text}>{text}</li>)}</ul></Fold> : null;
}
const tabStyle = 'flex-1 rounded-none border-b-2 border-transparent bg-transparent px-2 text-sm shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none hover:data-[state=inactive]:bg-transparent';

export default function TrainingExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState({ id: '', text: '' });
  const [view, setView] = useState({ id: '', tab: 'instructions' });
  const { favorites, toggleFavorite, addToDraft, addToSession, replaceExercise, sessions, draft } = useTraining();
  const exercise = getExercise(id ?? '');
  const sessionId = searchParams.get('session');
  const itemId = searchParams.get('item');
  const appendId = searchParams.get('append');
  const appendSession = appendId ? sessions.find(session => session.id === appendId) : undefined;
  const replacementRequested = Boolean(sessionId || itemId);
  const replacementValid = Boolean(sessionId && itemId && sessions.some(session => session.id === sessionId && session.exercises.some(item => item.id === itemId)));
  if (!exercise) return <KwsSurface className="space-y-3 p-5"><h2 className="text-base font-semibold">Übung nicht gefunden</h2><p className="text-sm text-muted-foreground">Diese Übung ist nicht in der Bibliothek verfügbar.</p><Button asChild variant="secondary"><Link to="/training">Zum Training</Link></Button></KwsSurface>;
  const rehab = exercise.area === 'rehab';
  const kids = exercise.area === 'kids';
  const orientation = !kids && (rehab || exercise.contentKind === 'orientation');
  const kita = kids && searchParams.get('age') === 'kita' && exercise.kidsGuide?.audience === 'both';
  const title = rehab ? exercise.topic : exercise.title;
  const favorite = favorites.includes(exercise.id);
  const added = !replacementRequested && (appendId ? appendSession?.exercises : draft.exercises)?.some(item => item.exerciseId === exercise.id);
  const addExercise = () => {
    if (kids || orientation || !exercise.defaultDose) return;
    if (replacementRequested) {
      if (!replacementValid || !sessionId || !itemId) return;
      replaceExercise(sessionId, itemId, exercise.id);
      navigate('/training/sessions/' + encodeURIComponent(sessionId)); return;
    }
    if (added) return;
    if (appendId) { if (appendSession) addToSession(appendId, exercise.id); }
    else addToDraft(exercise.id);
    setNotice({ id: exercise.id, text: appendSession ? 'Zu deiner Einheit hinzugefügt.' : 'Zum Einheitsentwurf hinzugefügt.' });
  };
  const dose = exercise.defaultDose;
  const blocks = exercise.area === 'boulder' || exercise.area === 'mobility' || dose?.repetitionUnit === 'Haltephasen';
  const unit = dose?.repetitionUnit ?? (exercise.area === 'boulder' ? 'Versuche' : 'Wiederholungen');
  const side = dose?.sideMultiplier === 2 ? ' je Seite' : '';
  const guide = exercise.kidsGuide;
  return <div className="space-y-5" data-swipe-ignore data-exercise-detail={exercise.id}>
    <p className="sr-only" role="status" aria-live="polite">{notice.id === exercise.id ? notice.text : ''}</p>
    <header className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-1"><p className="text-xs text-muted-foreground">{kids ? 'Kinderspiel' : orientation ? 'Orientierung' : exercise.topic} · {kids ? guide?.ageLabel ?? guide?.ages : exercise.id === 'incline-pushup' ? 'Körpergewicht · Bank' : (exercise.requiredEquipment ?? [exercise.equipment]).join(' + ')}</p><h2 className="text-xl font-semibold leading-snug">{title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{exercise.goal}</p></div><Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={title + ': ' + (favorite ? 'aus Favoriten entfernen' : 'als Favorit merken')} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button></header>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <figure className="flex min-w-0 flex-col items-center rounded-kws-card bg-card p-3 shadow-soft lg:sticky lg:top-28 lg:p-5">{rehab ? <TrainingBodyRegionIcon topic={exercise.topic} className="h-52 w-52 lg:h-72 lg:w-72" decorative={false} /> : <TrainingExerciseArt exerciseId={exercise.id} title={title} className="w-52 max-w-full lg:w-full lg:max-w-96" />}<figcaption className="mt-2 text-xs text-muted-foreground">{kids ? 'Spielmotiv' : rehab ? 'Körperregion' : 'Übungsbild'}</figcaption></figure>
      <KwsSurface className="min-w-0 p-4 sm:p-5">
        {orientation ? <section className="space-y-4"><h3 className="text-sm font-semibold">{rehab ? 'Für dein Gespräch' : 'Vor dem Fingertraining'}</h3><Steps key={exercise.id} steps={exercise.steps} /><p className="border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">{exercise.note}</p>{rehab && <Button asChild variant="secondary"><Link to="/training/library/mobility">Zu Mobilität & Dehnen</Link></Button>}</section> : <>
          {kids && guide?.audience === 'both' && <div className="mb-4 flex gap-2" role="group" aria-label="Altersgruppe für das Spiel"><Button type="button" variant={kita ? 'secondary' : 'ghost'} aria-pressed={kita} onClick={() => { setView({ id: exercise.id, tab: 'instructions' }); setSearchParams(current => { const next = new URLSearchParams(current); next.set('age', 'kita'); return next; }, { replace: true }); }}>Kita</Button><Button type="button" variant={!kita ? 'secondary' : 'ghost'} aria-pressed={!kita} onClick={() => { setView({ id: exercise.id, tab: 'instructions' }); setSearchParams(current => { const next = new URLSearchParams(current); next.set('age', 'school'); return next; }, { replace: true }); }}>Schule</Button></div>}
          <Tabs key={exercise.id} value={view.id === exercise.id ? view.tab : 'instructions'} onValueChange={tab => setView({ id: exercise.id, tab })}>
            <TabsList aria-label="Übungsinformationen" className="mb-4 flex min-h-11 w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0"><TabsTrigger value="instructions" className={tabStyle}>{kids ? 'Spielablauf' : 'Anleitung'}</TabsTrigger><TabsTrigger value="dose" className={tabStyle}>{kids ? 'Aufbau' : 'Umfang'}</TabsTrigger><TabsTrigger value="variants" className={tabStyle}>Varianten</TabsTrigger></TabsList>
            <TabsContent value="instructions" className="m-0 space-y-4">
              {kids && guide && <><Facts items={[{ label: 'Alter', value: guide.ageLabel ?? guide.ages }, { label: 'Personen', value: guide.playersLabel ?? guide.players }, { label: 'Spielzeit', value: guide.durationLabel ?? guide.duration }]} /><div className="space-y-1 border-l-2 border-primary pl-3"><h3 className="text-xs font-semibold">Betreuung</h3><p className="text-xs leading-relaxed text-muted-foreground">{guide.supervision}</p></div></>}
              <Setup exercise={exercise} />
              <section id="exercise-instructions" className="scroll-mt-28">{kita && guide?.preschoolVariant ? <div id="exercise-kita" className="scroll-mt-28 space-y-2"><h3 className="text-sm font-semibold">Für Kitakinder</h3><p className="text-sm leading-relaxed">{guide.preschoolVariant}</p></div> : <Steps key={exercise.id} steps={exercise.steps} />}</section>
              <div className="border-l-2 border-primary pl-3"><p className="text-xs font-semibold">Darauf achten</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{exercise.note}</p></div>
              {(exercise.cues?.length || exercise.mistakes?.length) ? <Fold title={kids ? 'Tipps für die Betreuung' : 'Tipps zur Ausführung'}><ul className="space-y-2">{exercise.cues?.map(text => <li key={text}>{text}</li>)}{exercise.mistakes?.map(text => <li key={text}>Vermeiden: {text}</li>)}</ul></Fold> : null}
            </TabsContent>
            <TabsContent value="dose" className="m-0 space-y-4">{kids ? <><h3 className="text-sm font-semibold">Vor dem Spiel</h3><ul className="space-y-2 text-sm leading-relaxed">{exercise.setupRequirements?.map(text => <li key={text}>{text}</li>)}</ul>{guide && <div className="space-y-3 text-sm leading-relaxed"><p>{guide.players}</p><p>{guide.duration}</p></div>}</> : dose && <><h3 className="text-sm font-semibold">Umfang & Pausen</h3><Facts items={[{ label: blocks ? 'Blöcke' : 'Sätze', value: String(dose.sets) }, { label: unit, value: dose.repetitions + side }, { label: 'Pause', value: dose.restSeconds ? dose.restSeconds + ' Sek.' : 'Bei Bedarf' }]} /><p className="text-xs text-muted-foreground">Beispielumfang · in deiner Einheit anpassbar</p><p className="text-sm leading-relaxed">{exercise.dose}</p><p className="text-sm leading-relaxed text-muted-foreground">{exercise.rest}</p></>}</TabsContent>
            <TabsContent value="variants" className="m-0 space-y-5"><div className="space-y-2"><h3 className="text-sm font-semibold">Einfacher</h3><p className="text-sm leading-relaxed">{exercise.easier}</p></div><div className="space-y-2"><h3 className="text-sm font-semibold">{kids ? 'Weitere Spielidee' : 'Anspruchsvoller'}</h3><p className="text-sm leading-relaxed">{exercise.harder}</p></div></TabsContent>
          </Tabs>
          {!kids && <div className="mt-5 space-y-2 border-t border-border pt-4">{replacementRequested && !replacementValid && <p role="alert" className="text-sm text-destructive">Die Übung ist nicht mehr verfügbar. Öffne deine Einheit erneut.</p>}{!replacementRequested && appendId && !appendSession && <p role="alert" className="text-sm text-destructive">Diese Einheit ist nicht mehr verfügbar. Öffne deine Einheiten erneut.</p>}<Button type="button" variant={added ? 'secondary' : 'default'} className="h-auto min-h-11 w-full whitespace-normal py-3" aria-disabled={added || undefined} onClick={addExercise} disabled={(replacementRequested && !replacementValid) || (!replacementRequested && Boolean(appendId) && !appendSession)}>{added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{added ? appendSession ? 'In dieser Einheit' : 'Im Einheitsentwurf' : replacementRequested ? 'Übung ersetzen' : 'Zur Einheit hinzufügen'}</Button>{added && <Button asChild variant="ghost" className="w-full"><Link to={appendId ? '/training/sessions/' + encodeURIComponent(appendId) : '/training/sessions/new'}>{appendId ? 'Einheit ansehen' : 'Entwurf öffnen'}<ChevronRight aria-hidden="true" /></Link></Button>}</div>}
        </>}
      </KwsSurface>
    </div>
    {kids && guide && <Fold title="Alter, Gruppe & Spielzeit"><div className="grid gap-4 sm:grid-cols-3"><div><h3 className="text-xs font-semibold">Alter</h3><p>{guide.ages}</p></div><div><h3 className="text-xs font-semibold">Gruppe</h3><p>{guide.players}</p></div><div><h3 className="text-xs font-semibold">Spielzeit</h3><p>{guide.duration}</p></div></div></Fold>}
    {exercise.sources.length > 0 && <Fold title="Hintergrund & Quellen"><p className="max-w-2xl text-xs">Noch nicht fachlich freigegeben. Quellen stützen Grundlagen; konkrete Abläufe und Beispielumfänge sind redaktionell.</p>{exercise.selectionReason && <p className="max-w-2xl text-xs">{exercise.selectionReason}</p>}<ul className="max-w-2xl space-y-3">{exercise.sources.map(source => <li key={source.url + source.label} className="space-y-1 text-xs"><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-kws-control text-sm font-medium text-primary-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">{source.label}<ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="sr-only"> (öffnet in neuem Tab)</span></a><p>{source.context}</p></li>)}</ul></Fold>}
  </div>;
}
