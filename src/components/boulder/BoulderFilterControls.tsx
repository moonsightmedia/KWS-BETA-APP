import { useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, ChartNoAxesColumnIncreasing, Layers3, Loader2, Palette, RotateCcw, SlidersHorizontal, X, type LucideIcon } from 'lucide-react';
import type { ColorRow } from '@/hooks/useColors';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';

const DIFFICULTY_FILTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '?'];

export function FilterOption({ selected, indicator = 'inline', children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; indicator?: 'inline' | 'corner' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'group flex min-h-11 min-w-0 items-center gap-2 rounded-kws-control px-3 py-2 text-left font-sans text-xs font-medium transition-[background-color,box-shadow,transform] duration-150 motion-reduce:transition-none enabled:active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        selected ? 'bg-primary/10 font-semibold text-foreground ring-1 ring-inset ring-primary-ink hover:bg-primary/15' : 'bg-secondary/60 text-foreground hover:bg-secondary',
        className,
      )}
      {...props}
    >
      {children}
      <Check className={cn('shrink-0 text-primary-ink transition-[opacity,transform] duration-150 motion-reduce:transition-none', indicator === 'corner' ? 'pointer-events-none absolute right-1.5 top-1.5 h-3 w-3' : 'ml-auto h-3.5 w-3.5', selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0')} aria-hidden="true" />
    </button>
  );
}

type FilterControlsProps = {
  leadingControls?: ReactNode;
  leadingFullWidth?: boolean;
  sectorControls?: ReactNode;
  difficulties: string[];
  onDifficultyToggle: (value: string) => void;
  onDifficultyReset?: () => void;
  selectedColors: string[];
  onColorToggle: (value: string) => void;
  onColorReset?: () => void;
  colors?: ColorRow[];
  colorsLoading: boolean;
  colorsError: boolean;
  onRetryColors: () => void;
  activeCount: number;
  onReset: () => void;
  hideReset?: boolean;
};

export function FilterSection({ title, summary, children, icon: Icon = Layers3, active = false, onReset, defaultOpen = true }: {
  title: string; summary?: string; children: ReactNode; icon?: LucideIcon;
  active?: boolean; onReset?: () => void; defaultOpen?: boolean;
}) {
  return <Collapsible defaultOpen={defaultOpen} asChild>
    <section aria-label={title} className="min-w-0">
      <div className="flex items-center gap-1">
        <h3 className="min-w-0 flex-1">
          <CollapsibleTrigger className="group flex min-h-14 w-full items-center gap-3 rounded-kws-control py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-kws-control transition-colors group-hover:bg-secondary motion-reduce:transition-none', active ? 'bg-primary/10 text-primary-ink' : 'bg-secondary/60 text-muted-foreground')}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-semibold text-foreground">{title}</span>
              {summary && <span className={cn('mt-0.5 block break-words text-xs font-normal', active ? 'text-primary-ink' : 'text-muted-foreground')}>{summary}</span>}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </CollapsibleTrigger>
        </h3>
        {onReset && <Button variant="ghost" size="icon" aria-label={`${title} zurücksetzen`} title={`${title} zurücksetzen`} disabled={!active} onClick={onReset}><RotateCcw className="h-4 w-4" aria-hidden="true" /></Button>}
      </div>
      <CollapsibleContent className="kws-filter-collapse overflow-hidden">
        <div className="pb-2 pt-3">{children}</div>
      </CollapsibleContent>
    </section>
  </Collapsible>;
}

