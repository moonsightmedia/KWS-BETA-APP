import { cn } from '@/lib/utils';
import { TRAINING_ILLUSTRATION_ATLASES, TRAINING_ILLUSTRATION_IDS, TRAINING_ILLUSTRATION_OVERRIDES } from './training-illustrations';

interface TrainingExerciseArtProps {
  exerciseId: string;
  title: string;
  className?: string;
}

export default function TrainingExerciseArt({ exerciseId, title, className }: TrainingExerciseArtProps) {
  const index = TRAINING_ILLUSTRATION_IDS.findIndex(id => id === exerciseId);
  if (index < 0) return null;
  const tileIndex = index % 9;
  const column = tileIndex % 3;
  const row = Math.floor(tileIndex / 3);
  const atlas = index < 9 ? TRAINING_ILLUSTRATION_ATLASES.strength : TRAINING_ILLUSTRATION_ATLASES.boulder;
  const override = TRAINING_ILLUSTRATION_OVERRIDES[exerciseId];
  return <div role="img" aria-label={`Schematische Illustration: ${title}. Zur Orientierung, kein Nachweis einer korrekten Ausführung.`} className={cn('aspect-square shrink-0 rounded-kws-control bg-secondary bg-no-repeat', className)} style={{ backgroundImage: `url('${override ?? atlas}')`, backgroundSize: override ? 'contain' : '300% 300%', backgroundPosition: override ? 'center' : `${column / 2 * 100}% ${row / 2 * 100}%` }} />;
}
