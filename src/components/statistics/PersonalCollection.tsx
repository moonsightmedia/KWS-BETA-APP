import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Search, Target, X } from 'lucide-react';
import { toast } from 'sonner';
import { BouldersIcon } from '@/lib/appIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KwsSurface } from '@/components/ui/kws-surface';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { useUpdateBoulderMarkers } from '@/hooks/useBoulderCommunity';
import { gradeKey, type TrackedBoulderItem } from '@/lib/personalProgress';

type Collection = 'projects' | 'saved';
export function PersonalCollection({ entries, successIds, collection, onCollectionChange }: {
  entries: TrackedBoulderItem[]; successIds: Set<string>; collection: Collection; onCollectionChange: (value: Collection) => void;
}) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('hanging');
  const [showDone, setShowDone] = useState(false);
  const [shown, setShown] = useState(20);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const update = useUpdateBoulderMarkers();
  const field = collection === 'projects' ? 'is_project' : 'is_favorite';
  const projectCount = entries.filter(e => e.tick.is_project && !successIds.has(e.tick.boulder_id)).length;
  const savedCount = entries.filter(e => e.tick.is_favorite).length;
  const rows = useMemo(() => entries.filter(({ tick, boulder }) => tick[field]
    && (collection !== 'projects' || showDone || !successIds.has(tick.boulder_id))
    && (scope !== 'hanging' || boulder?.status === 'haengt')
    && (!search.trim() || boulder?.name.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de'))))
    .sort((a, b) => Number(successIds.has(a.tick.boulder_id)) - Number(successIds.has(b.tick.boulder_id)) || b.tick.updated_at.localeCompare(a.tick.updated_at)),
  [entries, field, collection, showDone, successIds, scope, search]);
  const remove = async (entry: TrackedBoulderItem) => {
    if (pendingId) return;
    setPendingId(entry.tick.id); setError('');
    try {
      await update.mutateAsync({ tickId: entry.tick.id, field, value: false });
      toast.success('Markierung entfernt. Deine Klettereinträge bleiben erhalten.');
    } catch { setError('Die Markierung konnte nicht entfernt werden. Bitte versuche es erneut.'); }
    finally { setPendingId(null); }
  };
  return <div className="space-y-4">
    <div>
      <KwsSegmentedControl className="max-w-lg" ariaLabel="Sammlung" value={collection} onValueChange={onCollectionChange}
        options={[{ value: 'projects', label: `Projekte · ${projectCount}` }, { value: 'saved', label: `Gespeichert · ${savedCount}` }]} />
      <p className="mt-3 text-sm text-muted-foreground">{collection === 'projects' ? 'Deine offenen Ziele. Geschaffte Projekte bleiben unter „Erledigte“ erhalten.' : 'Boulder, die du dir für später gemerkt hast – unabhängig von deinem Fortschritt.'}</p>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input aria-label="In meinen Bouldern suchen" placeholder="Boulder suchen" className="pl-10" value={search} onChange={e => { setSearch(e.target.value); setShown(20); }} />
      </div>
      <KwsSegmentedControl className="shrink-0 sm:w-56 [&_button]:whitespace-nowrap" ariaLabel="Wandstatus" value={scope} onValueChange={value => { setScope(value); setShown(20); }} options={[{ value: 'hanging', label: 'An der Wand' }, { value: 'all', label: 'Alle' }]} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p role="status" className="text-muted-foreground">{rows.length} {rows.length === 1 ? 'Boulder' : 'Boulder'}{scope === 'hanging' ? ' an der Wand' : ''}</p>
      {collection === 'projects' ? <Button variant="ghost" size="sm" aria-pressed={showDone} onClick={() => { setShowDone(!showDone); setShown(20); }}>{showDone ? 'Erledigte ausblenden' : 'Erledigte einblenden'}</Button> : null}
    </div>
    {error ? <p role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
    {!rows.length ? <KwsSurface className="space-y-3 p-6 text-center">
      {collection === 'projects' ? <Target className="mx-auto h-7 w-7 text-muted-foreground" /> : <Bookmark className="mx-auto h-7 w-7 text-muted-foreground" />}
      <h2 className="font-semibold">Keine passenden Boulder</h2>
      <p className="text-sm text-muted-foreground">Markiere einen Boulder als {collection === 'projects' ? 'Projekt' : 'gespeichert'}. Hier findest du ihn für deine nächste Session wieder.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild><Link to="/boulders">Boulder entdecken</Link></Button>
        <Button variant="secondary" onClick={() => { setSearch(''); setScope('all'); setShowDone(true); setShown(20); }}>Alle Markierungen zeigen</Button>
      </div>
    </KwsSurface> : <div className="grid gap-3 xl:grid-cols-2">
      {rows.slice(0, shown).map(entry => {
        const { boulder, tick } = entry; const done = successIds.has(tick.boulder_id);
        const name = boulder?.name || 'Boulder nicht mehr verfügbar';
        return <KwsSurface key={tick.id} className="flex items-center gap-3 p-3">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-kws-control bg-secondary">
            <BouldersIcon className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            {boulder?.thumbnail_url ? <img alt="" src={boulder.thumbnail_url} className="absolute inset-0 h-full w-full object-cover" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            {boulder ? <Link to={`/boulders/${boulder.id}`} className="block break-words rounded-kws-control font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{name}</Link> : <p className="font-semibold">{name}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Grad {gradeKey(boulder?.difficulty)} · {boulder?.status === 'haengt' ? 'An der Wand' : boulder ? 'Abgeschraubt' : 'Nicht verfügbar'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs">{done ? <Check className="h-3.5 w-3.5" /> : collection === 'projects' ? <Target className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}{done ? 'Geschafft' : collection === 'projects' ? 'Offenes Projekt' : 'Für später'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" disabled={pendingId !== null} aria-label={`${collection === 'projects' ? 'Projektmarkierung' : 'Speicherung'} entfernen: ${name}`} onClick={() => void remove(entry)}><X aria-hidden="true" /></Button>
        </KwsSurface>;
      })}
    </div>}
    {rows.length > shown ? <Button variant="secondary" className="w-full" onClick={() => setShown(value => value + 20)}>Weitere Boulder anzeigen</Button> : null}
  </div>;
}