export function FilterToggle({ label, description, icon: Icon, checked, onCheckedChange }: {
  label: string; description?: string; icon: LucideIcon; checked: boolean; onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return <div className="flex min-h-14 items-center gap-3 py-2">
    <Icon className={cn('h-5 w-5 shrink-0', checked ? 'text-primary-ink' : 'text-muted-foreground')} aria-hidden="true" />
    <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer py-1 text-sm font-medium">
      {label}{description && <span id={descriptionId} className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>}
    </label>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={label} aria-describedby={description ? descriptionId : undefined} />
  </div>;
}

export function BoulderFilterControls({ leadingControls, sectorControls, difficulties, onDifficultyToggle, onDifficultyReset, selectedColors, onColorToggle, onColorReset, colors, colorsLoading, colorsError, onRetryColors, activeCount, onReset, hideReset = false }: FilterControlsProps) {
  const [showAllColors, setShowAllColors] = useState(false);
  const colorListId = useId();
  // Keep selected colors visible when the catalogue is folded back to its first six.
  const compactColors = colors?.filter((color, index) => index < 6 || selectedColors.includes(color.name));
  const visibleColors = showAllColors ? colors : compactColors;
  const hiddenColorCount = (colors?.length ?? 0) - (compactColors?.length ?? 0);
  return (
    <div className="space-y-5" aria-label="Boulder filtern">
      {leadingControls}
      <div className="space-y-5">
        <FilterSection title="Schwierigkeit" icon={ChartNoAxesColumnIncreasing} active={difficulties.length > 0} onReset={onDifficultyReset} summary={difficulties.length ? `Grad ${DIFFICULTY_FILTER_OPTIONS.filter(value => difficulties.includes(value)).join(' · ')}` : 'Alle Grade · Mehrfachauswahl'}>
          <div className="grid grid-cols-5 gap-1.5 rounded-kws-card bg-secondary/60 p-1.5 md:grid-cols-9">
            {DIFFICULTY_FILTER_OPTIONS.map((difficulty) => (
              <FilterOption key={difficulty} selected={difficulties.includes(difficulty)} indicator="corner" onClick={() => onDifficultyToggle(difficulty)} aria-label={difficulty === '?' ? 'Unbekannter Grad' : `Grad ${difficulty}`} className={cn('relative h-12 justify-center px-2 text-center text-base leading-none tabular-nums', !difficulties.includes(difficulty) && 'bg-transparent hover:bg-white')}>
                <span>{difficulty}</span>
              </FilterOption>
            ))}
          </div>
        </FilterSection>
        <FilterSection title="Grifffarbe" icon={Palette} active={selectedColors.length > 0} onReset={onColorReset} summary={selectedColors.length ? selectedColors.join(' · ') : 'Alle Farben · Mehrfachauswahl'}>
          {colors?.length ? (
            <div id={colorListId} className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {visibleColors?.map((color) => (
                <FilterOption key={color.id} selected={selectedColors.includes(color.name)} onClick={() => onColorToggle(color.name)} aria-label={`Farbe ${color.name}`} className="min-h-14 gap-2 px-2">
                  <span className="h-8 w-8 shrink-0 rounded-kws-control shadow-[inset_0_0_0_1px_rgba(19,17,43,0.15)]" style={getColorBackgroundStyle(color.name, colors)} aria-hidden="true" />
                  <span className="min-w-0 break-words leading-snug">{color.name}</span>
                </FilterOption>
              ))}
            </div>
          ) : colorsLoading ? (
            <p role="status" className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Farben werden geladen …</p>
          ) : !colorsError ? (
            <p className="text-xs text-muted-foreground">Noch keine Farben verfügbar.</p>
          ) : null}
          {hiddenColorCount > 0 && <button type="button" aria-expanded={showAllColors} aria-controls={colorListId} onClick={() => setShowAllColors(value => !value)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-kws-control text-xs font-medium text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {showAllColors ? 'Weniger Farben' : `Weitere ${hiddenColorCount} Farben`}<ChevronDown className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', showAllColors && 'rotate-180')} aria-hidden="true" />
          </button>}
          {colorsError ? (
            <div role="alert" className="mt-2 text-xs text-muted-foreground">
              <p>Farben konnten nicht aktualisiert werden.</p>
              <button type="button" onClick={onRetryColors} className="mt-1 min-h-11 rounded-kws-control px-2 font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Farben erneut laden</button>
            </div>
          ) : null}
        </FilterSection>
      </div>
      {sectorControls}
      {!hideReset && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted-foreground">{activeCount ? `${activeCount} Filter aktiv` : 'Mehrere Optionen kombinierbar'}</p>
        <button type="button" onClick={onReset} disabled={!activeCount} className="flex min-h-11 items-center gap-2 rounded-kws-control px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Filter zurücksetzen
        </button>
      </div>}
    </div>
  );
}

export function BoulderFilterPanel({ open, onOpenChange, children, resultCount, activeCount = 0, onReset }: { open: boolean; onOpenChange: (value: boolean) => void; children: ReactNode; resultCount: number; activeCount?: number; onReset?: () => void }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent scrollLayout="contained" style={{ maxWidth: 720 }} className="flex h-[min(820px,90dvh)] flex-col overflow-hidden bg-white p-0"
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}>
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-kws-control bg-primary/10 text-primary-ink"><SlidersHorizontal className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <DialogTitle>Boulder filtern</DialogTitle>
              <DialogDescription className="mt-1 text-xs" aria-live="polite" aria-atomic="true">{resultCount === 1 ? '1 passender Boulder' : `${resultCount} passende Boulder`}{activeCount ? ` · ${activeCount} aktiv` : ''}</DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Filter schließen" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2 md:px-6" data-filter-scroll>{children}</div>
        <footer className="flex shrink-0 items-center gap-2 bg-white px-4 pb-[calc(1rem+var(--app-safe-area-bottom,0px))] pt-3 shadow-[0_-4px_20px_rgba(25,36,54,0.04)] md:px-6">
          {onReset && <Button variant="ghost" className="gap-2 px-2 text-xs" aria-label="Filter zurücksetzen" disabled={!activeCount} onClick={onReset}><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset</Button>}
          <Button className="min-w-0 flex-1 gap-2" onClick={() => onOpenChange(false)}>{resultCount} Boulder anzeigen<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export function BoulderFilterTrigger({ count, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { count: number }) {
  return <Button variant={count ? 'default' : 'secondary'} className="shrink-0 gap-2" aria-haspopup="dialog" aria-label={`Filter öffnen${count ? `, ${count} aktiv` : ''}`} {...props}>
    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /><span>Filter</span>
    {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-kws-badge bg-foreground/10 px-1 text-xs tabular-nums">{count}</span>}
  </Button>;
}

export function ActiveFilterChip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return <button type="button" onClick={onRemove} aria-label={`${label} entfernen`} className="flex min-h-11 max-w-full items-center gap-2 rounded-kws-control bg-primary/10 px-3 text-xs font-medium text-foreground hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className="flex min-w-0 items-center gap-2">{children}</span><X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  </button>;
}

export function BoulderSortPanel<T extends string>({ options, selected, onSelect, className }: { options: ReadonlyArray<{ key: T; label: string }>; selected: string; onSelect: (value: T) => void; className?: string }) {
  return (
    <section aria-label="Sortieren nach" className={cn(kwsPopoverClassName, 'p-4 animate-in slide-in-from-top-2', className)}>
      <h3 className="mb-3 font-sans text-xs font-semibold">Sortieren nach</h3>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {options.map((option) => <FilterOption key={option.key} selected={selected === option.key} onClick={() => onSelect(option.key)}>{option.label}</FilterOption>)}
      </div>
    </section>
  );
}
