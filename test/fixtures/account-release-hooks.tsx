// Isolated rendered QA. No production account, email, credential or API calls.
import type { ReactNode } from 'react';
const params = new URLSearchParams(location.search);
const fixtureUser = { id: 'f0000000-0000-4000-8000-000000000016', email: 'qa@example.invalid', user_metadata: { full_name: 'Alexandra Bergmann' } };
const record = { id: 'f0000000-0000-4000-8000-000000000018', user_id: fixtureUser.id, requested_at: '2026-10-12T08:00:00Z', due_at: '2026-10-19T08:00:00Z', status: 'pending' as const };
let saved = params.get('state') === 'pending';
export const useAuth = () => ({ user: params.get('view') === 'auth' ? null : fixtureUser, session: { access_token: 'fixture-only' }, loading: false,
  signIn: async () => {}, signUp: async () => { document.dispatchEvent(new CustomEvent('qa-account-action', { detail: 'Registrierung an Testumgebung übergeben' })); }, resetPassword: async () => {}, resendConfirmation: async () => {} });
export async function getAccountDeletionRequest() { if (params.get('state') === 'load-error') throw new Error('Isolierter Ladefehler'); return saved ? record : null; }
export async function requestAccountDeletion() {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (params.get('state') === 'error') throw new Error('Isolierter Testfehler: Bitte versuche es erneut.');
  saved = true; document.dispatchEvent(new CustomEvent('qa-account-action', { detail: 'Ein Löschantrag gespeichert' })); return record;
}
export async function getPendingAccountDeletions() { if (params.get('state') === 'error') throw new Error('Isolierter Ladefehler'); return params.get('state') === 'empty' ? [] : [record]; }
export const formatDeletionDeadline = (value: string) => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const DashboardPageLayout = ({ children }: { children: ReactNode }) => <main className="min-h-screen bg-background px-4 pb-16 pt-8 md:px-8">{children}</main>;
export const fetchProfileRecord = async () => ({ full_name: 'Alexandra Bergmann', email: fixtureUser.email, avatar_url: null });
export const updateProfileRecord = async () => { throw new Error('Profiländerungen werden in dieser QA nicht ausgeführt.'); };
export const uploadProfileAvatar = async () => { throw new Error('Dateioperationen in dieser QA gesperrt.'); };
export const deleteProfileAvatar = async () => {};
export const supabase = { auth: { updateUser: async () => ({ error: new Error('Auth-Änderungen in dieser QA gesperrt.') }) } };
export const useBoulders = () => ({ data: [], isLoading: false });
export const useBouldersWithSectors = useBoulders;
export const useCreateBoulder = () => ({ mutateAsync: async () => { throw new Error('QA write blocked'); }, isPending: false });
export const useDeleteBoulder = useCreateBoulder;
export const useDeleteAllBoulders = useCreateBoulder;
export const useSectors = () => ({ data: [], isLoading: false });
export const useSectorsTransformed = () => ({ data: [{ id: 'qa-sector', name: 'Testsektor' }], isLoading: false });
export const useColors = () => ({ data: [], isLoading: false });
export const useBoulderAttributeCatalog = () => ({ data: [], isLoading: false });
export const useSetBoulderAttributes = useCreateBoulder;
