import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Clock3, Dumbbell, Footprints, ListPlus, Plus, Trash2 } from 'lucide-react';
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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  if (!id) {
    const own = sessions.filter(session => !session.id.startsWith('preview-'));
    return <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><p className="max-w-md text-sm leading-relaxed text-muted-foreground">Deine Kombination aus Kraft und Technik.</p><Button asChild className="shrink-0 px-3 text-xs"><Link to="/training/sessions/new"><Plus aria-hidden="true" />Neue Einheit</Link></Button></div>
      {draft.exercises.length > 0 && <Link to="/training/sessions/new" className="flex min-h-20 items-center gap-3 rounded-kws-card bg-foreground p-4 text-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ListPlus className="h-5 w-5 text-primary" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold">Entwurf fortsetzen</span><span className="mt-1 block text-xs text-white/80">{draft.exercises.length} Übungen ausgewählt</span></span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      {own.length ? <div className="grid gap-3 sm:grid-cols-2">{own.map(session => <KwsSurface key={session.id}><Link to={`/training/sessions/${session.id}`} className="flex min-h-28 items-center gap-3 rounded-kws-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-secondary"><ListPlus className="h-5 w-5 text-primary-ink" aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="font-sans text-sm font-semibold">{session.title}</h2><p className="mt-2 text-xs text-muted-foreground">{session.exercises.length} Übungen · ca. {getSessionMinutes(session)} Min.</p></div><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link></KwsSurface>)}</div> : <KwsSurface className="px-5 py-8 text-center"><ListPlus className="mx-auto h-8 w-8 text-primary-ink" aria-hidden="true" /><h2 className="mt-4 font-sans text-base font-semibold">Deine erste eigene Einheit</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Übungen auswählen, Reihenfolge festlegen und den Umfang anpassen.</p><Button asChild className="mt-5"><Link to="/training/sessions/new">Jetzt zusammenstellen<ArrowRight aria-hidden="true" /></Link></Button></KwsSurface>}
    </div>;
  }
  const isNew = id === 'new';
  const session = isNew ? draft : sessions.find(item => item.id === id);
  if (!session) return <KwsSurface className="p-6"><h2 className="font-sans text-base font-semibold">Einheit nicht vorhanden</h2><p className="mt-2 text-sm text-muted-foreground">Beispieldaten bleiben nur während der geöffneten App erhalten.</p><Button asChild className="mt-4"><Link to="/training/sessions">Zu deinen Einheiten</Link></Button></KwsSurface>;
  const setItems = (items: SessionExercise[]) => isNew ? updateDraft(previous => ({ ...previous, exercises: items })) : updateSession(id, { exercises: items });
  const changeItem = (itemId: string, changes: Partial<SessionExercise>) => setItems(session.exercises.map(item => item.id === itemId ? { ...item, ...changes } : item));
  const move = (index: number, direction: number) => { const items = [...session.exercises]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; setItems(items); };
  const strengthCount = session.exercises.filter(item => getExercise(item.exerciseId)?.area === 'strength').length;
  const boulderCount = session.exercises.length - strengthCount;
  const suffix = isNew ? '' : `?append=${encodeURIComponent(id)}`;
  const detailContext = `returnSession=${encodeURIComponent(id)}${isNew ? '' : `&append=${encodeURIComponent(id)}`}`;
  return <div className="space-y-5">
    <section className="space-y-3">
      {isNew ? <div><Label htmlFor="session-title" className="text-xs">Name deiner Einheit</Label><Input id="session-title" maxLength={80} value={session.title} onChange={event => updateDraft(previous => ({ ...previous, title: event.target.value }))} className="mt-2 bg-card" /></div> : <h2 className="font-sans text-lg font-semibold">{session.title}</h2>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" />ca. {getSessionMinutes(session)} Min. inkl. Pausen</span><span>{strengthCount} Kraft · {boulderCount} Technik</span>{!isNew && <span className="inline-flex items-center gap-1 text-primary-ink"><Check className="h-4 w-4" aria-hidden="true" />In deiner Sammlung</span>}</div>
      {!isNew && session.id.startsWith('preview-') && <p className="text-xs leading-relaxed text-muted-foreground">{session.minutes} Min. Terminbudget einschließlich Vorbereitung und freiem Bouldern. Übungsumfang als Beispiel.</p>}
    </section>
    {!session.exercises.length && <KwsSurface className="p-5"><h2 className="font-sans text-sm font-semibold">Noch keine Übungen ausgewählt</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Beginne mit einer Kraft- oder Boulderübung. Beide Bereiche lassen sich in einer Einheit kombinieren.</p></KwsSurface>}
    <ol className="space-y-3" aria-label="Übungen deiner Einheit">
      {session.exercises.map((item, index) => {
        const exercise = getExercise(item.exerciseId); if (!exercise) return null;
        const editing = editingItem === item.id;
        const repetitions = item.repetitions.trim() ? `${item.repetitions} ${exercise.area === 'boulder' ? 'Durchgänge' : 'Wdh.'}` : 'Wiederholungen offen';
        const Icon = exercise.area === 'boulder' ? Footprints : Dumbbell;
        return <li key={item.id}><KwsSurface className="overflow-hidden">
          <div className="flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-secondary text-sm font-semibold">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{exercise.topic}</p><Link to={`/training/exercises/${exercise.id}?${detailContext}`} className="inline-flex min-h-11 items-center rounded-kws-control text-sm font-semibold leading-snug underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{exercise.title}</Link><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.sets} Sätze · {repetitions} · {item.restSeconds} Sek. Pause</p></div><Button size="icon" variant="ghost" aria-label={`Entfernen: ${exercise.title}`} onClick={() => setItems(session.exercises.filter(value => value.id !== item.id))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div>
          <div className="flex items-center gap-1 border-t border-border/60 px-3"><Button variant="ghost" className="flex-1 justify-start px-1 text-xs" aria-expanded={editing} aria-controls={`settings-${item.id}`} onClick={() => setEditingItem(editing ? null : item.id)}>Umfang anpassen<ChevronDown className={editing ? 'rotate-180' : ''} aria-hidden="true" /></Button><Button size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Nach oben: ${exercise.title}`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></Button><Button size="icon" variant="ghost" disabled={index === session.exercises.length - 1} onClick={() => move(index, 1)} aria-label={`Nach unten: ${exercise.title}`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></Button></div>
          {editing && <div id={`settings-${item.id}`} className="space-y-3 border-t border-border/60 bg-secondary/30 p-4"><div className="grid grid-cols-3 gap-2">
            <div><Label htmlFor={`sets-${item.id}`} className="text-xs">Sätze</Label><Input id={`sets-${item.id}`} type="number" min={1} max={8} value={item.sets} onChange={event => changeItem(item.id, { sets: Math.min(8, Math.max(1, Number(event.target.value) || 1)) })} className="mt-1 bg-card" /></div>
            <div><Label htmlFor={`reps-${item.id}`} className="text-xs">{exercise.area === 'boulder' ? 'Durchgänge' : 'Wdh.'}</Label><Input id={`reps-${item.id}`} maxLength={30} value={item.repetitions} aria-describedby={!item.repetitions.trim() ? `reps-help-${item.id}` : undefined} onChange={event => changeItem(item.id, { repetitions: event.target.value })} className="mt-1 bg-card" /></div>
            <div><Label htmlFor={`rest-${item.id}`} className="text-xs">Pause (Sek.)</Label><Input id={`rest-${item.id}`} type="number" min={0} max={600} value={item.restSeconds} onChange={event => changeItem(item.id, { restSeconds: Math.min(600, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 bg-card" /></div>
          </div>{!item.repetitions.trim() && <p id={`reps-help-${item.id}`} className="text-xs leading-relaxed text-muted-foreground">Wiederholungen offen. Ergänze den Umfang dieser Übung.</p>}{!isNew && <Button asChild variant="outline" className="text-xs"><Link to={`/training/library/${exercise.area}?session=${id}&item=${item.id}`}>Austauschen</Link></Button>}</div>}
        </KwsSurface></li>;
      })}
    </ol>
    <div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" className="h-auto min-h-14 whitespace-normal px-3 py-3 text-xs"><Link to={`/training/library/strength${suffix}`}><Plus aria-hidden="true" />Kraftübung hinzufügen</Link></Button><Button asChild variant="outline" className="h-auto min-h-14 whitespace-normal px-3 py-3 text-xs"><Link to={`/training/library/boulder${suffix}`}><Plus aria-hidden="true" />Boulderübung hinzufügen</Link></Button></div>
    {isNew && <Button className="w-full sm:w-auto" disabled={!session.exercises.length || !session.title.trim() || session.exercises.some(item => !item.repetitions.trim())} onClick={() => { const saved = saveDraft(); if (saved) { setEditingItem(null); navigate(`/training/sessions/${saved}`); } else setMessage('Wähle Übungen aus und gib deiner Einheit einen Namen.'); }}>Einheit übernehmen<Check aria-hidden="true" /></Button>}
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">In dieser Vorschau bleiben Änderungen bis zum Neuladen erhalten.</p>
  </div>;
}
