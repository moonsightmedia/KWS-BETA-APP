import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, Lock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTraining } from '@/features/training/TrainingContext';
import { WEEKDAYS } from '@/features/training/data';
import { cn } from '@/lib/utils';

export default function TrainingWeekPlan() {
  const { plan, sessions, movePlanEntry, togglePlanEntry } = useTraining();
  const [notice, setNotice] = useState('');
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

  return <div className="space-y-4">
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
              <div><h3 className="text-sm font-semibold">{session.title}</h3><p className="mt-1 text-xs text-muted-foreground">{session.minutes} Min. · {session.focus}</p></div>
              <div className="flex flex-wrap gap-2">
                <Button asChild><Link to={`/training/sessions/${session.id}`}>Einheit ansehen<ChevronRight aria-hidden="true" /></Link></Button>
                <Button type="button" variant="secondary" aria-pressed={entry.completed}
                  aria-label={`${session.title}: ${entry.completed ? 'Erledigt-Markierung entfernen' : 'als erledigt markieren'}`}
                  className={cn(entry.completed && 'bg-primary/15 hover:bg-primary/20')}
                  onClick={() => { togglePlanEntry(entry.id); setNotice(`${session.title}: ${entry.completed ? 'wieder offen' : 'als erledigt markiert'}.`); }}>
                  <Check className={entry.completed ? 'text-primary-ink' : 'text-muted-foreground'} aria-hidden="true" />{entry.completed ? 'Erledigt' : 'Abhaken'}
                </Button>
              </div>
              <div className="border-t border-border pt-4">
                {entry.fixed ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" aria-hidden="true" />Fester Termin · Änderungen über deine Angaben</p> : <div className="max-w-xs space-y-2">
                  <label htmlFor={`move-${entry.id}`} className="text-xs font-semibold">Tag ändern</label>
                  <Select value={String(entry.day)} onValueChange={(value) => {
                    const nextDay = Number(value);
                    if (nextDay === entry.day || plan.entries.some((other) => other.id !== entry.id && other.day === nextDay)) return;
                    movePlanEntry(entry.id, nextDay); setSelectedDay(nextDay);
                    setNotice(`${session.title} nach ${WEEKDAYS[nextDay]} verschoben.`);
                  }}>
                    <SelectTrigger id={`move-${entry.id}`} aria-label={`${session.title}: Tag ändern`}><SelectValue /></SelectTrigger>
                    <SelectContent>{WEEKDAYS.map((target, targetIndex) => <SelectItem key={target} value={String(targetIndex)}
                      disabled={plan.entries.some((other) => other.id !== entry.id && other.day === targetIndex)}>{target}{plan.entries.some((other) => other.id !== entry.id && other.day === targetIndex) ? ' · belegt' : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>}
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
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{session?.title ?? 'Einheit nicht verfügbar'}</span><span className="mt-1 block text-xs text-muted-foreground">{session ? `${session.minutes} Min.` : WEEKDAYS[entry.day]}{entry.fixed ? ' · fest' : ''}{entry.completed ? ' · erledigt' : ''}</span></span>
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
