import { supabase } from "@/integrations/supabase/client";

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
    totalChunks: number
  ) {
    // Note: boulder_id can be null initially and updated later if needed, 
    // but usually we have it. If null, we might need to allow nulls in DB or ensure we have it.
    // Our SQL schema allows boulder_id REFERENCES public.boulders(id), which implies it can be null?
    // Wait, in my SQL I wrote: `boulder_id UUID REFERENCES public.boulders(id)`. 
    // It doesn't say NOT NULL, so it's nullable.
    
    const { error } = await supabase
      .from('upload_logs')
      .insert({
        session_id: sessionId,
        boulder_id: boulderId,
        file_type: fileType,
        status: 'pending',
        file_name: fileName,
        file_size: fileSize,
        total_chunks: totalChunks,
        progress: 0,
        uploaded_chunks: 0
      });

    if (error) {
      console.error('[UploadLogger] Failed to create log:', error);
    }
    
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

