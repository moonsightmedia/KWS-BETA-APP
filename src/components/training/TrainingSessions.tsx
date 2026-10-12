import { ArrowDown, ArrowRight, ArrowUp, Clock3, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KwsSurface } from '@/components/ui/kws-surface';
import { getExercise, getSessionMinutes } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import type { SessionExercise } from '@/features/training/types';

export default function TrainingSessions() {
  const { id } = useParams<{ id: string }>();
  const { draft, updateDraft, sessions, saveDraft, updateSession } = useTraining();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  if (!id) {
    const own = sessions.filter(session => !session.id.startsWith('preview-'));
    return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Übungen aus den Bibliotheken miteinander kombinieren.</p><Button asChild><Link to="/training/sessions/new"><Plus className="mr-2 h-4 w-4" />Einheit erstellen</Link></Button></div>
      {draft.exercises.length > 0 && <KwsSurface className="p-4"><Link to="/training/sessions/new" className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">Entwurf fortsetzen · {draft.exercises.length} Übungen<ArrowRight className="h-4 w-4" /></Link></KwsSurface>}
      {own.length ? own.map(session => <KwsSurface key={session.id}><Link to={`/training/sessions/${session.id}`} className="flex min-h-20 items-center justify-between gap-3 p-4"><div><h2 className="font-sans text-sm font-semibold">{session.title}</h2><p className="mt-1 text-xs text-muted-foreground">{session.exercises.length} Übungen · ca. {getSessionMinutes(session)} Min.</p></div><ArrowRight className="h-4 w-4" /></Link></KwsSurface>) : <KwsSurface className="p-6"><h2 className="font-sans text-base font-semibold">Deine erste eigene Einheit</h2><p className="mt-2 text-sm text-muted-foreground">Wähle Kraft- und Boulderübungen aus und lege ihre Reihenfolge fest.</p><Button asChild variant="outline" className="mt-4"><Link to="/training/sessions/new">Jetzt zusammenstellen</Link></Button></KwsSurface>}
    </div>;
  }
  const isNew = id === 'new';
  const session = isNew ? draft : sessions.find(item => item.id === id);
  if (!session) return <KwsSurface className="p-6"><h2 className="font-sans text-base font-semibold">Einheit nicht vorhanden</h2><p className="mt-2 text-sm text-muted-foreground">Beispieldaten bleiben nur während der geöffneten App erhalten.</p><Button asChild className="mt-4"><Link to="/training/sessions">Zu deinen Einheiten</Link></Button></KwsSurface>;
  const setItems = (items: SessionExercise[]) => isNew ? updateDraft(previous => ({ ...previous, exercises: items })) : updateSession(id, { exercises: items });
  const changeItem = (itemId: string, changes: Partial<SessionExercise>) => setItems(session.exercises.map(item => item.id === itemId ? { ...item, ...changes } : item));
  const move = (index: number, direction: number) => { const items = [...session.exercises]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; setItems(items); };
  return <div className="space-y-4">
    <KwsSurface className="p-4">
      {isNew ? <><Label htmlFor="session-title">Name deiner Einheit</Label><Input id="session-title" maxLength={80} value={session.title} onChange={event => updateDraft(previous => ({ ...previous, title: event.target.value }))} className="mt-2" /></> : <h2 className="font-sans text-base font-semibold">{session.title}</h2>}
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />{session.exercises.length} Übungen · ca. {getSessionMinutes(session)} Min. Übungszeit einschließlich Pausen</p>
      {!isNew && session.id.startsWith('preview-') && <p className="mt-2 text-xs text-muted-foreground">{session.minutes} Min. Terminbudget; übrige Zeit für Vorbereitung, Übergänge und freies Bouldern. Die Dosis bleibt ein Beispiel.</p>}
    </KwsSurface>
    {!session.exercises.length && <KwsSurface className="p-5"><h2 className="font-sans text-sm font-semibold">Noch keine Übungen ausgewählt</h2><p className="mt-2 text-sm text-muted-foreground">Füge passende Übungen aus einer Bibliothek hinzu.</p></KwsSurface>}
    <ol className="space-y-3" aria-label="Übungen deiner Einheit">
      {session.exercises.map((item, index) => { const exercise = getExercise(item.exerciseId); if (!exercise) return null; return <li key={item.id}><KwsSurface className="p-4">
        <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-kws-control bg-secondary text-sm font-semibold">{index + 1}</span><div className="min-w-0 flex-1"><Link to={`/training/exercises/${exercise.id}`} className="text-sm font-semibold underline-offset-4 hover:underline">{exercise.title}</Link><p className="mt-1 text-xs text-muted-foreground">{exercise.topic} · {exercise.equipment}</p></div><Button size="icon" variant="ghost" aria-label={`Entfernen: ${exercise.title}`} onClick={() => setItems(session.exercises.filter(value => value.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div><Label htmlFor={`sets-${item.id}`} className="text-xs">Sätze</Label><Input id={`sets-${item.id}`} type="number" min={1} max={8} value={item.sets} onChange={event => changeItem(item.id, { sets: Math.min(8, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1" /></div>
          <div><Label htmlFor={`reps-${item.id}`} className="text-xs">{exercise.area === 'boulder' ? 'Durchgänge' : 'Wdh.'}</Label><Input id={`reps-${item.id}`} maxLength={30} value={item.repetitions} onChange={event => changeItem(item.id, { repetitions: event.target.value })} className="mt-1" /></div>
          <div><Label htmlFor={`rest-${item.id}`} className="text-xs">Pause (Sek.)</Label><Input id={`rest-${item.id}`} type="number" min={0} max={600} value={item.restSeconds} onChange={event => changeItem(item.id, { restSeconds: Math.min(600, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1" /></div>
        </div>
        <div className="mt-3 flex items-center gap-2"><Button size="icon" variant="outline" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Nach oben: ${exercise.title}`}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="outline" disabled={index === session.exercises.length - 1} onClick={() => move(index, 1)} aria-label={`Nach unten: ${exercise.title}`}><ArrowDown className="h-4 w-4" /></Button>{!isNew && <Button asChild variant="ghost" className="ml-auto"><Link to={`/training/library/${exercise.area}?session=${id}&item=${item.id}`}>Austauschen</Link></Button>}</div>
      </KwsSurface></li>; })}
    </ol>
    {isNew && <div className="flex flex-col gap-3 sm:flex-row"><Button asChild variant="outline"><Link to="/training/library/strength"><Plus className="mr-2 h-4 w-4" />Kraftübung hinzufügen</Link></Button><Button asChild variant="outline"><Link to="/training/library/boulder"><Plus className="mr-2 h-4 w-4" />Boulderübung hinzufügen</Link></Button><Button className="sm:ml-auto" disabled={!session.exercises.length || !session.title.trim()} onClick={() => { const saved = saveDraft(); if (saved) navigate(`/training/sessions/${saved}`); else setMessage('Wähle Übungen aus und gib deiner Einheit einen Namen.'); }}>Einheit übernehmen</Button></div>}
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">Nur in dieser Vorschau verfügbar. Beim Neuladen werden eigene Einheiten und Änderungen zurückgesetzt.</p>
  </div>;
}
