export const PULL_ACTIVATION_DISTANCE = 8;
export const PULL_THRESHOLD = 64;
export const MAX_PULL_DISTANCE = 104;

export type PullIntent = 'pending' | 'pull' | 'cancel';

export const resolvePullIntent = (deltaX: number, deltaY: number): PullIntent => {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);

  if (deltaY < -PULL_ACTIVATION_DISTANCE) return 'cancel';
  if (horizontalDistance > PULL_ACTIVATION_DISTANCE && horizontalDistance > verticalDistance) return 'cancel';
  if (deltaY > PULL_ACTIVATION_DISTANCE && verticalDistance >= horizontalDistance * 1.1) return 'pull';

  return 'pending';
};

export const getResistedPullDistance = (rawDistance: number): number => {
  if (rawDistance <= 0) return 0;
  return Math.min(MAX_PULL_DISTANCE, rawDistance * 0.78);
};

