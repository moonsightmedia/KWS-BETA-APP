import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate, useRoutes, type Location, type RouteObject } from 'react-router-dom';
import { RouteSwipeContext, RouteSwipePreviewContext, type RouteSwipeController } from '@/contexts/RouteSwipeContext';
import { routeSwipeDuration, routeSwipeOffset, shouldCommitRouteSwipe } from '@/lib/routeSwipeMotion';

interface Pane { id: number; location: Location }
interface Gesture {
  source: Pane; target: Pane | null; width: number; delta: number;
  clip: string; animations: Animation[]; originals: Map<HTMLElement, string>;
  settling: boolean; committing: boolean;
}

function Page({ routes, location }: { routes: RouteObject[]; location: Location }) {
  return useRoutes(routes, location);
}

/** Keep the incoming React page mounted from its first drag frame through URL commit. */
export function MainRoutePager({ routes }: { routes: RouteObject[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const serial = useRef(1);
  const [panes, setPanes] = useState<Pane[]>(() => [{ id: serial.current, location }]);
  const nodes = useRef(new Map<number, HTMLDivElement>());
  const gesture = useRef<Gesture | null>(null);
  const state = useRef({ panes, location, navigate, routes });
  state.current = { panes, location, navigate, routes };

  const controller = useMemo<RouteSwipeController>(() => {
    let frame = 0;
    const surface = (pane: Pane) => nodes.current.get(pane.id)?.querySelector('main');
    const translate = (pane: Pane, offset: number) => {
      const main = surface(pane);
      if (!main || !gesture.current) return;
      if (!gesture.current.originals.has(main)) gesture.current.originals.set(main, main.style.transform);
      main.style.transform = `translate3d(${offset}px, 0, 0)`;
    };
    const restore = () => {
      cancelAnimationFrame(frame); frame = 0;
      const current = gesture.current;
      gesture.current = null;
      current?.animations.forEach(animation => animation.cancel());
      current?.originals.forEach((transform, main) => { main.style.transform = transform; });
    };
    const cancel = () => {
      if (!gesture.current) return;
      const source = gesture.current.source;
      restore();
      setPanes([source]);
    };
    const apply = () => {
      frame = 0;
      const current = gesture.current;
      if (!current) return;
      const offset = routeSwipeOffset(current.delta, current.width, !current.target);
      translate(current.source, offset);
      if (current.target) translate(current.target, offset + (current.delta < 0 ? current.width : -current.width));
    };

    return {
      move(element, path, delta) {
        if (gesture.current?.settling || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const source = state.current.panes[0];
        const main = element.closest('main') ?? element.querySelector('main');
        if (!main) return;
        const supported = path && state.current.routes.some(route => route.path === path);
        const previous = gesture.current;
        if (!previous || previous.target?.location.pathname !== (supported ? path : undefined)) {
          restore();
          const bounds = main.getBoundingClientRect();
          const headerBottom = nodes.current.get(source.id)?.querySelector('[data-kws-dashboard-header]')?.getBoundingClientRect().bottom ?? Math.max(0, bounds.top);
          const target: Pane | null = supported ? {
            id: ++serial.current,
            location: { pathname: path!, search: '', hash: '', state: null, key: `swipe-${serial.current}` },
          } : null;
          gesture.current = {
            source, target, width: bounds.width, delta,
            clip: `inset(${Math.max(0, headerBottom)}px ${Math.max(0, innerWidth - bounds.right)}px 0px ${Math.max(0, bounds.left)}px)`,
            animations: [], originals: new Map(), settling: false, committing: false,
          };
          // This inert, frozen-location preview becomes the same keyed page
          // after navigation. It never gets a separate entrance animation.
          flushSync(() => setPanes(target ? [source, target] : [source]));
        }
        gesture.current!.delta = delta;
        if (!frame) frame = requestAnimationFrame(apply);
      },
      finish(path, delta, velocity, minimum) {
        const current = gesture.current;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const width = current?.width ?? innerWidth;
          cancel();
          if (path && shouldCommitRouteSwipe(delta, velocity, width, minimum)) state.current.navigate(path);
          return;
        }
        if (!current || current.settling) return;
        // Optional development routes outside the pager retain normal navigation.
        if (path && !state.current.routes.some(route => route.path === path)) {
          cancel();
          if (shouldCommitRouteSwipe(delta, velocity, current.width, minimum)) state.current.navigate(path);
          return;
        }
        cancelAnimationFrame(frame); frame = 0;
        current.delta = delta;
        apply();
        const commit = !!path && !!current.target && shouldCommitRouteSwipe(delta, velocity, current.width, minimum);
        const offset = routeSwipeOffset(delta, current.width, !current.target);
        const direction = delta < 0 ? -1 : 1;
        const end = commit ? direction * current.width : 0;
        current.settling = true;
        const duration = routeSwipeDuration(end - offset, current.width);
        const animate = (pane: Pane, from: number, to: number) => {
          const main = surface(pane);
          if (!main || typeof main.animate !== 'function') { translate(pane, to); return null; }
          const animation = main.animate([
            { transform: `translate3d(${from}px,0,0)` },
            { transform: `translate3d(${to}px,0,0)` },
          ], { duration, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' });
          current.animations.push(animation);
          return animation;
        };
        const outgoing = animate(current.source, offset, end);
        if (current.target) animate(current.target, offset - direction * current.width, commit ? 0 : -direction * current.width);
        const done = () => {
          if (gesture.current !== current) return;
          if (commit && path) {
            current.committing = true;
            state.current.navigate(path);
          } else cancel();
        };
        if (outgoing) outgoing.onfinish = done;
        else done();
      },
      cancel,
    };
  }, []);

  useLayoutEffect(() => {
    const current = gesture.current;
    const arriving = current?.committing && current.target?.location.pathname === location.pathname ? current.target : null;
    if (panes[0].location === location) return;
    // Reset document scroll before the incoming viewport layer becomes normal
    // page flow. Keep its key, DOM, data and component state across the commit.
    if (arriving) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    controller.cancel();
    setPanes([{ id: arriving?.id ?? (panes[0].location.pathname === location.pathname ? panes[0].id : ++serial.current), location }]);
  }, [location, controller, panes]);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => controller.cancel();
    window.addEventListener('resize', onChange);
    media.addEventListener('change', onChange);
    return () => {
      controller.cancel();
      window.removeEventListener('resize', onChange);
      media.removeEventListener('change', onChange);
    };
  }, [controller]);

  return <RouteSwipeContext.Provider value={controller}>
    {panes.map((pane, index) => <RouteSwipePreviewContext.Provider key={pane.id} value={index > 0}>
      <div ref={node => { if (node) { node.inert = index > 0; nodes.current.set(pane.id, node); } else nodes.current.delete(pane.id); }}
        data-main-route-pane={pane.location.pathname} data-route-preview={index > 0 || undefined}
        aria-hidden={index > 0 || undefined}
        style={index > 0 ? { position: 'fixed', inset: 0, zIndex: 15, pointerEvents: 'none', overflow: 'clip', clipPath: gesture.current?.clip } : undefined}>
        <div data-route-page><Page routes={routes} location={pane.location} /></div>
      </div>
    </RouteSwipePreviewContext.Provider>)}
  </RouteSwipeContext.Provider>;
}
