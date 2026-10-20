import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useBoulderVideoControls } from '@/hooks/useBoulderVideoControls';
import './BoulderMobileDetail.css';

export type MobileBoulderDetail = {
  title: string;
  metadata: ReactNode;
  content: ReactNode | ((returnToVideo: () => void) => ReactNode);
  onBack: () => void;
  backLabel: string;
};
type Drag = { offset: number; height: number };
type Gesture = { id: number; mode: 'open' | 'close'; x: number; y: number; started: number; height: number; active: boolean };
type Props = {
  detail?: MobileBoulderDetail;
  enabled: boolean;
  fullscreen: boolean;
  menuOpen: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  controls: ReturnType<typeof useBoulderVideoControls>;
  onInteractionChange: (locked: boolean) => void;
  children: (open: () => void, button: RefObject<HTMLButtonElement>) => ReactNode;
};

/** The media stays mounted inside the same wrapper while its detail sheet moves. */
export function BoulderMobileDetail({ detail, enabled, fullscreen, menuOpen, videoRef, controls, onInteractionChange, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const background = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClickUntil = useRef(0);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ratio, setRatio] = useState(9 / 16);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const interacting = open || drag !== null;

  useEffect(() => {
    if (!enabled) { setOpen(false); setDrag(null); gesture.current = null; }
  }, [enabled]);
  useEffect(() => {
    onInteractionChange(interacting);
    return () => onInteractionChange(false);
  }, [interacting, onInteractionChange]);
  useEffect(() => {
    if (background.current) background.current.inert = open;
    if (open) closeButton.current?.focus();
    else opener.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    const update = () => { if (video.videoWidth && video.videoHeight) setRatio(video.videoWidth / video.videoHeight); };
    update();
    video.addEventListener('loadedmetadata', update);
    return () => video.removeEventListener('loadedmetadata', update);
  }, [enabled, videoRef]);

  const openDetails = () => {
    onInteractionChange(true);
    opener.current = button.current;
    videoRef.current?.pause();
    controls.reveal();
    setOpen(true);
  };
  const start = (event: PointerEvent<HTMLElement>, mode: Gesture['mode']) => {
    if (!enabled || menuOpen || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const interactive = (event.target as HTMLElement).closest('button,input,textarea,select,a,[role="slider"]');
    if (interactive && !(mode === 'open' && interactive === button.current)) return;
    if (mode === 'open') {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (open || event.clientY < bounds.bottom - Math.min(240, bounds.height * .35)) return;
    }
    gesture.current = { id: event.pointerId, mode, x: event.clientX, y: event.clientY, started: event.timeStamp, height: sheet.current?.getBoundingClientRect().height || 400, active: false };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.id) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    const distance = g.mode === 'open' ? -dy : dy;
    if (!g.active) {
      if ((Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) || distance < -10) { gesture.current = null; return; }
      if (distance < 8 || distance < Math.abs(dx) * 1.2) return;
      g.active = true;
      event.currentTarget.setPointerCapture(g.id);
    }
    event.preventDefault();
    setDrag({ height: g.height, offset: Math.max(0, Math.min(g.height, g.mode === 'open' ? g.height - distance : distance)) });
  };
  const finish = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.id) return;
    gesture.current = null;
    if (!g.active) return;
    suppressClickUntil.current = performance.now() + 350;
    const distance = Math.max(0, g.mode === 'open' ? g.y - event.clientY : event.clientY - g.y);
    const speed = distance / Math.max(1, event.timeStamp - g.started);
    if (!cancelled && (distance >= Math.min(88, g.height * .25) || (distance > 24 && speed > .45))) {
      if (g.mode === 'open') openDetails();
      else setOpen(false);
    }
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(g.id)) event.currentTarget.releasePointerCapture(g.id);
  };
  const gap = Math.max(0, (size.height - size.width / ratio) / 2);

  return <div ref={root} className={enabled ? 'kws-mobile-detail' : 'relative h-full w-full'} data-details-open={open} data-expanded={fullscreen}
    style={enabled ? { '--detail-image-gap': `${gap}px` } as CSSProperties : undefined}
    onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
    onClickCapture={event => { if (performance.now() < suppressClickUntil.current && (event.target === root.current || event.target === videoRef.current)) { event.preventDefault(); event.stopPropagation(); } }}>
    <div ref={background} className="kws-mobile-detail-background" onPointerDownCapture={event => start(event, 'open')}>
      {children(openDetails, button)}
      {enabled && detail ? <>
        <div className="kws-detail-fade kws-detail-fade-top kws-video-chrome" />
        <div className="kws-detail-fade kws-detail-fade-bottom kws-video-chrome" />
        <header className="kws-detail-heading kws-video-chrome" ref={element => { if (element) element.inert = !controls.visible; }}>
          <Button variant="secondary" size="icon" aria-label={detail.backLabel} onClick={detail.onBack}><ArrowLeft /></Button>
          {!fullscreen && <div className="kws-detail-identity"><h1>{detail.title}</h1>{detail.metadata}</div>}
        </header>
      </> : null}
    </div>
    {enabled && detail ? <div className="kws-detail-backdrop" data-open={open} data-active={open || drag !== null} data-dragging={drag !== null}
      aria-hidden={!open} ref={element => { if (element) element.inert = !open; }}
      style={{ '--sheet-offset': drag ? `${drag.offset}px` : open ? '0px' : '100%', '--sheet-progress': drag ? 1 - drag.offset / drag.height : open ? 1 : 0 } as CSSProperties}
      onClick={() => setOpen(false)}>
      <section ref={sheet} className="kws-detail-sheet" role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-labelledby={titleId}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          // Nested dialogs (e.g. a tracking session) own their keys and focus.
          if (!event.currentTarget.contains(event.target as Node) || event.defaultPrevented) return;
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if (event.key !== 'Tab') return;
          const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(el => !el.closest('[inert]') && el.getClientRects().length && el.tabIndex >= 0);
          const first = targets[0], last = targets[targets.length - 1];
          if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
        }}>
        <div className="kws-detail-grip" onPointerDownCapture={event => start(event, 'close')}><div className="kws-detail-handle" />
          <header><div><p>Boulder-Details</p><h2 id={titleId}>{detail.title}</h2></div><Button ref={closeButton} variant="secondary" size="icon" aria-label="Boulder-Details schließen" onClick={() => setOpen(false)}><X /></Button></header>
        </div>
        <div className="kws-detail-body" onClickCapture={event => {
          if ((event.target as HTMLElement).closest('[data-mobile-detail-tabs] button')) event.currentTarget.scrollTop = 0;
        }}>{typeof detail.content === 'function' ? detail.content(() => {
          setOpen(false); controls.reveal();
          void videoRef.current?.play().catch(() => controls.reveal());
        }) : detail.content}</div>
      </section>
    </div> : null}
  </div>;
}
