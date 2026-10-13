import { cn } from '@/lib/utils';
import { TOPIC_GLYPH_IDS, TRAINING_GLYPHS } from './training-glyphs';

export default function TrainingTopicIcon({ exerciseId, topic, className }: { exerciseId?: string; topic: string; className?: string }) {
  const glyphId = exerciseId && TRAINING_GLYPHS[exerciseId] ? exerciseId : TOPIC_GLYPH_IDS[topic];
  const glyph = glyphId ? TRAINING_GLYPHS[glyphId] : undefined;
  if (!glyph) return null;
  return <svg viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-training-icon={glyphId} className={cn('h-5 w-5 shrink-0', className)}>
    {glyph.paths.map((d, index) => <path key={index} d={d} />)}
    {glyph.circles?.map(([cx, cy, r], index) => <circle key={index} cx={cx} cy={cy} r={r} />)}
  </svg>;
}
