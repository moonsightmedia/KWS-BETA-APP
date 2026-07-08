import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UploadLogger } from '@/utils/uploadLogger';
import { resumableUpload } from '@/utils/resumableUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { reportError } from '@/utils/feedbackUtils';
import { useAuth } from '@/hooks/useAuth';
import { compressThumbnail } from '@/integrations/supabase/storage';
import {
  deleteNativeVideoFile,
  getNativeVideoApiBase,
  nativeBackgroundVideoUpload,
  prepareNativeVideoPathForUpload,
  isNativeVideoPipelineAvailable,
} from '@/utils/nativeVideoUpload';
import {
  getUploadInputName,
  getUploadInputSize,
  isNativeVideoUploadFile,
  type NativeVideoUploadFile,
  type UploadFileInput,
  type UploadStatus,
} from '@/types/upload';

export interface ActiveUpload {
  sessionId: string;
  boulderId: string;
  file: File | null;
  nativeFile?: NativeVideoUploadFile;
  fileName: string;
  fileSize: number;
  type: 'video' | 'thumbnail';
  progress: number;
  status: UploadStatus;
  error?: string;
  sectorId?: string;
  abortController?: AbortController;
}

interface UploadContextType {
  uploads: ActiveUpload[];
  startUpload: (boulderId: string, file: UploadFileInput, type: 'video' | 'thumbnail', sectorId?: string) => Promise<string>;
  resumeUpload: (sessionId: string, file: UploadFileInput) => Promise<void>;
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

/**
 * @deprecated Background compression is disabled.
 * Quality versions are now created manually via script.
 * This function is kept for reference but is no longer called.
 */
async function compressVideoInBackground(
  originalUrl: string,
  sectorId: string | undefined,
  boulderId: string,
  session: any
): Promise<void> {
  // Disabled - quality versions are created manually via script
  console.log('[UploadContext] ℹ️ Background compression disabled - quality versions are created manually');
}

const NATIVE_UPLOADS_STORAGE_KEY = 'kws-native-video-upload-queue';

type PersistedNativeUpload = {
  sessionId: string;
  boulderId: string;
  nativeFile: NativeVideoUploadFile;
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  sectorId?: string;
  error?: string;
};

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return (
    !navigator.onLine ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('internet') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('connection')
  );
}

