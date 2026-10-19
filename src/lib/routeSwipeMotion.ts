// A one-shot handover between the outgoing and incoming main-page hooks.
// It never enters history state, so Back/Forward cannot replay an old swipe.
let arrival: { path: string; direction: number; expires: number } | null = null;

export function prepareSwipeArrival(path: string, direction: number) {
  arrival = { path, direction, expires: Date.now() + 1000 };
}

export function createRouteSwipeMotion(element: HTMLElement) {
  // Keep the fixed header and navigation still, regardless of where the page
  // attaches its gesture ref. The main surface also works for loading states.
  const surface = element.closest('main') ?? element.querySelector('main') ?? element;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const original = { transform: surface.style.transform, willChange: surface.style.willChange };
  let animation: Animation | undefined;
  let frame = 0;
  let offset = 0;
  let complete: (() => void) | undefined;

  const restore = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    animation?.cancel();
    animation = undefined;
    surface.style.transform = original.transform;
    surface.style.willChange = original.willChange;
    offset = 0;
  };

  const settle = (destination: number, duration: number, onFinish?: () => void) => {
    cancelAnimationFrame(frame);
    frame = 0;
    const from = getComputedStyle(surface).transform;
    animation?.cancel();
    complete = onFinish;
    if (media.matches || typeof surface.animate !== 'function') {
      restore();
      complete = undefined;
      onFinish?.();
      return;
    }
    surface.style.willChange = 'transform';
    animation = surface.animate([
      { transform: from === 'none' ? 'translateX(0)' : from },
      { transform: `translateX(${destination}px)` },
    ], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    animation.onfinish = () => {
      // Keep the departure pose until the router commits and destroys this
      // surface. Restoring here would flash the old page back to its origin.
      if (!onFinish) restore();
      complete = undefined;
      onFinish?.();
    };
  };

  const onReducedMotion = () => {
    if (!media.matches) return;
    const done = complete;
    complete = undefined;
    restore();
    done?.();
  };
  media.addEventListener('change', onReducedMotion);

  return {
    enter(path: string) {
      const pending = arrival;
      arrival = null;
      if (!pending || pending.path !== path || pending.expires < Date.now() || media.matches) return;
      surface.style.transform = `translateX(${-pending.direction * 32}px)`;
      settle(0, 200);
    },
    drag(deltaX: number, atEdge: boolean) {
      if (media.matches) return;
      // Bounded feedback avoids moving a long page out of its viewport. At the
      // first/last page the smaller resistance explains that there is no neighbor.
      offset = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * (atEdge ? 0.1 : 0.32), atEdge ? 12 : 48);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        animation?.cancel();
        animation = undefined;
        complete = undefined;
        surface.style.willChange = 'transform';
        surface.style.transform = `translateX(${offset}px)`;
      });
    },
    reset() { settle(0, 180); },
    leave(direction: number, onFinish: () => void) {
      // Continue from the rendered release position, never spring back before
      // navigation. The short departure and arrival form one directional motion.
      settle(direction * Math.max(Math.abs(offset), 48), 90, onFinish);
    },
    destroy() {
      complete = undefined;
      restore();
      media.removeEventListener('change', onReducedMotion);
    },
  };
}
