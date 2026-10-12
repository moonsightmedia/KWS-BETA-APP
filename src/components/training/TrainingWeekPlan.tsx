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

  if (!plan) return <KwsSurface className="space-y-4 p-5">
    <CalendarDays className="h-6 w-6 text-primary-ink" aria-hidden="true" />
    <h2 className="text-base font-semibold">Deine Woche beginnt hier</h2>
    <p className="text-sm text-muted-foreground">Wähle Ziel, Lernfelder und mögliche Tage. Anschließend kannst du die Beispielwoche anpassen.</p>
    <Button asChild className="h-auto min-h-11 whitespace-normal"><Link to="/training/plan">Beispielwoche zusammenstellen<ChevronRight aria-hidden="true" /></Link></Button>
  </KwsSurface>;

  const completed = plan.entries.filter((entry) => entry.completed).length;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold">Deine Beispielwoche</h2><p className="mt-1 text-sm text-muted-foreground">{completed} von {plan.entries.length} als erledigt markiert</p></div>
      <Button asChild variant="secondary"><Link to="/training/plan"><Pencil aria-hidden="true" />Angaben ändern</Link></Button>
    </div>
    <p className="text-sm text-muted-foreground">{plan.summary}</p>
    <p className="text-xs text-muted-foreground">Beispielplan ohne individuelle Trainingsfreigabe. Verschieben prüft freie Tage; es bewertet weder Erholung noch die passende Trainingslast.</p>
    <div className="grid gap-3 xl:grid-cols-7" aria-label="Wochenübersicht">
      {WEEKDAYS.map((day, dayIndex) => {
        const entries = plan.entries.filter((entry) => entry.day === dayIndex);
        return <KwsSurface key={day} className="min-w-0 p-4 xl:p-3">
          <h3 className="mb-3 text-sm font-semibold">{day}</h3>
          {entries.length === 0 ? <p className="text-xs text-muted-foreground">Kein Termin geplant</p> : <div className="space-y-4">
            {entries.map((entry) => {
              const session = sessions.find((item) => item.id === entry.sessionId);
              if (!session) return <p key={entry.id} className="text-sm text-muted-foreground">Einheit nicht verfügbar. Ändere die Angaben für eine neue Beispielwoche.</p>;
              return <div key={entry.id} className="space-y-3">
                <Link to={`/training/sessions/${session.id}`} className="group flex min-h-11 items-start gap-2 rounded-kws-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold group-hover:text-primary-ink">{session.title}</p><p className="mt-1 text-xs text-muted-foreground">{session.minutes} Min. · {session.focus}</p></div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
                <Button type="button" variant="secondary" aria-pressed={entry.completed}
                  aria-label={`${session.title}: ${entry.completed ? 'Erledigt-Markierung entfernen' : 'als erledigt markieren'}`}
                  className={cn('w-full justify-start px-3 text-xs', entry.completed && 'bg-primary/15 hover:bg-primary/20')}
                  onClick={() => { togglePlanEntry(entry.id); setNotice(`${session.title}: ${entry.completed ? 'wieder offen' : 'als erledigt markiert'}.`); }}>
                  <Check className={cn('h-4 w-4', entry.completed ? 'text-primary-ink' : 'text-muted-foreground')} aria-hidden="true" />
                  {entry.completed ? 'Erledigt' : 'Abhaken'}
                </Button>
                {entry.fixed ? <p className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" aria-hidden="true" />Fester Termin</p> : <div className="space-y-2">
                  <label htmlFor={`move-${entry.id}`} className="text-xs text-muted-foreground">Tag ändern</label>
                  <Select value={String(entry.day)} onValueChange={(value) => {
                    const nextDay = Number(value);
                    if (nextDay === entry.day || plan.entries.some((other) => other.id !== entry.id && other.day === nextDay)) return;
                    movePlanEntry(entry.id, nextDay); setNotice(`${session.title} nach ${WEEKDAYS[nextDay]} verschoben.`);
                  }}>
                    <SelectTrigger id={`move-${entry.id}`} className="px-2 text-xs" aria-label={`${session.title}: Tag ändern`}><SelectValue /></SelectTrigger>
                    <SelectContent>{WEEKDAYS.map((target, targetIndex) => <SelectItem key={target} value={String(targetIndex)}
                      disabled={plan.entries.some((other) => other.id !== entry.id && other.day === targetIndex)}>{target}{plan.entries.some((other) => other.id !== entry.id && other.day === targetIndex) ? ' · belegt' : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>}
              </div>;
            })}
          </div>}
        </KwsSurface>;
      })}
    </div>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <p className="text-xs text-muted-foreground">Ein ausgelassener Termin wird nicht zusätzlich nachgeholt. Feste Tage lassen sich über „Angaben ändern“ neu wählen.</p>
  </div>;
}
