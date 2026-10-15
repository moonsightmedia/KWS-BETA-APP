import { useState } from 'react';
import { cn } from '@/lib/utils';

const regions: Record<string, string> = { Schulter: 'shoulder', 'Finger und Hand': 'hand', Ellenbogen: 'elbow', Knie: 'knee', Hüfte: 'hip', Wade: 'calf' };

/** Generated raster body-region artwork; color is contained in the image itself. */
export default function TrainingBodyRegionIcon({ topic, className, decorative = true }: { topic: string; className?: string; decorative?: boolean }) {
  const [failedTopic, setFailedTopic] = useState<string | null>(null);
  const region = regions[topic];
  if (!region) return null;
  if (failedTopic === topic) return <span aria-hidden="true" data-body-region={region} className={cn('inline-block h-12 w-12 rounded-kws-control bg-secondary', className)} />;
  return <img src={'/training/regions/' + region + '.png'} alt={decorative ? '' : 'Körpergrafik: ' + topic} aria-hidden={decorative || undefined} data-body-region={region} decoding="async" onError={() => setFailedTopic(topic)} className={cn('h-12 w-12 shrink-0 object-contain', className)} />;
}
