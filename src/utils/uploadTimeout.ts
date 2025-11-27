/**
 * Upload Timeout Utility
 * Automatically marks stale/hung uploads as failed
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Mark uploads that have been stuck in compressing/uploading status for too long as failed
 * This prevents uploads from staying in "compressing" or "uploading" status forever
 */
export async function markStaleUploadsAsFailed(): Promise<void> {
  try {
    // Mark uploads that have been in compressing/uploading status for more than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('upload_logs')
      .update({
        status: 'failed',
        error_message: 'Upload timeout: Upload wurde nicht innerhalb von 30 Minuten abgeschlossen',
        completed_at: new Date().toISOString(),
        error_details: {
          message: 'Upload timeout',
          code: 'UPLOAD_TIMEOUT',
          timeout: true,
        },
      })
      .in('status', ['compressing', 'uploading'])
      .lt('started_at', thirtyMinutesAgo)
      .is('completed_at', null);

    if (error) {
      console.error('[UploadTimeout] Failed to mark stale uploads as failed:', error);
    } else {
      console.log('[UploadTimeout] Checked for stale uploads');
    }
  } catch (error) {
    console.error('[UploadTimeout] Exception marking stale uploads:', error);
  }
}

/**
 * Run this periodically to clean up stale uploads
 */
export function startStaleUploadCleanup(intervalMinutes: number = 5): () => void {
  // Run immediately
  markStaleUploadsAsFailed();
  
  // Then run periodically
  const intervalId = setInterval(() => {
    markStaleUploadsAsFailed();
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}



