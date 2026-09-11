import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import type { ColorRow } from '@/hooks/useColors';
import { getColorBackgroundStyle } from '@/utils/colorUtils';
import { cn } from '@/lib/utils';
import { kwsPopoverClassName } from '@/components/ui/kws-surface';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const DIFFICULTY_FILTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '?'];

export function FilterOption({ selected, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'flex min-h-11 min-w-0 items-center gap-2 rounded-kws-control px-3 py-2 text-left font-sans text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-50',
        selected ? 'bg-primary/10 font-semibold text-foreground hover:bg-primary/15' : 'bg-secondary/70 text-foreground hover:bg-secondary',
        className,
      )}
      {...props}
    >
      {children}
      <Check className={cn('ml-auto h-3.5 w-3.5 shrink-0 text-primary', !selected && 'invisible')} aria-hidden="true" />
    </button>
  );
}

type FilterControlsProps = {
  leadingControls: ReactNode;
  leadingFullWidth?: boolean;
  difficulties: string[];
  onDifficultyToggle: (value: string) => void;
  selectedColors: string[];
  onColorToggle: (value: string) => void;
  colors?: ColorRow[];
  colorsLoading: boolean;
  colorsError: boolean;
  onRetryColors: () => void;
  activeCount: number;
  onReset: () => void;
};

export function BoulderFilterControls({ leadingControls, leadingFullWidth = false, difficulties, onDifficultyToggle, selectedColors, onColorToggle, colors, colorsLoading, colorsError, onRetryColors, activeCount, onReset }: FilterControlsProps) {
  return (
    <div className="space-y-4" aria-label="Boulder filtern">
      <div className={cn('grid gap-5', leadingFullWidth ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_1.2fr]')}>
        {leadingFullWidth ? leadingControls : null}
        <div className="space-y-5">
        {!leadingFullWidth ? leadingControls : null}
        <section aria-label="Schwierigkeit">
          <h3 className="mb-3 font-sans text-xs font-semibold text-foreground">Schwierigkeit</h3>
          <div className="grid grid-cols-5 gap-2">
            {DIFFICULTY_FILTER_OPTIONS.map((difficulty) => (
              <FilterOption key={difficulty} selected={difficulties.includes(difficulty)} onClick={() => onDifficultyToggle(difficulty)} aria-label={difficulty === '?' ? 'Unbekannter Grad' : `Grad ${difficulty}`} className="gap-1 px-2">
                <span className="flex-1 text-center">{difficulty}</span>
              </FilterOption>
            ))}
          </div>
        </section>
        </div>
        <section aria-label="Farbe">
          <h3 className="mb-3 font-sans text-xs font-semibold text-foreground">Farbe</h3>
          {colors?.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
              {colors.map((color) => (
                <FilterOption key={color.id} selected={selectedColors.includes(color.name)} onClick={() => onColorToggle(color.name)} aria-label={`Farbe ${color.name}`} className="px-2.5">
                  <span className="h-5 w-5 shrink-0 rounded-kws-badge shadow-[inset_0_0_0_1px_rgba(19,17,43,0.12)]" style={getColorBackgroundStyle(color.name, colors)} aria-hidden="true" />
                  <span className="min-w-0">{color.name}</span>
                </FilterOption>
              ))}
            </div>
          ) : colorsLoading ? (
            <p role="status" className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Farben werden geladen …</p>
          ) : !colorsError ? (
            <p className="text-xs text-muted-foreground">Noch keine Farben verfügbar.</p>
          ) : null}
          {colorsError ? (
            <div role="alert" className="mt-2 text-xs text-muted-foreground">
              <p>Farben konnten nicht aktualisiert werden.</p>
              <button type="button" onClick={onRetryColors} className="mt-1 min-h-11 rounded-kws-control px-2 font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">Farben erneut laden</button>
            </div>
          ) : null}
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted-foreground">{activeCount ? `${activeCount} Filter aktiv` : 'Mehrere Optionen kombinierbar'}</p>
        <button type="button" onClick={onReset} disabled={!activeCount} className="flex min-h-11 items-center gap-2 rounded-kws-control px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:opacity-40 disabled:hover:bg-transparent">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Filter zurücksetzen
        </button>
      </div>
    </div>
  );
}

export function BoulderFilterPanel({ open, onOpenChange, children, resultCount }: { open: boolean; onOpenChange: (value: boolean) => void; children: ReactNode; resultCount: number }) {
  const isMobile = useIsMobile(1024);
  if (!isMobile) return open ? <div className={cn(kwsPopoverClassName, 'mt-3 p-4 animate-in slide-in-from-top-2')}>{children}</div> : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="z-[130] max-h-[88dvh] overflow-hidden rounded-t-kws-card border-0 bg-white [&>div:first-child]:mt-3 [&>div:first-child]:h-1 [&>div:first-child]:w-10 [&>div:first-child]:shrink-0 [&>div:first-child]:rounded-kws-badge [&>div:first-child]:bg-muted-foreground/25">
        <DrawerHeader className="px-4 pb-4 pt-3 text-left">
          <DrawerTitle className="font-sans text-sm font-semibold text-foreground">Boulder filtern</DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">Schneller zum passenden Boulder.</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        <DrawerFooter className="shrink-0 bg-white px-4 pb-[calc(1rem+var(--app-safe-area-bottom))] pt-2">
          <button type="button" onClick={() => onOpenChange(false)} className="min-h-11 rounded-kws-control bg-primary px-4 font-sans text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45">{resultCount} Boulder anzeigen</button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
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
