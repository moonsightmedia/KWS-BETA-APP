import { cn } from '@/lib/utils';
import { getExercise } from '@/features/training/data';
import { equipmentIllustrationCrop, kidsIllustrationCrop, GRIP_ILLUSTRATION_IDS, MOBILITY_ILLUSTRATION_IDS, KIDS_ILLUSTRATION_IDS, KWS_EQUIPMENT_ILLUSTRATION_IDS, TRAINING_ILLUSTRATION_ATLASES, TRAINING_ILLUSTRATION_IDS, TRAINING_ILLUSTRATION_OVERRIDES } from './training-illustrations';

interface TrainingExerciseArtProps {
  exerciseId: string;
  title: string;
  className?: string;
}

export default function TrainingExerciseArt({ exerciseId, title, className }: TrainingExerciseArtProps) {
  const exercise = getExercise(exerciseId);
  const illustrationId = exercise?.illustrationId ?? exerciseId;
  const mobilityIndex = MOBILITY_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  if (mobilityIndex >= 0) return <div role="img" aria-label={`Schematische Illustration: ${title}. Zur Orientierung, kein Nachweis einer korrekten Ausführung.`} className={cn('aspect-square shrink-0 rounded-kws-control bg-secondary bg-no-repeat', className)} style={{ backgroundImage: `url('${TRAINING_ILLUSTRATION_ATLASES.mobility}')`, backgroundSize: '300% 300%', backgroundPosition: `${mobilityIndex % 3 / 2 * 100}% ${Math.floor(mobilityIndex / 3) / 2 * 100}%` }} />;
  const index = TRAINING_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  const equipmentIndex = KWS_EQUIPMENT_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  const kidsIndex = KIDS_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  const gripIndex = GRIP_ILLUSTRATION_IDS.findIndex(id => id === illustrationId);
  if (gripIndex >= 0) return <div role="img" aria-label={`Schematische Illustration: ${title}. Zur Orientierung, kein Nachweis einer korrekten Ausführung.`} className={cn('aspect-square shrink-0 rounded-kws-control bg-secondary bg-no-repeat', className)} style={{ backgroundImage: `url('${TRAINING_ILLUSTRATION_ATLASES.grips}')`, backgroundSize: '200% 200%', backgroundPosition: `${gripIndex % 2 * 100}% ${Math.floor(gripIndex / 2) * 100}%` }} />;
  if (index < 0 && equipmentIndex < 0 && kidsIndex < 0) return null;
  const tileIndex = kidsIndex >= 0 ? kidsIndex : equipmentIndex >= 0 ? equipmentIndex : index % 9;
  const column = tileIndex % 3;
  const row = Math.floor(tileIndex / 3);
  const rows = equipmentIndex >= 0 || kidsIndex >= 0 ? 4 : 3;
  const atlas = kidsIndex >= 0 ? TRAINING_ILLUSTRATION_ATLASES.kids : equipmentIndex >= 0 ? TRAINING_ILLUSTRATION_ATLASES.equipment : index < 9 ? TRAINING_ILLUSTRATION_ATLASES.strength : TRAINING_ILLUSTRATION_ATLASES.boulder;
  const override = TRAINING_ILLUSTRATION_OVERRIDES[illustrationId];
  const crop = override ? undefined : kidsIndex >= 0 ? kidsIllustrationCrop(kidsIndex) : equipmentIndex >= 0 ? equipmentIllustrationCrop(equipmentIndex) : undefined;
  return <div role="img" aria-label={`Schematische Illustration: ${title}. Zur Orientierung, kein Nachweis einer korrekten Ausführung.`} className={cn('aspect-square shrink-0 rounded-kws-control bg-secondary bg-no-repeat', className)} style={{ backgroundImage: `url('${override ?? atlas}')`, backgroundSize: override ? 'contain' : crop ? `${crop.imageWidth / crop.size * 100}% ${crop.imageHeight / crop.size * 100}%` : `300% ${rows * 100}%`, backgroundPosition: override ? 'center' : crop ? `${crop.x / (crop.imageWidth - crop.size) * 100}% ${crop.y / (crop.imageHeight - crop.size) * 100}%` : `${column / 2 * 100}% ${row / (rows - 1) * 100}%` }} />;
}
