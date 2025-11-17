import { supabase } from './client';

const DEFAULT_BUCKET = 'beta-videos';
const SECTOR_IMAGES_BUCKET = 'sector-images';

// All-Inkl API Configuration
const ALLINKL_API_URL = import.meta.env.VITE_ALLINKL_API_URL || 'https://cdn.kletterwelt-sauerland.de/upload-api';
const USE_ALLINKL_STORAGE = import.meta.env.VITE_USE_ALLINKL_STORAGE === 'true' || false;

function getFileExt(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1) : '';
}

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/**
 * Compress video file to reduce size before upload
 * Optimized for mobile devices - uses MediaRecorder with lower bitrate
 */
async function compressVideo(file: File, onProgress?: (progress: number) => void): Promise<File> {
  // If file is already small enough (< 20MB), skip compression
  const skipCompressionThreshold = 20 * 1024 * 1024; // 20MB
  if (file.size < skipCompressionThreshold) {
    if (onProgress) onProgress(100);
    return file;
  }

  // Check if MediaRecorder is available
  if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9') && 
      !MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    console.warn('MediaRecorder nicht unterstützt, verwende Original-Video');
    if (onProgress) onProgress(100);
    return file;
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    let mediaRecorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    let hasResolved = false;

    const cleanup = () => {
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      URL.revokeObjectURL(objectUrl);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {
          // Ignore
        }
      }
    };

    const resolveWithOriginal = () => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      if (onProgress) onProgress(100);
      resolve(file);
    };

    video.addEventListener('loadedmetadata', () => {
      if (hasResolved) return;
      
      try {
        // Use canvas to capture video stream
        const canvas = document.createElement('canvas');
        // Limit resolution for mobile performance (max 1280px width)
        const maxWidth = Math.min(video.videoWidth, 1280);
        const aspectRatio = video.videoHeight / video.videoWidth;
        canvas.width = maxWidth;
        canvas.height = Math.round(maxWidth * aspectRatio);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolveWithOriginal();
          return;
        }

        // Determine best codec
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

        const stream = canvas.captureStream(25); // 25 FPS for mobile
        
        // Lower bitrate for mobile (1.5 Mbps)
        const bitrate = 1500000;
        
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: bitrate,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
            // Update progress during recording
            if (onProgress) {
              const progress = Math.min(30 + (chunks.length * 2), 80);
              onProgress(progress);
            }
          }
        };

        mediaRecorder.onstop = () => {
          if (hasResolved) return;
          
          try {
            const compressedBlob = new Blob(chunks, { type: mimeType });
            
            // Only use compressed version if it's at least 10% smaller
            if (compressedBlob.size > 0 && compressedBlob.size < file.size * 0.9) {
              const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
                type: mimeType,
                lastModified: Date.now(),
              });
              if (onProgress) onProgress(100);
              hasResolved = true;
              cleanup();
              resolve(compressedFile);
            } else {
              // Compression didn't help enough, use original
              resolveWithOriginal();
            }
          } catch (error) {
            console.warn('Fehler beim Erstellen der komprimierten Datei:', error);
            resolveWithOriginal();
          }
        };

        mediaRecorder.onerror = (e) => {
          console.warn('MediaRecorder Fehler:', e);
          resolveWithOriginal();
        };

        // Start recording
        try {
          mediaRecorder.start(100); // Collect data every 100ms
          
          // Draw video frames to canvas
          video.currentTime = 0;
          let lastTime = 0;
          
          const drawFrame = () => {
            if (hasResolved || video.ended || !mediaRecorder || mediaRecorder.state === 'inactive') {
              if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
              return;
            }
            
            const currentTime = video.currentTime;
            if (currentTime !== lastTime) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              lastTime = currentTime;
            }
            
            // Continue playing
            if (!video.paused && !video.ended) {
              requestAnimationFrame(drawFrame);
            }
          };

          video.addEventListener('seeked', () => {
            if (!hasResolved) {
              drawFrame();
            }
          });

          video.addEventListener('timeupdate', () => {
            if (!hasResolved) {
              drawFrame();
            }
          });

          // Start playing video
          video.play().catch((error) => {
            console.warn('Video play fehlgeschlagen:', error);
            resolveWithOriginal();
          });

          // Stop after video ends
          video.addEventListener('ended', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
              }, 500);
            }
          });

          // Safety timeout - stop after 2 minutes
          setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            if (!hasResolved) {
              resolveWithOriginal();
            }
          }, 120000); // 2 minutes max

        } catch (error) {
          console.warn('Fehler beim Starten der Kompression:', error);
          resolveWithOriginal();
        }
      } catch (error) {
        console.warn('Fehler bei Video-Kompression:', error);
        resolveWithOriginal();
      }
    }, { once: true });

    video.addEventListener('error', () => {
      resolveWithOriginal();
    });

    // Append to body (hidden) for mobile compatibility
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
  });
}

/**
 * Upload file to All-Inkl using chunked upload for large files
 */
