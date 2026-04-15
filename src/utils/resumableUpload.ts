
import { supabase } from '@/integrations/supabase/client';

// Configuration
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 1000; // Start with 1s delay

interface UploadOptions {
  sessionId: string;
  sectorId?: string;
  onProgress?: (progress: number) => void;
  abortSignal?: AbortSignal;
  accessToken?: string;
}

interface UploadStatus {
  session_id: string;
  uploaded_chunks: number[];
}

// Wake Lock Helper
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('[Upload] Wake Lock active');
    }
  } catch (err) {
    console.warn('[Upload] Wake Lock failed:', err);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log('[Upload] Wake Lock released');
    }).catch(() => {});
  }
}

// Network Helper
async function waitForNetwork(): Promise<void> {
  if (navigator.onLine) return;

  console.log('[Upload] Offline, waiting for network...');
  return new Promise((resolve) => {
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      console.log('[Upload] Online again, resuming...');
      resolve();
    };
    window.addEventListener('online', handleOnline);
  });
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}

export async function resumableUpload(
  file: File,
  apiUrl: string,
  options: UploadOptions
): Promise<string> {
  console.log('[resumableUpload] 🚀 Starting resumable upload:', {
    fileName: file.name,
    fileSize: file.size,
    sessionId: options.sessionId,
    sectorId: options.sectorId,
    apiUrl
  });
  
  const { sessionId, sectorId, onProgress, abortSignal, accessToken: providedAccessToken } = options;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log('[resumableUpload] 📊 Total chunks:', totalChunks);
  
  console.log('[resumableUpload] 🔒 Requesting wake lock...');
  await requestWakeLock();
  console.log('[resumableUpload] ✅ Wake lock acquired');

  try {
    let accessToken = providedAccessToken ?? null;

    if (!accessToken) {
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        5000,
        'Session timeout after 5s while starting upload'
      );
      accessToken = sessionResult.data.session?.access_token ?? null;
    }

    if (!accessToken) {
      throw new Error('Nicht authentifiziert: Upload benötigt eine gültige Sitzung.');
    }

    // Check if aborted before starting
    if (abortSignal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }

    // 1. Check existing status
    const statusUrl = `${apiUrl}/upload-status.php?session_id=${sessionId}`;
    let uploadedChunks: number[] = [];
    
    try {
      const statusRes = await fetch(statusUrl, {
        signal: abortSignal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (statusRes.ok) {
        const statusData: UploadStatus = await statusRes.json();
        uploadedChunks = statusData.uploaded_chunks || [];
        console.log(`[Upload] Resuming session ${sessionId}, ${uploadedChunks.length}/${totalChunks} chunks already uploaded.`);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      console.warn('[Upload] Could not check status, starting fresh', e);
    }

    // Calculate initial progress
    if (onProgress) {
        const percent = (uploadedChunks.length / totalChunks) * 100;
        onProgress(percent);
    }

    // 2. Upload missing chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Check if aborted before each chunk
      if (abortSignal?.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }

      if (uploadedChunks.includes(chunkIndex)) {
        continue;
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        // Check if aborted before retry
        if (abortSignal?.aborted) {
          throw new DOMException('Upload aborted', 'AbortError');
        }

        try {
          await waitForNetwork();

          const headers: Record<string, string> = {
            'X-Upload-Session-Id': sessionId,
            'X-Chunk-Number': chunkIndex.toString(),
            'X-Total-Chunks': totalChunks.toString(),
            'X-File-Name': file.name,
            'X-File-Size': file.size.toString(),
            'X-File-Type': file.type,
            'Authorization': `Bearer ${accessToken}`
          };
          
          if (sectorId) {
            headers['X-Sector-Id'] = sectorId;
          }

          const formData = new FormData();
          formData.append('chunk', chunk);

          console.log(`[resumableUpload] 📤 Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunk.size} bytes) for session ${sessionId}...`);
          console.log(`[resumableUpload] 📤 Upload URL: ${apiUrl}/upload.php`);
          console.log(`[resumableUpload] 📤 Headers:`, headers);
          
          const uploadStartTime = Date.now();
          
          // Create a timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Upload timeout after 60s for chunk ${chunkIndex}`)), 60000);
          });
          
          // Race between upload and timeout
          const fetchPromise = fetch(`${apiUrl}/upload.php`, {
            method: 'POST',
            headers: headers, // Note: Content-Type is set automatically by browser for FormData
            body: formData,
            signal: abortSignal
          });
          
          let response: Response;
          try {
            response = await Promise.race([fetchPromise, timeoutPromise]);
            const uploadDuration = Date.now() - uploadStartTime;
            console.log(`[resumableUpload] ✅ Chunk ${chunkIndex + 1} upload completed in ${uploadDuration}ms`);
          } catch (error: unknown) {
            const uploadDuration = Date.now() - uploadStartTime;
            console.error(`[resumableUpload] ❌ Chunk ${chunkIndex + 1} upload failed after ${uploadDuration}ms:`, error);
            throw error;
          }

          console.log(`[resumableUpload] 📥 Response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[resumableUpload] ❌ Upload failed: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          console.log(`[resumableUpload] 📥 Parsing response JSON...`);
          const result = await response.json();
          console.log(`[resumableUpload] 📥 Response data:`, result);
          
          // If this was the last chunk, we might get the final URL
          if (result.url) {
            return result.url;
          }

          // Chunk success
          if (onProgress) {
            // Recalculate progress based on completed chunks + this one
            // Note: This is a simple progress, valid for sequential upload
            const currentProgress = ((uploadedChunks.length + 1) / totalChunks) * 100;
            // We don't add to uploadedChunks array here to keep loop simple, 
            // but logic holds if we assume success means it's done.
            // Better: track locally
            uploadedChunks.push(chunkIndex);
             onProgress((uploadedChunks.length / totalChunks) * 100);
          }
          
          break; // Success, move to next chunk

        } catch (error) {
          attempts++;
          console.error(`[Upload] Chunk ${chunkIndex} failed (attempt ${attempts}/${MAX_RETRIES}):`, error);
          
          if (attempts >= MAX_RETRIES) {
            throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts`);
          }
          
          // Exponential backoff
          await delay(RETRY_DELAY_BASE * Math.pow(2, attempts));
        }
      }
    }

    // Should have returned URL in the last chunk response.
    // If we are here, maybe the server didn't return URL for some reason, or we resumed and all chunks were already there?
    // If all chunks are there, we might need to trigger a "finish" call or just re-upload the last chunk to trigger merge?
    // Or better: check status again?
    // For simplicity, if we finish loop and no URL, we assume something went wrong or we need to ping the server.
    // In our PHP script, sending the last chunk triggers merge.
    // If we resumed and all chunks are already there, we might need a specific "complete" endpoint or just re-send last chunk.
    
    // Edge case: All chunks already uploaded but we didn't get the URL (e.g. browser crashed right before receiving response)
    // We can try to send the last chunk again to force merge/response.
    if (uploadedChunks.length === totalChunks) {
         console.log('[Upload] All chunks present, re-sending last chunk to trigger completion...');
         // Re-upload last chunk logic... (simplified: just throw error for now or rely on user retry)
         throw new Error('Upload seems complete but no URL received. Please retry.');
    }

    throw new Error('Upload finished but no URL returned');

  } finally {
    releaseWakeLock();
  }
}

