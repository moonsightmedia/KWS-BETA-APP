import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UploadLogger } from '@/utils/uploadLogger';
import { resumableUpload } from '@/utils/resumableUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ActiveUpload {
  sessionId: string;
  boulderId: string;
  file: File | null;
  fileName: string;
  fileSize: number;
  type: 'video' | 'thumbnail';
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'restoring' | 'cancelled';
  error?: string;
  sectorId?: string;
  abortController?: AbortController;
}

interface UploadContextType {
  uploads: ActiveUpload[];
  startUpload: (boulderId: string, file: File, type: 'video' | 'thumbnail', sectorId?: string) => Promise<string>;
  resumeUpload: (sessionId: string, file: File) => Promise<void>;
  cancelUpload: (sessionId: string) => void;
  removeUpload: (sessionId: string) => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploads, setUploads] = useState<ActiveUpload[]>([]);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const MAX_CONCURRENT_UPLOADS = 4; // Maximum number of simultaneous uploads
  const processingRef = useRef<Set<string>>(new Set()); // Track which uploads are being processed

  // Helper function to check and start queued uploads
  const processQueue = useCallback(() => {
    setUploads(prev => {
      const activeCount = prev.filter(u => 
        (u.status === 'uploading' || u.status === 'pending') && processingRef.current.has(u.sessionId)
      ).length;
      
      if (activeCount >= MAX_CONCURRENT_UPLOADS) {
        return prev; // Already at max concurrent uploads
      }

      // Find next pending upload that's not being processed
      const nextUpload = prev.find(u => 
        u.status === 'pending' && u.file && !processingRef.current.has(u.sessionId)
      );

      if (nextUpload) {
        // Mark as being processed
        processingRef.current.add(nextUpload.sessionId);
        // Start the upload asynchronously
        processUpload(nextUpload).catch(err => {
          console.error('Error processing upload:', err);
          processingRef.current.delete(nextUpload.sessionId);
        });
      }
      
      return prev;
    });
  }, []);

  const updateUpload = useCallback((sessionId: string, updates: Partial<ActiveUpload>) => {
    setUploads(prev => {
      const updated = prev.map(u => u.sessionId === sessionId ? { ...u, ...updates } : u);
      // After updating, check if we can start more uploads
      setTimeout(() => processQueue(), 0);
      return updated;
    });
  }, [processQueue]);

  const processUpload = async (upload: ActiveUpload, abortSignal?: AbortSignal) => {
    if (!upload.file) {
      processingRef.current.delete(upload.sessionId);
      return;
    }

    // Check if cancelled
    if (upload.status === 'cancelled') {
      processingRef.current.delete(upload.sessionId);
      return;
    }

    // Update status to uploading
    updateUpload(upload.sessionId, { status: 'uploading', progress: 0, error: undefined });

    try {
        // Helper to update DB logs
        const updateLog = async (status: string, progress?: number, error?: string) => {
             const updates: any = { status, updated_at: new Date().toISOString() };
             if (progress !== undefined) updates.progress = progress;
             if (error !== undefined) updates.error = error || null;
             
             await supabase.from('upload_logs')
                .update(updates)
                .eq('session_id', upload.sessionId);
        };

        if (upload.status === 'pending') {
             try {
                 await UploadLogger.create(
                    upload.sessionId,
                    upload.boulderId,
                    upload.type,
                    upload.fileName,
                    upload.fileSize,
                    Math.ceil(upload.fileSize / (5 * 1024 * 1024))
                );
             } catch (e) {
                 // Ignore if already exists
             }
        }

        const API_URL = import.meta.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';
        
        // Create abort controller if not provided
        const controller = abortSignal ? undefined : new AbortController();
        if (controller) {
            abortControllersRef.current[upload.sessionId] = controller;
            updateUpload(upload.sessionId, { abortController: controller });
        }
        
        const url = await resumableUpload(
            upload.file,
            API_URL,
            {
                sessionId: upload.sessionId,
                sectorId: upload.sectorId,
                onProgress: (p) => {
                    // Check if cancelled by checking current state
                    setUploads(prev => {
                        const current = prev.find(u => u.sessionId === upload.sessionId);
                        if (current?.status === 'cancelled') return prev;
                        return prev.map(u => u.sessionId === upload.sessionId ? { ...u, progress: p } : u);
                    });
                    updateLog('uploading', p);
                },
                abortSignal: abortSignal || controller?.signal
            }
        );

        await updateLog('completed', 100);
        
        // Update Boulder Record
        if (upload.type === 'video') {
            await supabase.from('boulders').update({ beta_video_url: url }).eq('id', upload.boulderId);
        } else {
            await supabase.from('boulders').update({ thumbnail_url: url }).eq('id', upload.boulderId);
        }

        updateUpload(upload.sessionId, { status: 'completed', progress: 100 });
        toast.success(`${upload.type === 'video' ? 'Video' : 'Thumbnail'} hochgeladen!`);

        // Clean up
        delete abortControllersRef.current[upload.sessionId];
        processingRef.current.delete(upload.sessionId);

        // Trigger queue processing to start next upload
        processQueue();

        // Remove from list after delay
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.sessionId !== upload.sessionId));
        }, 5000);

    } catch (error: any) {
        // Check if it was cancelled
        if (error.name === 'AbortError' || upload.status === 'cancelled') {
            updateUpload(upload.sessionId, { status: 'cancelled' });
            await supabase.from('upload_logs').update({ 
                 status: 'failed', 
                 error: 'Upload abgebrochen' 
            }).eq('session_id', upload.sessionId);
            delete abortControllersRef.current[upload.sessionId];
            processingRef.current.delete(upload.sessionId);
            processQueue(); // Start next upload
            return;
        }
        
        console.error('Upload failed:', error);
        updateUpload(upload.sessionId, { status: 'error', error: error.message });
        
        await supabase.from('upload_logs').update({ 
             status: 'failed', 
             error: error.message 
        }).eq('session_id', upload.sessionId);
        
        delete abortControllersRef.current[upload.sessionId];
        processingRef.current.delete(upload.sessionId);
        
        // Trigger queue processing to start next upload
        processQueue();
    }
  };

  const startUpload = useCallback(async (boulderId: string, file: File, type: 'video' | 'thumbnail', sectorId?: string) => {
    const sessionId = type === 'video' 
        ? Math.random().toString(36).substring(2) + Date.now().toString(36)
        : `thumb_${Math.random().toString(36).substring(2) + Date.now().toString(36)}`;

    const newUpload: ActiveUpload = {
        sessionId,
        boulderId,
        file,
        fileName: file.name,
        fileSize: file.size,
        type,
        progress: 0,
        status: 'pending',
        sectorId
    };

    setUploads(prev => [...prev, newUpload]);
    // Check if we can start this upload immediately
    setTimeout(() => processQueue(), 0);
    
    return sessionId;
  }, [processQueue]);

  const resumeUpload = useCallback(async (sessionId: string, file: File) => {
     let targetUpload: ActiveUpload | undefined;
     
     setUploads(prev => {
         return prev.map(u => {
             if (u.sessionId === sessionId) {
                 targetUpload = { ...u, file, status: 'pending', error: undefined };
                 return targetUpload;
             }
             return u;
         });
     });
     
     if (targetUpload) {
         processingRef.current.add(targetUpload.sessionId);
         processUpload(targetUpload).catch(err => {
           console.error('Error resuming upload:', err);
           processingRef.current.delete(targetUpload.sessionId);
         });
     }
  }, []);

  const cancelUpload = useCallback(async (sessionId: string) => {
    setUploads(prev => {
        const upload = prev.find(u => u.sessionId === sessionId);
        if (!upload) return prev;

        // Abort if uploading
        if (upload.status === 'uploading' || upload.status === 'pending') {
            const controller = abortControllersRef.current[sessionId] || upload.abortController;
            if (controller) {
                controller.abort();
            }
        }

        // Update DB log
        supabase.from('upload_logs').update({ 
             status: 'failed', 
             error: 'Upload abgebrochen' 
        }).eq('session_id', sessionId);

        // Remove from list after short delay
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.sessionId !== sessionId));
            delete abortControllersRef.current[sessionId];
        }, 1000);

        return prev.map(u => u.sessionId === sessionId ? { ...u, status: 'cancelled' as const } : u);
    });
  }, []);

  const removeUpload = useCallback(async (sessionId: string) => {
    const upload = uploads.find(u => u.sessionId === sessionId);
    
    // Cancel if active
    if (upload && (upload.status === 'uploading' || upload.status === 'pending')) {
        const controller = abortControllersRef.current[sessionId] || upload.abortController;
        if (controller) {
            controller.abort();
        }
    }

    // Try to delete from DB log first
    const { data: deletedData, error: deleteError } = await supabase
        .from('upload_logs')
        .delete()
        .eq('session_id', sessionId)
        .select();

    if (deleteError) {
        // If delete fails (e.g., RLS policy), mark it as deleted so it won't be restored
        console.warn('[UploadContext] Failed to delete upload log, marking as removed:', deleteError);
        const { error: updateError } = await supabase
            .from('upload_logs')
            .update({ 
                status: 'failed', 
                error: 'Upload entfernt',
                updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId);
        
        if (updateError) {
            console.error('[UploadContext] Failed to mark upload as removed:', updateError);
        } else {
            console.log('[UploadContext] Upload marked as removed in DB');
        }
    } else {
        if (deletedData && deletedData.length > 0) {
            console.log('[UploadContext] Upload log deleted from DB:', sessionId);
        } else {
            console.warn('[UploadContext] No upload log found to delete, marking as removed:', sessionId);
            // If nothing was deleted, try to mark it anyway
            await supabase
                .from('upload_logs')
                .update({ 
                    status: 'failed', 
                    error: 'Upload entfernt',
                    updated_at: new Date().toISOString()
                })
                .eq('session_id', sessionId);
        }
    }

    delete abortControllersRef.current[sessionId];
    
    // Remove from local state
    setUploads(prev => prev.filter(u => u.sessionId !== sessionId));
  }, [uploads]);

  // Initial Restore
  useEffect(() => {
    const restore = async () => {
        const { data: logs, error } = await supabase
            .from('upload_logs')
            .select('*')
            .in('status', ['pending', 'uploading', 'compressing', 'failed']) 
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error restoring uploads:', error);
            return;
        }

        if (logs && logs.length > 0) {
            console.log('[UploadContext] Found', logs.length, 'upload logs to restore');
            
            // Filter out uploads that were explicitly removed by user
            const restored: ActiveUpload[] = logs
                .filter(log => {
                    const errorText = (log.error || '').trim();
                    const shouldExclude = errorText === 'Upload entfernt' || errorText === 'Upload abgebrochen';
                    
                    if (shouldExclude) {
                        console.log('[UploadContext] Excluding upload log (removed by user):', log.session_id, 'error:', errorText);
                    }
                    
                    return !shouldExclude;
                })
                .map(log => {
                    console.log('[UploadContext] Restoring upload log:', log.session_id);
                    return {
                        sessionId: log.session_id,
                        boulderId: log.boulder_id || '',
                        file: null,
                        fileName: log.file_name,
                        fileSize: log.file_size,
                        type: log.file_type as 'video' | 'thumbnail',
                        progress: log.progress,
                        status: 'restoring',
                        error: 'Upload unterbrochen. Datei neu wählen.'
                    };
                });
            
            console.log('[UploadContext] Restoring', restored.length, 'uploads');
            
            setUploads(prev => {
                const existingIds = new Set(prev.map(u => u.sessionId));
                const newUploads = restored.filter(r => !existingIds.has(r.sessionId));
                const updated = [...prev, ...newUploads];
                // Process queue after restore
                setTimeout(() => processQueue(), 100);
                return updated;
            });
        } else {
            console.log('[UploadContext] No upload logs to restore');
        }
    };
    restore();
  }, [processQueue]);

  return (
    <UploadContext.Provider value={{ 
        uploads, 
        startUpload, 
        resumeUpload,
        cancelUpload,
        removeUpload,
        isUploading: uploads.some(u => u.status === 'uploading')
    }}>
      {children}
    </UploadContext.Provider>
  );
};

