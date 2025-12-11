import { Session } from '@supabase/supabase-js';

export class UploadLogger {
  private sessionId: string;
  private retryCount: number = 0;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  static async create(
    sessionId: string,
    boulderId: string | null,
    fileType: 'video' | 'thumbnail',
    fileName: string,
    fileSize: number,
    totalChunks: number,
    session: Session | null // CRITICAL: Session must be passed for RLS after reload
  ) {
    console.log('[UploadLogger] 📝 Creating upload log:', { sessionId, boulderId, fileType, fileName, fileSize, totalChunks, hasSession: !!session });
    
    // CRITICAL: Use direct fetch instead of Supabase QueryBuilder
    // QueryBuilder doesn't work reliably on localhost after reload
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[UploadLogger] ❌ Supabase-Konfiguration fehlt');
      throw new Error('Supabase-Konfiguration fehlt');
    }

    // IMPORTANT: RLS uses auth.uid(), so we need the session access token, not just the API key
    if (!session?.access_token) {
      console.error('[UploadLogger] ❌ No session access token available');
      throw new Error('Keine aktive Session. Bitte melde dich an.');
    }

    const logData = {
      session_id: sessionId,
      boulder_id: boulderId,
      file_type: fileType,
      status: 'pending',
      file_name: fileName,
      file_size: fileSize,
      total_chunks: totalChunks,
      progress: 0,
      uploaded_chunks: 0
    };

    console.log('[UploadLogger] 📤 Inserting upload log via REST API...');
    
    const response = await window.fetch(
      `${SUPABASE_URL}/rest/v1/upload_logs`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`, // Use session token for RLS
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(logData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UploadLogger] ❌ Failed to create log:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('[UploadLogger] ✅ Upload log created successfully');
    
    return new UploadLogger(sessionId);
  }

  async updateProgress(progress: number, uploadedChunksCount?: number) {
    const updates: any = {
      progress,
      status: 'uploading',
      updated_at: new Date().toISOString()
    };
    
    if (uploadedChunksCount !== undefined) {
      updates.uploaded_chunks = uploadedChunksCount;
    }

    const { error } = await supabase
      .from('upload_logs')
      .update(updates)
      .eq('session_id', this.sessionId);

    if (error) {
      console.warn('[UploadLogger] Failed to update progress:', error);
    }
  }

  async updateStatus(status: 'pending' | 'uploading' | 'completed' | 'failed', progress?: number, errorMsg?: any) {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (progress !== undefined) {
      updates.progress = progress;
    }
    
    if (errorMsg) {
        // Extract message if it's an error object
      updates.error = errorMsg instanceof Error ? errorMsg.message : String(errorMsg);
    }

    const { error } = await supabase
      .from('upload_logs')
      .update(updates)
      .eq('session_id', this.sessionId);

    if (error) {
      console.error('[UploadLogger] Failed to update status:', error);
    }
  }
  
  async incrementRetry() {
      this.retryCount++;
      // Optionally log this retry to DB if we had a retries column, currently just tracking locally/console
      console.log(`[UploadLogger] Retry ${this.retryCount} for session ${this.sessionId}`);
  }
}

export async function getActiveUploads() {
    const { data, error } = await supabase
        .from('upload_logs')
        .select('*')
        .in('status', ['pending', 'uploading'])
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('[UploadLogger] Failed to fetch active uploads:', error);
        return [];
    }
    return data;
}


