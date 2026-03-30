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
import honeycombBg from '@/assets/honeycomb-original.png';

interface InteractiveMapStageProps {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  compact?: boolean;
  lockAspectRatio?: boolean;
  panPadding?: number;
  honeycombBackground?: boolean;
  onViewportChange?: (viewport: { scale: number; translate: Point }) => void;
}

type Point = { x: number; y: number };

const MIN_SCALE = 0.82;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.35;

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
  honeycombBackground = false,
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

  useEffect(() => {
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
  }, []);

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
    const node = containerRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
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
  }, [scale, updateScale]);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    dragStartRef.current = null;
    pinchStartDistanceRef.current = null;
    pointerPositionsRef.current.clear();
  }, []);

  useEffect(() => {
    resetView();
  }, [resetView, width, height, compact]);

  useEffect(() => {
    onViewportChange?.({ scale, translate });
  }, [onViewportChange, scale, translate]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    if (!node) return;
    node.setPointerCapture(event.pointerId);
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointerPositionsRef.current.size === 1) {
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      dragOriginRef.current = translate;
    }

    if (pointerPositionsRef.current.size === 2) {
      const [first, second] = Array.from(pointerPositionsRef.current.values());
      pinchStartDistanceRef.current = distance(first, second);
      pinchStartScaleRef.current = scale;
      dragStartRef.current = null;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
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
      setTranslate(clampTranslate({ x: dragOriginRef.current.x + deltaX, y: dragOriginRef.current.y + deltaY }, scale));
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
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
      ...(honeycombBackground
        ? {
            backgroundColor: '#f4f4f4',
            backgroundImage: `url(${honeycombBg})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '768px auto',
            backgroundPosition: 'center top',
          }
        : {}),
    }),
    [honeycombBackground, lockAspectRatio, width, height],
  );

  return (
    <div className={cn('w-full max-w-full overflow-hidden', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full max-w-full overflow-hidden rounded-2xl border border-[#DEE6E0] bg-[#F7FAF7] touch-none',
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
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
      </div>
    </div>
  );
}