function readPersistedNativeUploads(): PersistedNativeUpload[] {
  try {
    const raw = localStorage.getItem(NATIVE_UPLOADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePersistedNativeUploads(uploads: ActiveUpload[]) {
  const nativeUploads: PersistedNativeUpload[] = uploads
    .filter((upload) => upload.nativeFile && !['completed', 'cancelled'].includes(upload.status))
    .map((upload) => ({
      sessionId: upload.sessionId,
      boulderId: upload.boulderId,
      nativeFile: upload.nativeFile!,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      progress: upload.progress,
      status: upload.status,
      sectorId: upload.sectorId,
      error: upload.error,
    }));

  if (nativeUploads.length) {
    localStorage.setItem(NATIVE_UPLOADS_STORAGE_KEY, JSON.stringify(nativeUploads));
  } else {
    localStorage.removeItem(NATIVE_UPLOADS_STORAGE_KEY);
  }
}

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth(); // CRITICAL: Get session from useAuth for RLS after reload
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
      
      console.log('[UploadContext] 🔄 processQueue called:', { 
        totalUploads: prev.length, 
        activeCount, 
        maxConcurrent: MAX_CONCURRENT_UPLOADS,
        pendingUploads: prev.filter(u => u.status === 'pending').length,
        pendingWithFile: prev.filter(u => u.status === 'pending' && (u.file || u.nativeFile)).length
      });
      
      if (activeCount >= MAX_CONCURRENT_UPLOADS) {
        console.log('[UploadContext] ⏸️ Already at max concurrent uploads, waiting...');
        return prev; // Already at max concurrent uploads
      }

      // Find next pending upload that's not being processed
      const nextUpload = prev.find(u => 
        u.status === 'pending' && (u.file || u.nativeFile) && !processingRef.current.has(u.sessionId)
      );

      if (nextUpload) {
        console.log('[UploadContext] ✅ Found pending upload to process:', { 
          sessionId: nextUpload.sessionId, 
          fileName: nextUpload.fileName, 
          type: nextUpload.type,
          hasFile: !!nextUpload.file,
          hasNativeFile: !!nextUpload.nativeFile
        });
        // Mark as being processed
        processingRef.current.add(nextUpload.sessionId);
        // Start the upload asynchronously
        processUpload(nextUpload).catch(err => {
          console.error('[UploadContext] ❌ Error processing upload:', err);
          processingRef.current.delete(nextUpload.sessionId);
        });
      } else {
        const pendingWithoutFile = prev.filter(u => u.status === 'pending' && !u.file && !u.nativeFile);
        if (pendingWithoutFile.length > 0) {
          console.warn('[UploadContext] ⚠️ Found pending uploads without file:', pendingWithoutFile.map(u => ({ sessionId: u.sessionId, fileName: u.fileName })));
        }
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

  useEffect(() => {
    writePersistedNativeUploads(uploads);
  }, [uploads]);

  useEffect(() => {
    const resumeWaitingNativeUploads = () => {
      setUploads(prev => prev.map(upload => (
        upload.nativeFile && upload.status === 'waiting_network'
          ? { ...upload, status: 'pending' as const, error: undefined }
          : upload
      )));
      setTimeout(() => processQueue(), 0);
    };

    window.addEventListener('online', resumeWaitingNativeUploads);
    return () => window.removeEventListener('online', resumeWaitingNativeUploads);
  }, [processQueue]);

  // Helper function to update upload log using direct fetch
  const updateUploadLog = useCallback(async (sessionId: string, updates: { status?: string; error?: string | null; progress?: number }) => {
    if (!session?.access_token) {
      console.warn('[UploadContext] ⚠️ Cannot update log - no session');
      return;
    }

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn('[UploadContext] ⚠️ Cannot update log - missing config');
      return;
    }

    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.error !== undefined) updateData.error = updates.error;
      if (updates.progress !== undefined) updateData.progress = updates.progress;

      await window.fetch(
        `${SUPABASE_URL}/rest/v1/upload_logs?session_id=eq.${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(updateData),
        }
      );
    } catch (logError) {
      console.warn('[UploadContext] ⚠️ Failed to update upload log (non-critical):', logError);
    }
  }, [session]);

  const processUpload = async (upload: ActiveUpload, abortSignal?: AbortSignal) => {
    console.log('[UploadContext] 🔵 processUpload called:', { 
      sessionId: upload.sessionId, 
      fileName: upload.fileName, 
      type: upload.type,
      hasFile: !!upload.file,
      hasNativeFile: !!upload.nativeFile,
      status: upload.status
    });
    
    if (!upload.file && !upload.nativeFile) {
      console.error('[UploadContext] ❌ No file in upload, cannot process:', upload.sessionId);
      processingRef.current.delete(upload.sessionId);
      return;
    }

    // Check if cancelled
    if (upload.status === 'cancelled') {
      console.log('[UploadContext] ⏸️ Upload was cancelled, skipping:', upload.sessionId);
      processingRef.current.delete(upload.sessionId);
      return;
    }

    console.log('[UploadContext] 🚀 Starting upload:', upload.sessionId);
    // Update status to uploading
    console.log('[UploadContext] 📝 Updating upload status to "uploading"...');
    updateUpload(upload.sessionId, { status: upload.nativeFile ? 'queued' : 'uploading', progress: 0, error: undefined });
    console.log('[UploadContext] ✅ Upload status updated');

    try {
        // CRITICAL: Get session at runtime (not from render-time) to avoid stale session
        // This session will be used throughout the entire upload process
        console.log('[UploadContext] 🔍 Getting session for upload process...');
        let currentSession = session;
        
        // If session is not available, try to get it with timeout
        if (!currentSession?.access_token) {
            console.log('[UploadContext] ⚠️ Session not available from useAuth, fetching...');
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Session timeout after 5s')), 5000)
            );
            
            try {
                const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
                const { data: { session: fetchedSession }, error: sessionError } = sessionResult as any;
                
                if (sessionError) {
                    console.error('[UploadContext] ❌ Error getting session:', sessionError);
                    throw new Error(`Session error: ${sessionError.message}`);
                }
                
                if (!fetchedSession?.access_token) {
                    console.error('[UploadContext] ❌ No session available after fetch');
                    throw new Error('Keine aktive Session. Bitte melde dich an.');
                }
                
                currentSession = fetchedSession;
                console.log('[UploadContext] ✅ Session fetched successfully');
            } catch (timeoutError: any) {
                console.error('[UploadContext] ❌ Session timeout or error:', timeoutError);
                throw new Error('Keine aktive Session. Bitte melde dich an.');
            }
        }
        
        console.log('[UploadContext] ✅ Session available for upload process');
        
        // Helper to update DB logs
        const updateLog = async (status: string, progress?: number, error?: string) => {
             if (!currentSession?.access_token) {
                 console.warn('[UploadContext] ⚠️ No session for updateLog, skipping');
                 return;
             }
             
             const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
             const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

             if (!SUPABASE_URL || !SUPABASE_KEY) {
                 console.warn('[UploadContext] ⚠️ Cannot update log - missing config');
                 return;
             }

             try {
                 const updateData: any = { updated_at: new Date().toISOString() };
                 if (status !== undefined) updateData.status = status;
                 if (error !== undefined) updateData.error = error;
                 if (progress !== undefined) updateData.progress = progress;

                 await window.fetch(
                     `${SUPABASE_URL}/rest/v1/upload_logs?session_id=eq.${upload.sessionId}`,
                     {
                         method: 'PATCH',
                         headers: {
                             'apikey': SUPABASE_KEY,
                             'Authorization': `Bearer ${currentSession.access_token}`,
                             'Content-Type': 'application/json',
                             'Prefer': 'return=minimal',
                         },
                         body: JSON.stringify(updateData),
                     }
                 );
             } catch (logError) {
                 console.warn('[UploadContext] ⚠️ Failed to update upload log (non-critical):', logError);
             }
        };

        if (upload.status === 'pending') {
             console.log('[UploadContext] 📝 Creating upload log in database...');
             
             try {
                 await UploadLogger.create(
                    upload.sessionId,
                    upload.boulderId,
                    upload.type,
                    upload.fileName,
                    upload.fileSize,
                    Math.ceil(upload.fileSize / (5 * 1024 * 1024)),
                    currentSession // CRITICAL: Pass current session for RLS
                );
                console.log('[UploadContext] ✅ Upload log created in database');
             } catch (e: any) {
                 // Check if error is due to duplicate (already exists)
                 if (e?.message?.includes('duplicate') || e?.message?.includes('already exists')) {
                     console.warn('[UploadContext] ⚠️ Upload log already exists, continuing...');
                 } else {
                     console.error('[UploadContext] ❌ Upload log creation failed:', e);
                     throw e; // Re-throw if it's not a duplicate error
                 }
             }
        } else {
            console.log('[UploadContext] ⏭️ Skipping upload log creation (status is not "pending"):', upload.status);
        }

        const API_URL = import.meta.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';
        console.log('[UploadContext] 🌐 API URL:', API_URL);
        
        // Create abort controller if not provided
        const controller = abortSignal ? undefined : new AbortController();
        if (controller) {
            console.log('[UploadContext] 🎛️ Creating abort controller');
            abortControllersRef.current[upload.sessionId] = controller;
            updateUpload(upload.sessionId, { abortController: controller });
        }
        
        // CRITICAL: Compress thumbnails before uploading to reduce file size
        let fileToUpload = upload.file;
        if (upload.type === 'thumbnail') {
            if (!upload.file) {
                throw new Error('Thumbnail-Datei fehlt. Bitte Datei neu waehlen.');
            }
            console.log('[UploadContext] 🗜️ Compressing thumbnail before upload...', {
                originalSize: upload.file.size,
                fileName: upload.fileName
            });
            try {
                fileToUpload = await compressThumbnail(upload.file, (progress) => {
                    // Update progress during compression (0-40% for compression, 40-100% for upload)
                    const compressionProgress = Math.floor(progress * 0.4); // Compression takes first 40%
                    updateUpload(upload.sessionId, { progress: compressionProgress });
                    updateLog('uploading', compressionProgress);
                });
                console.log('[UploadContext] ✅ Thumbnail compressed:', {
                    originalSize: upload.file.size,
                    compressedSize: fileToUpload.size,
                    reduction: `${((1 - fileToUpload.size / upload.file.size) * 100).toFixed(1)}%`
                });
            } catch (compressError: any) {
                console.error('[UploadContext] ⚠️ Thumbnail compression failed, using original file:', compressError);
                // Continue with original file if compression fails
                fileToUpload = upload.file;
            }
        }

        // For videos: upload original and then create quality versions on server
        let videoUrls: { hd?: string; sd?: string; low?: string } | undefined = undefined;
        let url: string;
        
        if (upload.type === 'video') {
            if (upload.nativeFile && isNativeVideoPipelineAvailable()) {
                if (!navigator.onLine) {
                    updateUpload(upload.sessionId, {
                        status: 'waiting_network',
                        error: 'Warte auf Internetverbindung.',
                    });
                    await updateLog('uploading', upload.progress, 'Warte auf Internetverbindung');
                    throw new Error('offline');
                }

                let preparedNativeFile;
                try {
                    updateUpload(upload.sessionId, { status: 'compressing', progress: Math.max(upload.progress, 1), error: undefined });
                    await updateLog('compressing', Math.max(upload.progress, 1));
                    preparedNativeFile = await prepareNativeVideoPathForUpload(
                        {
                            path: upload.nativeFile.path,
                            fileName: upload.nativeFile.name,
                            fileSize: upload.nativeFile.size,
                            mimeType: upload.nativeFile.mimeType,
                        },
                        (compressionProgress) => {
                            const progress = Math.max(1, Math.floor(compressionProgress * 0.35));
                            updateUpload(upload.sessionId, { status: 'compressing', progress });
                            updateLog('compressing', progress);
                        },
                    );
                } catch (compressError) {
                    console.warn('[UploadContext] Native compression failed, uploading original file:', compressError);
                    preparedNativeFile = {
                        filePath: upload.nativeFile.path,
                        fileSize: upload.nativeFile.size,
                        fileName: upload.nativeFile.name.replace(/\.[^.]+$/, '') + '.mp4',
                        mimeType: upload.nativeFile.mimeType || 'video/mp4',
                        cleanup: async () => undefined,
                    };
                }

                try {
                    updateUpload(upload.sessionId, { status: 'uploading', progress: Math.max(upload.progress, 35), error: undefined });
                    const nativeUrl = await nativeBackgroundVideoUpload(preparedNativeFile, {
                        sessionId: upload.sessionId,
                        sectorId: upload.sectorId,
                        fileName: preparedNativeFile.fileName,
                        mimeType: preparedNativeFile.mimeType,
                        authToken: currentSession.access_token,
                        abortSignal: abortSignal || controller?.signal,
                        onProgress: (p) => {
                            const progress = 35 + Math.floor(p * 0.65);
                            setUploads(prev => {
                                const current = prev.find(u => u.sessionId === upload.sessionId);
                                if (current?.status === 'cancelled') return prev;
                                return prev.map(u => u.sessionId === upload.sessionId ? { ...u, status: 'uploading', progress } : u);
                            });
                            updateLog('uploading', progress);
                        },
                    });

                    videoUrls = { hd: nativeUrl };
                    url = nativeUrl;
                    console.log('[UploadContext] Native video upload completed:', nativeUrl);
                } catch (uploadError) {
                    if (isNetworkError(uploadError)) {
                        updateUpload(upload.sessionId, {
                            status: 'waiting_network',
                            error: 'Warte auf Internetverbindung. Upload wird automatisch fortgesetzt.',
                        });
                        await updateLog('uploading', upload.progress, 'Warte auf Internetverbindung');
                    }
                    throw uploadError;
                }
            }

            if (!videoUrls) {
            if (!upload.file) {
                throw new Error('Video-Datei fehlt. Bitte Datei neu waehlen.');
            }
            const videoApiUrl = isNativeVideoPipelineAvailable()
                ? getNativeVideoApiBase()
                : API_URL;
            console.log('[UploadContext] 🎬 Uploading video via chunked upload...', { videoApiUrl });

            try {
                const originalUrl = await resumableUpload(upload.file, videoApiUrl, {
                    sessionId: upload.sessionId,
                    sectorId: upload.sectorId,
                    authToken: currentSession.access_token,
                    onProgress: (p) => {
                        setUploads(prev => {
                            const current = prev.find(u => u.sessionId === upload.sessionId);
                            if (current?.status === 'cancelled') return prev;
                            return prev.map(u => u.sessionId === upload.sessionId ? { ...u, progress: p } : u);
                        });
                        updateLog('uploading', p);
                    },
                    abortSignal: abortSignal || controller?.signal,
                });

                videoUrls = { hd: originalUrl };
                url = originalUrl;
                console.log('[UploadContext] ✅ Video upload completed:', originalUrl);
            } catch (uploadError: any) {
                console.error('[UploadContext] ❌ Video upload failed:', uploadError);
                throw new Error(`Video-Upload fehlgeschlagen: ${uploadError.message || 'Unbekannter Fehler'}`);
            }
            }
        }

        // If it's a thumbnail, do single upload (videos always have videoUrls from multi-quality compression)
        if (!videoUrls && upload.type === 'thumbnail') {
            console.log('[UploadContext] 📤 Uploading thumbnail...', {
                fileName: upload.fileName,
                fileSize: fileToUpload.size,
                originalSize: upload.file.size,
                fileType: fileToUpload.type,
                sessionId: upload.sessionId,
                sectorId: upload.sectorId,
                apiUrl: API_URL
            });
            
            // Adjust progress callback to account for compression (40-100% for upload)
            const uploadProgressCallback = (p: number) => {
                // Map upload progress (0-100%) to overall progress (40-100%)
                const overallProgress = 40 + Math.floor(p * 0.6);
                // Check if cancelled by checking current state
                setUploads(prev => {
                    const current = prev.find(u => u.sessionId === upload.sessionId);
                    if (current?.status === 'cancelled') return prev;
                    return prev.map(u => u.sessionId === upload.sessionId ? { ...u, progress: overallProgress } : u);
                });
                updateLog('uploading', overallProgress);
            };

            url = await resumableUpload(
                fileToUpload,
                API_URL,
                {
                    sessionId: upload.sessionId,
                    sectorId: upload.sectorId,
                    authToken: currentSession.access_token,
                    onProgress: uploadProgressCallback,
                    abortSignal: abortSignal || controller?.signal
                }
            );
            console.log('[UploadContext] ✅ Thumbnail upload completed, URL:', url);
        } else if (!videoUrls && upload.type === 'video') {
            // Fallback: use original URL if compression failed
            console.warn('[UploadContext] ⚠️ No videoUrls available, using original URL as fallback');
            videoUrls = { hd: url };
        }

        await updateLog('completed', 100);
        
        // Update Boulder Record using direct fetch (QueryBuilder hangs after reload)
        console.log('[UploadContext] 📝 Updating boulder record in database...');
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error('Supabase-Konfiguration fehlt');
        }

        // Use currentSession (already fetched at the start of processUpload)
        if (!currentSession?.access_token) {
            console.error('[UploadContext] ❌ No session available for boulder update');
            throw new Error('Keine aktive Session. Bitte melde dich an.');
        }

        // Build update data: use beta_video_urls if available, otherwise fallback to beta_video_url
        const updateData = upload.type === 'video' 
            ? videoUrls 
                ? { 
                    beta_video_url: url, // HD URL for backward compatibility
                    beta_video_urls: videoUrls // New multi-quality structure
                  }
                : { beta_video_url: url }
            : { thumbnail_url: url };

        console.log('[UploadContext] 📝 Updating boulder:', upload.boulderId, 'with:', updateData);

        const updateResponse = await window.fetch(
            `${SUPABASE_URL}/rest/v1/boulders?id=eq.${upload.boulderId}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${currentSession.access_token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify(updateData),
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('[UploadContext] ❌ Error updating boulder:', updateResponse.status, errorText);
            throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
        }

        console.log('[UploadContext] ✅ Boulder record updated successfully');

        updateUpload(upload.sessionId, { status: 'completed', progress: 100 });
        toast.success(`${upload.type === 'video' ? 'Video' : 'Thumbnail'} hochgeladen!`);

        if (upload.nativeFile?.cached) {
            await deleteNativeVideoFile(upload.nativeFile.path);
        }

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
        console.error('[UploadContext] ❌ Upload failed in processUpload:', error);
        console.error('[UploadContext] ❌ Error details:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
            cause: error?.cause,
            uploadSessionId: upload.sessionId,
            uploadFileName: upload.fileName,
            uploadType: upload.type
        });
        
        if (upload.nativeFile && isNetworkError(error)) {
            const waitingMessage = 'Warte auf Internetverbindung. Upload wird automatisch fortgesetzt.';
            updateUpload(upload.sessionId, { status: 'waiting_network', error: waitingMessage });
            await updateUploadLog(upload.sessionId, {
                status: 'uploading',
                error: waitingMessage,
                progress: upload.progress,
            });
            delete abortControllersRef.current[upload.sessionId];
            processingRef.current.delete(upload.sessionId);

            const retryWhenOnline = () => {
                window.removeEventListener('online', retryWhenOnline);
                setUploads(prev => prev.map(u => (
                    u.sessionId === upload.sessionId
                        ? { ...u, status: 'pending' as const, error: undefined }
                        : u
                )));
                setTimeout(() => processQueue(), 0);
            };

            window.addEventListener('online', retryWhenOnline, { once: true });
            return;
        }

        // Check if it was cancelled
        if (error.name === 'AbortError' || upload.status === 'cancelled') {
            console.log('[UploadContext] ⏸️ Upload was explicitly cancelled:', upload.sessionId);
            updateUpload(upload.sessionId, { status: 'cancelled' });
            await updateUploadLog(upload.sessionId, { 
                status: 'failed', 
                error: 'Upload abgebrochen' 
            });
            delete abortControllersRef.current[upload.sessionId];
            processingRef.current.delete(upload.sessionId);
            processQueue(); // Start next upload
            return;
        }
        
        const errorMessage = error?.message || 'Unbekannter Upload-Fehler';
        console.error('[UploadContext] ❌ Setting upload status to error:', errorMessage);
        updateUpload(upload.sessionId, { status: 'error', error: errorMessage });
        
        await updateUploadLog(upload.sessionId, { 
            status: 'failed', 
            error: errorMessage 
        });
        
        // Automatically report upload error to feedback system
        try {
            const uploadError = error instanceof Error ? error : new Error(error.message || 'Upload-Fehler');
            await reportError(
                uploadError,
                undefined,
                `Upload-Fehler beim Hochladen von ${upload.type === 'video' ? 'Video' : 'Thumbnail'}:\n` +
                `Dateiname: ${upload.fileName}\n` +
                `Dateigröße: ${(upload.fileSize / 1024 / 1024).toFixed(2)} MB\n` +
                `Boulder-ID: ${upload.boulderId}\n` +
                `Session-ID: ${upload.sessionId}`
            );
        } catch (reportErr) {
            // Silently fail - don't let error reporting break upload error handling
            console.warn('[UploadContext] Failed to report upload error:', reportErr);
        }
        
        delete abortControllersRef.current[upload.sessionId];
        processingRef.current.delete(upload.sessionId);
        
        // Trigger queue processing to start next upload
        processQueue();
    }
  };

  const startUpload = useCallback(async (boulderId: string, file: UploadFileInput, type: 'video' | 'thumbnail', sectorId?: string) => {
    const isNativeVideo = type === 'video' && isNativeVideoUploadFile(file);
    const fileName = getUploadInputName(file);
    const fileSize = getUploadInputSize(file);
    console.log('[UploadContext] 🚀 startUpload called:', { boulderId, fileName: file.name, fileSize: file.size, type, sectorId });
    
    if (!file) {
      console.error('[UploadContext] ❌ No file provided to startUpload');
      throw new Error('No file provided');
    }
    
    const sessionId = type === 'video' 
        ? Math.random().toString(36).substring(2) + Date.now().toString(36)
        : `thumb_${Math.random().toString(36).substring(2) + Date.now().toString(36)}`;

    const newUpload: ActiveUpload = {
        sessionId,
        boulderId,
        file: isNativeVideo ? null : file as File,
        nativeFile: isNativeVideo ? file : undefined,
        fileName,
        fileSize,
        type,
        progress: 0,
        status: 'pending',
        sectorId
    };

    console.log('[UploadContext] ✅ Adding upload to queue:', { sessionId, boulderId, fileName: file.name, type, status: 'pending' });
    
    // CRITICAL: Add upload and immediately check if we can process it
    setUploads(prev => {
      const updated = [...prev, newUpload];
      console.log('[UploadContext] 📊 Total uploads in queue:', updated.length);
      return updated;
    });
    
    // CRITICAL: Process queue after state update
    // Use setTimeout to ensure state is updated before processing
    setTimeout(() => {
      console.log('[UploadContext] 🔄 Processing queue after adding upload:', sessionId);
      
      // Check if we can start this upload immediately
      setUploads(currentUploads => {
        const uploadToProcess = currentUploads.find(u => u.sessionId === sessionId);
        
        if (!uploadToProcess) {
          console.warn('[UploadContext] ⚠️ Upload not found in queue:', sessionId);
          return currentUploads;
        }
        
        const activeCount = currentUploads.filter(u => 
          (u.status === 'uploading' || u.status === 'pending') && processingRef.current.has(u.sessionId)
        ).length;
        
        console.log('[UploadContext] 🔍 Queue check:', {
          activeCount,
          maxConcurrent: MAX_CONCURRENT_UPLOADS,
          canStart: activeCount < MAX_CONCURRENT_UPLOADS,
          hasFile: !!uploadToProcess.file,
          hasNativeFile: !!uploadToProcess.nativeFile,
          status: uploadToProcess.status,
          isProcessing: processingRef.current.has(uploadToProcess.sessionId)
        });
        
        if (activeCount < MAX_CONCURRENT_UPLOADS && (uploadToProcess.file || uploadToProcess.nativeFile) && uploadToProcess.status === 'pending' && !processingRef.current.has(uploadToProcess.sessionId)) {
          console.log('[UploadContext] ✅ Can start upload immediately:', uploadToProcess.sessionId);
          processingRef.current.add(uploadToProcess.sessionId);
          processUpload(uploadToProcess).catch(err => {
            console.error('[UploadContext] ❌ Error processing upload:', err);
            processingRef.current.delete(uploadToProcess.sessionId);
          });
        } else {
          console.log('[UploadContext] ⏸️ Cannot start upload immediately, will be processed by queue');
        }
        
        return currentUploads;
      });
      
      // Also call processQueue to handle other uploads
      processQueue();
    }, 0);
    
    return sessionId;
  }, [processQueue]);

  const resumeUpload = useCallback(async (sessionId: string, file: UploadFileInput) => {
     let targetUpload: ActiveUpload | undefined;
     const nativeFile = isNativeVideoUploadFile(file) ? file : undefined;
     
     setUploads(prev => {
         return prev.map(u => {
             if (u.sessionId === sessionId) {
                 targetUpload = {
                   ...u,
                   file: nativeFile ? null : file as File,
                   nativeFile,
                   fileName: getUploadInputName(file),
                   fileSize: getUploadInputSize(file),
                   status: 'pending',
                   error: undefined,
                 };
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

        if (upload.nativeFile?.cached) {
            deleteNativeVideoFile(upload.nativeFile.path).catch(() => undefined);
        }

        // Abort if uploading
        if (upload.status === 'uploading' || upload.status === 'pending') {
            const controller = abortControllersRef.current[sessionId] || upload.abortController;
            if (controller) {
                controller.abort();
            }
        }

        // Update DB log
        updateUploadLog(sessionId, { 
            status: 'failed', 
            error: 'Upload abgebrochen' 
        });

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

    if (upload?.nativeFile?.cached) {
        await deleteNativeVideoFile(upload.nativeFile.path);
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
        const persistedNativeUploads = new Map(
            readPersistedNativeUploads().map((upload) => [upload.sessionId, upload]),
        );
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
                    const persistedNative = persistedNativeUploads.get(log.session_id);
                    console.log('[UploadContext] Restoring upload log:', {
                        session_id: log.session_id,
                        file_name: log.file_name,
                        db_status: log.status,
                        progress: log.progress
                    });
                    
                    if (persistedNative && log.file_type === 'video') {
                        const restoredStatus: UploadStatus = navigator.onLine ? 'pending' : 'waiting_network';
                        return {
                            sessionId: log.session_id,
                            boulderId: log.boulder_id || persistedNative.boulderId || '',
                            file: null,
                            nativeFile: persistedNative.nativeFile,
                            fileName: persistedNative.fileName || log.file_name,
                            fileSize: persistedNative.fileSize || log.file_size,
                            type: 'video' as const,
                            progress: log.progress || persistedNative.progress || 0,
                            status: restoredStatus,
                            error: restoredStatus === 'waiting_network' ? 'Warte auf Internetverbindung.' : undefined,
                            sectorId: log.sector_id || persistedNative.sectorId,
                        };
                    }

                    return {
                        sessionId: log.session_id,
                        boulderId: log.boulder_id || '',
                        file: null, // File objects are lost after reload
                        fileName: log.file_name,
                        fileSize: log.file_size,
                        type: log.file_type as 'video' | 'thumbnail',
                        progress: log.progress || 0,
                        status: 'restoring' as const, // Always 'restoring' - user must re-select file
                        error: 'Upload unterbrochen. Datei neu wählen.',
                        sectorId: log.sector_id
                    };
                });
            
            console.log('[UploadContext] Restoring', restored.length, 'uploads with status "restoring" (files need to be re-selected)');
            
            setUploads(prev => {
                const existingIds = new Set(prev.map(u => u.sessionId));
                const newUploads = restored.filter(r => !existingIds.has(r.sessionId));
                const updated = [...prev, ...newUploads];
                console.log('[UploadContext] Total uploads after restore:', updated.length);
                if (newUploads.some((upload) => upload.nativeFile && upload.status === 'pending')) {
                    setTimeout(() => processQueue(), 0);
                }
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

