export const fixtureUser = { id: 'qa-admin', email: 'admin@example.test', user_metadata: {} };
const session = { user: fixtureUser, access_token: 'fixture-only' };

export const useAuth = () => ({ user: fixtureUser, session, loading: false, authTransition: null, signOut: async () => {} });

const write = async (table: string, payload: unknown, ids: string[]) => {
  window.adminOperationsQA.writes.push({ table, payload, ids });
  if (window.adminOperationsQA.writeMode === 'fail') return { data: null, error: new Error('Testfehler') };
  return { data: ids.map((id) => ({ id })), error: null };
};

export const supabase = {
  from: (table: string) => ({
    update: (payload: Record<string, unknown>) => ({
      eq: async (_column: string, id: string) => write(table, payload, [id]),
      in: async (_column: string, ids: string[]) => write(table, payload, ids),
    }),
  }),
  auth: { getUser: async () => ({ data: { user: fixtureUser }, error: null }) },
};

declare global {
  interface Window {
    adminOperationsQA: {
      writes: Array<{ method?: string; table?: string; payload?: unknown; ids?: string[]; url?: string }>;
      writeMode: 'success' | 'fail' | 'empty' | 'slow' | 'partial_second';
      readMode?: 'fail';
    };
  }
}
