import type { Difficulty } from '@/types/boulder';

export const DIFFICULTY_VALUES: Array<Exclude<Difficulty, null>> = [1, 2, 3, 4, 5, 6, 7, 8];

export function formatDifficulty(difficulty: Difficulty): string {
  return difficulty == null ? '?' : String(difficulty);
}
