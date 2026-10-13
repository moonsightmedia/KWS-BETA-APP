export const TRAINING_ILLUSTRATION_ATLASES = {
  strength: '/training/strength-atlas.png?v=kws-green-2',
  boulder: '/training/boulder-atlas.png?v=kws-green-2',
  equipment: '/training/equipment-atlas.png',
};
// Generated 1254 × 1254 atlases; illustration crops are editorial previews.
// Their arrangement is verified separately from coaching approval of technique.
export const TRAINING_ILLUSTRATION_STATUS = 'schematic-preview' as const;
export const TRAINING_ILLUSTRATION_OVERRIDES: Record<string, string> = {
  'side-plank': '/training/side-plank-knees.png',
  'dumbbell-bench': '/training/dumbbell-bench.png?v=kws-green-2',
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
