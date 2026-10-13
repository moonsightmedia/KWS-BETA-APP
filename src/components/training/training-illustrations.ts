export const TRAINING_ILLUSTRATION_ATLASES = {
  strength: '/training/strength-atlas.png?v=kws-green-2',
  boulder: '/training/boulder-atlas.png?v=kws-green-2',
  equipment: '/training/equipment-atlas-v2.png',
  kids: '/training/kids-atlas.png',
};
// The original 3x3 atlases are 1254px square; equipment/kids have inspected crops below.
// Their arrangement is verified separately from coaching approval of technique.
export const TRAINING_ILLUSTRATION_STATUS = 'schematic-preview' as const;
export const TRAINING_ILLUSTRATION_OVERRIDES: Record<string, string> = {
  'side-plank': '/training/side-plank-knees.png',
  'dumbbell-bench': '/training/dumbbell-bench.png?v=kws-green-2',
  'dead-bug': '/training/dead-bug-v3.png',
  'band-press': '/training/band-press-v2.png',
};
export const TRAINING_ILLUSTRATION_IDS = [
  'incline-pushup', 'pushup', 'dumbbell-bench', 'dumbbell-floor', 'band-press', 'band-row',
  'pullup', 'split-squat', 'dead-bug', 'quiet-feet', 'foot-swap', 'edge-choice',
  'smearing', 'high-step', 'hip-position', 'heel-hook', 'read-boulder', 'controlled-move',
] as const;
export const KWS_EQUIPMENT_ILLUSTRATION_IDS = [
  'bodyweight-squat', 'glute-bridge', 'calf-raise', 'side-plank', 'scapular-pullup',
  'kettlebell-floor-press', 'kettlebell-goblet-squat', 'kettlebell-row',
  'kettlebell-deadlift', 'ez-curl', 'fingerboard-feet-supported',
] as const;
export const KIDS_ILLUSTRATION_IDS = [
  'kids-colour-post', 'kids-animal-path', 'kids-treasure-clues',
  'kids-footprint-map', 'kids-shape-detectives', 'kids-story-stations',
  'kids-friendly-mirror', 'kids-route-builders', 'kids-move-memory',
  'kids-choice-lab', 'kids-helper-interview', 'kids-homeward-mission',
] as const;
/** Inspected square regions in the 1086x1448 v2 atlas; generated rows are uneven. */
export function equipmentIllustrationCrop(index: number) {
  const column = index % 3, row = Math.floor(index / 3);
  const size = row === 2 ? 330 : 362;
  return { x: column * 362 + (362 - size) / 2, y: [0, 362, 724, 1054][row], size, imageWidth: 1086, imageHeight: 1448 };
}
/** Inspected squares in the kids atlas, whose illustrated rows are not equidistant. */
export function kidsIllustrationCrop(index: number) {
  const column = index % 3, row = Math.floor(index / 3);
  const size = [350, 350, 345, 362][row];
  return { x: column * 362 + (362 - size) / 2, y: [0, 350, 700, 1043][row], size, imageWidth: 1086, imageHeight: 1448 };
}
