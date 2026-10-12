import { getCurrentSession } from '@/lib/authenticatedFetch';
import { supabaseRestRequest } from '@/lib/supabaseRest';

export const reportReasons = [
  ['harassment', 'Beleidigung oder Belästigung'], ['sexual', 'Sexueller Inhalt'],
  ['violence', 'Gewalt oder gefährlicher Inhalt'], ['rights', 'Verletzung von Rechten'], ['other', 'Sonstiges'],
] as const;
export type ReportReason = typeof reportReasons[number][0];
export type ContentKind = 'comment' | 'boulder' | 'profile';
export interface ContentReport { id: string; kind: ContentKind; target_id: string; subject_user_id: string | null; reason: ReportReason; detail: string; created_at: string; status: 'open' | 'resolved'; content_text: string | null; boulder_id: string | null }
export interface PendingComment { id: string; user_id: string; boulder_id: string; comment: string; created_at: string }

async function request<T>(path: string, body?: unknown): Promise<T> {
  const session = await getCurrentSession();
  if (!session) throw new Error('Bitte melde dich erneut an.');
  return supabaseRestRequest<T>(`/rest/v1/${path}`, { accessToken: session.access_token, ...(body === undefined ? {} : { method: 'POST' as const, body }) });
}
export async function reportContent(kind: ContentKind, target: string, reason: ReportReason, detail: string) {
  if (!reportReasons.some(([value]) => value === reason) || detail.length > 1000) throw new Error('Bitte prüfe Grund und Beschreibung.');
  const result = await request<{ id?: string; received?: boolean }>('rpc/kws_report_content', { content_kind: kind, target, report_reason: reason, report_detail: detail.trim() });
  if (!result?.id || result.received !== true) throw new Error('Die Meldung wurde nicht bestätigt.');
}
export async function blockUser(target: string, blocked: boolean) {
  const result = await request<{ blocked?: boolean }>('rpc/kws_block_user', { target, blocked });
  if (result?.blocked !== blocked) throw new Error('Die Nutzersperre wurde nicht bestätigt.');
}
export const getBlockedUsers = () => request<Array<{ blocked_id: string }>>('community_blocks?select=blocked_id&order=created_at.desc');
export const getOpenReports = () => request<ContentReport[]>('rpc/kws_open_content_reports', {});
export const getPendingComments = () => request<PendingComment[]>('boulder_comments?select=id,user_id,boulder_id,comment,created_at&moderation_status=eq.pending&order=created_at.asc');
export async function moderateContent(kind: ContentKind | 'report', target: string, action: 'approve' | 'reject' | 'hide' | 'restore' | 'ban' | 'unban' | 'resolve', note = '') {
  const result = await request<{ confirmed?: boolean }>('rpc/kws_moderate_content', { content_kind: kind, target, action, note });
  if (result?.confirmed !== true) throw new Error('Die Moderationsaktion wurde nicht bestätigt.');
}
