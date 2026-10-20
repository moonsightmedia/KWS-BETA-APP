import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { Hand, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InteractiveMapStageProps {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  compact?: boolean;
  lockAspectRatio?: boolean;
  panPadding?: number;
  disablePanZoom?: boolean;
  /** Embedded editors must leave ordinary wheel/touch gestures to the page. */
  allowPageScroll?: boolean;
  controlsPlacement?: 'overlay' | 'right';
  /** Direct mouse controls and two-finger touch gestures in embedded maps. */
  directManipulation?: boolean;
  onViewportChange?: (viewport: { scale: number; translate: Point }) => void;
}

type Point = { x: number; y: number };

const MIN_SCALE = 0.82;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.35;
const PAN_START_THRESHOLD = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function InteractiveMapStage({
  width,
  height,
  children,
  className,
  viewportClassName,
  compact = false,
  lockAspectRatio = true,
  panPadding = 0,
  disablePanZoom = false,
  allowPageScroll = false,
  controlsPlacement = 'overlay',
  directManipulation = false,
  onViewportChange,
}: InteractiveMapStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerPositionsRef = useRef<Map<number, Point>>(new Map());
  const dragStartRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point>({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [panEnabled, setPanEnabled] = useState(false);
  const camera = useRef({ scale: 1, translate: { x: 0, y: 0 } });
  const suppressClick = useRef(false);

  useEffect(() => {
    if (disablePanZoom) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [disablePanZoom]);

  const clampTranslate = useCallback(
    (next: Point, nextScale: number) => {
      const maxX = Math.max(0, ((containerSize.width * nextScale) - containerSize.width) / 2) + panPadding;
      const maxY = Math.max(0, ((containerSize.height * nextScale) - containerSize.height) / 2) + panPadding;

      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [containerSize.height, containerSize.width, panPadding],
  );

  const setView = useCallback((nextScale: number, nextTranslate: Point) => {
    const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const clampedTranslate = clampTranslate(nextTranslate, clampedScale);
    camera.current = { scale: clampedScale, translate: clampedTranslate };
    setScale(clampedScale);
    setTranslate(clampedTranslate);
  }, [clampTranslate]);

  const updateScale = useCallback((nextScale: number, focalPoint?: Point) => {
    const current = camera.current;
    const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!focalPoint || !rect) {
      setView(clampedScale, current.translate);
      return;
    }
    const ratio = clampedScale / current.scale;
    setView(clampedScale, {
      x: current.translate.x * ratio + (focalPoint.x - rect.width / 2) * (1 - ratio),
      y: current.translate.y * ratio + (focalPoint.y - rect.height / 2) * (1 - ratio),
    });
  }, [setView]);

  useEffect(() => {
    if (disablePanZoom) return;
    const node = containerRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      if (!directManipulation && allowPageScroll && !event.ctrlKey && !event.metaKey) return;
      if (!event.cancelable) return;
      event.preventDefault();

      const rect = node.getBoundingClientRect();
      if (event.deltaY === 0) return;
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      const nextScale = directManipulation
        ? camera.current.scale * Math.exp(-pixels * (event.ctrlKey ? 0.01 : 0.002))
        : camera.current.scale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      updateScale(nextScale, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [allowPageScroll, directManipulation, disablePanZoom, updateScale]);

  useEffect(() => {
    if (!directManipulation || disablePanZoom) return;
    const node = containerRef.current;
    if (!node) return;
    let gesture: {
      ids: number[]; distance: number; midpoint: Point;
      scale: number; translate: Point;
    } | null = null;
    let finishingGesture = false;
    const contacts = (event: TouchEvent) => Array.from(event.touches).filter(touch =>
      touch.target instanceof Node && node.contains(touch.target));
    const touchDistance = (first: Touch, second: Touch) =>
      Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    const start = (event: TouchEvent) => {
      const touches = contacts(event);
      if (touches.length < 2) {
        if (event.touches.length === 1) finishingGesture = false;
        return;
      }
      if (event.cancelable) event.preventDefault();
      suppressClick.current = true;
      if (gesture) return;
      const [first, second] = touches;
      const rect = node.getBoundingClientRect();
      gesture = {
        ids: [first.identifier, second.identifier],
        distance: Math.max(1, touchDistance(first, second)),
        midpoint: { x: (first.clientX + second.clientX) / 2 - rect.left,
          y: (first.clientY + second.clientY) / 2 - rect.top },
        scale: camera.current.scale, translate: camera.current.translate,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) {
        if (finishingGesture && event.cancelable) event.preventDefault();
        return;
      }
      if (event.cancelable) event.preventDefault();
      const touches = contacts(event);
      const first = touches.find(touch => touch.identifier === gesture!.ids[0]);
      const second = touches.find(touch => touch.identifier === gesture!.ids[1]);
      if (!first || !second) return;
      const rect = node.getBoundingClientRect();
      const nextScale = clamp(gesture.scale * touchDistance(first, second) / gesture.distance, MIN_SCALE, MAX_SCALE);
      const ratio = nextScale / gesture.scale;
      const midpoint = { x: (first.clientX + second.clientX) / 2 - rect.left,
        y: (first.clientY + second.clientY) / 2 - rect.top };
      setView(nextScale, {
        x: gesture.translate.x * ratio + midpoint.x - gesture.midpoint.x
          + (gesture.midpoint.x - rect.width / 2) * (1 - ratio),
        y: gesture.translate.y * ratio + midpoint.y - gesture.midpoint.y
          + (gesture.midpoint.y - rect.height / 2) * (1 - ratio),
      });
    };
    const end = (event: TouchEvent) => {
      if (gesture || finishingGesture) {
        if (event.cancelable) event.preventDefault();
        finishingGesture = event.touches.length > 0;
      }
      if (contacts(event).length < 2 || event.type === 'touchcancel') gesture = null;
    };
    node.addEventListener('touchstart', start, { passive: false });
    node.addEventListener('touchmove', move, { passive: false });
    node.addEventListener('touchend', end, { passive: false });
    node.addEventListener('touchcancel', end, { passive: false });
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', end);
    };
  }, [directManipulation, disablePanZoom, setView]);

  const resetView = useCallback(() => {
    setPanEnabled(false);
    camera.current = { scale: 1, translate: { x: 0, y: 0 } };
    suppressClick.current = false;
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    dragStartRef.current = null;
    pinchStartDistanceRef.current = null;
    pointerPositionsRef.current.clear();
  }, []);

  useEffect(() => {
    resetView();
  }, [resetView, width, height, compact, disablePanZoom]);

  useEffect(() => {
    onViewportChange?.({ scale, translate });
  }, [onViewportChange, scale, translate]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disablePanZoom) return;
    if (directManipulation && event.pointerType === 'touch') {
      suppressClick.current = false;
      return;
    }
    if (directManipulation) {
      suppressClick.current = false;
      if (event.button !== 0) return;
      if (!panEnabled && event.target instanceof Element
        && event.target.closest('[role="button"], button, a, input, [data-sector-region-group]')) return;
    } else if (allowPageScroll && !panEnabled) return;
    const node = containerRef.current;
    if (!node) return;
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointerPositionsRef.current.size === 1) {
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      dragOriginRef.current = translate;
    }

    if (pointerPositionsRef.current.size === 2) {
      node.setPointerCapture(event.pointerId);
      const [first, second] = Array.from(pointerPositionsRef.current.values());
      pinchStartDistanceRef.current = distance(first, second);
      pinchStartScaleRef.current = scale;
      dragStartRef.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disablePanZoom) return;
    if (!pointerPositionsRef.current.has(event.pointerId)) return;
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointerPositionsRef.current.size === 2) {
      const [first, second] = Array.from(pointerPositionsRef.current.values());
      const startDistance = pinchStartDistanceRef.current;
      if (!startDistance || !containerRef.current) return;

      const midpointClient = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const rect = containerRef.current.getBoundingClientRect();
      const focalPoint = {
        x: midpointClient.x - rect.left,
        y: midpointClient.y - rect.top,
      };

      updateScale((distance(first, second) / startDistance) * pinchStartScaleRef.current, focalPoint);
      return;
    }

    if (pointerPositionsRef.current.size === 1 && dragStartRef.current) {
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;
      if (Math.hypot(deltaX, deltaY) < PAN_START_THRESHOLD) return;

      const node = containerRef.current;
      if (node && !node.hasPointerCapture(event.pointerId)) {
        node.setPointerCapture(event.pointerId);
      }
      suppressClick.current = true;
      setView(camera.current.scale, { x: dragOriginRef.current.x + deltaX, y: dragOriginRef.current.y + deltaY });
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disablePanZoom) return;
    pointerPositionsRef.current.delete(event.pointerId);

    if (pointerPositionsRef.current.size < 2) {
      pinchStartDistanceRef.current = null;
    }

    if (pointerPositionsRef.current.size === 1) {
      const remainingPointer = Array.from(pointerPositionsRef.current.values())[0];
      dragStartRef.current = remainingPointer;
      dragOriginRef.current = translate;
    } else {
      dragStartRef.current = null;
    }
  };

  const transformStyle = useMemo(
    () => ({
      transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
      transformOrigin: 'center center',
    }),
    [scale, translate.x, translate.y],
  );

  const viewportStyle = useMemo<CSSProperties>(
    () => ({
      ...(lockAspectRatio ? { aspectRatio: `${width} / ${height}`, width: '100%' } : { width: '100%' }),
    }),
    [lockAspectRatio, width, height],
  );

  const controlsOnRight = controlsPlacement === 'right' && allowPageScroll && !disablePanZoom;
  const controls = allowPageScroll && !disablePanZoom ? <div className={cn(
    'flex gap-1 rounded-kws-control bg-card p-1 shadow-soft',
    directManipulation && 'hidden [@media(hover:hover)_and_(pointer:fine)]:flex',
    controlsOnRight ? 'shrink-0 flex-col' : 'absolute right-2 top-2',
  )} aria-label="Kartenzoom">
    {!directManipulation && <Button size="icon" variant={panEnabled ? 'default' : 'ghost'} aria-label={panEnabled ? 'Seitenscrollen aktivieren' : 'Karte verschieben'} aria-pressed={panEnabled} onClick={() => setPanEnabled(value => !value)}><Hand className="h-4 w-4" /></Button>}
    <Button size="icon" variant="ghost" aria-label="Karte verkleinern" disabled={scale <= MIN_SCALE} onClick={() => updateScale(scale - ZOOM_STEP)}><Minus className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" aria-label="Karte vergrößern" disabled={scale >= MAX_SCALE} onClick={() => updateScale(scale + ZOOM_STEP)}><Plus className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" aria-label="Kartenansicht zurücksetzen" disabled={scale === 1 && translate.x === 0 && translate.y === 0} onClick={resetView}><RotateCcw className="h-4 w-4" /></Button>
  </div> : null;

  return (
    <div className={cn('w-full max-w-full overflow-hidden', className)}>
      <div className={cn('h-full', controlsOnRight && 'flex items-start gap-2')}>
        <div
          ref={containerRef}
          data-map-viewport
          data-swipe-ignore
          onClickCapture={event => {
            if (suppressClick.current && event.detail > 0) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          className={cn(
            'relative w-full max-w-full overflow-hidden rounded-kws-card border border-white bg-[#FBFDF9] shadow-[0_10px_30px_rgba(25,36,54,0.07)]',
            directManipulation || disablePanZoom || (allowPageScroll && !panEnabled) ? 'touch-pan-y' : 'touch-none',
            !disablePanZoom && (directManipulation || scale > 1) ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
            controlsOnRight && 'min-w-0 flex-1',
            viewportClassName,
          )}
          style={viewportStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="absolute inset-0 h-full w-full" data-map-transform style={transformStyle}>
            {children}
          </div>
          {!controlsOnRight && controls}
          {!directManipulation && !controlsOnRight && allowPageScroll && panEnabled && !disablePanZoom && <p className="pointer-events-none absolute bottom-2 left-2 rounded-kws-control bg-card px-2 py-1 text-xs shadow-soft">Karte bewegen · Hand erneut antippen zum Scrollen</p>}
        </div>
        {controlsOnRight && controls}
      </div>
      {directManipulation && <p className="mt-2 text-xs text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hidden">Mit zwei Fingern zoomen und verschieben.</p>}
      {!directManipulation && controlsOnRight && panEnabled && <p role="status" className="mt-2 text-xs text-muted-foreground">Karte bewegen · Hand erneut antippen zum Scrollen</p>}
    </div>
  );
}
