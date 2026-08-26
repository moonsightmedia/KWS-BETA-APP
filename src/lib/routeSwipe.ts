export const ROUTE_SWIPE_ACTIVATION_DISTANCE = 8;

export type HorizontalSwipeIntent =
  | 'pending'
  | 'horizontal'
  | 'vertical'
  | 'next'
  | 'previous';

export const resolveHorizontalSwipeIntent = (
  deltaX: number,
  deltaY: number,
  threshold = 56,
  axisRatio = 1.2,
): HorizontalSwipeIntent => {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);

  if (
    horizontalDistance <= ROUTE_SWIPE_ACTIVATION_DISTANCE
    && verticalDistance <= ROUTE_SWIPE_ACTIVATION_DISTANCE
  ) {
    return 'pending';
  }

  if (verticalDistance > horizontalDistance || horizontalDistance < verticalDistance * axisRatio) {
    return 'vertical';
  }

  if (horizontalDistance < threshold) {
    return 'horizontal';
  }

  // Existing app convention: a finger movement to the right advances to the
  // next main page; a movement to the left returns to the previous one.
  return deltaX > 0 ? 'next' : 'previous';
};
