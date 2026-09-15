/** Recovery is a read-only reconciliation, never a request to upload again. */
export interface RecoverableUploadLog {
  id: string;
  session_id: string;
  user_id: string | null;
  boulder_id: string | null;
  file_type: 'video' | 'thumbnail';
  file_name: string;
  file_size: number;
  status: string;
  progress: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadBoulderEvidence {
  id: string;
  beta_video_url?: string | null;
  beta_video_status?: string | null;
  beta_video_upload_session_id?: string | null;
  thumbnail_url?: string | null;
}

export type RecoveryDecision =
  | { kind: 'omit' }
  | { kind: 'restoring' | 'server_processing' | 'recovery_review'; message: string };

export function classifyRecoveredUpload(
  log: RecoverableUploadLog,
  boulder: UploadBoulderEvidence | undefined,
  now = Date.now(),
): RecoveryDecision {
  if (['completed', 'duplicate', 'cancelled'].includes(log.status)
    || ['Upload entfernt', 'Upload abgebrochen'].includes((log.error || '').trim())) return { kind: 'omit' };
  if (!boulder) return { kind: 'recovery_review', message: 'Der zugehörige Boulder ist nicht verfügbar. Bitte in der Verwaltung prüfen.' };
  if (log.file_type === 'video') {
    const sameSession = boulder.beta_video_upload_session_id === log.session_id;
    // A URL or 100% alone is not proof: only the exact published job may disappear.
    if (sameSession && boulder.beta_video_status === 'ready' && boulder.beta_video_url?.trim()) return { kind: 'omit' };
    if (sameSession && ['queued', 'processing'].includes(boulder.beta_video_status || '')) {
      return { kind: 'server_processing', message: 'Die Datei liegt auf dem Server. Qualitätsstufen werden erstellt; kein erneuter Upload nötig.' };
    }
    if (boulder.beta_video_upload_session_id && !sameSession) {
      return { kind: 'recovery_review', message: 'Am Boulder ist eine andere Upload-Sitzung hinterlegt. Nicht erneut hochladen, zuerst prüfen.' };
    }
    if (sameSession && boulder.beta_video_status === 'failed') {
      return { kind: 'recovery_review', message: 'Die Verarbeitung auf dem Server ist fehlgeschlagen. Bitte in der Verwaltung prüfen.' };
    }
  }
  const mediaUrl = log.file_type === 'video' ? boulder.beta_video_url : boulder.thumbnail_url;
  if (mediaUrl?.trim() || (log.progress || 0) >= 100) {
    return { kind: 'recovery_review', message: 'Es gibt bereits Mediendaten oder 100 % im alten Protokoll. Der Abschluss ist nicht eindeutig bestätigt.' };
  }
  const age = now - Date.parse(log.updated_at);
  if (!Number.isFinite(age) || age < 10 * 60 * 1000) {
    return { kind: 'recovery_review', message: 'Dieser Upload könnte noch auf einem anderen Gerät laufen. Status später erneut prüfen.' };
  }
  return { kind: 'restoring', message: 'Auf diesem Gerät fehlt die Originaldatei. Nur fortsetzen, wenn der Upload auf keinem anderen Gerät läuft.' };
}

// Late progress requests must not turn a terminal database row back into uploading.
export function uploadLogTransitionFilter(status?: string): string {
  return status === 'uploading' || status === 'compressing'
    ? '&status=in.(pending,compressing,uploading)'
    : '';
}

type ReadJson = <T>(table: string, query: URLSearchParams) => Promise<T[]>;

export function mergeRecoveredUploads<T extends { sessionId: string; recoveredAt?: string; file?: unknown; nativeFile?: unknown }>(
  existing: T[], restored: T[], terminal: { has: (id: string) => boolean },
): T[] {
  const local = existing.filter(upload => !upload.recoveredAt || upload.file || upload.nativeFile);
  const localIds = new Set(local.map(upload => upload.sessionId));
  return [...local, ...restored.filter(upload => !localIds.has(upload.sessionId) && !terminal.has(upload.sessionId))];
}

export async function readUploadRecovery(userId: string, read: ReadJson) {
  if (!userId) throw new Error('Keine aktive Anmeldung.');
  const logs: RecoverableUploadLog[] = [];
  let cursor = '';
  for (;;) {
    const query = new URLSearchParams({
      select: 'id,session_id,user_id,boulder_id,file_type,file_name,file_size,status,progress,error,created_at,updated_at',
      user_id: `eq.${userId}`, status: 'in.(pending,uploading,compressing,failed,aborted_suspected_oom)',
      order: 'id.asc', limit: '200',
    });
    if (cursor) query.set('id', `gt.${cursor}`);
    const page = await read<RecoverableUploadLog>('upload_logs', query);
    if (!Array.isArray(page) || page.some(log => log.user_id !== userId)) throw new Error('Upload-Zuordnung konnte nicht geprüft werden.');
    logs.push(...page);
    if (page.length < 200) break;
    const next = page.at(-1)?.id;
    if (!next || next <= cursor) throw new Error('Upload-Protokolle konnten nicht vollständig geladen werden.');
    cursor = next;
  }
  const ids = [...new Set(logs.map(log => log.boulder_id).filter((id): id is string => Boolean(id)))];
  const boulders = new Map<string, UploadBoulderEvidence>();
  // Small batches keep URL length bounded and never depend on the default REST row cap.
  for (let i = 0; i < ids.length; i += 100) {
    const rows = await read<UploadBoulderEvidence>('boulders', new URLSearchParams({
      select: 'id,beta_video_url,beta_video_status,beta_video_upload_session_id,thumbnail_url',
      id: `in.(${ids.slice(i, i + 100).join(',')})`, limit: '100',
    }));
    if (!Array.isArray(rows)) throw new Error('Boulder-Zuordnung konnte nicht geprüft werden.');
    rows.forEach(row => boulders.set(row.id, row));
  }
  return logs.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(log => ({
    log, decision: classifyRecoveredUpload(log, boulders.get(log.boulder_id || '')),
  }));
}
