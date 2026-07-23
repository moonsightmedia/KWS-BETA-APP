import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getActiveUploads } from '@/utils/uploadLogger';

export interface UploadLogItem {
  id: string;
  session_id: string;
  boulder_id: string | null;
  file_type: 'video' | 'thumbnail';
  status: 'pending' | 'uploading' | 'compressing' | 'completed' | 'failed' | 'aborted_suspected_oom';
  progress: number;
  error: string | null;
  file_name: string;
  created_at: string;
}

export function useUploadTracker() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const { data: activeUploads = [], isLoading } = useQuery({
    queryKey: ['active-uploads', session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => getActiveUploads(session),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('upload-tracker')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upload_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-uploads'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    activeUploads: activeUploads as UploadLogItem[],
    isLoading,
    hasActiveUploads: activeUploads.length > 0,
  };
}
