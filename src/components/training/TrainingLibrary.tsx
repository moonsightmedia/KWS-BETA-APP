import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRAINING_AREAS, TRAINING_EXERCISES } from '@/features/training/data';
import { useTraining } from '@/features/training/TrainingContext';
import type { TrainingArea, TrainingExercise } from '@/features/training/types';
import { cn } from '@/lib/utils';

interface TrainingLibraryProps {
  favoritesOnly?: boolean;
}

const normalize = (value: string) => value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
const validAreas: TrainingArea[] = ['strength', 'boulder', 'rehab'];

function matchScore(exercise: TrainingExercise, terms: string[]) {
  const title = normalize(exercise.title);
  const topic = normalize(exercise.topic);
  const keywords = normalize(exercise.keywords.join(' '));
  return terms.reduce((score, term) => score + (title.startsWith(term) ? 6 : title.includes(term) ? 4 : topic.includes(term) ? 3 : keywords.includes(term) ? 2 : 1), 0);
}

export default function TrainingLibrary({ favoritesOnly = false }: TrainingLibraryProps) {
  const { area: areaParam } = useParams<{ area: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites, toggleFavorite } = useTraining();
  const searchId = useId();
  const topicId = useId();
  const equipmentId = useId();
  const resultsId = useId();
  const [visibleCount, setVisibleCount] = useState(5);
  const area = validAreas.includes(areaParam as TrainingArea) ? areaParam as TrainingArea : undefined;
  const areaInfo = TRAINING_AREAS.find(item => item.id === area);
  const query = searchParams.get('q') ?? '';
  const topic = searchParams.get('topic') ?? 'all';
  const equipment = searchParams.get('equipment') ?? 'all';

  const baseExercises = useMemo(() => TRAINING_EXERCISES.filter(exercise => (
    favoritesOnly ? favorites.includes(exercise.id) : exercise.area === area
  )), [area, favorites, favoritesOnly]);
  const topics = useMemo(() => [...new Set(baseExercises.map(exercise => exercise.topic))].sort((a, b) => a.localeCompare(b, 'de')), [baseExercises]);
  const equipmentOptions = useMemo(() => [...new Set(baseExercises.map(exercise => exercise.equipment))].sort((a, b) => a.localeCompare(b, 'de')), [baseExercises]);
  const results = useMemo(() => {
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    return baseExercises.filter(exercise => {
      const text = normalize([exercise.title, exercise.topic, exercise.goal, exercise.equipment, ...exercise.keywords].join(' '));
      return (topic === 'all' || exercise.topic === topic)
        && (equipment === 'all' || exercise.equipment === equipment)
        && terms.every(term => text.includes(term));
    }).sort((a, b) => matchScore(b, terms) - matchScore(a, terms));
  }, [baseExercises, equipment, query, topic]);

  useEffect(() => setVisibleCount(5), [area, favoritesOnly, query, topic, equipment]);

  const updateFilter = (key: string, value: string) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };
  const resetFilters = () => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      ['q', 'topic', 'equipment'].forEach(key => next.delete(key));
      return next;
    }, { replace: true });
  };
  const exerciseTarget = (id: string) => {
    const replacement = new URLSearchParams();
    ['q', 'topic', 'equipment', 'session', 'item'].forEach(key => {
      const value = searchParams.get(key);
      if (value) replacement.set(key, value);
    });
    const suffix = replacement.toString();
    return `/training/exercises/${encodeURIComponent(id)}${suffix ? `?${suffix}` : ''}`;
  };
  const hasFilters = Boolean(query || topic !== 'all' || equipment !== 'all');

  if (!favoritesOnly && !areaInfo) {
    return <KwsSurface className="space-y-3 p-4">
      <h2 className="font-sans text-base font-semibold">Bibliothek nicht gefunden</h2>
      <p className="text-sm text-muted-foreground">Wähle eine der Trainingsbibliotheken.</p>
      <Button asChild><Link to="/training">Zum Training</Link></Button>
    </KwsSurface>;
  }

  return (
    <div className="space-y-5" data-swipe-ignore>
      <div className="space-y-1">
        <h2 className="font-sans text-base font-semibold">{favoritesOnly ? 'Deine Favoriten' : areaInfo?.title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{favoritesOnly ? 'Deine gemerkten Übungen an einem Ort.' : areaInfo?.description}</p>
      </div>

      {!favoritesOnly && area === 'rehab' && (
        <p className="rounded-kws-control bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Dieser Bereich ist vorbereitet. Individuelle Reha-Übungen und Dosierungen gehören in die fachliche Betreuung.
        </p>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={searchId} className="text-xs font-medium">Übung suchen</label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id={searchId} type="search" value={query} onChange={event => updateFilter('q', event.target.value)} placeholder="Name oder Trainingsziel" className="pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none" />
            {query && <Button type="button" variant="ghost" size="icon" aria-label="Suche leeren" className="absolute right-0 top-0" onClick={() => updateFilter('q', '')}><X aria-hidden="true" /></Button>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={topicId} className="text-xs font-medium">Thema</label>
            <Select value={topic} onValueChange={value => updateFilter('topic', value)}>
              <SelectTrigger id={topicId}><SelectValue>{topic === 'all' ? 'Alle Themen' : topic}</SelectValue></SelectTrigger>
              <SelectContent><SelectItem value="all">Alle Themen</SelectItem>{topics.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={equipmentId} className="text-xs font-medium">Equipment</label>
            <Select value={equipment} onValueChange={value => updateFilter('equipment', value)}>
              <SelectTrigger id={equipmentId}><SelectValue>{equipment === 'all' ? 'Alle Geräte' : equipment}</SelectValue></SelectTrigger>
              <SelectContent><SelectItem value="all">Alle Geräte</SelectItem>{equipmentOptions.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-3">
        <p role="status" className="text-xs text-muted-foreground">{Math.min(visibleCount, results.length)} von {results.length} {results.length === 1 ? 'Übung' : 'Übungen'}</p>
        {hasFilters && <Button type="button" variant="ghost" className="px-2" onClick={resetFilters}>Zurücksetzen</Button>}
      </div>

      {results.length ? <KwsSurface className="overflow-hidden">
        <ul id={resultsId} className="divide-y divide-border/60" aria-label={favoritesOnly ? 'Gemerkte Übungen' : 'Übungen'}>
          {results.slice(0, visibleCount).map(exercise => {
            const favorite = favorites.includes(exercise.id);
            return <li key={exercise.id} className="flex items-center gap-1 pr-2 sm:pr-3">
              <Link to={exerciseTarget(exercise.id)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-secondary/50 focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-sm font-semibold leading-snug">{exercise.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{exercise.goal}</p>
                  <p className="pt-1 text-xs text-muted-foreground">{exercise.topic} · {exercise.equipment}{exercise.area !== 'rehab' && exercise.minutes > 0 ? ` · ${exercise.minutes} Min.` : ''}</p>
                </div>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={`${exercise.title}: ${favorite ? 'aus Favoriten entfernen' : 'als Favorit merken'}`} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button>
            </li>;
          })}
        </ul>
      </KwsSurface> : <KwsSurface className="space-y-3 p-5">
        <h3 className="text-sm font-semibold">{favoritesOnly && !baseExercises.length ? 'Noch keine Favoriten' : 'Keine passenden Übungen'}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{favoritesOnly && !baseExercises.length ? 'Merke dir Übungen über das Sternsymbol in einer Bibliothek.' : 'Passe deine Suche an oder setze die Filter zurück.'}</p>
        {hasFilters ? <Button type="button" variant="secondary" onClick={resetFilters}>Filter zurücksetzen</Button> : favoritesOnly ? <Button asChild variant="secondary"><Link to="/training">Bibliotheken öffnen</Link></Button> : null}
      </KwsSurface>}

      {results.length > visibleCount && <Button type="button" variant="secondary" className="w-full sm:w-auto" aria-controls={resultsId} onClick={() => setVisibleCount(count => count + 5)}>Weitere {Math.min(5, results.length - visibleCount)} anzeigen</Button>}
    </div>
  );
}
