import { useId, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronRight, Loader2, Palette, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { kwsSurfaceClassName } from '@/components/ui/kws-surface';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminColors, useAddDefaultColors, type ColorRow } from '@/hooks/useColors';
import { cn } from '@/lib/utils';
import { ColorEditor } from './ColorEditor';
import { ColorSwatch } from './ColorValueField';
import { normalizeHex } from './colorForm';
import { ColorOrderDialog } from './ColorOrderDialog';

export const ColorManagement = () => {
  const id = useId();
  const catalog = useAdminColors();
  const defaults = useAddDefaultColors();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editor, setEditor] = useState<ColorRow | 'new' | null>(null);
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
  const newColorButton = useRef<HTMLButtonElement | null>(null);
  const defaultsButton = useRef<HTMLButtonElement | null>(null);
  const orderButton = useRef<HTMLButtonElement | null>(null);
  const [ordering, setOrdering] = useState(false);
  const openEditor = (value: ColorRow | 'new', trigger: HTMLButtonElement) => {
    editorTrigger.current = trigger;
    setEditor(value);
  };
  const restoreEditorFocus = () => requestAnimationFrame(() => {
    const trigger = editorTrigger.current?.isConnected ? editorTrigger.current : newColorButton.current;
    trigger?.focus();
  });
  const [showDefaults, setShowDefaults] = useState(false);
  const [defaultError, setDefaultError] = useState('');
  const colors = catalog.data ?? [];
  const activeCount = colors.filter(color => color.is_active).length;
  const filtered = useMemo(() => (catalog.data ?? []).filter(color => {
    const term = query.trim().toLocaleLowerCase('de');
    const matchesQuery = [color.name, color.hex, color.secondary_hex ?? ''].some(value => value.toLocaleLowerCase('de').includes(term));
    return matchesQuery && (filter === 'all' || color.is_active === (filter === 'active'));
  }), [catalog.data, query, filter]);
  const addDefaults = async () => {
    if (defaults.isPending) return;
    setDefaultError('');
    try { await defaults.mutateAsync(); setShowDefaults(false); }
    catch { setDefaultError('Die Standardfarben konnten nicht ergänzt werden. Bitte versuche es erneut.'); }
  };

  return <section aria-labelledby={id + '-title'} className="min-w-0 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 id={id + '-title'} className="font-sans text-base font-semibold text-foreground">Grifffarben</h2>
      </div>
      <Button ref={newColorButton} onClick={event => openEditor('new', event.currentTarget)} disabled={catalog.isPending || catalog.isError} className="shrink-0 gap-2"><Plus className="h-4 w-4" />Neue Farbe</Button>
    </div>
    <div className="min-w-0 space-y-3">
      <div className="grid gap-3 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <div className="relative min-w-0">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Farben suchen" placeholder="Farbe suchen" value={query} onChange={event => setQuery(event.target.value)} className="border-0 bg-secondary/70 pl-10 pr-11" />
          {query && <Button variant="ghost" size="icon" aria-label="Suche leeren" onClick={() => setQuery('')} className="absolute right-0 top-0 h-11 w-11"><X className="h-4 w-4" /></Button>}
        </div>
        <KwsSegmentedControl<'all' | 'active' | 'inactive'> value={filter} onValueChange={setFilter} options={[{ value: 'all', label: 'Alle' }, { value: 'active', label: 'Aktiv' }, { value: 'inactive', label: 'Inaktiv' }]} ariaLabel="Farben nach Status filtern" />
      </div>
      <div className="flex min-h-11 items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">{!catalog.isPending && !catalog.isError && <>{filtered.length} {filtered.length === 1 ? 'Farbe' : 'Farben'}{query || filter !== 'all' ? ' von ' + colors.length : ''}<span className="hidden sm:inline"> · {activeCount} aktiv</span></>}</p>
        <Button ref={orderButton} variant="ghost" className="shrink-0 gap-2 text-xs" disabled={catalog.isPending || catalog.isError || colors.length < 2} onClick={() => setOrdering(true)}><ArrowUpDown className="h-4 w-4" />Reihenfolge</Button>
      </div>
      {catalog.isPending ? <div role="status" aria-label="Farben werden geladen" className="grid gap-3 min-[1280px]:grid-cols-2">{[1, 2, 3, 4].map(row => <Skeleton key={row} className="h-24 w-full rounded-kws-card" />)}</div>
        : catalog.isError ? <div role="alert" className="space-y-3 px-4 pb-5"><p className="text-sm text-destructive">Die Farben konnten nicht geladen werden.</p><Button variant="secondary" onClick={() => catalog.refetch()}>Erneut versuchen</Button></div>
        : <>
          {filtered.length ? <ul aria-label="Grifffarben" className="grid gap-3 min-[1280px]:grid-cols-2">
            {filtered.map(color => <li key={color.id} className="min-w-0">
              <button type="button" aria-label={color.name + ' bearbeiten'} onClick={event => openEditor(color, event.currentTarget)} className={cn(kwsSurfaceClassName, 'group flex h-full min-h-24 w-full items-center gap-3 p-3 text-left transition-shadow hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4')}>
                <ColorSwatch hex={color.hex} secondaryHex={color.secondary_hex} className="h-16 w-16" />
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2"><span className="break-words font-sans text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{color.name}</span>{!color.is_active && <span className="rounded-kws-badge bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">Inaktiv</span>}</span>
                  <span className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground"><span>{normalizeHex(color.hex) ?? color.hex}</span>{color.secondary_hex && <span>/ {normalizeHex(color.secondary_hex) ?? color.secondary_hex}</span>}</span>
                </span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </button>
            </li>)}
          </ul> : <div className="flex flex-col items-center px-4 py-8 text-center"><Palette className="mb-3 h-7 w-7 text-muted-foreground" /><h3 className="text-sm font-semibold">{colors.length ? 'Keine passenden Farben' : 'Deine Farbpalette ist noch leer'}</h3><p className="mt-1 max-w-xs text-sm text-muted-foreground">{colors.length ? 'Passe die Suche an oder zeige alle Farben.' : 'Lege deine erste Grifffarbe an oder ergänze die Standardfarben.'}</p>{colors.length > 0 && <Button variant="secondary" className="mt-4" onClick={() => { setQuery(''); setFilter('all'); }}>Filter zurücksetzen</Button>}</div>}
        </>}
    </div>
    <div className="flex justify-end"><Button ref={defaultsButton} variant="ghost" className="text-xs text-muted-foreground" disabled={catalog.isPending || catalog.isError} onClick={() => { setDefaultError(''); setShowDefaults(true); }}>Standardfarben ergänzen</Button></div>
    {ordering && <ColorOrderDialog colors={colors} onClose={() => setOrdering(false)} onRestoreFocus={() => requestAnimationFrame(() => orderButton.current?.focus())} />}
    {editor && <ColorEditor key={editor === 'new' ? 'new' : editor.id} color={editor === 'new' ? undefined : editor} colors={colors} onClose={() => setEditor(null)} onRestoreFocus={restoreEditorFocus} />}
    <AlertDialog open={showDefaults} onOpenChange={open => { if (!defaults.isPending) setShowDefaults(open); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => defaultsButton.current?.focus()); }}>
        <AlertDialogTitle>Standardfarben ergänzen?</AlertDialogTitle>
        <AlertDialogDescription>Ergänzt fehlende Standardfarben wie Grün, Gelb und Blau. Vorhandene Namen, Farbwerte und zweifarbige Kombinationen bleiben unverändert.</AlertDialogDescription>
        {defaultError && <p role="alert" className="text-sm text-destructive">{defaultError}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={defaults.isPending}>Abbrechen</AlertDialogCancel><Button onClick={addDefaults} disabled={defaults.isPending}>{defaults.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Ergänzen</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
};

