import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DashboardAreaOption = { id: string; name: string };

export function SetterDashboardAreaNavigation({ options, value, onChange, disabled }: {
  options: DashboardAreaOption[]; value: string; onChange: (value: string) => void;
  disabled: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const current = useRef({ value, options, onChange, disabled });
  useEffect(() => { current.current = { value, options, onChange, disabled }; }, [value, options, onChange, disabled]);
  const index = Math.max(0, options.findIndex(option => option.id === value));

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    function align() {
      if (!element) return;
      element.scrollTo({ left: index * element.getBoundingClientRect().width, behavior: 'instant' });
    }
    align();
    const observer = new ResizeObserver(align);
    observer.observe(element);
    return () => observer.disconnect();
  }, [index]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  function settle() {
    if (disabled) return;
    clearTimeout(settleTimer.current);
    // Native scrolling owns momentum, vertical scroll and pinch zoom. Commit only a settled page.
    settleTimer.current = setTimeout(() => {
      const element = scroller.current;
      if (!element?.clientWidth || current.current.disabled) return;
      const width = element.getBoundingClientRect().width;
      const next = Math.round(element.scrollLeft / width);
      const option = current.current.options[next];
      if (option && Math.abs(element.scrollLeft - next * width) < 3
        && option.id !== current.current.value) current.current.onChange(option.id);
    }, 140);
  }

  function select(next: number) {
    const option = options[next];
    if (disabled || !option) return;
    onChange(option.id);
  }

  function keyboard(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
  }

  return <div className="sd-area-navigation" data-swipe-ignore>
    <Button variant="ghost" size="icon" aria-label="Vorheriger Hallenbereich" disabled={disabled || index === 0} onClick={() => select(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
    <div ref={scroller} className="sd-area-pager" role="group" aria-roledescription="Karussell" aria-label="Hallenbereiche – wischen oder Pfeiltasten verwenden"
      tabIndex={disabled ? -1 : 0} aria-disabled={disabled} onKeyDown={keyboard} onScroll={settle}>
      {options.map((option, page) => <div key={option.id} className="sd-area-page" aria-hidden={page !== index}>
        <strong>{option.name}</strong>{!disabled && <span aria-hidden="true">{page + 1} / {options.length}</span>}
      </div>)}
    </div>
    <Button variant="ghost" size="icon" aria-label="Nächster Hallenbereich" disabled={disabled || index === options.length - 1} onClick={() => select(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
    <span className="sr-only" aria-live="polite">{options[index]?.name} ausgewählt</span>
  </div>;
}
