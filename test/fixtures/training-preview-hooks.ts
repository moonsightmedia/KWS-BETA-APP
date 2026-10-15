import { useSyncExternalStore } from 'react';

let account = 'training-demo';
const listeners = new Set<() => void>();
export const switchPreviewAccount = () => { account = account === 'training-demo' ? 'training-demo-2' : 'training-demo'; listeners.forEach(listener => listener()); };
export const useAuth = () => {
  const id = useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => account);
  return { user: { id, email: 'demo@example.invalid', user_metadata: { first_name: 'Demo' } }, session: { user: { id } }, loading: false, authTransition: null, reauthRequired: false, signOut: async () => { switchPreviewAccount(); } };
};
export const useIsAdmin = () => ({ isAdmin: false, loading: false });
export const useHasRole = () => ({ hasRole: false, loading: false });
export const fetchProfileRecord = async () => ({ first_name: 'Demo', avatar_url: null });