async function uploadToAllInkl(
  file: File,
  fileType: 'video' | 'image',
  sectorId?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  const useChunked = totalChunks > 1;
  const uploadSessionId = useChunked ? randomId() : null;

  if (useChunked) {
    // Chunked upload for large files
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);

      const headers: Record<string, string> = {
        'X-File-Name': file.name,
        'X-File-Size': file.size.toString(),
        'X-File-Type': file.type,
        'X-Chunk-Number': i.toString(),
        'X-Total-Chunks': totalChunks.toString(),
      };

      if (uploadSessionId) {
        headers['X-Upload-Session-Id'] = uploadSessionId;
      }

      if (sectorId) {
        headers['X-Sector-Id'] = sectorId;
      }

      const response = await fetch(`${ALLINKL_API_URL}/upload.php`, {
        method: 'POST',
        body: formData,
        headers: headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update progress
      if (onProgress) {
        const chunkProgress = ((i + 1) / totalChunks) * 100;
        onProgress(chunkProgress);
      }

      // If this is the last chunk, return the URL
      if (i === totalChunks - 1 && result.url) {
        return result.url;
      }
    }

    throw new Error('Upload completed but no URL returned');
  } else {
    // Single file upload for small files
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
      'X-File-Name': file.name,
      'X-File-Size': file.size.toString(),
      'X-File-Type': file.type,
    };

    if (sectorId) {
      headers['X-Sector-Id'] = sectorId;
    }

    // Track upload progress using XMLHttpRequest for better progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success && result.url) {
              resolve(result.url);
            } else {
              reject(new Error(result.error || 'Upload failed'));
            }
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.open('POST', `${ALLINKL_API_URL}/upload.php`);
      
      // Set headers
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.send(formData);
    });
  }
}

