import { supabase } from '@/integrations/supabase/client';

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  connectionType?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export interface NetworkInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onLine?: boolean;
}

export interface ChunkInfo {
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  failedChunks?: number[];
}

export interface ErrorDetails {
  code?: string;
  message: string;
  stack?: string;
  networkError?: boolean;
  timeout?: boolean;
  chunkNumber?: number;
  totalChunks?: number;
  statusCode?: number;
  responseText?: string;
}

export type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed' | 'duplicate';
export type FileType = 'video' | 'thumbnail';
export type UploadType = 'allinkl' | 'supabase';

export interface UploadLogData {
  upload_session_id: string;
  boulder_id?: string | null;
  file_name: string;
  file_size: number;
  file_type: FileType;
  upload_type: UploadType;
  status: UploadStatus;
  progress: number;
  error_message?: string | null;
  error_details?: ErrorDetails | null;
  final_url?: string | null;
  chunk_info?: ChunkInfo | null;
  device_info: DeviceInfo;
  network_info?: NetworkInfo | null;
  retry_count: number;
  file_hash?: string | null;
}

/**
 * Collect device information
 */
export function collectDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform || 'unknown';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent) && !/Edg/i.test(userAgent);

  // Get connection type if available (Network Information API)
  let connectionType: string | undefined;
  const nav = navigator as any;
  if (nav.connection) {
    connectionType = nav.connection.effectiveType || nav.connection.type || 'unknown';
  } else if (nav.mozConnection) {
    connectionType = nav.mozConnection.effectiveType || nav.mozConnection.type || 'unknown';
  } else if (nav.webkitConnection) {
    connectionType = nav.webkitConnection.effectiveType || nav.webkitConnection.type || 'unknown';
  }

  return {
    userAgent,
    platform,
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    connectionType,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
  };
}

/**
 * Collect network information
 */
export function collectNetworkInfo(): NetworkInfo {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (!connection) {
    return {
      onLine: navigator.onLine,
    };
  }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
    onLine: navigator.onLine,
  };
}

/**
 * Generate a unique session ID for an upload
 */
export function generateSessionId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

/**
 * Calculate SHA-256 hash of a file for duplicate detection
 */
export async function calculateFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.warn('[UploadLogger] Failed to calculate file hash:', error);
    // Return a fallback hash based on file name and size
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}

/**
 * Check if a file with the same hash was recently uploaded (duplicate detection)
 */
