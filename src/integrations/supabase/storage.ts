import { supabase } from './client';

const DEFAULT_BUCKET = 'beta-videos';

function getFileExt(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1) : '';
}

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export async function uploadBetaVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const ext = getFileExt(file.name) || 'mp4';
  const objectPath = `uploads/${randomId()}.${ext}`;

  // Simulate progress if callback provided
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15; // Increment by 0-15% each time
      if (progress >= 90) {
        progress = 90; // Cap at 90% until upload completes
        clearInterval(interval);
      }
      onProgress(progress);
    }, 200); // Update every 200ms
    
    return interval;
  };

  const progressInterval = simulateProgress();

  try {
    // Use native Supabase Storage upload method
    const { data, error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'video/mp4',
      });

    // Clear progress simulation
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    if (error) {
      console.error('[Storage Upload] Error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: error,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
      });
      throw error;
    }

    // Report 100% completion
    if (onProgress) {
      onProgress(100);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(DEFAULT_BUCKET)
      .getPublicUrl(objectPath);

    return urlData.publicUrl;
  } catch (error: any) {
    // Clear progress simulation on error
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    throw error;
  }
}

