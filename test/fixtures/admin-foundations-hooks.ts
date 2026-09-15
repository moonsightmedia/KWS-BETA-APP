// Test-only module, substituted by Playwright. Never authenticates a real account.
export const fixtureUser = { id: 'qa-admin', email: 'admin@example.test', user_metadata: {} };
const session = { user: fixtureUser, access_token: 'fixture-only-not-a-credential' };
export const useAuth = () => {
  const loading = new URLSearchParams(location.search).get('state') === 'auth-loading';
  return { user: loading ? null : fixtureUser, session: loading ? null : session, loading, authTransition: null, signOut: async () => {} };
};
export const useIsAdmin = () => ({ isAdmin: true, loading: false });
export const useHasRole = () => ({ hasRole: true, loading: false });

export const supabase = {
  from: (table: string) => ({
    update: (payload: Record<string, unknown>) => ({
      eq: (_column: string, id: string) => {
        const perform = async () => {
          window.adminQA.writes.push({ table, id, payload });
          await new Promise(resolve => setTimeout(resolve, window.adminQA.delay));
          if (window.adminQA.writeMode === 'fail') return { data: null, error: new Error('Testfehler') };
          if (window.adminQA.writeMode === 'empty') return { data: [], error: null };
          window.adminQA.profiles = window.adminQA.profiles.map(row => row.id === id ? { ...row, ...payload } : row);
          return { data: [{ id }], error: null };
        };
        return { then: (resolve: (value: unknown) => void) => perform().then(resolve), select: perform };
      },
    }),
  }),
  auth: { resetPasswordForEmail: async (email: string) => {
    window.adminQA.writes.push({ operation: 'password-email', email });
    await new Promise(resolve => setTimeout(resolve, window.adminQA.delay));
    return { error: window.adminQA.writeMode === 'fail' ? new Error('Testfehler') : null };
  } },
};

declare global {
  interface Window {
    adminQA: {
      profiles: Array<{ id: string; email: string; full_name: string; first_name: string; last_name: string; birth_date: string | null; created_at: string }>;
      writes: Array<unknown>;
      roles: Array<{ user_id: string; role: string }>;
      failSources: string[];
      writeMode: 'success' | 'fail' | 'empty';
      delay: number;
      pushEnabled?: boolean;
      pushDevicesEmpty?: boolean;
      reads?: string[];
    };
  }
}
