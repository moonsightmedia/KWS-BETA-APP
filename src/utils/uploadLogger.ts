import { backendConfig } from '@/lib/backendConfig';
import type { Session } from '@supabase/supabase-js';
import { uploadLogTransitionFilter } from '@/lib/uploadRecovery';
import { createAuthenticatedUploadFetch } from '@/lib/authenticatedFetch';

type UploadLogStatus =
  | 'pending'
  | 'compressing'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'duplicate'
  | 'aborted_suspected_oom';

function getRestConfig(session: Session | null): {
  url: string;
  key: string;
  ownerId: string;
} {
  const url = backendConfig.supabaseUrl;
  const key = backendConfig.publicKey;

  if (!url || !key) {
    throw new Error('Supabase-Konfiguration fehlt');
  }
  if (!session?.access_token) {
    throw new Error('Keine aktive Session. Bitte melde dich an.');
  }

  return { url, key, ownerId: session.user.id };
}

async function patchUploadLog(
  sessionId: string,
  ownerId: string,
  updates: Record<string, unknown>,
): Promise<boolean> {
  const url = backendConfig.supabaseUrl;
  const key = backendConfig.publicKey;
  if (!url || !key) return false;

  try {
    const response = await createAuthenticatedUploadFetch(ownerId)(
      `${url}/rest/v1/upload_logs?session_id=eq.${encodeURIComponent(sessionId)}${uploadLogTransitionFilter(updates.status as string | undefined)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(updates),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[UploadLogger] PATCH failed:', response.status, errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[UploadLogger] PATCH exception:', error);
    return false;
  }
}

export class UploadLogger {
  private sessionId: string;
  private retryCount = 0;
  private ownerId: string;

  constructor(sessionId: string, ownerId: string) {
    this.sessionId = sessionId;
    this.ownerId = ownerId;
  }

  static async create(
    sessionId: string,
    boulderId: string | null,
    fileType: 'video' | 'thumbnail',
    fileName: string,
    fileSize: number,
    totalChunks: number,
    session: Session | null,
  ) {
    console.log('[UploadLogger] Creating upload log:', {
      sessionId,
      boulderId,
      fileType,
      fileName,
      fileSize,
      totalChunks,
      hasSession: !!session,
    });

    const { url, key, ownerId } = getRestConfig(session);

    const logData = {
      session_id: sessionId,
      boulder_id: boulderId,
      file_type: fileType,
      status: 'pending',
      file_name: fileName,
      file_size: fileSize,
      total_chunks: totalChunks,
      progress: 0,
      uploaded_chunks: 0,
      user_id: session?.user?.id ?? null,
    };

    const response = await createAuthenticatedUploadFetch(ownerId)(`${url}/rest/v1/upload_logs`, {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UploadLogger] Failed to create log:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('[UploadLogger] Upload log created successfully');
    return new UploadLogger(sessionId, ownerId);
  }

  async updateProgress(progress: number, uploadedChunksCount?: number) {
    const updates: Record<string, unknown> = {
      progress,
      status: 'uploading',
      updated_at: new Date().toISOString(),
    };

    if (uploadedChunksCount !== undefined) {
      updates.uploaded_chunks = uploadedChunksCount;
    }

    await patchUploadLog(this.sessionId, this.ownerId, updates);
  }

  async updateStatus(
    status: UploadLogStatus,
    progress?: number,
    errorMsg?: unknown,
  ) {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (progress !== undefined) {
      updates.progress = progress;
    }

    if (errorMsg) {
      updates.error = errorMsg instanceof Error ? errorMsg.message : String(errorMsg);
    }

    await patchUploadLog(this.sessionId, this.ownerId, updates);
  }

  async incrementRetry() {
    this.retryCount += 1;
    console.log(`[UploadLogger] Retry ${this.retryCount} for session ${this.sessionId}`);
  }
}

export async function getActiveUploads(session: Session | null) {
  if (!session?.access_token) return [];

  const url = backendConfig.supabaseUrl;
  const key = backendConfig.publicKey;
  if (!url || !key) return [];

  try {
    const response = await createAuthenticatedUploadFetch(session.user.id)(
      `${url}/rest/v1/upload_logs?status=in.(pending,compressing,uploading)&order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      console.error('[UploadLogger] Failed to fetch active uploads:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('[UploadLogger] Failed to fetch active uploads:', error);
    return [];
  }
}

/** Mark stale in-progress logs as aborted after an unexpected app restart. */
export async function markStaleUploadsAsSuspectedOom(
  session: Session | null,
  sessionIds?: string[],
): Promise<number> {
  if (!session?.access_token) return 0;

  const url = backendConfig.supabaseUrl;
  const key = backendConfig.publicKey;
  if (!url || !key) return 0;

  try {
    const filter = sessionIds?.length
      ? `session_id=in.(${sessionIds.map(encodeURIComponent).join(',')})`
      : 'status=in.(pending,compressing,uploading)';

    const uploadFetch = createAuthenticatedUploadFetch(session.user.id);
    const response = await uploadFetch(
      `${url}/rest/v1/upload_logs?${filter}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          status: 'aborted_suspected_oom',
          error: 'App restarted while upload was in progress (suspected OOM/kill)',
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      // Fallback if constraint rejects new status
      const fallback = await uploadFetch(
        `${url}/rest/v1/upload_logs?${filter}`,
        {
          method: 'PATCH',
          headers: {
            apikey: key,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            status: 'failed',
            error: 'aborted_suspected_oom: App restarted while upload was in progress',
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!fallback.ok) return 0;
      const rows = await fallback.json();
      return Array.isArray(rows) ? rows.length : 0;
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows.length : 0;
  } catch (error) {
    console.warn('[UploadLogger] markStaleUploadsAsSuspectedOom failed:', error);
    return 0;
  }
}
