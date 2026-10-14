import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, Lock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTraining } from '@/features/training/TrainingContext';
import { getExercise, getSessionMinutes, WEEKDAYS } from '@/features/training/data';
import TrainingExerciseArt from './TrainingExerciseArt';
import TrainingWarmup from './TrainingWarmup';
import { cn } from '@/lib/utils';

export default function TrainingWeekPlan() {
  const { plan, sessions, movePlanEntry, togglePlanEntry, storageStatus } = useTraining();
  const [notice, setNotice] = useState('');
  const [movingEntry, setMovingEntry] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => plan?.entries[0]?.day ?? 0);

  if (!plan) return <KwsSurface className="mx-auto max-w-2xl space-y-4 p-5">
    <CalendarDays className="h-6 w-6 text-primary-ink" aria-hidden="true" />
    <h2 className="text-base font-semibold">Noch keine Woche geplant</h2>
    <p className="text-sm text-muted-foreground">Wähle dein Ziel und mögliche Tage.</p>
    <Button asChild className="h-auto min-h-11 whitespace-normal"><Link to="/training/plan">Woche zusammenstellen<ChevronRight aria-hidden="true" /></Link></Button>
  </KwsSurface>;

  const completed = plan.entries.filter((entry) => entry.completed).length;
  const selectedEntries = plan.entries.filter((entry) => entry.day === selectedDay);
  const otherEntries = [...plan.entries].filter((entry) => entry.day !== selectedDay).sort((a, b) => a.day - b.day);
  const duration = (session: typeof sessions[number]) => getSessionMinutes(session) === null ? 'Dauer offen' : `ca. ${getSessionMinutes(session)} Min.`;

  return <div className="space-y-4">
    <KwsSurface className="space-y-3 p-4 sm:p-5"><div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" aria-hidden="true" /><div><h2 className="font-sans text-base font-semibold">{plan.status === 'needs-review' ? 'Deine Planung zur Besprechung' : 'Kraft und Technik in deiner Woche'}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p></div></div>
      {plan.status === 'needs-review' && <p className="rounded-kws-control bg-secondary p-3 text-sm leading-relaxed">Für diese Angaben erstelle ich keine automatische Belastungsvorgabe. Besprich Ziel und verfügbare Tage mit einer passenden Fachperson. Deine festen Termine bleiben sichtbar.</p>}
      {!!plan.notes?.length && <details><summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold">{plan.status === 'needs-review' ? 'Was vorher geklärt werden muss' : 'So wurde dein Plan zusammengestellt'}</summary><ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">{plan.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
      <p className="text-xs text-muted-foreground">{storageStatus === 'saved' ? 'Auf diesem Gerät gespeichert' : 'Speichern nicht verfügbar · nur in dieser Sitzung'}</p>
    </KwsSurface>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{completed} von {plan.entries.length} erledigt</p>
      <Button asChild variant="secondary"><Link to="/training/plan"><Pencil aria-hidden="true" />Angaben ändern</Link></Button>
    </div>
    <div className="grid grid-cols-7 gap-1 rounded-kws-card bg-secondary p-1" role="group" aria-label="Tag auswählen">
      {WEEKDAYS.map((day, index) => {
        const entries = plan.entries.filter((entry) => entry.day === index);
        const allDone = entries.length > 0 && entries.every((entry) => entry.completed);
        return <button key={day} type="button" aria-pressed={selectedDay === index}
          aria-label={`${day}: ${entries.length ? `${entries.length} ${entries.length === 1 ? 'Termin' : 'Termine'}${allDone ? ', erledigt' : ''}` : 'kein Termin'}`}
          onClick={() => setSelectedDay(index)}
          className={cn('flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-kws-control px-1 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selectedDay === index ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-card')}>
          <span className="lg:hidden">{day.slice(0, 2)}</span><span className="hidden lg:inline">{day}</span>
          <span className="flex h-4 items-center text-xs font-normal" aria-hidden="true">{allDone ? <Check className="h-4 w-4" /> : entries.length ? entries.length : '–'}</span>
        </button>;
      })}
    </div>

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <KwsSurface className="min-w-0 p-4 sm:p-5" aria-label={`Tagesplanung ${WEEKDAYS[selectedDay]}`}>
        <h2 className="mb-4 text-base font-semibold">{WEEKDAYS[selectedDay]}</h2>
        {selectedEntries.length === 0 ? <div className="space-y-2 py-2">
          <p className="text-sm">Kein Termin geplant</p>
          <p className="text-xs text-muted-foreground">Wähle einen belegten Tag, um deine Einheit anzusehen oder zu verschieben.</p>
        </div> : <div className="space-y-5">
          {selectedEntries.map((entry) => {
            const session = sessions.find((item) => item.id === entry.sessionId);
            if (!session) return <p key={entry.id} className="text-sm text-muted-foreground">Einheit nicht verfügbar. Ändere die Angaben für eine neue Beispielwoche.</p>;
            return <div key={entry.id} className="space-y-4">
              <div><h3 className="break-words text-base font-semibold">{session.title}</h3><p className="mt-1 text-xs text-muted-foreground">{entry.fixed ? 'Eigener Termin · Umfang offen' : duration(session)} · {session.focus}</p>{session.rationale && <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold">Aufbau dieser Einheit</summary><p className="text-xs leading-relaxed text-muted-foreground">{session.rationale}</p></details>}</div>
              {!entry.fixed && <div className="space-y-3">
                <TrainingWarmup session={session} />
                <ol className="space-y-2" aria-label="Übungen im Wochenplan">{session.exercises.map(item => { const exercise = getExercise(item.exerciseId); if (!exercise) return null; return <li key={item.id}><Link to={`/training/exercises/${exercise.id}?returnSession=${encodeURIComponent(session.id)}&append=${encodeURIComponent(session.id)}`} className="flex gap-3 rounded-kws-control bg-secondary/40 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><TrainingExerciseArt exerciseId={exercise.id} title={exercise.title} className="h-16 w-16 shrink-0 rounded-kws-control" /><span className="min-w-0 flex-1 py-1"><span className="block text-sm font-semibold">{exercise.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.sets} {exercise.area === 'mobility' || exercise.area === 'boulder' ? item.sets === 1 ? 'Block' : 'Blöcke' : item.sets === 1 ? 'Satz' : 'Sätze'} × {item.repetitions} {exercise.defaultDose?.repetitionUnit ?? (exercise.area === 'boulder' ? 'Versuche' : 'Wdh.')}{exercise.defaultDose?.sideMultiplier === 2 ? ' je Seite' : ''} · {item.restSeconds === 0 ? 'Pause bei Bedarf' : `${item.restSeconds} Sek. ${item.restScope === 'repetitions' ? exercise.defaultDose?.repetitionUnit === 'Haltephasen' ? 'zwischen Haltephasen' : exercise.defaultDose?.repetitionUnit === 'Wiederholungen' ? 'zwischen Wiederholungen' : 'zwischen Versuchen' : 'zwischen Sätzen'}`}</span></span></Link>{item.reason && <details className="px-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold">Warum diese Übung?</summary><p className="pb-3 text-xs leading-relaxed text-muted-foreground">{item.reason}</p></details>}</li>; })}</ol>
                {session.budgetMinutes && <p className="text-xs text-muted-foreground">{duration(session)} einschließlich Pausen und Übergängen · Zeitfenster {session.budgetMinutes} Min.{(getSessionMinutes(session) ?? 0) > session.budgetMinutes ? ' · Dein angepasster Umfang überschreitet das Zeitfenster.' : ''}</p>}
              </div>}
              <div className="flex flex-wrap gap-2">
                {!entry.fixed && <Button asChild><Link to={`/training/sessions/${session.id}?entry=${encodeURIComponent(entry.id)}`}>Einheit anpassen<ChevronRight aria-hidden="true" /></Link></Button>}
                <Button type="button" variant="secondary" aria-pressed={entry.completed}
                  disabled={!entry.fixed && !entry.completed && !session.exercises.length}
                  aria-label={`${session.title}: ${entry.completed ? 'Erledigt-Markierung entfernen' : 'als erledigt markieren'}`}
                  className={cn(entry.completed && 'bg-primary/15 hover:bg-primary/20')}
                  onClick={() => { togglePlanEntry(entry.id); setNotice(`${session.title}: ${entry.completed ? 'wieder offen' : 'als erledigt markiert'}.`); }}>
                  <Check className={entry.completed ? 'text-primary-ink' : 'text-muted-foreground'} aria-hidden="true" />{entry.completed ? 'Erledigt' : entry.fixed ? 'Termin abhaken' : 'Als trainiert markieren'}
                </Button>
              </div>
              {!entry.fixed && <p className="text-xs leading-relaxed text-muted-foreground">{entry.completed ? 'Mit dieser Markierung werden abgeschlossene Einheiten unter „Zuletzt trainiert“ gespeichert. Entferne sie, falls du versehentlich abgeschlossen hast.' : session.exercises.length ? 'Nach dem Training markieren: Die Einheit wird in „Zuletzt trainiert“ gespeichert und lässt sich erneut zusammenstellen.' : 'Ergänze zuerst Übungen, um diese Einheit als trainiert zu markieren.'}</p>}
              <div className="border-t border-border pt-4">
                {entry.fixed ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" aria-hidden="true" />Fester Termin · Änderungen über deine Angaben</p> : <Dialog open={movingEntry === entry.id} onOpenChange={open => setMovingEntry(open ? entry.id : null)}><DialogTrigger asChild><Button variant="outline">Termin verschieben</Button></DialogTrigger><DialogContent><DialogTitle>Termin verschieben</DialogTitle><DialogDescription>Wähle einen freien Tag für „{session.title}“. Berücksichtige dabei dein übriges Training und ausreichende Erholung.</DialogDescription><div className="grid grid-cols-2 gap-2" role="group" aria-label="Zieltag wählen">{WEEKDAYS.map((day, index) => <Button key={day} variant={index === entry.day ? 'default' : 'secondary'} disabled={index === entry.day || plan.entries.some(other => other.id !== entry.id && other.day === index)} onClick={() => { movePlanEntry(entry.id, index); setSelectedDay(index); setMovingEntry(null); setNotice(`${session.title} nach ${WEEKDAYS[index]} verschoben.`); }}>{day}{plan.entries.some(other => other.id !== entry.id && other.day === index) ? ' · belegt' : ''}</Button>)}</div></DialogContent></Dialog>}
              </div>
            </div>;
          })}
        </div>}
      </KwsSurface>

      <section className="min-w-0" aria-label="Weitere Termine">
        <h2 className="mb-2 text-sm font-semibold">Weitere Termine</h2>
        {otherEntries.length === 0 ? <p className="py-3 text-xs text-muted-foreground">Keine weiteren Termine in dieser Woche.</p> : <KwsSurface className="divide-y divide-border px-3">
          {otherEntries.map((entry) => {
            const session = sessions.find((item) => item.id === entry.sessionId);
            return <button key={entry.id} type="button" onClick={() => setSelectedDay(entry.day)}
              className="flex min-h-16 w-full items-center gap-3 rounded-kws-control py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kws-control bg-secondary text-xs font-semibold">{WEEKDAYS[entry.day].slice(0, 2)}</span>
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{session?.title ?? 'Einheit nicht verfügbar'}</span><span className="mt-1 block text-xs text-muted-foreground">{entry.fixed ? 'Eigener Termin · fest' : session ? duration(session) : WEEKDAYS[entry.day]}{entry.completed ? ' · erledigt' : ''}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>;
          })}
        </KwsSurface>}
      </section>
    </div>
    <p className="text-xs text-muted-foreground">Verschieben berücksichtigt freie Tage. Die passende Belastung und Erholung sind damit nicht geprüft.</p>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
  </div>;
}
