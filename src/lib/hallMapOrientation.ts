import type { MapPoint } from '@/types/hallMap';

/** Display-only rotation. Stored points and sector IDs never change. */
export function getHallMapDisplayGeometry(width: number, height: number, mobile: boolean) {
  const rotateClockwise = mobile && width > height;
  return {
    width: rotateClockwise ? height : width,
    height: rotateClockwise ? width : height,
    rotateClockwise,
  };
}

export function toHallMapDisplayPoint(point: Readonly<MapPoint>, rotateClockwise: boolean): MapPoint {
  return rotateClockwise ? { x: 100 - point.y, y: point.x } : { x: point.x, y: point.y };
}
