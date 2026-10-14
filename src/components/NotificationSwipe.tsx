import { useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Check, Mail, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Axis-locked horizontal gestures; the browser owns vertical scrolling. */
export function NotificationSwipe({ read, disabled, onAction, children }: {
  read: boolean; disabled: boolean; onAction: (action: 'read' | 'dismiss') => void; children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number; axis: 'pending' | 'x' | 'y'; dx: number } | null>(null);
  const suppressClick = useRef(false);
  const reset = () => { gesture.current = null; setDragging(false); setOffset(0); };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (disabled || !e.isPrimary || e.button !== 0 || (e.target as Element).closest('button,a,input,select,textarea')) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: 'pending', dx: 0 };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x; const dy = e.clientY - g.y;
    if (g.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
      if (g.axis === 'x') { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }
    }
    if (g.axis !== 'x') return;
    g.dx = dx; suppressClick.current = true;
    setOffset(Math.max(-160, Math.min(160, dx)));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const action = g.axis === 'x' && Math.abs(g.dx) >= 88 ? g.dx > 0 ? 'read' : 'dismiss' : null;
    reset();
    if (action && !disabled) onAction(action);
  };
  const ReadIcon = read ? Mail : Check;
  return <div data-swipe-ignore className="relative overflow-hidden" onPointerDown={down} onPointerMove={move} onPointerUp={up}
    onPointerCancel={() => { suppressClick.current = false; reset(); }}
    onLostPointerCapture={e => { if (e.target === e.currentTarget) reset(); }} style={{ touchAction: 'pan-y pinch-zoom' }}
    onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}>
    <div aria-hidden="true" className={cn('absolute inset-0 flex items-center px-5 text-xs font-semibold', offset < 0 ? 'justify-end bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground')}>
      <span className="flex w-20 flex-col items-center gap-2">{offset < 0 ? <><Trash2 className="h-5 w-5" />Entfernen</> : <><ReadIcon className="h-5 w-5" />{read ? 'Ungelesen' : 'Gelesen'}</>}</span>
    </div>
    <div className={cn('relative bg-card', !dragging && 'transition-transform duration-200 motion-reduce:transition-none')}
      style={{ transform: `translate3d(${offset}px,0,0)` }}>{children}</div>
  </div>;
}
