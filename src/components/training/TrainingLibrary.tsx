import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Activity, Check, ChevronRight, Dumbbell, Mountain, PersonStanding, Plus, Search, SlidersHorizontal, StretchHorizontal, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KwsSurface, kwsPopoverClassName } from '@/components/ui/kws-surface';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import TrainingExerciseArt from './TrainingExerciseArt';
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
  const navigate = useNavigate();
  const { favorites, toggleFavorite, draft, addToDraft, addToSession, replaceExercise, sessions } = useTraining();
  const searchId = useId();
  const resultsId = useId();
  const filtersId = useId();
  const mobile = useIsMobile();
  const [visibleCount, setVisibleCount] = useState(5);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftTopic, setDraftTopic] = useState('all');
  const [draftEquipment, setDraftEquipment] = useState('all');
  const [resetSearchOnApply, setResetSearchOnApply] = useState(false);
  const [notice, setNotice] = useState('');
  const area = validAreas.includes(areaParam as TrainingArea) ? areaParam as TrainingArea : undefined;
  const areaInfo = TRAINING_AREAS.find(item => item.id === area);
  const query = searchParams.get('q') ?? '';
  const topic = searchParams.get('topic') ?? 'all';
  const equipment = searchParams.get('equipment') ?? 'all';
  const sessionId = searchParams.get('session');
  const itemId = searchParams.get('item');
  const appendId = searchParams.get('append');
  const appendSession = appendId ? sessions.find(session => session.id === appendId) : undefined;
  const replacementRequested = Boolean(sessionId || itemId);
  const replacementValid = Boolean(sessionId && itemId && sessions.some(session => session.id === sessionId && session.exercises.some(item => item.id === itemId)));

  const baseExercises = useMemo(() => TRAINING_EXERCISES.filter(exercise => (
    favoritesOnly ? favorites.includes(exercise.id) : exercise.area === area
  )), [area, favorites, favoritesOnly]);
  const topics = useMemo(() => [...new Set(baseExercises.map(exercise => exercise.topic))].sort((a, b) => Number(['Brust', 'Fußtechnik'].includes(b)) - Number(['Brust', 'Fußtechnik'].includes(a)) || a.localeCompare(b, 'de')), [baseExercises]);
  const equipmentOptions = useMemo(() => [...new Set(baseExercises.map(exercise => exercise.equipment))].sort((a, b) => a.localeCompare(b, 'de')), [baseExercises]);
  const inferredTopic = topics.find(value => normalize(query).trim().includes(normalize(value))) ?? (topics.includes('Fußtechnik') && /\b(fuss|fusse)\b/.test(normalize(query)) ? 'Fußtechnik' : undefined);
  const activeTopic = topic !== 'all' ? topic : inferredTopic ?? 'all';
  const results = useMemo(() => {
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    return baseExercises.filter(exercise => {
      const text = normalize([exercise.title, exercise.topic, exercise.goal, exercise.equipment, ...exercise.keywords].join(' '));
      return (topic === 'all' || exercise.topic === topic)
        && (area === 'rehab' || equipment === 'all' || exercise.equipment === equipment)
        && terms.every(term => text.includes(term));
    }).sort((a, b) => matchScore(b, terms) - matchScore(a, terms));
  }, [area, baseExercises, equipment, query, topic]);

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
    ['q', 'topic', 'equipment', 'session', 'item', 'append'].forEach(key => {
      const value = searchParams.get(key);
      if (value) replacement.set(key, value);
    });
    if (favoritesOnly) replacement.set('from', 'favorites');
    const suffix = replacement.toString();
    return `/training/exercises/${encodeURIComponent(id)}${suffix ? `?${suffix}` : ''}`;
  };
  const hasFilters = Boolean(query || topic !== 'all' || equipment !== 'all');
  const activeFilterCount = Number(topic !== 'all') + Number(area !== 'rehab' && equipment !== 'all');
  const openFilters = (open: boolean) => {
    if (open) { setDraftTopic(topic); setDraftEquipment(equipment); setResetSearchOnApply(false); }
    setFiltersOpen(open);
  };
  const applyFilters = () => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (resetSearchOnApply) next.delete('q');
      if (draftTopic === 'all') next.delete('topic'); else next.set('topic', draftTopic);
      if (area === 'rehab' || draftEquipment === 'all') next.delete('equipment'); else next.set('equipment', draftEquipment);
      return next;
    }, { replace: true });
    setFiltersOpen(false);
  };
  const chooseTopic = (value: string) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (value === 'all') next.delete('topic'); else next.set('topic', value);
      if (inferredTopic) next.delete('q');
      return next;
    }, { replace: true });
  };
  const filterControls = <>
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div>{mobile ? <DialogTitle>{area === 'rehab' ? 'Körperregion filtern' : 'Übungen filtern'}</DialogTitle> : <h2 id={filtersId} className="font-sans text-base font-semibold">{area === 'rehab' ? 'Körperregion filtern' : 'Übungen filtern'}</h2>}{mobile ? <DialogDescription className="mt-1 text-xs">{area === 'rehab' ? 'Wähle einen vorbereiteten Bereich.' : 'Wähle Thema und verfügbares Equipment.'}</DialogDescription> : <p className="mt-1 text-xs text-muted-foreground">{area === 'rehab' ? 'Wähle einen vorbereiteten Bereich.' : 'Wähle Thema und verfügbares Equipment.'}</p>}</div>
      <Button type="button" variant="ghost" size="icon" aria-label="Filter schließen" onClick={() => setFiltersOpen(false)}><X aria-hidden="true" /></Button>
    </div>
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4">
      <fieldset className="space-y-3"><legend className="text-sm font-semibold">{area === 'rehab' ? 'Körperregion' : 'Thema'}</legend><div className="flex flex-wrap gap-2">{['all', ...topics].map(value => <Button key={value} type="button" variant={draftTopic === value ? 'default' : 'secondary'} aria-pressed={draftTopic === value} className="px-3" onClick={() => setDraftTopic(value)}>{value === 'all' ? 'Alle' : value}</Button>)}</div></fieldset>
      {area !== 'rehab' && <fieldset className="space-y-3"><legend className="text-sm font-semibold">Equipment</legend><div className="grid grid-cols-2 gap-2">{['all', ...equipmentOptions].map(value => { const Icon = value === 'Kurzhanteln' ? Dumbbell : value === 'Boulderwand' ? Mountain : value === 'Widerstandsband' ? StretchHorizontal : PersonStanding; return <Button key={value} type="button" variant={draftEquipment === value ? 'default' : 'secondary'} aria-pressed={draftEquipment === value} className="h-auto min-h-11 justify-start whitespace-normal px-3 py-3 text-left text-xs" onClick={() => setDraftEquipment(value)}><Icon aria-hidden="true" /><span className="min-w-0 flex-1">{value === 'all' ? 'Alle Geräte' : value}</span>{draftEquipment === value && <Check aria-hidden="true" />}</Button>; })}</div></fieldset>}
    </div>
    <div className="flex shrink-0 gap-2 border-t border-border p-4"><Button type="button" variant="secondary" className="flex-1" onClick={() => { setDraftTopic('all'); setDraftEquipment('all'); setResetSearchOnApply(true); }}>Zurücksetzen</Button><Button type="button" className="flex-1" onClick={applyFilters}>Übernehmen</Button></div>
  </>;
  const filterTrigger = <Button type="button" variant={activeFilterCount ? 'secondary' : 'outline'} className="shrink-0 px-3" aria-label={activeFilterCount ? `Filter, ${activeFilterCount} aktiv` : 'Filter'}><SlidersHorizontal aria-hidden="true" /><span>Filter</span>{activeFilterCount > 0 && <span className="rounded-kws-badge bg-foreground px-1.5 text-xs text-background">{activeFilterCount}</span>}</Button>;
  const addExercise = (exerciseId: string) => {
    const selectedItems = appendId ? appendSession?.exercises : draft.exercises;
    if (!replacementRequested && selectedItems?.some(item => item.exerciseId === exerciseId)) return;
    if (replacementRequested) {
      if (!replacementValid || !sessionId || !itemId) return;
      replaceExercise(sessionId, itemId, exerciseId);
      navigate(`/training/sessions/${encodeURIComponent(sessionId)}`);
    } else if (appendId) {
      if (appendSession) { addToSession(appendId, exerciseId); setNotice(`${TRAINING_EXERCISES.find(item => item.id === exerciseId)?.title}: zu ${appendSession.title} hinzugefügt.`); }
    } else { addToDraft(exerciseId); setNotice(`${TRAINING_EXERCISES.find(item => item.id === exerciseId)?.title}: zur eigenen Einheit hinzugefügt.`); }
  };
  const changeArea = (nextArea: TrainingArea) => {
    const params = new URLSearchParams();
    ['append', 'session', 'item'].forEach(key => {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    });
    navigate(`/training/library/${nextArea}${params.size ? `?${params.toString()}` : ''}`);
  };

  if (!favoritesOnly && !areaInfo) {
    return <KwsSurface className="space-y-3 p-4">
      <h2 className="font-sans text-base font-semibold">Bibliothek nicht gefunden</h2>
      <p className="text-sm text-muted-foreground">Wähle eine der Trainingsbibliotheken.</p>
      <Button asChild><Link to="/training">Zum Training</Link></Button>
    </KwsSurface>;
  }

  return (
    <div className="space-y-3" data-swipe-ignore>
      <KwsSegmentedControl<TrainingArea | 'favorites'> value={favoritesOnly ? 'favorites' : area!} options={[{ value: 'strength', label: 'Kraft' }, { value: 'boulder', label: 'Bouldern' }, { value: 'rehab', label: 'Reha' }]} onValueChange={value => { if (value !== 'favorites') changeArea(value); }} ariaLabel="Trainingsbereich" />
      {favoritesOnly && <p className="text-xs text-muted-foreground">Deine gemerkten Übungen · nach Thema oder Name suchen</p>}

      <div className="space-y-3">
        <div className="flex gap-2">
          <label htmlFor={searchId} className="sr-only">{area === 'rehab' ? 'Körperregion suchen' : 'Übung suchen'}</label>
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id={searchId} type="search" value={query} onChange={event => updateFilter('q', event.target.value)} placeholder={area === 'rehab' ? 'Region suchen' : 'Übung suchen'} className="pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none" />
            {query && <Button type="button" variant="ghost" size="icon" aria-label="Suche leeren" className="absolute right-0 top-0" onClick={() => updateFilter('q', '')}><X aria-hidden="true" /></Button>}
          </div>
          {mobile ? <Dialog open={filtersOpen} onOpenChange={openFilters}><DialogTrigger asChild>{filterTrigger}</DialogTrigger><DialogContent scrollLayout="contained" className="flex flex-col overflow-hidden bg-card p-0" data-swipe-ignore>{filterControls}</DialogContent></Dialog> : <Popover open={filtersOpen} onOpenChange={openFilters}><PopoverTrigger asChild>{filterTrigger}</PopoverTrigger><PopoverContent align="end" collisionPadding={16} aria-labelledby={filtersId} className={cn(kwsPopoverClassName, 'z-[120] flex max-h-[var(--radix-popover-content-available-height)] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0')} data-swipe-ignore>{filterControls}</PopoverContent></Popover>}
        </div>
      </div>
      {area !== 'rehab' && <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Thema schnell wählen">
        {['all', ...topics].map(value => <Button key={value} type="button" variant={activeTopic === value ? 'default' : 'secondary'} className="shrink-0 px-3" aria-pressed={activeTopic === value} onClick={() => chooseTopic(value)}>{value === 'all' ? 'Alle' : value}</Button>)}
      </div>}
      {hasFilters && <div className="flex flex-wrap gap-2" aria-label="Aktive Suchfilter">{query && <Button type="button" variant="ghost" className="max-w-full gap-2 bg-secondary px-3 text-xs" aria-label={`Suche ${query} entfernen`} onClick={() => updateFilter('q', '')}><span className="truncate">Suche: {query}</span><X aria-hidden="true" /></Button>}{topic !== 'all' && <Button type="button" variant="ghost" className="gap-2 bg-secondary px-3 text-xs" aria-label={`Thema ${topic} entfernen`} onClick={() => updateFilter('topic', 'all')}>{topic}<X aria-hidden="true" /></Button>}{area !== 'rehab' && equipment !== 'all' && <Button type="button" variant="ghost" className="gap-2 bg-secondary px-3 text-xs" aria-label={`Equipment ${equipment} entfernen`} onClick={() => updateFilter('equipment', 'all')}>{equipment}<X aria-hidden="true" /></Button>}</div>}
      {!favoritesOnly && area === 'rehab' && <p className="text-xs leading-relaxed text-muted-foreground">Orientierung für Beobachtungen und das Gespräch mit einer Fachperson. Kein individueller Therapieplan.</p>}
      {replacementRequested && <p role={replacementValid ? 'status' : 'alert'} className={cn('text-xs leading-relaxed', replacementValid ? 'text-muted-foreground' : 'text-destructive')}>{replacementValid ? 'Wähle eine Übung als Ersatz für deine Einheit.' : 'Die ursprüngliche Übung ist nicht mehr verfügbar. Öffne deine Einheit erneut.'}</p>}
      {!replacementRequested && appendId && <div className="flex items-center justify-between gap-3"><p role={appendSession ? 'status' : 'alert'} className={cn('min-w-0 text-xs leading-relaxed', appendSession ? 'text-muted-foreground' : 'text-destructive')}>{appendSession ? `Ergänzen für „${appendSession.title}“` : 'Diese Einheit ist nicht mehr verfügbar. Öffne deine Einheiten erneut.'}</p>{appendSession && <Button asChild variant="secondary" className="shrink-0 px-3"><Link to={`/training/sessions/${encodeURIComponent(appendId)}`}>Einheit ansehen</Link></Button>}</div>}
      <p role="status" className="text-xs text-muted-foreground">{Math.min(visibleCount, results.length)} von {results.length} {area === 'rehab' ? results.length === 1 ? 'Region' : 'Regionen' : results.length === 1 ? 'Übung' : 'Übungen'}{area !== 'rehab' && equipment !== 'all' ? ` · ${equipment}` : ''}</p>

      {results.length ? (
        <ul id={resultsId} className={cn('grid gap-3', area === 'rehab' ? 'grid-cols-2' : 'lg:grid-cols-2')} aria-label={favoritesOnly ? 'Gemerkte Übungen' : area === 'rehab' ? 'Vorbereitete Körperregionen' : 'Übungen'}>
          {results.slice(0, visibleCount).map(exercise => {
            const favorite = favorites.includes(exercise.id);
            const rehab = exercise.area === 'rehab';
            const title = rehab ? exercise.topic : exercise.title;
            const selected = !replacementRequested && (appendId ? appendSession?.exercises : draft.exercises)?.some(item => item.exerciseId === exercise.id);
            if (rehab) return <li key={exercise.id}><KwsSurface className="h-full p-3"><div className="flex items-center justify-between gap-2"><Activity aria-hidden="true" className="h-5 w-5 text-primary-ink" /><Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={`${title}: ${favorite ? 'aus Favoriten entfernen' : 'als Favorit merken'}`} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button></div><Link to={exerciseTarget(exercise.id)} className="group mt-1 block min-h-11 rounded-kws-control outline-none focus-visible:ring-2 focus-visible:ring-ring"><h3 className="text-sm font-semibold leading-snug group-hover:text-primary-ink">{title}</h3><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Orientierung</span><ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" /></div></Link></KwsSurface></li>;
            return <li key={exercise.id}>
              <KwsSurface className={cn('h-full p-3 transition-shadow', selected && 'ring-1 ring-primary-strong')}>
                <div className="flex items-start gap-3">
                  <Link to={exerciseTarget(exercise.id)} className="shrink-0 rounded-kws-control outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${title}: Anleitung öffnen`}><TrainingExerciseArt exerciseId={exercise.id} title={title} className="w-24 sm:w-28" /></Link>
                  <div className="min-w-0 flex-1"><Link to={exerciseTarget(exercise.id)} className="group block min-h-11 rounded-kws-control py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-xs text-muted-foreground">{exercise.topic}</p><h3 className="mt-1 text-sm font-semibold leading-snug group-hover:text-primary-ink">{title}</h3></Link><p className="mt-1 text-xs text-muted-foreground">{exercise.equipment} · {exercise.minutes} Min.</p></div>
                  <Button type="button" variant="ghost" size="icon" className={cn('shrink-0', favorite && 'text-primary-ink')} aria-pressed={favorite} aria-label={`${title}: ${favorite ? 'aus Favoriten entfernen' : 'als Favorit merken'}`} onClick={() => toggleFavorite(exercise.id)}><Star aria-hidden="true" className={cn(favorite && 'fill-current')} /></Button>
                </div>
                <>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">{exercise.goal}</p>
                    <Button type="button" variant="secondary" className={cn('shrink-0 px-3', selected && 'text-primary-ink')} aria-disabled={selected || undefined} aria-label={`${title}: ${selected ? 'in eigener Einheit' : replacementRequested ? 'als Ersatz wählen' : 'zur eigenen Einheit hinzufügen'}`} disabled={(replacementRequested && !replacementValid) || (!replacementRequested && Boolean(appendId) && !appendSession)} onClick={() => addExercise(exercise.id)}>{selected ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{selected ? 'Ausgewählt' : replacementRequested ? 'Ersetzen' : 'Hinzufügen'}</Button>
                  </div>
                </>
              </KwsSurface>
            </li>;
          })}
        </ul>
      ) : <KwsSurface className="space-y-3 p-5">
        <h3 className="text-sm font-semibold">{favoritesOnly && !baseExercises.length ? 'Noch keine Favoriten' : area === 'rehab' ? 'Keine passende Körperregion' : 'Keine passenden Übungen'}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{favoritesOnly && !baseExercises.length ? 'Merke dir Übungen über das Sternsymbol in einer Bibliothek.' : 'Passe deine Suche an oder setze die Filter zurück.'}</p>
        {hasFilters ? <Button type="button" variant="secondary" onClick={resetFilters}>Filter zurücksetzen</Button> : favoritesOnly ? <Button asChild variant="secondary"><Link to="/training">Bibliotheken öffnen</Link></Button> : null}
      </KwsSurface>}

      {results.length > visibleCount && <Button type="button" variant="secondary" className="w-full sm:w-auto" aria-controls={resultsId} onClick={() => setVisibleCount(count => count + 5)}>Weitere {Math.min(5, results.length - visibleCount)} anzeigen</Button>}
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}
