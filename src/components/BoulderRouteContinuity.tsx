import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { UNSAFE_LocationContext, useLocation, useOutlet } from 'react-router-dom';
import { readBoulderOrigin } from '@/lib/boulderNavigation';

const ReturnContext = createContext(false);
export const useRetainedBoulderOrigin = () => useContext(ReturnContext);

/** Retain only the immediate source while its detail is open; release on other navigation.
 * Freeze its router location too, so URL filters and headers cannot change underneath it.
 */
export function BoulderRouteContinuity() {
  const location = useLocation();
  const locationContext = useContext(UNSAFE_LocationContext);
  const outlet = useOutlet();
  const source = useRef<{ element: ReactNode; context: typeof locationContext; scrollTop: number } | null>(null);
  const previousDetail = useRef(false);
  const sourceFocus = useRef<HTMLElement | null>(null);
  const origin = readBoulderOrigin(location.state);
  const isDetail = /^\/boulders\/[^/]+$/.test(location.pathname);
  const retained = isDetail && origin && source.current?.context.location.key === origin.key
    ? source.current : null;

  useLayoutEffect(() => {
    let restoreFrame: number | undefined;
    if (!isDetail) {
      if (previousDetail.current && source.current?.context.location.key === location.key) {
        const top = source.current.scrollTop;
        const restore = () => {
          window.scrollTo({ top, behavior: 'instant' });
          sourceFocus.current?.focus({ preventScroll: true });
        };
        restore();
        // Native scroll anchoring may run after unhiding the document content.
        restoreFrame = requestAnimationFrame(restore);
      }
      source.current = { element: outlet, context: locationContext, scrollTop: 0 };
    } else if (retained && origin) {
      // Kept only in memory. Do not alter the browser's history state.
      source.current = { ...retained, scrollTop: origin.scrollTop };
    } else {
      source.current = null;
    }
    previousDetail.current = Boolean(retained);
    return () => { if (restoreFrame !== undefined) cancelAnimationFrame(restoreFrame); };
  }, [isDetail, location.key, locationContext, origin, outlet, retained]);

  return <ReturnContext.Provider value={Boolean(retained)}>
    <div key="source" hidden={isDetail} aria-hidden={isDetail || undefined}
      onFocusCapture={event => { sourceFocus.current = event.target as HTMLElement; }}>
      <UNSAFE_LocationContext.Provider value={retained?.context ?? locationContext}>
        {isDetail ? retained?.element : outlet}
      </UNSAFE_LocationContext.Provider>
    </div>
    {isDetail ? <div key={location.pathname} className="kws-detail-enter">{outlet}</div> : null}
  </ReturnContext.Provider>;
}
