import type { MapPoint } from '@/types/hallMap';

/** Insert next to the nearest edge, including the closing edge, not at an arbitrary end. */
export function insertPolygonPoint(points: MapPoint[], point: MapPoint, width: number, height: number) {
  if (points.length < 3) return [...points, point];
  let edge = 0;
  let nearest = Infinity;
  const px = point.x * width, py = point.y * height;
  points.forEach((a, index) => {
    const b = points[(index + 1) % points.length];
    const dx = (b.x - a.x) * width, dy = (b.y - a.y) * height;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((px - a.x * width) * dx + (py - a.y * height) * dy) / length)) : 0;
    const distance = (px - a.x * width - t * dx) ** 2 + (py - a.y * height - t * dy) ** 2;
    if (distance < nearest) { nearest = distance; edge = index; }
  });
  return [...points.slice(0, edge + 1), point, ...points.slice(edge + 1)];
}
