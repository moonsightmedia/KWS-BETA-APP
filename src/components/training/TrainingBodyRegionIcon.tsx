import { cn } from '@/lib/utils';

const regions: Record<string, { name: string; paths: string[]; joint?: [number, number]; head?: [number, number, number] }> = {
  Schulter: { name: 'shoulder', paths: ['M9 8 5 10q-2 1-2 4v7', 'M15 8l4 2q2 1 2 4v7', 'M7 14v8M17 14v8'], head: [12, 4.5, 2.5], joint: [18.5, 11.5] },
  'Finger und Hand': { name: 'hand', paths: ['M8 21q-3-3-4-6l-1-2q0-2 2-1l3 3V7q0-2 2-2v8-9q0-2 2-2t2 2v9-8q0-2 2-2t2 2v8-6q0-2 2-2t2 2v9q0 4-3 6', 'M8 21h11'] },
  Ellenbogen: { name: 'elbow', paths: ['M5 3v10q0 7 7 7l9-1v-5l-9-1q-1 0-1-2V3'], joint: [8, 15] },
  Knie: { name: 'knee', paths: ['M4 3l9 7q5 3 3 8l-2 4', 'M2 8l8 6q1 1 0 3l-2 5'], joint: [13, 14] },
  Hüfte: { name: 'hip', paths: ['M7 3v5l-3 5 3 9', 'M17 3v5l3 5-3 9', 'M7 8h10M7 13l5 3 5-3M12 16v6'], joint: [17, 12] },
  Wade: { name: 'calf', paths: ['M8 2q-3 6-1 10l1 7-3 3h12v-3l-3-1 1-6q3-6 0-10', 'M10 6q4 4 1 8'] },
};

export default function TrainingBodyRegionIcon({ topic, className }: { topic: string; className?: string }) {
  const region = regions[topic];
  if (!region) return null;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-body-region={region.name} className={cn('h-5 w-5 shrink-0', className)}>
    {region.paths.map(path => <path key={path} d={path} />)}
    {region.head && <circle cx={region.head[0]} cy={region.head[1]} r={region.head[2]} />}
    {region.joint && <circle cx={region.joint[0]} cy={region.joint[1]} r="2.5" fill="currentColor" stroke="none" />}
  </svg>;
}
