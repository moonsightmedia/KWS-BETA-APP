import type { Session } from '@supabase/supabase-js';

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
  accessToken: string;
} {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase-Konfiguration fehlt');
  }
  if (!session?.access_token) {
    throw new Error('Keine aktive Session. Bitte melde dich an.');
  }

  return { url, key, accessToken: session.access_token };
}

async function patchUploadLog(
  sessionId: string,
  accessToken: string,
  updates: Record<string, unknown>,
): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;

  try {
    const response = await window.fetch(
      `${url}/rest/v1/upload_logs?session_id=eq.${encodeURIComponent(sessionId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${accessToken}`,
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
  private accessToken: string | null = null;

  constructor(sessionId: string, accessToken?: string | null) {
    this.sessionId = sessionId;
    this.accessToken = accessToken ?? null;
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

    const { url, key, accessToken } = getRestConfig(session);

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

    const response = await window.fetch(`${url}/rest/v1/upload_logs`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
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
    return new UploadLogger(sessionId, accessToken);
  }

  setAccessToken(accessToken: string | null) {
    this.accessToken = accessToken;
  }

  async updateProgress(progress: number, uploadedChunksCount?: number) {
    if (!this.accessToken) {
      console.warn('[UploadLogger] No access token for progress update');
      return;
    }

    const updates: Record<string, unknown> = {
      progress,
      status: 'uploading',
      updated_at: new Date().toISOString(),
    };

    if (uploadedChunksCount !== undefined) {
      updates.uploaded_chunks = uploadedChunksCount;
    }

    await patchUploadLog(this.sessionId, this.accessToken, updates);
  }

  async updateStatus(
    status: UploadLogStatus,
    progress?: number,
    errorMsg?: unknown,
  ) {
    if (!this.accessToken) {
      console.warn('[UploadLogger] No access token for status update');
      return;
    }

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

    await patchUploadLog(this.sessionId, this.accessToken, updates);
  }

  async incrementRetry() {
    this.retryCount += 1;
    console.log(`[UploadLogger] Retry ${this.retryCount} for session ${this.sessionId}`);
  }
}

export async function getActiveUploads(session: Session | null) {
  if (!session?.access_token) return [];

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  try {
    const response = await window.fetch(
      `${url}/rest/v1/upload_logs?status=in.(pending,compressing,uploading)&order=created_at.desc`,
      {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${session.access_token}`,
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

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return 0;

  try {
    const filter = sessionIds?.length
      ? `session_id=in.(${sessionIds.map(encodeURIComponent).join(',')})`
      : 'status=in.(pending,compressing,uploading)';

    const response = await window.fetch(
      `${url}/rest/v1/upload_logs?${filter}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${session.access_token}`,
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
      const fallback = await window.fetch(
        `${url}/rest/v1/upload_logs?${filter}`,
        {
          method: 'PATCH',
          headers: {
            apikey: key,
            Authorization: `Bearer ${session.access_token}`,
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
