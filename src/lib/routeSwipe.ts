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

  // Pages follow their visual left-to-right order: drag left to reveal the
  // next page on the right, drag right to reveal the previous page on the left.
  return deltaX < 0 ? 'next' : 'previous';
};
