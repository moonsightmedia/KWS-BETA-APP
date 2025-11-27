/**
 * Upload Queue System
 * Manages sequential uploads with retry logic and progress tracking
 */

import { UploadLogger } from './uploadLogger';

export interface QueuedUpload {
  id: string;
  file: File;
  fileType: 'video' | 'thumbnail';
  boulderId?: string | null;
  uploadFn: (file: File, onProgress?: (progress: number) => void, boulderId?: string | null) => Promise<string>;
  onProgress?: (progress: number) => void;
  onComplete?: (url: string) => void;
  onError?: (error: Error) => void;
  retryCount: number;
  maxRetries: number;
  logger?: UploadLogger;
}

export class UploadQueue {
  private queue: QueuedUpload[] = [];
  private processing: boolean = false;
  private currentUpload: QueuedUpload | null = null;

  /**
   * Add upload to queue
   */
  enqueue(upload: Omit<QueuedUpload, 'id' | 'retryCount'>): string {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const queuedUpload: QueuedUpload = {
      ...upload,
      id,
      retryCount: 0,
      maxRetries: upload.maxRetries || 3,
    };
    
    this.queue.push(queuedUpload);
    this.processQueue();
    
    return id;
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const upload = this.queue.shift();
      if (!upload) break;

      this.currentUpload = upload;

      try {
        // Initialize logger if not provided
        if (!upload.logger) {
          const uploadType = upload.fileType === 'video' ? 'allinkl' : 'allinkl';
          upload.logger = new UploadLogger(
            upload.file,
            upload.fileType,
            uploadType,
            upload.boulderId
          );
          
          try {
            await upload.logger.initialize();
            await upload.logger.updateStatus('pending', 0);
          } catch (error: any) {
            if (error.message === 'Duplicate file detected') {
              upload.onError?.(error);
              continue;
            }
            console.warn('[UploadQueue] Logger initialization failed:', error);
          }
        }

        // Execute upload with retry logic
        const url = await this.executeWithRetry(upload);
        
        await upload.logger.updateStatus('completed', 100, null, null, url);
        upload.onComplete?.(url);
      } catch (error: any) {
        console.error('[UploadQueue] Upload failed:', error);
        
        // Increment retry count
        upload.retryCount++;
        
        if (upload.retryCount < upload.maxRetries) {
          // Retry: add back to queue
          console.log(`[UploadQueue] Retrying upload (${upload.retryCount}/${upload.maxRetries}):`, upload.file.name);
          await upload.logger?.incrementRetry();
          await upload.logger?.updateStatus('pending', 0, error);
          
          // Add back to front of queue for immediate retry
          this.queue.unshift(upload);
          
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, upload.retryCount - 1), 10000); // Max 10s
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries reached
          await upload.logger?.updateStatus('failed', 0, error);
          upload.onError?.(error);
        }
      }
    }

    this.currentUpload = null;
    this.processing = false;
  }

  /**
   * Execute upload with retry logic
   */
  private async executeWithRetry(upload: QueuedUpload): Promise<string> {
    const maxRetries = upload.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
          console.log(`[UploadQueue] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          await upload.logger?.incrementRetry();
          await upload.logger?.updateStatus('uploading', 0);
        }

        // Execute upload
        const url = await upload.uploadFn(
          upload.file,
          (progress) => {
            upload.onProgress?.(progress);
            upload.logger?.updateStatus('uploading', progress).catch(() => {});
          },
          upload.boulderId
        );

        return url;
      } catch (error: any) {
        lastError = error;
        console.warn(`[UploadQueue] Upload attempt ${attempt + 1} failed:`, error);

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) {
          throw error; // Don't retry non-retryable errors
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Upload failed after retries');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message?.toLowerCase() || '';
    const retryablePatterns = [
      'network',
      'timeout',
      'fetch',
      'connection',
      'offline',
      'failed to fetch',
      'networkerror',
    ];

    // Check if error is network-related
    if (retryablePatterns.some(pattern => message.includes(pattern))) {
      return true;
    }

    // Check if browser is offline
    if (!navigator.onLine) {
      return true;
    }

    // Check error name
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true;
    }

    // Don't retry validation errors or duplicate errors
    if (message.includes('duplicate') || message.includes('validation') || message.includes('invalid')) {
      return false;
    }

    return false;
  }

  /**
   * Get queue status
   */
  getStatus(): { queueLength: number; processing: boolean; currentUpload: QueuedUpload | null } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentUpload: this.currentUpload,
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.currentUpload = null;
    this.processing = false;
  }

  /**
   * Remove upload from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(u => u.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
}

// Singleton instance
export const uploadQueue = new UploadQueue();



