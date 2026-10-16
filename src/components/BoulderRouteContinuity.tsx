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
  const source = useRef<{ element: ReactNode; context: typeof locationContext } | null>(null);
  const previousDetail = useRef(false);
  const sourceFocus = useRef<HTMLElement | null>(null);
  const sourceContainer = useRef<HTMLDivElement>(null);
  const origin = readBoulderOrigin(location.state);
  const isDetail = /^\/boulders\/[^/]+$/.test(location.pathname);
  const retained = isDetail && origin && source.current?.context.location.key === origin.key
    ? source.current : null;

  useLayoutEffect(() => {
    if (sourceContainer.current) sourceContainer.current.inert = isDetail;
    if (!isDetail) return;

    // Keep the source's viewport and layout intact while the detail scrolls in
    // its own foreground layer. Compensate classic desktop scrollbar removal.
    const body = document.body;
    const documentRoot = document.documentElement;
    const overflow = documentRoot.style.overflow;
    const padding = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    documentRoot.style.overflow = 'hidden';
    return () => { documentRoot.style.overflow = overflow; body.style.paddingRight = padding; };
  }, [isDetail]);

  useLayoutEffect(() => {
    if (!isDetail) {
      if (previousDetail.current && source.current?.context.location.key === location.key) {
        sourceFocus.current?.focus({ preventScroll: true });
      }
      source.current = { element: outlet, context: locationContext };
    } else if (!retained) {
      source.current = null;
    }
    previousDetail.current = Boolean(retained);
  }, [isDetail, location.key, locationContext, outlet, retained]);

  return <ReturnContext.Provider value={Boolean(retained)}>
    <div key="source" ref={sourceContainer} className="isolate" aria-hidden={isDetail || undefined}
      onFocusCapture={event => { sourceFocus.current = event.target as HTMLElement; }}>
      <UNSAFE_LocationContext.Provider value={retained?.context ?? locationContext}>
        {isDetail ? retained?.element : outlet}
      </UNSAFE_LocationContext.Provider>
    </div>
    {isDetail ? <div key={location.pathname} data-boulder-detail-scroll
      className="fixed inset-0 z-20 overflow-y-auto overscroll-y-contain bg-brand-canvas">
      <div className="kws-detail-enter">{outlet}</div>
    </div> : null}
  </ReturnContext.Provider>;
}
