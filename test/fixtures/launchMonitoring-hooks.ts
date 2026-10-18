const user = { id: 'fixture-admin', email: 'admin@example.test', user_metadata: {} };
export const useAuth = () => ({ user, session: { user, access_token: 'fixture-only' }, loading: false });
