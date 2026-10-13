import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Check, ChevronDown, Clock3, ListPlus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrainingInput as Input } from './TrainingInput';
import { Label } from '@/components/ui/label';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getExercise, getSessionMinutes, WEEKDAYS } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import { completionOrigin } from '@/features/training/trainingHistory';
import type { SessionExercise, TrainingSession } from '@/features/training/types';
import TrainingExerciseArt from './TrainingExerciseArt';
import TrainingTopicIcon from './TrainingTopicIcon';
import { cn } from '@/lib/utils';

const durationLabel = (session: TrainingSession) => {
  const minutes = getSessionMinutes(session);
  return minutes === null ? 'Dauer offen' : `ca. ${minutes} Min. inkl. Pausen`;
};
const completionDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TrainingSessions() {
  const { id } = useParams<{ id: string }>();
  const { draft, updateDraft, sessions, saveDraft, updateSession, plan, scheduleSession, storageStatus, history, completeSession, undoCompletion } = useTraining();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [scheduleDay, setScheduleDay] = useState<number | null>(null);
  if (!id) {
    const own = sessions.filter(session => !session.id.startsWith('preview-'));
    return <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><p className="max-w-md text-sm leading-relaxed text-muted-foreground">Übungen auswählen, Umfang anpassen und als eigene Einheit speichern.</p><Button asChild className="shrink-0 px-3 text-xs"><Link to="/training/sessions/new"><Plus aria-hidden="true" />Neue Einheit</Link></Button></div>
      {draft.exercises.length > 0 && <Link to="/training/sessions/new" className="flex min-h-20 items-center gap-3 rounded-kws-card bg-foreground p-4 text-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ListPlus className="h-5 w-5 text-primary" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold">Entwurf fortsetzen</span><span className="mt-1 block text-xs text-white/80">{draft.exercises.length} Übungen ausgewählt</span></span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      {own.length ? <div className="grid gap-3 sm:grid-cols-2">{own.map(session => <KwsSurface key={session.id}><Link to={`/training/sessions/${session.id}`} className="flex min-h-28 items-center gap-3 rounded-kws-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-secondary"><ListPlus className="h-5 w-5 text-primary-ink" aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="font-sans text-sm font-semibold">{session.title}</h2><p className="mt-2 text-xs text-muted-foreground">{session.exercises.length} Übungen · {durationLabel(session)}</p></div><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link></KwsSurface>)}</div> : <KwsSurface className="px-5 py-8 text-center"><ListPlus className="mx-auto h-8 w-8 text-primary-ink" aria-hidden="true" /><h2 className="mt-4 font-sans text-base font-semibold">Deine erste eigene Einheit</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Übungen auswählen, Reihenfolge festlegen und den Umfang anpassen.</p><Button asChild className="mt-5"><Link to="/training/sessions/new">Jetzt zusammenstellen<ArrowRight aria-hidden="true" /></Link></Button></KwsSurface>}
    </div>;
  }
  const isNew = id === 'new';
  const session = isNew ? draft : sessions.find(item => item.id === id);
  if (!session) return <KwsSurface className="p-6"><h2 className="font-sans text-base font-semibold">Einheit nicht vorhanden</h2><p className="mt-2 text-sm text-muted-foreground">Öffne eine vorhandene Einheit aus deiner Sammlung.</p><Button asChild className="mt-4"><Link to="/training/sessions">Zu deinen Einheiten</Link></Button></KwsSurface>;
  const plannedEntry = plan?.entries.find(entry => entry.sessionId === session.id);
  const latestCompletion = plannedEntry && plan ? history.find(completion => completion.originKey === completionOrigin(plan, plannedEntry.id)) : history.find(completion => completion.session.id === session.id);
  if (plannedEntry?.fixed && session.exercises.length === 0) return <KwsSurface className="space-y-3 p-5"><h2 className="text-base font-semibold">{session.title}</h2><p className="text-sm text-muted-foreground">Dieser Tag ist für deinen bestehenden Trainingstermin reserviert. Der Assistent ergänzt dafür keine Übungen oder Belastungsvorgaben.</p>{session.rationale && <p className="text-xs text-muted-foreground">{session.rationale}</p>}<Button asChild variant="secondary"><Link to="/training/week">Mein Wochenplan<ArrowRight aria-hidden="true" /></Link></Button></KwsSurface>;
  const estimatedMinutes = getSessionMinutes(session);
  const overBudget = estimatedMinutes !== null && session.budgetMinutes !== undefined && estimatedMinutes > session.budgetMinutes;
  const setItems = (items: SessionExercise[]) => isNew ? updateDraft(previous => ({ ...previous, exercises: items })) : updateSession(id, { exercises: items });
  const changeItem = (itemId: string, changes: Partial<SessionExercise>) => setItems(session.exercises.map(item => item.id === itemId ? { ...item, ...changes } : item));
  const move = (index: number, direction: number) => { const items = [...session.exercises]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; setItems(items); };
  const strengthCount = session.exercises.filter(item => getExercise(item.exerciseId)?.area === 'strength').length;
  const boulderCount = session.exercises.filter(item => getExercise(item.exerciseId)?.area === 'boulder').length;
  const suffix = isNew ? '' : `?append=${encodeURIComponent(id)}`;
  const detailContext = `returnSession=${encodeURIComponent(id)}${isNew ? '' : `&append=${encodeURIComponent(id)}`}`;
  return <div className="space-y-5">
    {isNew && <ol aria-label="Schritte zur eigenen Einheit" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">{['Auswählen', 'Anpassen', 'Speichern'].map((step, index) => <li key={step} aria-current={index === (session.exercises.length ? 1 : 0) ? 'step' : undefined} className={cn('inline-flex items-center gap-2', index === (session.exercises.length ? 1 : 0) && 'font-semibold text-foreground')}><span className="grid h-6 w-6 place-items-center rounded-kws-badge bg-secondary">{index + 1}</span>{step}</li>)}</ol>}
    <section className="space-y-3">
      {isNew ? <div><Label htmlFor="session-title" className="text-xs">Name deiner Einheit</Label><Input id="session-title" maxLength={80} value={session.title} onChange={event => updateDraft(previous => ({ ...previous, title: event.target.value }))} className="mt-2 bg-card" /></div> : <h2 className="font-sans text-lg font-semibold">{session.title}</h2>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" />{durationLabel(session)}</span><span>{strengthCount} Kraft · {boulderCount} Technik</span>{!isNew && <span className="inline-flex items-center gap-1 text-primary-ink"><Check className="h-4 w-4" aria-hidden="true" />In deiner Sammlung</span>}</div>
      {session.rationale && <p className="text-sm leading-relaxed text-muted-foreground">{session.rationale}</p>}
      {session.budgetMinutes !== undefined && <p className="text-xs text-muted-foreground">Zeitbudget: {session.budgetMinutes} Min. · Berechnung aus deinem aktuellen Umfang, Vorbereitung und Abschluss.</p>}
      {overBudget && <p role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">Deine Änderungen überschreiten das Zeitbudget um {estimatedMinutes! - session.budgetMinutes!} Min. Reduziere einen Block oder plane mehr Zeit; kürze Pausen nicht automatisch.</p>}
    </section>
    {session.exercises.length > 0 && <section className="flex items-start gap-3 border-l-2 border-primary pl-3"><span className="min-w-0"><h3 className="text-sm font-semibold">Vorbereitung{session.preparationMinutes !== undefined ? ` · ${session.preparationMinutes} Min.` : ''}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Befinden und Aufgaben prüfen, Bewegungen leicht annähern und benötigte Geräte einweisen lassen. Ein Timer allein gibt den nächsten Block nicht frei.</p></span></section>}
    {!session.exercises.length && <KwsSurface className="p-5"><h2 className="font-sans text-sm font-semibold">Noch keine Übungen ausgewählt</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Beginne mit einer Kraft- oder Boulderübung. Beide Bereiche lassen sich in einer Einheit kombinieren.</p></KwsSurface>}
    <ol className="space-y-3" aria-label="Übungen deiner Einheit">
      {session.exercises.map((item, index) => {
        const exercise = getExercise(item.exerciseId); if (!exercise) return null;
        const editing = editingItem === item.id;
        const repetitions = item.repetitions.trim() ? `${item.repetitions} ${exercise.defaultDose?.repetitionUnit ?? (exercise.area === 'boulder' ? 'Versuche' : 'Wdh.')}${exercise.defaultDose?.sideMultiplier === 2 ? ' je Seite' : ''}${exercise.defaultDose?.repetitionUnit === 'Haltephasen' ? ` · jeweils bis ${exercise.defaultDose.secondsPerRepetition} Sek.` : ''}` : 'Wiederholungen offen';
        const restScope = item.restScope ?? exercise.defaultDose?.restScope ?? (exercise.area === 'boulder' ? 'repetitions' : 'sets');
        const pauseLabel = restScope === 'repetitions' ? exercise.defaultDose?.repetitionUnit === 'Haltephasen' ? 'zwischen Haltephasen' : 'zwischen Versuchen' : 'zwischen Sätzen';
        return <li key={item.id}><KwsSurface className="overflow-hidden">
          <div className="flex items-start gap-3 p-4"><TrainingExerciseArt exerciseId={exercise.id} title={exercise.title} className="w-16 shrink-0" /><div className="min-w-0 flex-1"><p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><TrainingTopicIcon exerciseId={exercise.id} topic={exercise.topic} className="h-4 w-4" />{index + 1} · {exercise.topic}</p><Link to={`/training/exercises/${exercise.id}?${detailContext}`} className="inline-flex min-h-11 items-center rounded-kws-control text-sm font-semibold leading-snug underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{exercise.title}</Link><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.sets} {exercise.area === 'boulder' || exercise.defaultDose?.repetitionUnit === 'Haltephasen' ? (item.sets === 1 ? 'Block' : 'Blöcke') : (item.sets === 1 ? 'Satz' : 'Sätze')} · {repetitions} · {item.restSeconds} Sek. {pauseLabel}</p>{(item.reason || exercise.selectionReason) && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.reason || exercise.selectionReason}</p>}</div><Button size="icon" variant="ghost" aria-label={`Entfernen: ${exercise.title}`} onClick={() => setItems(session.exercises.filter(value => value.id !== item.id))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div>
          <div className="flex items-center gap-1 border-t border-border/60 px-3"><Button variant="ghost" className="flex-1 justify-start px-1 text-xs" aria-expanded={editing} aria-controls={`settings-${item.id}`} onClick={() => setEditingItem(editing ? null : item.id)}>Umfang anpassen<ChevronDown className={editing ? 'rotate-180' : ''} aria-hidden="true" /></Button><Button size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Nach oben: ${exercise.title}`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></Button><Button size="icon" variant="ghost" disabled={index === session.exercises.length - 1} onClick={() => move(index, 1)} aria-label={`Nach unten: ${exercise.title}`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></Button></div>
          {editing && <div id={`settings-${item.id}`} className="space-y-3 border-t border-border/60 bg-secondary/30 p-4"><div className="grid grid-cols-3 gap-2">
            <div><Label htmlFor={`sets-${item.id}`} className="text-xs">{exercise.area === 'boulder' ? 'Blöcke' : 'Sätze'}</Label><Input id={`sets-${item.id}`} type="number" min={1} max={8} value={item.sets} onChange={event => changeItem(item.id, { sets: Math.min(8, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 bg-card" /></div>
            <div><Label htmlFor={`reps-${item.id}`} className="text-xs">{exercise.defaultDose?.repetitionUnit ?? (exercise.area === 'boulder' ? 'Versuche' : 'Wdh.')}</Label><Input id={`reps-${item.id}`} maxLength={30} value={item.repetitions} aria-describedby={!item.repetitions.trim() ? `reps-help-${item.id}` : undefined} onChange={event => changeItem(item.id, { repetitions: event.target.value })} className="mt-1 bg-card" /></div>
            <div><Label htmlFor={`rest-${item.id}`} className="text-xs">Pause (Sek.)</Label><Input id={`rest-${item.id}`} type="number" min={0} max={600} value={item.restSeconds} onChange={event => changeItem(item.id, { restSeconds: Math.min(600, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 bg-card" /></div>
          </div><p className="text-xs text-muted-foreground">Die Pause gilt {pauseLabel}; ein längerer Bedarf hat Vorrang.</p>{!item.repetitions.trim() && <p id={`reps-help-${item.id}`} className="text-xs leading-relaxed text-muted-foreground">Wiederholungen offen. Ergänze den Umfang dieser Übung.</p>}{!isNew && <Button asChild variant="outline" className="text-xs"><Link to={`/training/library/${exercise.area}?session=${id}&item=${item.id}`}>Austauschen</Link></Button>}</div>}
        </KwsSurface></li>;
      })}
    </ol>
    {session.exercises.length > 0 && <section className="border-l-2 border-border pl-3"><h3 className="text-sm font-semibold">Abschluss{session.cooldownMinutes !== undefined ? ` · ${session.cooldownMinutes} Min.` : ''}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Lösen, Durchführung und Lernpunkt festhalten. Restzeit wird nicht automatisch mit weiteren harten Versuchen gefüllt.</p></section>}
    <div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" className="h-auto min-h-14 whitespace-normal px-3 py-3 text-xs"><Link to={`/training/library/strength${suffix}`}><Plus aria-hidden="true" />Kraftübung hinzufügen</Link></Button><Button asChild variant="outline" className="h-auto min-h-14 whitespace-normal px-3 py-3 text-xs"><Link to={`/training/library/boulder${suffix}`}><Plus aria-hidden="true" />Boulderübung hinzufügen</Link></Button></div>
    {isNew && <div className="space-y-2"><Button className="w-full sm:w-auto" disabled={!session.exercises.length || !session.title.trim() || session.exercises.some(item => !item.repetitions.trim())} onClick={() => { const saved = saveDraft(); if (saved) { setEditingItem(null); navigate(`/training/sessions/${saved}`); } else setMessage('Wähle Übungen aus und gib deiner Einheit einen Namen.'); }}>Einheit speichern<Check aria-hidden="true" /></Button><p className="text-xs text-muted-foreground">Danach kannst du sie optional in deine Woche einplanen.</p></div>}
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    {!isNew && !plannedEntry?.fixed && session.exercises.length > 0 && <section className="space-y-3 border-t border-border pt-4" aria-label="Training dokumentieren">
      <Button type="button" variant="secondary" disabled={plannedEntry?.completed} onClick={() => { if (completeSession(session.id)) setMessage(''); else setMessage('Diese Einheit ist bereits erfasst oder konnte gerade nicht als trainiert markiert werden.'); }}>Als trainiert markieren<Check aria-hidden="true" /></Button>
      {latestCompletion && <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p role="status" className="text-xs text-muted-foreground">Als trainiert erfasst · <time dateTime={latestCompletion.completedAt}>{completionDate.format(new Date(latestCompletion.completedAt))}</time></p><Button type="button" variant="ghost" className="px-1 text-xs" onClick={() => { undoCompletion(latestCompletion.id); setMessage(''); }}>Rückgängig</Button></div>}
    </section>}
    {!isNew && !session.id.startsWith('preview-') && <KwsSurface className="space-y-3 p-4">
      <h3 className="text-sm font-semibold">Optional: in die Woche einplanen</h3>
      {plannedEntry ? <Button asChild variant="secondary"><Link to="/training/week">Mein Wochenplan<ArrowRight aria-hidden="true" /></Link></Button> : <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Freien Wochentag wählen">{WEEKDAYS.map((day, index) => <Button key={day} type="button" variant="secondary" disabled={Boolean(plan?.entries.some(entry => entry.day === index)) || plan?.status === 'needs-review'} aria-pressed={scheduleDay === index} onClick={() => setScheduleDay(index)} className={cn('px-2 text-xs', scheduleDay === index && 'bg-primary text-primary-foreground hover:bg-primary/95')}>{day}</Button>)}</div>
        {plan?.status === 'needs-review' && <p className="text-xs text-muted-foreground">Deine Woche benötigt zuerst eine Prüfung. Eine eigene Einheit umgeht diesen Schritt nicht.</p>}
        <Button type="button" disabled={scheduleDay === null || estimatedMinutes === null || !session.exercises.length || Boolean(plan?.entries.some(entry => entry.day === scheduleDay)) || plan?.status === 'needs-review'} onClick={() => {
          if (scheduleDay === null) return;
          if (scheduleSession(session.id, scheduleDay)) { setMessage(''); navigate('/training/week'); }
          else setMessage('Dieser Termin konnte nicht eingeplant werden. Wähle einen freien Tag oder prüfe deinen Wochenplan.');
        }}>In Woche einplanen<CalendarDays aria-hidden="true" /></Button>
      </>}
    </KwsSurface>}
    <p className="text-xs leading-relaxed text-muted-foreground">{storageStatus === 'saved' ? 'Eigene Einheiten und Wochenplan werden lokal auf diesem Gerät gespeichert.' : 'Lokales Speichern ist gerade nicht verfügbar. Änderungen bleiben nur in der geöffneten App.'}</p>
  </div>;
}
