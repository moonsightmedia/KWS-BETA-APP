import { TOPIC_GLYPH_IDS } from './training-glyphs';
import TrainingBodyRegionIcon from './TrainingBodyRegionIcon';
import TrainingExerciseArt from './TrainingExerciseArt';

export default function TrainingTopicIcon({ exerciseId, topic, className }: { exerciseId?: string; topic: string; className?: string }) {
  if (['Schulter', 'Finger und Hand', 'Ellenbogen', 'Knie', 'Hüfte', 'Wade'].includes(topic)) return <TrainingBodyRegionIcon topic={topic} className={className} />;
  const illustrationId = exerciseId ?? TOPIC_GLYPH_IDS[topic];
  return illustrationId ? <span aria-hidden="true"><TrainingExerciseArt exerciseId={illustrationId} title={topic} className={className} /></span> : null;
}