export async function uploadBetaVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file type
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
  }

  // Compress video if needed (reports progress 0-50%)
  let videoToUpload = file;
  if (file.size > 20 * 1024 * 1024) { // Only compress if > 20MB
    try {
      if (onProgress) onProgress(5);
      videoToUpload = await compressVideo(file, (progress) => {
        if (onProgress) {
          // Compression takes 5-50% of total progress
          onProgress(5 + (progress * 0.45));
        }
      });
    } catch (error) {
      console.warn('Video compression failed, using original:', error);
      videoToUpload = file; // Use original if compression fails
    }
  }

  // Validate file size after compression (50MB max to reduce egress costs)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (videoToUpload.size > maxSize) {
    throw new Error(`Datei zu groß. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB. Bitte komprimiere das Video oder verwende YouTube/Vimeo für größere Videos.`);
  }

  // Use All-Inkl if enabled, otherwise fallback to Supabase
  if (USE_ALLINKL_STORAGE) {
    try {
      // Adjust progress: compression took 0-50%, upload takes 50-100%
      const uploadProgress = onProgress 
        ? (progress: number) => onProgress(50 + (progress * 0.5))
        : undefined;
      
      return await uploadToAllInkl(videoToUpload, 'video', undefined, uploadProgress);
    } catch (error: any) {
      console.error('[All-Inkl Upload] Failed, falling back to Supabase:', error);
      // Fallback to Supabase if All-Inkl fails
    }
  }

  // Fallback to Supabase Storage
  const ext = getFileExt(videoToUpload.name) || (videoToUpload.type.includes('webm') ? 'webm' : 'mp4');
  const objectPath = `uploads/${randomId()}.${ext}`;

  // Simulate progress if callback provided (starts at 50% after compression)
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = file.size > 20 * 1024 * 1024 ? 50 : 0; // Start at 50% if compression was done
    const interval = setInterval(() => {
      progress += Math.random() * 10; // Increment by 0-10% each time
      if (progress >= 95) {
        progress = 95; // Cap at 95% until upload completes
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
      .upload(objectPath, videoToUpload, {
        cacheControl: '604800', // 7 days cache (reduced from 1 year to allow updates)
        upsert: true,
        contentType: videoToUpload.type || 'video/mp4',
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

/**
 * Upload a sector image to All-Inkl or Supabase Storage
 */
export async function uploadSectorImage(
  file: File,
  sectorId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`Datei zu groß. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Use All-Inkl if enabled, otherwise fallback to Supabase
  if (USE_ALLINKL_STORAGE) {
    try {
      return await uploadToAllInkl(file, 'image', sectorId, onProgress);
    } catch (error: any) {
      console.error('[All-Inkl Upload] Failed, falling back to Supabase:', error);
      // Fallback to Supabase if All-Inkl fails
    }
  }

  // Fallback to Supabase Storage
  const ext = getFileExt(file.name) || 'jpg';
  const objectPath = `${sectorId}/${randomId()}.${ext}`;

  // Simulate progress if callback provided
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 90) {
        progress = 90;
        clearInterval(interval);
      }
      onProgress(progress);
    }, 200);
    
    return interval;
  };

  const progressInterval = simulateProgress();

  try {
    const { data, error } = await supabase.storage
      .from(SECTOR_IMAGES_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600', // 1 hour cache for sector images
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (progressInterval) {
      clearInterval(progressInterval);
    }

    if (error) {
      console.error('[Sector Image Upload] Error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: error,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
        sectorId: sectorId,
        objectPath: objectPath,
      });
      throw error;
    }

    if (onProgress) {
      onProgress(100);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(SECTOR_IMAGES_BUCKET)
      .getPublicUrl(objectPath);

    return urlData.publicUrl;
  } catch (error: any) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    console.error('[Sector Image Upload] Upload failed:', error);
    throw error;
  }
}

/**
 * Delete a thumbnail image from All-Inkl or Supabase Storage
 */
export async function deleteThumbnail(thumbnailUrl: string | null): Promise<void> {
  if (!thumbnailUrl) return;

  try {
    // Check if it's an All-Inkl URL
    if (thumbnailUrl.includes('cdn.kletterwelt-sauerland.de')) {
      const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: thumbnailUrl }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }));
        console.error('Error deleting thumbnail from All-Inkl:', error);
        // Log debug info if available
        if (error.debug) {
          console.error('Delete debug info:', error.debug);
        }
      }
      return;
    }

    // Fallback to Supabase Storage
    const url = new URL(thumbnailUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === DEFAULT_BUCKET);
    
    if (bucketIndex === -1) {
      // Not a Supabase Storage URL, skip deletion
      return;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    const { error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    // Log error but don't throw - thumbnail might already be deleted or URL might be external
    console.error('Error deleting thumbnail:', error);
  }
}

/**
 * Delete a beta video from All-Inkl or Supabase Storage
 */
export async function deleteBetaVideo(videoUrl: string | null): Promise<void> {
  if (!videoUrl) return;

  try {
    // Check if it's an All-Inkl URL
    if (videoUrl.includes('cdn.kletterwelt-sauerland.de')) {
      const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }));
        console.error('Error deleting from All-Inkl:', error);
        // Log debug info if available
        if (error.debug) {
          console.error('Delete debug info:', error.debug);
        }
      }
      return;
    }

    // Fallback to Supabase Storage
    const url = new URL(videoUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === DEFAULT_BUCKET);
    
    if (bucketIndex === -1) {
      // Not a Supabase Storage URL, skip deletion
      return;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    const { error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    // Log error but don't throw - video might already be deleted or URL might be external
    console.error('Error deleting beta video:', error);
  }
}

/**
 * Upload a boulder thumbnail image to All-Inkl or Supabase Storage
 */
export async function uploadThumbnail(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
  }

  // Validate file size (5MB max for thumbnails)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error(`Datei zu groß. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Use All-Inkl if enabled, otherwise fallback to Supabase
  if (USE_ALLINKL_STORAGE) {
    try {
      return await uploadToAllInkl(file, 'image', undefined, onProgress);
    } catch (error: any) {
      console.error('[All-Inkl Thumbnail Upload] Failed, falling back to Supabase:', error);
      // Fallback to Supabase if All-Inkl fails
    }
  }

  // Fallback to Supabase Storage
  // Store thumbnails in a separate bucket or in the beta-videos bucket with a prefix
  const ext = getFileExt(file.name) || 'jpg';
  const objectPath = `thumbnails/${randomId()}.${ext}`;

  // Simulate progress if callback provided
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 90) {
        progress = 90;
        clearInterval(interval);
      }
      onProgress(progress);
    }, 200);
    
    return interval;
  };

  const progressInterval = simulateProgress();

  try {
    const { data, error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '1800', // 30 minutes cache for thumbnails (reduced from 1 hour)
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (progressInterval) {
      clearInterval(progressInterval);
    }

    if (error) {
      console.error('[Thumbnail Upload] Error details:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: error,
        fileSize: file.size,
        fileName: file.name,
        fileType: file.type,
        objectPath: objectPath,
      });
      throw error;
    }

    if (onProgress) {
      onProgress(100);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(DEFAULT_BUCKET)
      .getPublicUrl(objectPath);

    return urlData.publicUrl;
  } catch (error: any) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    console.error('[Thumbnail Upload] Upload failed:', error);
    throw error;
  }
}

/**
 * Delete a sector image from All-Inkl or Supabase Storage
 */
export async function deleteSectorImage(imageUrl: string): Promise<void> {
  try {
    // Check if it's an All-Inkl URL
    if (imageUrl.includes('cdn.kletterwelt-sauerland.de')) {
      const response = await fetch(`${ALLINKL_API_URL}/delete.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }));
        console.error('Error deleting from All-Inkl:', error);
      }
      return;
    }

    // Fallback to Supabase Storage
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === SECTOR_IMAGES_BUCKET);
    
    if (bucketIndex === -1) {
      // Not a Supabase Storage URL, skip deletion
      return;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    const { error } = await supabase.storage
      .from(SECTOR_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    // Log error but don't throw - image might already be deleted or URL might be external
    console.error('Error deleting sector image:', error);
  }
}

