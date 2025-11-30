import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UploadLogger, getActiveUploads } from '@/utils/uploadLogger';

export interface UploadLogItem {
  id: string;
  session_id: string;
  boulder_id: string | null;
  file_type: 'video' | 'thumbnail';
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  file_name: string;
  created_at: string;
}

export function useUploadTracker() {
  const queryClient = useQueryClient();

  // Initial fetch of active uploads
  const { data: activeUploads = [], isLoading } = useQuery({
    queryKey: ['active-uploads'],
    queryFn: getActiveUploads,
    // Refetch often or rely on realtime? Realtime is better.
    // But keep refetch as fallback.
    refetchInterval: 5000, 
  });

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('upload-tracker')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upload_logs'
        },
        (payload) => {
          // Invalidate query to refresh list
          queryClient.invalidateQueries({ queryKey: ['active-uploads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    activeUploads: activeUploads as UploadLogItem[],
    isLoading,
    hasActiveUploads: activeUploads.length > 0
  };
}


