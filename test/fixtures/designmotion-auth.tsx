import { useSyncExternalStore } from 'react';
let id = 'designmotion-user';
const listeners = new Set<() => void>();
export function switchFixtureAccount() { id = 'another-user'; listeners.forEach(fn => fn()); }
export function useAuth() {
  const userId = useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => id);
  return { user: { id: userId }, session: { access_token: 'isolated-fixture' }, loading: false };
}
