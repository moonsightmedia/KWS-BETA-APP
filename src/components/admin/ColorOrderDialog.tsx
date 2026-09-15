import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAdminColors, useReorderColors, type ColorRow } from '@/hooks/useColors';
import { ColorOrderError, moveColor } from '@/lib/colorOrder';
import { cn } from '@/lib/utils';
import { ColorSwatch } from './ColorValueField';

type Drag = { id: string; pointerId: number; startY: number; y: number; target: number; moved: boolean };

export function ColorOrderDialog({ colors, onClose, onRestoreFocus }: {
  colors: ColorRow[]; onClose: () => void; onRestoreFocus: () => void;
}) {
  const id = useId();
  const catalog = useAdminColors();
  const mutation = useReorderColors();
  const initial = useRef(colors);
  const [rows, setRows] = useState(colors);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reloadRequired, setReloadRequired] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [dragView, setDragView] = useState<Drag | null>(null);
  const drag = useRef<Drag | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const saving = useRef(false);
  const pending = mutation.isPending || reloading;
  const dirty = rows.some((row, index) => row.id !== initial.current[index]?.id);
  const disabled = pending || reloadRequired;
  const dragging = Boolean(dragView);

  const announceMove = (next: ColorRow[], movedId: string) => {
    const index = next.findIndex(row => row.id === movedId);
    setMessage(`${next[index].name}: Position ${index + 1} von ${next.length}. Noch nicht gespeichert.`);
  };
  const move = (from: number, to: number) => {
    if (disabled || drag.current) return;
    const next = moveColor(rows, from, to);
    if (next === rows) return;
    setRows(next);
    announceMove(next, rows[from].id);
    requestAnimationFrame(() => {
      handles.current.get(rows[from].id)?.focus();
      handles.current.get(rows[from].id)?.scrollIntoView({ block: 'nearest' });
    });
  };
  const finishDrag = (cancel = false) => {
    const current = drag.current;
    drag.current = null;
    setDragView(null);
    if (!current) return;
    if (!cancel && current.moved) {
      const from = rows.findIndex(row => row.id === current.id);
      const next = moveColor(rows, from, current.target);
      setRows(next);
      announceMove(next, current.id);
    } else if (cancel) setMessage('Verschieben abgebrochen.');
    handles.current.get(current.id)?.focus({ preventScroll: true });
  };
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, rowId: string, index: number) => {
    if (disabled || event.button !== 0 || !event.isPrimary || drag.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    drag.current = { id: rowId, pointerId: event.pointerId, startY: event.clientY, y: event.clientY, target: index, moved: false };
    setDragView({ ...drag.current });
  };

  // A single bounded loop also scrolls long lists while the pointer stays near
  // an edge. Only handles disable touch scrolling; the rest of the list scrolls.
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const tick = () => {
      const current = drag.current;
      const container = scroller.current;
      if (!current || !container) return;
      if (current.moved) {
        const bounds = container.getBoundingClientRect();
        const edge = 48;
        const top = Math.max(0, edge - (current.y - bounds.top));
        const bottom = Math.max(0, edge - (bounds.bottom - current.y));
        container.scrollTop += Math.max(-10, Math.min(10, (bottom - top) / 5));
        const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-color-order-row]'));
        let closest = current.target;
        let distance = Infinity;
        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const nextDistance = Math.abs(current.y - (rect.top + rect.height / 2));
          if (nextDistance < distance) { closest = index; distance = nextDistance; }
        });
        if (closest !== current.target) {
          current.target = closest;
          setDragView({ ...current });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  const close = () => {
    if (pending) return;
    if (dirty && !reloadRequired) setDiscard(true);
    else onClose();
  };
  const save = async () => {
    if (saving.current || disabled || !dirty || drag.current) return;
    saving.current = true;
    setError('');
    try {
      await mutation.mutateAsync({ expected: initial.current.map(({ id, sort_order }) => ({ id, sort_order })), ids: rows.map(row => row.id) });
      onClose();
    } catch (cause) {
      setError(cause instanceof ColorOrderError ? cause.message : 'Speichern nicht möglich. Dein Entwurf bleibt erhalten. Bitte versuche es erneut.');
      setReloadRequired(cause instanceof ColorOrderError && cause.reloadRequired);
    } finally { saving.current = false; }
  };
  const reload = async () => {
    setReloading(true);
    try {
      const result = await catalog.refetch();
      if (result.error || !result.data) throw new Error('Read failed');
      initial.current = result.data;
      setRows(result.data);
      setReloadRequired(false);
      setError('');
      setMessage('Gespeicherte Reihenfolge neu geladen. Du kannst erneut sortieren.');
    } catch { setError('Die Liste konnte nicht neu geladen werden. Bitte prüfe deine Verbindung.'); }
    finally { setReloading(false); }
  };

  return <>
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <DialogContent scrollLayout="contained" data-swipe-ignore className="flex max-h-[calc(100dvh-2rem)] flex-col sm:!max-w-[560px]" onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
        onInteractOutside={event => { if (pending || drag.current) event.preventDefault(); }}
        onEscapeKeyDown={event => { if (drag.current) { event.preventDefault(); finishDrag(true); } else if (pending) event.preventDefault(); }}>
        <div className="flex shrink-0 items-start justify-between gap-2 p-4 sm:p-5">
          <div><DialogTitle>Farben sortieren</DialogTitle><DialogDescription className="mt-1 text-xs">Am Griff ziehen oder mit den Pfeilen verschieben. Gilt für alle Farben – auch inaktive.</DialogDescription></div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-11 w-11 shrink-0" aria-label="Sortierung schließen" disabled={pending} onClick={close}><X className="h-4 w-4" /></Button>
        </div>
        <p id={id + '-help'} className="sr-only">Mit Pfeil hoch und runter verschieben. Pos1 an den Anfang, Ende ans Ende. Escape bricht Ziehen ab. Erst Speichern übernimmt die Reihenfolge.</p>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-5" data-testid="color-order-scroll">
          <ol aria-label="Farbreihenfolge" className="space-y-2">
            {rows.map((row, index) => <li key={row.id} data-color-order-row data-color-id={row.id}
              className={cn('relative flex min-w-0 items-center gap-2 rounded-kws-control bg-secondary/60 p-2 transition-colors motion-reduce:transition-none',
                dragView?.moved && dragView.id === row.id && 'opacity-50',
                dragView?.moved && dragView.target === index && 'bg-primary/15 ring-2 ring-inset ring-primary')}>
              <Button ref={element => { if (element) handles.current.set(row.id, element); else handles.current.delete(row.id); }} variant="ghost" size="icon"
                aria-label={row.name + ' verschieben'} aria-describedby={id + '-help'} className="h-11 w-11 shrink-0 touch-none cursor-grab active:cursor-grabbing" disabled={disabled}
                onPointerDown={event => startDrag(event, row.id, index)}
                onPointerMove={event => {
                  const current = drag.current;
                  if (!current || current.pointerId !== event.pointerId) return;
                  current.y = event.clientY;
                  if (Math.abs(current.y - current.startY) > 5) current.moved = true;
                  if (current.moved && !dragView?.moved) setDragView({ ...current });
                }}
                onPointerUp={event => {
                  if (drag.current?.pointerId !== event.pointerId) return;
                  const bounds = scroller.current?.getBoundingClientRect();
                  finishDrag(!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
                }}
                onPointerCancel={() => finishDrag(true)} onLostPointerCapture={() => { if (drag.current) finishDrag(true); }}
                onKeyDown={event => {
                  const target = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: rows.length - 1 }[event.key];
                  if (target !== undefined) { event.preventDefault(); move(index, target); }
                }}><GripVertical aria-hidden="true" className="h-5 w-5" /></Button>
              <ColorSwatch hex={row.hex} secondaryHex={row.secondary_hex} className="h-8 w-8" />
              <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold leading-snug [overflow-wrap:anywhere]">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{index + 1} von {rows.length}{!row.is_active ? ' · Inaktiv' : ''}</p></div>
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" aria-label={row.name + ' nach oben'} className="h-11 w-11" disabled={disabled || index === 0 || Boolean(dragView)} onClick={() => move(index, index - 1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={row.name + ' nach unten'} className="h-11 w-11" disabled={disabled || index === rows.length - 1 || Boolean(dragView)} onClick={() => move(index, index + 1)}><ArrowDown className="h-4 w-4" /></Button>
              </div>
              {dragView?.moved && dragView.target === index && <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-2 rounded-kws-badge bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">Neue Position {index + 1}</span>}
            </li>)}
          </ol>
        </div>
        <div className="shrink-0 border-t border-border/60 p-4 sm:px-5">
          <p role="status" aria-live="polite" aria-atomic="true" className="mb-3 text-xs text-muted-foreground">{pending ? 'Reihenfolge wird gespeichert und geprüft …' : dragView?.moved ? 'Loslassen zum Verschieben · Escape zum Abbrechen' : message || 'Änderungen werden erst mit Speichern übernommen.'}</p>
          {error && <div role="alert" className="mb-3 rounded-kws-control bg-destructive/10 p-3 text-xs text-destructive">{error}{reloadRequired && <Button variant="secondary" className="mt-2 w-full" disabled={pending} onClick={reload}>Gespeicherte Liste neu laden</Button>}</div>}
          <div className="flex gap-2"><Button variant="secondary" className="flex-1" disabled={pending || Boolean(dragView)} onClick={close}>Abbrechen</Button><Button className="flex-1 gap-2" disabled={disabled || !dirty || Boolean(dragView)} onClick={save}>{pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Check className="h-4 w-4" />}Speichern</Button></div>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={discard} onOpenChange={setDiscard}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => handles.current.get(rows[0]?.id)?.focus()); }}>
        <AlertDialogTitle>Reihenfolge verwerfen?</AlertDialogTitle><AlertDialogDescription>Deine neue Sortierung wurde noch nicht gespeichert. Die bisherige Reihenfolge bleibt erhalten.</AlertDialogDescription>
        <AlertDialogFooter><AlertDialogCancel>Weiter sortieren</AlertDialogCancel><Button variant="destructive" onClick={onClose}>Verwerfen</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
