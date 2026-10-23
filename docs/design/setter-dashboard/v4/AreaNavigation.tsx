import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AreaOption = { id: string; name: string; count: number | null };

export function AreaNavigation({ options, value, onChange, mode, disabled }: {
  options: AreaOption[]; value: string; onChange: (value: string) => void;
  mode: 'rail' | 'swipe'; disabled: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const current = useRef({ value, options, onChange });
  current.current = { value, options, onChange };
  const index = Math.max(0, options.findIndex(option => option.id === value));

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    function align() {
      if (!element) return;
      if (mode === 'swipe') element.scrollTo({ left: index * element.getBoundingClientRect().width, behavior: 'instant' });
      else {
        const item = element.children[index] as HTMLElement | undefined;
        if (!item) return;
        const left = item.getBoundingClientRect().left - element.getBoundingClientRect().left + element.scrollLeft;
        if (left < element.scrollLeft) element.scrollTo({ left, behavior: 'instant' });
        else if (left + item.offsetWidth > element.scrollLeft + element.clientWidth)
          element.scrollTo({ left: left + item.offsetWidth - element.clientWidth, behavior: 'instant' });
      }
    }
    align();
    const observer = new ResizeObserver(align);
    observer.observe(element);
    return () => observer.disconnect();
  }, [index, mode]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  function settle() {
    if (mode !== 'swipe' || disabled) return;
    clearTimeout(settleTimer.current);
    // Native scrolling owns momentum, vertical scroll and pinch zoom. Commit only a settled page.
    settleTimer.current = setTimeout(() => {
      const element = scroller.current;
      if (!element?.clientWidth) return;
      const width = element.getBoundingClientRect().width;
      const next = Math.round(element.scrollLeft / width);
      const option = current.current.options[next];
      if (option && Math.abs(element.scrollLeft - next * width) < 3
        && option.id !== current.current.value) current.current.onChange(option.id);
    }, 140);
  }

  function select(next: number, focus = false) {
    const option = options[next];
    if (disabled || !option) return;
    onChange(option.id);
    if (focus && mode === 'rail') (scroller.current?.children[next] as HTMLButtonElement)?.focus({ preventScroll: true });
  }

  function keyboard(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  }

  return <div className={`v4-area-navigation v4-area-${mode}`} data-swipe-ignore>
    <Button variant="ghost" size="icon" aria-label="Vorheriger Hallenbereich" disabled={disabled || index === 0} onClick={() => select(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
    {mode === 'rail' ? <div ref={scroller} className="v4-area-rail" role="group" aria-label="Hallenbereich direkt auswählen" onKeyDown={keyboard}>
      {options.map(option => <button key={option.id} type="button" disabled={disabled} aria-pressed={value === option.id}
        tabIndex={value === option.id ? 0 : -1} onClick={() => onChange(option.id)} className="v4-area-tab">
        <span>{option.name}</span><span className="v4-area-count">{option.count ?? '–'}</span>{value === option.id && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
      </button>)}
    </div> : <div ref={scroller} className="v4-area-pager" role="group" aria-roledescription="Karussell" aria-label="Hallenbereiche – wischen oder Pfeiltasten verwenden"
      tabIndex={disabled ? -1 : 0} aria-disabled={disabled} onKeyDown={keyboard} onScroll={settle}>
      {options.map((option, page) => <div key={option.id} className="v4-area-page" aria-hidden={page !== index}>
        <strong>{option.name}</strong><span>{option.count ?? '–'} Boulder <span aria-hidden="true">· {page + 1} / {options.length}</span></span>
      </div>)}
    </div>}
    <Button variant="ghost" size="icon" aria-label="Nächster Hallenbereich" disabled={disabled || index === options.length - 1} onClick={() => select(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
    <span className="sr-only" aria-live="polite">{options[index]?.name} ausgewählt</span>
  </div>;
}