export async function checkForDuplicate(fileHash: string, fileName: string, fileSize: number): Promise<boolean> {
  try {
    // Check for exact hash match in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('upload_logs')
      .select('id, status, created_at')
      .eq('file_hash', fileHash)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[UploadLogger] Error checking for duplicates:', error);
      return false;
    }

    if (data && data.length > 0) {
      const recentLog = data[0];
      // If there's a completed upload with the same hash in the last 5 minutes, it's a duplicate
      if (recentLog.status === 'completed') {
        return true;
      }
    }

    // Also check for same filename and size in last 2 minutes (additional check)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: nameData, error: nameError } = await supabase
      .from('upload_logs')
      .select('id, status, created_at')
      .eq('file_name', fileName)
      .eq('file_size', fileSize)
      .gte('created_at', twoMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (nameError) {
      console.warn('[UploadLogger] Error checking for duplicate by name:', nameError);
      return false;
    }

    if (nameData && nameData.length > 0) {
      const recentLog = nameData[0];
      if (recentLog.status === 'completed' || recentLog.status === 'uploading') {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn('[UploadLogger] Exception checking for duplicates:', error);
    return false;
  }
}

/**
 * UploadLogger class for structured logging of uploads
 */
export class UploadLogger {
  private logId: string | null = null;
  private sessionId: string;
  private fileHash: string | null = null;

  constructor(
    private file: File,
    private fileType: FileType,
    private uploadType: UploadType,
    private boulderId?: string | null
  ) {
    this.sessionId = generateSessionId();
  }

  /**
   * Initialize the log entry in the database
   */
  async initialize(): Promise<void> {
    try {
      // Calculate file hash for duplicate detection
      this.fileHash = await calculateFileHash(this.file);

      // Check for duplicates
      const isDuplicate = await checkForDuplicate(this.fileHash, this.file.name, this.file.size);
      if (isDuplicate) {
        await this.createLogEntry('duplicate', 0, null, {
          message: 'Duplicate file detected',
          code: 'DUPLICATE_FILE',
        });
        throw new Error('Duplicate file detected');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const logData: UploadLogData = {
        upload_session_id: this.sessionId,
        boulder_id: this.boulderId || null,
        file_name: this.file.name,
        file_size: this.file.size,
        file_type: this.fileType,
        upload_type: this.uploadType,
        status: 'pending',
        progress: 0,
        error_message: null,
        error_details: null,
        final_url: null,
        chunk_info: null,
        device_info: collectDeviceInfo(),
        network_info: collectNetworkInfo(),
        retry_count: 0,
        file_hash: this.fileHash,
      };

      const { data, error } = await supabase
        .from('upload_logs')
        .insert({
          ...logData,
          user_id: user?.id || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[UploadLogger] Failed to create log entry:', error);
        // Don't throw - logging should not break uploads
        return;
      }

      this.logId = data.id;
    } catch (error: any) {
      if (error.message === 'Duplicate file detected') {
        throw error; // Re-throw duplicate errors
      }
      console.error('[UploadLogger] Failed to initialize log:', error);
      // Don't throw - logging should not break uploads
    }
  }

  /**
   * Update the log entry status and progress
   */
  async updateStatus(
    status: UploadStatus,
    progress: number,
    error?: Error | string | null,
    chunkInfo?: ChunkInfo | null,
    finalUrl?: string | null
  ): Promise<void> {
    if (!this.logId) {
      // Try to find existing log by session ID
      const { data } = await supabase
        .from('upload_logs')
        .select('id')
        .eq('upload_session_id', this.sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        this.logId = data.id;
      } else {
        console.warn('[UploadLogger] Cannot update log - no log ID found');
        return;
      }
    }

    try {
      const errorMessage = error
        ? typeof error === 'string'
          ? error
          : error.message || 'Unknown error'
        : null;

      const errorDetails: ErrorDetails | null = error && typeof error !== 'string'
        ? {
            message: error.message || 'Unknown error',
            code: (error as any).code,
            stack: error.stack,
            networkError: error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch'),
            timeout: error.message?.toLowerCase().includes('timeout'),
            statusCode: (error as any).statusCode || (error as any).status,
            responseText: (error as any).responseText,
          }
        : null;

      const updateData: Partial<UploadLogData> = {
        status,
        progress,
        error_message: errorMessage,
        error_details: errorDetails,
        chunk_info: chunkInfo || null,
        final_url: finalUrl || null,
        network_info: collectNetworkInfo(), // Update network info on each status change
      };

      if (status === 'completed' || status === 'failed' || status === 'duplicate') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('upload_logs')
        .update(updateData)
        .eq('id', this.logId);

      if (updateError) {
        console.error('[UploadLogger] Failed to update log:', updateError);
      }
    } catch (error) {
      console.error('[UploadLogger] Exception updating log:', error);
    }
  }

  /**
   * Increment retry count
   */
  async incrementRetry(): Promise<void> {
    if (!this.logId) return;

    try {
      const { data } = await supabase
        .from('upload_logs')
        .select('retry_count')
        .eq('id', this.logId)
        .single();

      if (data) {
        const newRetryCount = (data.retry_count || 0) + 1;
        await supabase
          .from('upload_logs')
          .update({ retry_count: newRetryCount })
          .eq('id', this.logId);
      }
    } catch (error) {
      console.error('[UploadLogger] Exception incrementing retry:', error);
    }
  }

  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the log ID
   */
  getLogId(): string | null {
    return this.logId;
  }

  /**
   * Create a log entry (used for duplicate detection)
   */
  private async createLogEntry(
    status: UploadStatus,
    progress: number,
    finalUrl: string | null,
    errorDetails?: ErrorDetails
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const logData: UploadLogData = {
        upload_session_id: this.sessionId,
        boulder_id: this.boulderId || null,
        file_name: this.file.name,
        file_size: this.file.size,
        file_type: this.fileType,
        upload_type: this.uploadType,
        status,
        progress,
        error_message: errorDetails?.message || null,
        error_details: errorDetails || null,
        final_url: finalUrl,
        chunk_info: null,
        device_info: collectDeviceInfo(),
        network_info: collectNetworkInfo(),
        retry_count: 0,
        file_hash: this.fileHash,
      };

      if (status === 'completed' || status === 'failed' || status === 'duplicate') {
        (logData as any).completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('upload_logs')
        .insert({
          ...logData,
          user_id: user?.id || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[UploadLogger] Failed to create log entry:', error);
        return;
      }

      this.logId = data.id;
    } catch (error) {
      console.error('[UploadLogger] Exception creating log entry:', error);
    }
  }
}

