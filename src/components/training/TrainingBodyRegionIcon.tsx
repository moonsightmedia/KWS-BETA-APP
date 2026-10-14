import { cn } from '@/lib/utils';

const regions: Record<string, { name: string; paths: string[]; joint?: [number, number]; head?: [number, number, number]; size?: number; silhouette?: string }> = {
  Schulter: { name: 'shoulder', paths: ['M9 8 5 10q-2 1-2 4v7', 'M15 8l4 2q2 1 2 4v7', 'M7 14v8M17 14v8'], head: [12, 4.5, 2.5], joint: [18.5, 11.5] },
  'Finger und Hand': { name: 'hand', paths: ['M8 21q-3-3-4-6l-1-2q0-2 2-1l3 3V7q0-2 2-2v8-9q0-2 2-2t2 2v9-8q0-2 2-2t2 2v8-6q0-2 2-2t2 2v9q0 4-3 6', 'M8 21h11'] },
  Ellenbogen: {
    name: 'elbow', size: 32,
    silhouette: 'M7 3C5 6 4 10 5 14l2 7q.5 3 4 3 2 0 4-2l8-9 3-3q3 0 3-3V4q0-2-2-2t-2 2l-1 2-1 2-8 7-2-11V3Z',
    paths: ['M25 6h3M24 8l3 2'], joint: [11, 20],
  },
  Knie: {
    name: 'knee', size: 32,
    silhouette: 'M9 3l-3 8q-1 3 2 5l9 5-3 6-1 2q0 1 2 1h9q1 0 1-1 0-2-3-2h-3l4-7q1-3-2-5l-7-5 2-7Z',
    paths: [], joint: [20, 18],
  },
  Hüfte: { name: 'hip', paths: ['M7 3v5l-3 5 3 9', 'M17 3v5l3 5-3 9', 'M7 8h10M7 13l5 3 5-3M12 16v6'], joint: [17, 12] },
  Wade: { name: 'calf', paths: ['M8 2q-3 6-1 10l1 7-3 3h12v-3l-3-1 1-6q3-6 0-10', 'M10 6q4 4 1 8'] },
};

export default function TrainingBodyRegionIcon({ topic, className }: { topic: string; className?: string }) {
  const region = regions[topic];
  if (!region) return null;
  const size = region.size ?? 24;
  return <svg viewBox={`0 0 ${size} ${size}`} fill="none" stroke="currentColor" strokeWidth={1.75 * size / 24} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-body-region={region.name} className={cn('h-5 w-5 shrink-0', className)}>
    {region.silhouette && <><path d={region.silhouette} fill="currentColor" fillOpacity="0.1" stroke="none" /><path d={region.silhouette} /></>}
    {region.paths.map(path => <path key={path} d={path} />)}
    {region.head && <circle cx={region.head[0]} cy={region.head[1]} r={region.head[2]} />}
    {region.joint && <circle cx={region.joint[0]} cy={region.joint[1]} r={region.silhouette ? 1.8 : 2.5} fill="currentColor" stroke="none" />}
  </svg>;
}
