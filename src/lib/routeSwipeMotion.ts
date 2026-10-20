/** Position and release rules shared by touch and mouse. No 48px drag ceiling. */
export const routeSwipeOffset = (delta: number, width: number, edge = false) =>
  edge ? Math.sign(delta) * Math.min(24, Math.abs(delta) * 0.15)
    : Math.max(-width, Math.min(width, delta));

export const shouldCommitRouteSwipe = (delta: number, velocity: number, width: number, minimum = 56) =>
  Math.abs(delta) >= Math.max(minimum, width * 0.25)
  || (Math.abs(delta) >= 24 && Math.abs(velocity) >= 0.5 && Math.sign(delta) === Math.sign(velocity));

export const routeSwipeDuration = (remaining: number, width: number) =>
  Math.round(140 + Math.min(1, Math.abs(remaining) / width) * 120);
