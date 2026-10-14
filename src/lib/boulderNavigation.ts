import type { Location } from 'react-router-dom';

export type BoulderOrigin = { pathname: string; search: string; hash: string; key: string; scrollTop: number };
const origins = new Set(['/', '/app', '/boulders', '/guest', '/statistics']);

export function readBoulderOrigin(state: unknown): BoulderOrigin | null {
  const origin = (state as { boulderOrigin?: BoulderOrigin } | null)?.boulderOrigin;
  return origin && origins.has(origin.pathname) && typeof origin.search === 'string'
    && (origin.search === '' || origin.search.startsWith('?')) && typeof origin.hash === 'string'
    && (origin.hash === '' || origin.hash.startsWith('#')) && typeof origin.key === 'string'
    && Number.isFinite(origin.scrollTop) && origin.scrollTop >= 0 ? origin : null;
}

export function boulderNavigationState(location: Location) {
  return { boulderOrigin: { pathname: location.pathname, search: location.search, hash: location.hash,
    key: location.key, scrollTop: window.scrollY || document.scrollingElement?.scrollTop || 0 } };
}
