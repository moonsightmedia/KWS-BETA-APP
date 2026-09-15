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

  const updateScale = useCallback(
    (nextScale: number, focalPoint?: Point) => {
      const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);

      setScale((currentScale) => {
        if (clampedScale === currentScale) return currentScale;

        setTranslate((currentTranslate) => {
          if (!containerRef.current || !focalPoint) {
            return clampTranslate(currentTranslate, clampedScale);
          }

          const rect = containerRef.current.getBoundingClientRect();
          const center = { x: rect.width / 2, y: rect.height / 2 };
          const focalOffset = {
            x: focalPoint.x - center.x,
            y: focalPoint.y - center.y,
          };
          const scaleRatio = clampedScale / currentScale;

          return clampTranslate(
            {
              x: currentTranslate.x - focalOffset.x * (scaleRatio - 1),
              y: currentTranslate.y - focalOffset.y * (scaleRatio - 1),
            },
            clampedScale,
          );
        });

        return clampedScale;
      });
    },
    [clampTranslate],
  );

  useEffect(() => {
    if (disablePanZoom) return;
    const node = containerRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      if (allowPageScroll && !event.ctrlKey && !event.metaKey) return;
      if (!event.cancelable) return;
      event.preventDefault();

      const rect = node.getBoundingClientRect();
      updateScale(scale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [allowPageScroll, disablePanZoom, scale, updateScale]);

  const resetView = useCallback(() => {
    setPanEnabled(false);
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
    if (disablePanZoom || (allowPageScroll && !panEnabled)) return;
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
      setTranslate(clampTranslate({ x: dragOriginRef.current.x + deltaX, y: dragOriginRef.current.y + deltaY }, scale));
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

  return (
    <div className={cn('w-full max-w-full overflow-hidden', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full max-w-full overflow-hidden rounded-kws-card border border-white bg-[#FBFDF9] shadow-[0_10px_30px_rgba(25,36,54,0.07)]',
          disablePanZoom || (allowPageScroll && !panEnabled) ? 'touch-pan-y' : 'touch-none',
          !disablePanZoom && scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
          viewportClassName,
        )}
        style={viewportStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="absolute inset-0 h-full w-full" style={transformStyle}>
          {children}
        </div>
        {allowPageScroll && !disablePanZoom && <div className="absolute right-2 top-2 flex gap-1 rounded-kws-control bg-card p-1 shadow-soft" aria-label="Kartenzoom">
          <Button size="icon" variant={panEnabled ? 'default' : 'ghost'} aria-label={panEnabled ? 'Seitenscrollen aktivieren' : 'Karte verschieben'} aria-pressed={panEnabled} onClick={() => setPanEnabled(value => !value)}><Hand className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Karte verkleinern" disabled={scale <= MIN_SCALE} onClick={() => updateScale(scale - ZOOM_STEP)}><Minus className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Karte vergrößern" disabled={scale >= MAX_SCALE} onClick={() => updateScale(scale + ZOOM_STEP)}><Plus className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Kartenansicht zurücksetzen" disabled={scale === 1 && translate.x === 0 && translate.y === 0} onClick={resetView}><RotateCcw className="h-4 w-4" /></Button>
        </div>}
        {allowPageScroll && panEnabled && !disablePanZoom && <p className="pointer-events-none absolute bottom-2 left-2 rounded-kws-control bg-card px-2 py-1 text-xs shadow-soft">Karte bewegen · Hand erneut antippen zum Scrollen</p>}
      </div>
    </div>
  );
}
