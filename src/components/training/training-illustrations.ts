export const TRAINING_ILLUSTRATION_ATLASES = {
  strength: '/training/strength-atlas.png',
  boulder: '/training/boulder-atlas.png',
};
// Generated 1254 × 1254 atlases; illustration crops are editorial previews.
// Their arrangement is verified separately from coaching approval of technique.
export const TRAINING_ILLUSTRATION_STATUS = 'schematic-preview' as const;
export const TRAINING_ILLUSTRATION_OVERRIDES: Record<string, string> = {
  'dumbbell-bench': '/training/dumbbell-bench.png',
};
export const TRAINING_ILLUSTRATION_IDS = [
  'incline-pushup', 'pushup', 'dumbbell-bench', 'dumbbell-floor', 'band-press', 'band-row',
  'pullup', 'split-squat', 'dead-bug', 'quiet-feet', 'foot-swap', 'edge-choice',
  'smearing', 'high-step', 'hip-position', 'heel-hook', 'read-boulder', 'controlled-move',
] as const;
