import { authenticatedFetch } from '@/lib/authenticatedFetch';

export interface AccountDeletionRequest {
  id: string;
  user_id?: string | null;
  requested_at: string;
  due_at: string;
  status: 'pending' | 'processing' | 'completed';
}

async function deletionApi(path: string, init?: RequestInit) {
  const response = await authenticatedFetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${path}`, init);
  if (!response.ok) throw new Error('Die Anfrage konnte nicht bestätigt werden. Bitte versuche es erneut.');
  return response.json();
}

export async function getAccountDeletionRequest(userId: string): Promise<AccountDeletionRequest | null> {
  const rows = await deletionApi(`account_deletion_requests?select=id,requested_at,due_at,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
  if (!Array.isArray(rows)) throw new Error('Ungültige Antwort zur Kontolöschung.');
  return rows[0] ?? null;
}

export async function requestAccountDeletion(): Promise<AccountDeletionRequest> {
  const result = await deletionApi('rpc/kws_request_account_deletion', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  if (!result?.id || !result?.due_at || !['pending', 'processing'].includes(result.status)) {
    throw new Error('Der Löschantrag wurde nicht bestätigt. Bitte versuche es erneut.');
  }
  return result;
}

export async function getPendingAccountDeletions(): Promise<AccountDeletionRequest[]> {
  const rows = await deletionApi('account_deletion_requests?select=id,user_id,requested_at,due_at,status&status=neq.completed&order=due_at.asc');
  if (!Array.isArray(rows)) throw new Error('Ungültige Antwort zur Kontolöschung.');
  return rows;
}

export const formatDeletionDeadline = (value: string) => new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));
