import { cn } from '@/lib/utils';
import { getExercise } from '@/features/training/data';
import TrainingTopicIcon from './TrainingTopicIcon';
import { TRAINING_GLYPHS } from './training-glyphs';
import { KWS_EQUIPMENT_ILLUSTRATION_IDS, TRAINING_ILLUSTRATION_ATLASES, TRAINING_ILLUSTRATION_IDS, TRAINING_ILLUSTRATION_OVERRIDES } from './training-illustrations';

interface TrainingExerciseArtProps {
  exerciseId: string;
  title: string;
  className?: string;
}

export default function TrainingExerciseArt({ exerciseId, title, className }: TrainingExerciseArtProps) {
  const exercise = getExercise(exerciseId);
  // Each authored learning task/game gets its own motif, never another card's picture.
  if (TRAINING_GLYPHS[exerciseId] && (exercise?.illustrationId || exercise?.area === 'kids' || exercise?.area === 'rehab')) return <div role="img" aria-label={`Individuelles KWS-Motiv: ${title}. Symbolische Orientierung, keine Ausführungsanleitung.`} className={cn('grid aspect-square shrink-0 place-items-center rounded-kws-control bg-secondary/70 text-primary-ink', className)}><TrainingTopicIcon exerciseId={exerciseId} topic={exercise?.topic ?? ''} className="h-[62%] w-[62%]" /></div>;
  const illustrationId = exerciseId;
  const index = TRAINING_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  const equipmentIndex = KWS_EQUIPMENT_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  if (index < 0 && equipmentIndex < 0) return null;
  const tileIndex = equipmentIndex >= 0 ? equipmentIndex : index % 9;
  const column = tileIndex % 3;
  const row = Math.floor(tileIndex / 3);
  const rows = equipmentIndex >= 0 ? 4 : 3;
  const atlas = equipmentIndex >= 0 ? TRAINING_ILLUSTRATION_ATLASES.equipment : index < 9 ? TRAINING_ILLUSTRATION_ATLASES.strength : TRAINING_ILLUSTRATION_ATLASES.boulder;
  const override = TRAINING_ILLUSTRATION_OVERRIDES[illustrationId];
  return <div role="img" aria-label={`Schematische Illustration: ${title}. Zur Orientierung, kein Nachweis einer korrekten Ausführung.`} className={cn('aspect-square shrink-0 rounded-kws-control bg-secondary bg-no-repeat', className)} style={{ backgroundImage: `url('${override ?? atlas}')`, backgroundSize: override ? 'contain' : `300% ${rows * 100}%`, backgroundPosition: override ? 'center' : `${column / 2 * 100}% ${row / (rows - 1) * 100}%` }} />;
}
