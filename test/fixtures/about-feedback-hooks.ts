const role = new URLSearchParams(location.search).get('role') || 'admin';
const user = { id: `fixture-${role}`, email: 'beispiel@example.test', user_metadata: {} };
export const useAuth = () => ({ user, session: { access_token: 'synthetic-fixture-token', user }, loading: false, reauthRequired: false, authTransition: null, signOut: async () => {} });
export const useIsAdmin = () => ({ isAdmin: ['admin', 'stale', 'error'].includes(role), loading: false });
export const useHasRole = () => ({ hasRole: role !== 'user', loading: false });
export const useAccountProfile = () => ({ data: { full_name: 'Beispielkonto', avatar_url: null } });
export const authenticatedFetch = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init);
