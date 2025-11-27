import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UploadStatus {
  id: string;
  upload_session_id: string;
  file_name: string;
  file_type: 'video' | 'thumbnail';
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed' | 'duplicate';
  progress: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  boulder_id: string | null;
}

/**
 * Hook to track active uploads in real-time
 */
export function useUploadTracker() {
  const [activeUploads, setActiveUploads] = useState<Map<string, UploadStatus>>(new Map());

  // Query for active uploads (pending, compressing, uploading)
  // Show all active uploads, regardless of when they started
  const { data: uploads, refetch } = useQuery({
    queryKey: ['active-uploads'],
    queryFn: async () => {
      console.log('[useUploadTracker] 🔄 Querying active uploads from database...');
      
      const { data, error } = await supabase
        .from('upload_logs')
        .select('*')
        .in('status', ['pending', 'compressing', 'uploading'])
        .order('created_at', { ascending: false })
        .limit(100); // Increased limit to show more uploads

      // Ensure started_at is set if not already set (use created_at as fallback)
      if (data) {
        data.forEach((upload: any) => {
          if (!upload.started_at && upload.created_at) {
            upload.started_at = upload.created_at;
          }
        });
      }

      console.log('[useUploadTracker] 📊 Query result:', {
        hasError: !!error,
        error: error ? error.message : null,
        dataCount: data?.length || 0,
        data: data?.map(u => ({
          sessionId: u.upload_session_id,
          boulderId: u.boulder_id,
          fileName: u.file_name,
          fileType: u.file_type,
          status: u.status,
          progress: u.progress
        })) || []
      });

      if (error) {
        console.error('[useUploadTracker] ❌ Query error:', error);
        throw error;
      }
      
      console.log(`[useUploadTracker] ✅ Found ${data?.length || 0} active uploads`);
      return (data || []) as UploadStatus[];
    },
    refetchInterval: 1000, // Poll every 1 second for active uploads to show real-time progress
  });

  // Update active uploads map
  useEffect(() => {
    if (uploads) {
      console.log('[useUploadTracker] 🔄 Updating active uploads map:', {
        uploadsCount: uploads.length,
        uploads: uploads.map(u => ({
          sessionId: u.upload_session_id,
          boulderId: u.boulder_id,
          status: u.status
        }))
      });
      
      const uploadMap = new Map<string, UploadStatus>();
      uploads.forEach((upload) => {
        uploadMap.set(upload.upload_session_id, upload);
      });
      
      console.log('[useUploadTracker] ✅ Active uploads map updated:', {
        mapSize: uploadMap.size,
        mapKeys: Array.from(uploadMap.keys())
      });
      
      setActiveUploads(uploadMap);
    } else {
      console.log('[useUploadTracker] ⚠️ No uploads data to update map');
    }
  }, [uploads]);

  // Get upload by session ID
  const getUpload = useCallback((sessionId: string): UploadStatus | undefined => {
    return activeUploads.get(sessionId);
  }, [activeUploads]);

  // Get all active uploads as array
  const getActiveUploads = useCallback((): UploadStatus[] => {
    return Array.from(activeUploads.values());
  }, [activeUploads]);

  // Check if there are any active uploads
  const hasActiveUploads = activeUploads.size > 0;

  // Get uploads for a specific boulder
  const getBoulderUploads = useCallback((boulderId: string): UploadStatus[] => {
    return Array.from(activeUploads.values()).filter(
      (upload) => upload.boulder_id === boulderId
    );
  }, [activeUploads]);

  // Cancel/abort an upload by marking it as failed
  const cancelUpload = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('upload_logs')
        .update({
          status: 'failed',
          error_message: 'Upload wurde vom Benutzer abgebrochen',
          completed_at: new Date().toISOString(),
        })
        .eq('upload_session_id', sessionId)
        .in('status', ['pending', 'compressing', 'uploading']);

      if (error) throw error;
      
      // Refetch to update the list
      await refetch();
    } catch (error) {
      console.error('[UploadTracker] Failed to cancel upload:', error);
      throw error;
    }
  }, [refetch]);

  return {
    activeUploads: getActiveUploads(),
    getUpload,
    getBoulderUploads,
    hasActiveUploads,
    cancelUpload,
    refetch,
  };
}

