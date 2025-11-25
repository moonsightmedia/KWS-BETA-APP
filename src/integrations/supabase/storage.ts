import { supabase } from './client';
import { UploadLogger } from '@/utils/uploadLogger';
import exifr from 'exifr';

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
 * Keep uploads alive when page visibility changes
 * Prevents browser from pausing uploads when display is off or tab is switched
 */
function setupUploadKeepAlive(): () => void {
  // Keep a reference to prevent garbage collection
  let keepAliveInterval: number | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  let isActive = true;

  // Request wake lock if available (prevents device from sleeping)
  // This works even when tab is switched or app is in background
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLock = lock;
        console.log('[Upload] Wake lock acquired to keep uploads running');
        
        // Handle wake lock release (e.g., when user manually locks screen)
        lock.addEventListener('release', () => {
          console.log('[Upload] Wake lock released, attempting to reacquire...');
          // Try to reacquire if upload is still active
          if (isActive) {
            requestWakeLock();
          }
        });
      } catch (err: any) {
        console.warn('[Upload] Wake lock not available:', err);
      }
    }
  };

  // Request wake lock immediately
  requestWakeLock();

  // Keep connection alive with periodic ping when page is hidden (tab switched or minimized)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Page is hidden (tab switched or minimized) - keep connection alive
      if (keepAliveInterval === null) {
        keepAliveInterval = window.setInterval(() => {
          // Send a small keep-alive request to prevent connection timeout
          // Use keepalive flag for better background support
          fetch(`${ALLINKL_API_URL}/upload.php`, {
            method: 'OPTIONS',
            cache: 'no-cache',
            keepalive: true, // Helps keep request alive in background
          }).catch(() => {
            // Ignore errors - this is just a keep-alive
          });
        }, 30000); // Every 30 seconds
        console.log('[Upload] Tab switched/minimized - keeping uploads alive');
      }
      
      // Try to reacquire wake lock if it was released
      if (!wakeLock && isActive) {
        requestWakeLock();
      }
    } else {
      // Page is visible - clear keep-alive (not needed when visible)
      if (keepAliveInterval !== null) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      console.log('[Upload] Tab visible - normal operation');
    }
  };

  // Also listen for pagehide event (when tab is being closed/navigated away)
  const handlePageHide = () => {
    // Keep uploads running even when navigating away
    if (keepAliveInterval === null && isActive) {
      keepAliveInterval = window.setInterval(() => {
        fetch(`${ALLINKL_API_URL}/upload.php`, {
          method: 'OPTIONS',
          cache: 'no-cache',
          keepalive: true,
        }).catch(() => {});
      }, 30000);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  // Cleanup function
  return () => {
    isActive = false;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    if (keepAliveInterval !== null) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  };
}

/**
 * Get EXIF orientation from image file
 */
async function getExifOrientation(file: File): Promise<number> {
  try {
    const exifData = await exifr.parse(file, { orientation: true });
    return exifData?.Orientation || 1;
  } catch (error) {
    console.warn('[EXIF] Error reading EXIF data:', error);
    return 1; // Default orientation on error
  }
}

/**
 * Apply EXIF orientation transformation to canvas context
 * This ensures images are saved in the correct orientation (portrait images stay portrait)
 */
function applyExifOrientation(ctx: CanvasRenderingContext2D, orientation: number, width: number, height: number) {
  switch (orientation) {
    case 2:
      // Horizontal flip
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      // 180° rotation
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      // Vertical flip
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      // 90° clockwise + horizontal flip
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      // 90° clockwise (portrait images taken with phone rotated)
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      // 90° counter-clockwise + horizontal flip
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      // 90° counter-clockwise (portrait images taken with phone rotated)
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      // Orientation 1 or unknown - no transformation
      break;
  }
}

/**
 * Compress and resize thumbnail image for optimal performance
 * Resizes to max 800px width/height and compresses to JPEG with 85% quality
 * Automatically corrects EXIF orientation so portrait images are saved as portrait
 */
async function compressThumbnail(file: File, onProgress?: (progress: number) => void): Promise<File> {
  return new Promise(async (resolve, reject) => {
    // Read EXIF orientation first
    const orientation = await getExifOrientation(file);
    
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      try {
        // Browser automatically applies EXIF orientation when displaying
        // So img.width/height are already corrected for display
        let imgWidth = img.width;
        let imgHeight = img.height;

        // Determine if image is landscape (width > height) or portrait (height > width)
        const isLandscape = imgWidth > imgHeight;
        
        // ALWAYS save as portrait (height > width)
        // If landscape, we'll rotate it 90° clockwise to make it portrait
        let canvasWidth = imgWidth;
        let canvasHeight = imgHeight;
        let needsRotation = false;
        
        if (isLandscape) {
          // Landscape image: swap dimensions and rotate 90° clockwise
          canvasWidth = imgHeight;
          canvasHeight = imgWidth;
          needsRotation = true;
        }
        // If already portrait, keep dimensions as-is

        // Calculate optimal dimensions (max 800px, maintain aspect ratio)
        // If original file is very large (>10MB), use smaller max dimension
        const fileSizeMB = file.size / (1024 * 1024);
        const maxDimension = fileSizeMB > 10 ? 600 : 800; // Smaller dimension for very large files
        let width = canvasWidth;
        let height = canvasHeight;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        // Create canvas for resizing (always portrait orientation)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          // Canvas not supported - try to reduce dimensions further and retry
          if (maxDimension > 400) {
            // Retry with smaller dimension
            const smallerDimension = 400;
            let retryWidth = canvasWidth;
            let retryHeight = canvasHeight;
            if (retryWidth > smallerDimension || retryHeight > smallerDimension) {
              if (retryWidth > retryHeight) {
                retryHeight = Math.round((retryHeight / retryWidth) * smallerDimension);
                retryWidth = smallerDimension;
              } else {
                retryWidth = Math.round((retryWidth / retryHeight) * smallerDimension);
                retryHeight = smallerDimension;
              }
            }
            canvas.width = retryWidth;
            canvas.height = retryHeight;
            const retryCtx = canvas.getContext('2d');
            if (retryCtx) {
              // Retry with smaller canvas
              retryCtx.imageSmoothingEnabled = true;
              retryCtx.imageSmoothingQuality = 'high';
              retryCtx.drawImage(img, 0, 0, retryWidth, retryHeight);
              // Continue with compression...
            } else {
              resolve(file); // Canvas truly not supported
              return;
            }
          } else {
            resolve(file); // Already at minimum, canvas not supported
            return;
          }
        }

        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Save context state
        ctx.save();

        // Apply transformations to ensure portrait orientation
        if (needsRotation) {
          // Landscape image: rotate 90° clockwise to make it portrait
          ctx.translate(width / 2, height / 2);
          ctx.rotate(Math.PI / 2); // 90° clockwise
          ctx.translate(-height / 2, -width / 2);
          // Draw with swapped dimensions
          ctx.drawImage(img, 0, 0, height, width);
        } else {
          // Already portrait: apply EXIF orientation correction if needed
          // But only if it doesn't make it landscape again
          applyExifOrientation(ctx, orientation, width, height);
          
          // For EXIF orientations 6 and 8, we need to handle them specially
          if (orientation === 6 || orientation === 8) {
            // These are portrait images stored as landscape in EXIF
            // The browser already corrected them, so we just draw normally
            ctx.drawImage(img, 0, 0, width, height);
          } else {
            // Normal portrait or other orientations
            ctx.drawImage(img, 0, 0, width, height);
          }
        }

        // Restore context state
        ctx.restore();

        if (onProgress) onProgress(50);

        // Convert to JPEG with adaptive quality to ensure file is under 5MB
        const maxSize = 5 * 1024 * 1024; // 5MB
        const qualityLevels = [0.85, 0.70, 0.55, 0.40, 0.25, 0.15, 0.10]; // Extended quality levels
        const dimensionLevels = [maxDimension, 600, 500, 400, 300]; // Progressive dimension reduction
        
        let currentQualityIndex = 0;
        let currentDimensionIndex = 0;
        let bestResult: { blob: Blob; quality: number; dimension: number } | null = null;
        
        const tryCompress = (quality: number, dimension: number, retryWithSmallerDimension: boolean = false) => {
          // If we need to retry with smaller dimension, recreate canvas
          if (retryWithSmallerDimension && currentDimensionIndex < dimensionLevels.length - 1) {
            currentDimensionIndex++;
            const newDimension = dimensionLevels[currentDimensionIndex];
            let newWidth = canvasWidth;
            let newHeight = canvasHeight;
            
            if (newWidth > newDimension || newHeight > newDimension) {
              if (newWidth > newHeight) {
                newHeight = Math.round((newHeight / newWidth) * newDimension);
                newWidth = newDimension;
              } else {
                newWidth = Math.round((newWidth / newHeight) * newDimension);
                newHeight = newDimension;
              }
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Redraw image with new dimensions
            if (needsRotation) {
              ctx.save();
              ctx.translate(newWidth / 2, newHeight / 2);
              ctx.rotate(Math.PI / 2);
              ctx.translate(-newHeight / 2, -newWidth / 2);
              ctx.drawImage(img, 0, 0, newHeight, newWidth);
              ctx.restore();
            } else {
              applyExifOrientation(ctx, orientation, newWidth, newHeight);
              ctx.drawImage(img, 0, 0, newWidth, newHeight);
            }
            
            dimension = newDimension;
          }
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // If conversion fails, try next quality level
                if (currentQualityIndex < qualityLevels.length - 1) {
                  currentQualityIndex++;
                  tryCompress(qualityLevels[currentQualityIndex], dimension, false);
                } else if (currentDimensionIndex < dimensionLevels.length - 1) {
                  // Try with smaller dimension
                  currentQualityIndex = 0; // Reset quality
                  tryCompress(qualityLevels[0], dimension, true);
                } else {
                  // All options exhausted - use best result or original
                  URL.revokeObjectURL(objectUrl);
                  if (bestResult && bestResult.blob.size < file.size) {
                    const compressedFile = new File(
                      [bestResult.blob],
                      file.name.replace(/\.[^/.]+$/, '.jpg'),
                      { type: 'image/jpeg', lastModified: Date.now() }
                    );
                    if (onProgress) onProgress(100);
                    resolve(compressedFile);
                  } else {
                    resolve(file); // Return original if all attempts fail
                  }
                }
                return;
              }

              // Track best result (smallest that's still smaller than original)
              if (blob.size < file.size && (!bestResult || blob.size < bestResult.blob.size)) {
                bestResult = { blob, quality, dimension };
              }

              // If compressed version is under 5MB, use it
              if (blob.size <= maxSize) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '.jpg'),
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                URL.revokeObjectURL(objectUrl);
                if (onProgress) onProgress(100);
                resolve(compressedFile);
              } else if (blob.size < file.size && currentQualityIndex < qualityLevels.length - 1) {
                // Compressed version is smaller than original but still too large
                // Try lower quality
                currentQualityIndex++;
                tryCompress(qualityLevels[currentQualityIndex], dimension, false);
              } else if (blob.size < file.size && currentDimensionIndex < dimensionLevels.length - 1) {
                // Try with smaller dimension
                currentQualityIndex = 0; // Reset quality
                tryCompress(qualityLevels[0], dimension, true);
              } else if (bestResult && bestResult.blob.size < file.size) {
                // Use best result we found
                const compressedFile = new File(
                  [bestResult.blob],
                  file.name.replace(/\.[^/.]+$/, '.jpg'),
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                URL.revokeObjectURL(objectUrl);
                if (onProgress) onProgress(100);
                resolve(compressedFile);
              } else {
                // Compressed version is larger than original or no improvement
                // Try lower quality or smaller dimension
                if (currentQualityIndex < qualityLevels.length - 1) {
                  currentQualityIndex++;
                  tryCompress(qualityLevels[currentQualityIndex], dimension, false);
                } else if (currentDimensionIndex < dimensionLevels.length - 1) {
                  currentQualityIndex = 0;
                  tryCompress(qualityLevels[0], dimension, true);
                } else {
                  // All options exhausted
                  URL.revokeObjectURL(objectUrl);
                  if (bestResult && bestResult.blob.size < file.size) {
                    const compressedFile = new File(
                      [bestResult.blob],
                      file.name.replace(/\.[^/.]+$/, '.jpg'),
                      { type: 'image/jpeg', lastModified: Date.now() }
                    );
                    if (onProgress) onProgress(100);
                    resolve(compressedFile);
                  } else {
                    resolve(file); // Return original if compression doesn't help
                  }
                }
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        // Start with first quality level
        tryCompress(qualityLevels[0], maxDimension, false);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        console.warn('[Thumbnail Compression] Error during compression:', error);
        // Try a last-ditch effort: create a very small version
        try {
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 400;
          fallbackCanvas.height = 400;
          const fallbackCtx = fallbackCanvas.getContext('2d');
          if (fallbackCtx) {
            fallbackCtx.drawImage(img, 0, 0, 400, 400);
            fallbackCanvas.toBlob((blob) => {
              if (blob && blob.size < file.size && blob.size <= 5 * 1024 * 1024) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '.jpg'),
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                resolve(compressedFile);
              } else {
                resolve(file); // Return original if fallback also fails
              }
            }, 'image/jpeg', 0.3);
          } else {
            resolve(file); // Canvas not supported
          }
        } catch (fallbackError) {
          resolve(file); // Return original if all attempts fail
        }
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      console.warn('[Thumbnail Compression] Failed to load image for compression');
      resolve(file); // Return original on error
    };
  });
}

/**
 * Remove audio track from video file
 * NOTE: This function converts to WebM format (MediaRecorder limitation)
 * Only use when audio removal is critical and format change is acceptable
 * For MP4 files, this will convert to WebM, which may reduce quality
 */
async function removeAudioFromVideo(file: File, onProgress?: (progress: number) => void): Promise<File> {
  // Skip audio removal for MP4 files to preserve format and quality
  // MediaRecorder only supports WebM, so removing audio would convert MP4 to WebM
  if (file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')) {
    console.log('[Video Processing] Skipping audio removal for MP4 to preserve format');
    if (onProgress) onProgress(100);
    return file;
  }

  // Check if MediaRecorder is available
  if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp9') && 
      !MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    console.warn('MediaRecorder nicht unterstützt, verwende Original-Video (mit möglichem Audio)');
    if (onProgress) onProgress(100);
    return file;
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true; // Mute for playback
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
        // Use canvas to capture video stream (NO AUDIO)
        const canvas = document.createElement('canvas');
        // Keep original resolution for audio removal (no need to downscale)
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
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

        // Capture stream from canvas (this stream has NO audio track)
        const stream = canvas.captureStream(30); // 30 FPS
        
        // High quality bitrate: adjust based on resolution
        // ~4 Mbps per 1000px width, minimum 5 Mbps for good quality
        const bitrate = Math.max(5000000, Math.round((canvas.width / 1000) * 4000000));
        
        // MediaRecorder will only record the video track (no audio in canvas stream)
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: bitrate,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
            if (onProgress) {
              const progress = Math.min(50 + (chunks.length * 2), 95);
              onProgress(progress);
            }
          }
        };

        mediaRecorder.onstop = () => {
          if (hasResolved) return;
          
          try {
            const noAudioBlob = new Blob(chunks, { type: mimeType });
            
            if (noAudioBlob.size > 0) {
            // Ensure MIME type is set correctly for webm
            const finalMimeType = mimeType || 'video/webm';
            const noAudioFile = new File([noAudioBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
              type: finalMimeType,
              lastModified: Date.now(),
            });
              if (onProgress) onProgress(100);
              hasResolved = true;
              cleanup();
              resolve(noAudioFile);
            } else {
              resolveWithOriginal();
            }
          } catch (error) {
            console.warn('Fehler beim Erstellen der Datei ohne Audio:', error);
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
          console.warn('Fehler beim Starten der Audio-Entfernung:', error);
          resolveWithOriginal();
        }
      } catch (error) {
        console.warn('Fehler bei Audio-Entfernung:', error);
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

// FFmpeg instance (lazy-loaded)
let ffmpegInstance: any = null;

/**
 * Initialize FFmpeg instance (lazy loading with dynamic import)
 */
async function getFFmpeg(): Promise<any> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  // Dynamically import FFmpeg to avoid bundling it in the main bundle
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ]);

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  const ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }: { message: string }) => {
    console.log('[FFmpeg]', message);
  });

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    console.error('[FFmpeg] Failed to load:', error);
    throw error;
  }
}

/**
 * Compress video file to reduce size before upload using FFmpeg
 * Only called for files >= 20MB to improve loading performance
 * Preserves original format (MP4, MOV, etc.) - no WebM conversion
 */
async function compressVideo(file: File, onProgress?: (progress: number) => void): Promise<File> {
  try {
    if (onProgress) onProgress(10);
    
    // Initialize FFmpeg
    const ffmpeg = await getFFmpeg();
    if (onProgress) onProgress(20);

    // Get video metadata to determine optimal compression settings
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load video metadata'));
      };
    });

    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    const maxWidth = Math.min(originalWidth, 1920); // Max Full HD
    const aspectRatio = originalHeight / originalWidth;
    const targetHeight = Math.round(maxWidth * aspectRatio);

    // Determine if we need to resize
    const needsResize = originalWidth > 1920;
    
    // Calculate bitrate based on resolution (4 Mbps per 1000px width, min 2 Mbps)
    const bitrate = Math.max(2000000, Math.round((maxWidth / 1000) * 4000000));

    // Get file extension to preserve format
    const ext = getFileExt(file.name) || 'mp4';
    const inputFileName = `input.${ext}`;
    const outputFileName = `output.${ext}`;

    if (onProgress) onProgress(30);

    // Write input file to FFmpeg
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));
    if (onProgress) onProgress(40);

    // Build FFmpeg command
    // -i: input file
    // -c:v libx264: use H.264 codec (MP4 compatible)
    // -preset medium: balance between speed and compression
    // -crf 23: quality setting (lower = better quality, 18-28 is good range)
    // -vf scale: resize if needed
    // -c:a aac: audio codec for MP4
    // -b:a 128k: audio bitrate
    // -movflags +faststart: enable fast start for web playback
    const args = [
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      ...(needsResize ? ['-vf', `scale=${maxWidth}:${targetHeight}`] : []),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-b:v', `${bitrate}`,
      '-movflags', '+faststart',
      '-y', // Overwrite output file
      outputFileName,
    ];

    // Monitor progress
    ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        // Progress from 40% to 90% (FFmpeg processing)
        const ffmpegProgress = 40 + (progress * 0.5);
        onProgress(ffmpegProgress);
      }
    });

    if (onProgress) onProgress(45);

    // Execute FFmpeg command
    await ffmpeg.exec(args);
    if (onProgress) onProgress(90);

    // Read output file
    const data = await ffmpeg.readFile(outputFileName);
    if (onProgress) onProgress(95);

    // Clean up
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    // Create File object from compressed data
    const compressedBlob = new Blob([data], { type: file.type || `video/${ext}` });
    
    // Only use compressed version if it's at least 10% smaller
    if (compressedBlob.size > 0 && compressedBlob.size < file.size * 0.9) {
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, `.${ext}`),
        {
          type: file.type || `video/${ext}`,
          lastModified: Date.now(),
        }
      );
      if (onProgress) onProgress(100);
      console.log(`[Video Compression] Reduced from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
      return compressedFile;
    } else {
      // Compression didn't help enough, use original
      console.log('[Video Compression] Compression did not reduce size significantly, using original');
      if (onProgress) onProgress(100);
      return file;
    }
  } catch (error) {
    console.warn('[Video Compression] FFmpeg compression failed, using original:', error);
    if (onProgress) onProgress(100);
    return file; // Fallback to original on error
  }
}

/**
 * Upload file to All-Inkl using chunked upload for large files
 * Includes retry mechanism and better error handling
 */
async function uploadToAllInkl(
  file: File,
  fileType: 'video' | 'image',
  sectorId?: string,
  onProgress?: (progress: number) => void,
  retryCount: number = 0
): Promise<string> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second base delay
  const UPLOAD_TIMEOUT = 300000; // 5 minutes timeout
  
  // Ensure file type is set correctly
  // Remove codecs parameter from MIME type for server compatibility
  let mimeType = file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg');
  // Remove codecs parameter (e.g., 'video/webm;codecs=vp9' -> 'video/webm')
  if (mimeType.includes(';')) {
    mimeType = mimeType.split(';')[0];
  }
  
  // Use smaller chunks for better reliability, especially for large files
  // Smaller chunks reduce timeout risk and improve progress tracking
  // For files > 50MB, use 3MB chunks; for smaller files, use 5MB chunks
  const chunkSize = file.size > 50 * 1024 * 1024 
    ? 3 * 1024 * 1024  // 3MB chunks for large files (>50MB)
    : 5 * 1024 * 1024; // 5MB chunks for smaller files
  const totalChunks = Math.ceil(file.size / chunkSize);
  const useChunked = totalChunks > 1;
  const uploadSessionId = useChunked ? randomId() : null;
  
  // Helper function to wait for network to come back online
  const waitForNetwork = (): Promise<void> => {
    return new Promise((resolve) => {
      // If already online, resolve immediately
      if (navigator.onLine) {
        resolve();
        return;
      }

      console.log('[Upload] Network offline, waiting for connection...');
      
      // Wait for online event
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        console.log('[Upload] Network back online, resuming upload...');
        // Wait a bit more to ensure connection is stable
        setTimeout(resolve, 1000);
      };

      window.addEventListener('online', handleOnline, { once: true });
    });
  };

  // Helper function to retry with exponential backoff and network detection
  const retryWithBackoff = async (fn: () => Promise<string>): Promise<string> => {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's a network-related error
      const isNetworkError = 
        error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.toLowerCase().includes('failed to fetch') ||
        error.message?.toLowerCase().includes('networkerror') ||
        error.name === 'NetworkError' ||
        error.name === 'TypeError' ||
        !navigator.onLine; // Browser is offline
      
      if (isNetworkError && retryCount < MAX_RETRIES) {
        // If offline, wait for network to come back
        if (!navigator.onLine) {
          console.log('[Upload] Internet offline, waiting for connection to resume...');
          await waitForNetwork();
        }
        
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(`[All-Inkl Upload] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadToAllInkl(file, fileType, sectorId, onProgress, retryCount + 1);
      }
      throw error;
    }
  };

  if (useChunked) {
    // Chunked upload for large files with retry mechanism
    return retryWithBackoff(async () => {
      // Setup keep-alive for background uploads (once for entire upload)
      const cleanupKeepAlive = setupUploadKeepAlive();
      
      try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);

        const headers: Record<string, string> = {
          'X-File-Name': file.name,
          'X-File-Size': file.size.toString(),
          'X-File-Type': mimeType,
          'X-Chunk-Number': i.toString(),
          'X-Total-Chunks': totalChunks.toString(),
        };

        if (uploadSessionId) {
          headers['X-Upload-Session-Id'] = uploadSessionId;
        }

        if (sectorId) {
          headers['X-Sector-Id'] = sectorId;
        }

          // Upload chunk with timeout
          // Use longer timeout for larger files (more chunks = more time needed)
          const chunkTimeout = totalChunks > 10 
            ? UPLOAD_TIMEOUT * 2  // 10 minutes for files with many chunks
            : UPLOAD_TIMEOUT;      // 5 minutes for smaller files
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), chunkTimeout);

        try {
            // Check if network is available before attempting upload
            if (!navigator.onLine) {
              console.log('[Upload] Network offline, waiting for connection...');
              await waitForNetwork();
            }

          const response = await fetch(`${ALLINKL_API_URL}/upload.php`, {
            method: 'POST',
            body: formData,
            headers: headers,
            signal: controller.signal,
              // keepalive helps keep request alive when tab is switched
              // Note: Some browsers may still throttle, but this improves chances
              keepalive: true,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorMessage = `Upload failed: ${response.statusText}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If JSON parsing fails, use status text
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();

          // Update progress
          if (onProgress) {
            const chunkProgress = ((i + 1) / totalChunks) * 100;
            onProgress(chunkProgress);
          }

          // If this is the last chunk, return the URL
          if (i === totalChunks - 1 && result.url) {
              cleanupKeepAlive();
            return result.url;
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
              // Check if abort was due to network issue
              if (!navigator.onLine) {
                cleanupKeepAlive();
                throw new Error('Upload interrupted: Network connection lost');
              }
              cleanupKeepAlive();
            throw new Error('Upload timeout: Request took too long');
          }
            cleanupKeepAlive();
          throw error;
        }
      }

        cleanupKeepAlive();
      throw new Error('Upload completed but no URL returned');
      } catch (error) {
        cleanupKeepAlive();
        throw error;
      }
    });
  } else {
    // Single file upload for small files with retry mechanism
    return retryWithBackoff(async () => {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {
        'X-File-Name': file.name,
        'X-File-Size': file.size.toString(),
        'X-File-Type': mimeType,
      };

      if (sectorId) {
        headers['X-Sector-Id'] = sectorId;
      }

      // Setup keep-alive for background uploads
      const cleanupKeepAlive = setupUploadKeepAlive();
      
      // Check if network is available before attempting upload
      if (!navigator.onLine) {
        console.log('[Upload] Network offline, waiting for connection...');
        await waitForNetwork();
      }

      // Track upload progress using XMLHttpRequest for better progress tracking
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let isResolved = false;

        // Monitor network status during upload
        const handleOffline = () => {
          if (!isResolved) {
            console.log('[Upload] Network went offline during upload, will retry...');
            // Don't abort immediately, wait a bit to see if connection comes back
            setTimeout(() => {
              if (!navigator.onLine && !isResolved) {
                xhr.abort();
                isResolved = true;
                cleanupKeepAlive();
                window.removeEventListener('offline', handleOffline);
                window.removeEventListener('online', handleOnline);
                reject(new Error('Upload interrupted: Network connection lost'));
              }
            }, 5000); // Wait 5 seconds before giving up
          }
        };

        const handleOnline = () => {
          console.log('[Upload] Network back online during upload');
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Timeout handling
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            xhr.abort();
            isResolved = true;
            cleanupKeepAlive();
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            reject(new Error('Upload timeout: Request took too long'));
          }
        }, UPLOAD_TIMEOUT);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          clearTimeout(timeoutId);
          cleanupKeepAlive();
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnline);
          if (isResolved) return;
          
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.success && result.url) {
                isResolved = true;
                resolve(result.url);
              } else {
                isResolved = true;
                const errorMsg = result.error || 'Upload failed';
                console.error('[All-Inkl Upload] Server error:', errorMsg, 'Response:', result);
                reject(new Error(errorMsg));
              }
            } catch (error) {
              isResolved = true;
              console.error('[All-Inkl Upload] Failed to parse response:', xhr.responseText);
              reject(new Error(`Failed to parse response: ${xhr.responseText.substring(0, 200)}`));
            }
          } else {
            isResolved = true;
            let errorMsg = `Upload failed: ${xhr.statusText} (${xhr.status})`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              if (errorResponse.error) {
                errorMsg = errorResponse.error;
              }
            } catch (e) {
              // If response is not JSON, use status text
            }
            console.error('[All-Inkl Upload] HTTP error:', xhr.status, xhr.statusText, 'Response:', xhr.responseText);
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener('error', () => {
          cleanupKeepAlive();
          clearTimeout(timeoutId);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnline);
          if (isResolved) return;
          isResolved = true;
          const errorMsg = !navigator.onLine 
            ? 'Upload failed: Network connection lost'
            : 'Upload failed: Network error';
          reject(new Error(errorMsg));
        });

        xhr.addEventListener('abort', () => {
          cleanupKeepAlive();
          clearTimeout(timeoutId);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnline);
          if (isResolved) return;
          isResolved = true;
          const errorMsg = !navigator.onLine
            ? 'Upload aborted: Network connection lost'
            : 'Upload aborted';
          reject(new Error(errorMsg));
        });

        xhr.open('POST', `${ALLINKL_API_URL}/upload.php`);
        
        // Set headers
        Object.keys(headers).forEach(key => {
          xhr.setRequestHeader(key, headers[key]);
        });

        xhr.send(formData);
      });
    });
  }
}

export async function uploadBetaVideo(
  file: File,
  onProgress?: (progress: number) => void,
  boulderId?: string | null
): Promise<string> {
  // Determine upload type
  const uploadType = USE_ALLINKL_STORAGE ? 'allinkl' : 'supabase';
  
  // Initialize logger
  const logger = new UploadLogger(file, 'video', uploadType, boulderId);
  
  try {
    // Initialize log entry and check for duplicates
    await logger.initialize();
    await logger.updateStatus('pending', 0);
  } catch (error: any) {
    if (error.message === 'Duplicate file detected') {
      throw error; // Re-throw duplicate errors
    }
    // Continue with upload even if logging fails
    console.warn('[UploadLogger] Failed to initialize, continuing without logging:', error);
  }

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];
  if (!allowedTypes.includes(file.type)) {
    const error = new Error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
    await logger.updateStatus('failed', 0, error).catch(() => {});
    throw error;
  }

  // Preserve original file extension for format detection
  const originalExt = getFileExt(file.name) || (file.type.includes('mp4') ? 'mp4' : 'mp4');
  
  // Process video: compress large files for better performance
  // Strategy: 
  // - Small videos (< 20MB): keep original format (MP4, MOV, etc.) for quality
  // - Large videos (>= 20MB): compress using FFmpeg while preserving original format (MP4, MOV, etc.)
  // FFmpeg allows compression without format conversion
  let videoToUpload = file;
  const compressionThreshold = 20 * 1024 * 1024; // 20MB
  const shouldCompress = file.size >= compressionThreshold;
  
  if (shouldCompress) {
    try {
      await logger.updateStatus('compressing', 5).catch(() => {});
      if (onProgress) onProgress(5);
      
      console.log('[Video Upload] Compressing large video (>20MB) for better performance:', file.type, file.name);
      // FFmpeg compression preserves original format (MP4, MOV, etc.)
      videoToUpload = await compressVideo(file, (progress) => {
        const compressionProgress = 5 + (progress * 0.45); // 5-50% for compression
        logger.updateStatus('compressing', compressionProgress).catch(() => {});
        if (onProgress) {
          onProgress(compressionProgress);
        }
      });
      
      await logger.updateStatus('compressing', 50).catch(() => {});
      if (onProgress) onProgress(50);
    } catch (error: any) {
      console.warn('Video processing (compression) failed, using original:', error);
      await logger.updateStatus('compressing', 50, error).catch(() => {});
      videoToUpload = file; // Use original if processing fails
    }
  } else {
    // Small videos: preserve original format and quality
    console.log('[Video Upload] Keeping original format for small video (<20MB):', file.type, file.name);
    await logger.updateStatus('uploading', 0).catch(() => {});
    if (onProgress) onProgress(0);
  }

  // Validate file size (500MB max to allow larger videos while still having a reasonable limit)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (videoToUpload.size > maxSize) {
    const error = new Error(`Datei zu groß. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB. Bitte komprimiere das Video oder verwende YouTube/Vimeo für größere Videos.`);
    await logger.updateStatus('failed', 0, error).catch(() => {});
    throw error;
  }

  // Use All-Inkl if enabled, otherwise fallback to Supabase
  if (USE_ALLINKL_STORAGE) {
    try {
      const uploadStartProgress = shouldCompress ? 50 : 0;
      await logger.updateStatus('uploading', uploadStartProgress).catch(() => {});
      
      // Upload progress: starts at 50% if compression was done, otherwise 0%
      const uploadProgress = onProgress 
        ? (progress: number) => {
            const totalProgress = uploadStartProgress + (progress * (shouldCompress ? 0.5 : 1.0));
            logger.updateStatus('uploading', totalProgress).catch(() => {});
            onProgress(totalProgress);
          }
        : undefined;
      
      const url = await uploadToAllInkl(videoToUpload, 'video', undefined, uploadProgress);
      await logger.updateStatus('completed', 100, null, null, url).catch(() => {});
      return url;
    } catch (error: any) {
      console.error('[All-Inkl Video Upload] Failed:', error);
      console.error('[All-Inkl Video Upload] Error details:', {
        message: error.message,
        fileName: videoToUpload.name,
        fileSize: videoToUpload.size,
        fileType: videoToUpload.type,
        stack: error.stack,
      });
      await logger.incrementRetry().catch(() => {});
      await logger.updateStatus('failed', 50, error).catch(() => {});
      // DO NOT fallback to Supabase - throw error instead
      throw new Error(`CDN-Upload fehlgeschlagen: ${error.message}. Bitte versuche es erneut oder kontaktiere den Administrator.`);
    }
  }

  // If All-Inkl is not enabled, use Supabase Storage
  const uploadStartProgress = shouldCompress ? 50 : 0;
  await logger.updateStatus('uploading', uploadStartProgress).catch(() => {});
  
  // Preserve original file extension to maintain format (MP4, MOV, etc.)
  // FFmpeg compression preserves the original format
  const ext = getFileExt(videoToUpload.name) || originalExt;
  const objectPath = `uploads/${randomId()}.${ext}`;

  // Simulate progress if callback provided (starts at 50% if compression was done, otherwise 0%)
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = uploadStartProgress;
    const interval = setInterval(() => {
      progress += Math.random() * 10; // Increment by 0-10% each time
      if (progress >= 95) {
        progress = 95; // Cap at 95% until upload completes
        clearInterval(interval);
      }
      logger.updateStatus('uploading', progress).catch(() => {});
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
      await logger.updateStatus('failed', 0, error).catch(() => {});
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

    await logger.updateStatus('completed', 100, null, null, urlData.publicUrl).catch(() => {});
    return urlData.publicUrl;
  } catch (error: any) {
    // Clear progress simulation on error
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    await logger.updateStatus('failed', 0, error).catch(() => {});
    throw error;
  }
}

/**
 * Compress and resize sector image for optimal performance
 * Resizes to max 1920px width (Full HD) and compresses to JPEG with 85% quality
 * Maintains aspect ratio and corrects EXIF orientation
 */
async function compressSectorImage(file: File, onProgress?: (progress: number) => void): Promise<File> {
  return new Promise(async (resolve, reject) => {
    // Read EXIF orientation first
    const orientation = await getExifOrientation(file);
    
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      try {
        let imgWidth = img.width;
        let imgHeight = img.height;

        // Calculate optimal dimensions (max 1920px width, maintain aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = imgWidth;
        let height = imgHeight;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            // Landscape
            width = Math.min(width, maxWidth);
            height = Math.round(width / aspectRatio);
            if (height > maxHeight) {
              height = maxHeight;
              width = Math.round(height * aspectRatio);
            }
          } else {
            // Portrait
            height = Math.min(height, maxHeight);
            width = Math.round(height * aspectRatio);
            if (width > maxWidth) {
              width = maxWidth;
              height = Math.round(width / aspectRatio);
            }
          }
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context not available'));
          return;
        }

        // Apply EXIF orientation correction
        applyExifOrientation(ctx, orientation, width, height);

        // Draw and scale image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            if (onProgress) onProgress(100);
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
  });
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

  // Compress image before upload to reduce size and improve loading performance
  let imageToUpload = file;
  try {
    if (onProgress) onProgress(5);
    imageToUpload = await compressSectorImage(file, (progress) => {
      const compressionProgress = 5 + (progress * 0.4); // 5-45% for compression
      if (onProgress) {
        onProgress(compressionProgress);
      }
    });
    if (onProgress) onProgress(45);
  } catch (error: any) {
    console.warn('[Sector Image Upload] Compression failed, using original:', error);
    imageToUpload = file; // Use original if compression fails
  }

  // Validate file size AFTER compression (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (imageToUpload.size > maxSize) {
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedSizeMB = (imageToUpload.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Datei zu groß. Original: ${originalSizeMB}MB, nach Kompression: ${compressedSizeMB}MB. ` +
      `Maximum: ${Math.round(maxSize / (1024 * 1024))}MB. Bitte verwende ein kleineres Bild.`
    );
  }

  // Use All-Inkl if enabled, otherwise fallback to Supabase
  if (USE_ALLINKL_STORAGE) {
    try {
      const uploadProgress = onProgress 
        ? (progress: number) => {
            // Compression took 0-45%, upload takes 45-100%
            const totalProgress = 45 + (progress * 0.55);
            onProgress(totalProgress);
          }
        : undefined;
      return await uploadToAllInkl(imageToUpload, 'image', sectorId, uploadProgress);
    } catch (error: any) {
      console.error('[All-Inkl Upload] Failed, falling back to Supabase:', error);
      // Fallback to Supabase if All-Inkl fails
    }
  }

  // Fallback to Supabase Storage
  const ext = 'jpg'; // Always use JPEG after compression
  const objectPath = `${sectorId}/${randomId()}.${ext}`;

  // Simulate progress if callback provided (starts at 45% after compression)
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = 45; // Start at 45% after compression
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 95) {
        progress = 95;
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
      .upload(objectPath, imageToUpload, {
        cacheControl: '604800', // 7 days cache for sector images
        upsert: true,
        contentType: 'image/jpeg', // Always JPEG after compression
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
  onProgress?: (progress: number) => void,
  boulderId?: string | null
): Promise<string> {
  // Determine upload type
  const uploadType = USE_ALLINKL_STORAGE ? 'allinkl' : 'supabase';
  
  // Initialize logger
  const logger = new UploadLogger(file, 'thumbnail', uploadType, boulderId);
  
  try {
    // Initialize log entry and check for duplicates
    await logger.initialize();
    await logger.updateStatus('pending', 0);
  } catch (error: any) {
    if (error.message === 'Duplicate file detected') {
      throw error; // Re-throw duplicate errors
    }
    // Continue with upload even if logging fails
    console.warn('[UploadLogger] Failed to initialize, continuing without logging:', error);
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    const error = new Error(`Ungültiger Dateityp. Erlaubt sind: ${allowedTypes.join(', ')}`);
    await logger.updateStatus('failed', 0, error).catch(() => {});
    throw error;
  }

  // Compress and optimize thumbnail before upload
  // This reduces file size significantly, so we check size AFTER compression
  let thumbnailToUpload = file;
  try {
    await logger.updateStatus('compressing', 5).catch(() => {});
    if (onProgress) onProgress(5);
    
    thumbnailToUpload = await compressThumbnail(file, (progress) => {
      const compressionProgress = 5 + (progress * 0.4); // 5-45% for compression
      logger.updateStatus('compressing', compressionProgress).catch(() => {});
      if (onProgress) {
        onProgress(compressionProgress);
      }
    });
    
    await logger.updateStatus('compressing', 45).catch(() => {});
    if (onProgress) onProgress(45);
  } catch (error: any) {
    console.warn('[Thumbnail Upload] Compression failed, using original:', error);
    await logger.updateStatus('compressing', 45, error).catch(() => {});
    thumbnailToUpload = file; // Use original if compression fails
  }

  // Validate file size AFTER compression (5MB max for thumbnails)
  // Large original files can be compressed to under 5MB, so we check after compression
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (thumbnailToUpload.size > maxSize) {
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedSizeMB = (thumbnailToUpload.size / (1024 * 1024)).toFixed(2);
    const error = new Error(
      `Datei zu groß. Original: ${originalSizeMB}MB, nach Kompression: ${compressedSizeMB}MB. ` +
      `Maximum: ${Math.round(maxSize / 1024 / 1024)}MB. Bitte verwende ein kleineres Bild oder reduziere die Auflösung.`
    );
    await logger.updateStatus('failed', 0, error).catch(() => {});
    throw error;
  }

  // Use All-Inkl if enabled, otherwise fallback to Supabase
  if (USE_ALLINKL_STORAGE) {
    try {
      await logger.updateStatus('uploading', 45).catch(() => {});
      
      const uploadProgress = onProgress 
        ? (progress: number) => {
            // Compression took 0-45%, upload takes 45-100%
            const totalProgress = 45 + (progress * 0.55);
            logger.updateStatus('uploading', totalProgress).catch(() => {});
            onProgress(totalProgress);
          }
        : undefined;
      
      const url = await uploadToAllInkl(thumbnailToUpload, 'image', undefined, uploadProgress);
      await logger.updateStatus('completed', 100, null, null, url).catch(() => {});
      return url;
    } catch (error: any) {
      console.error('[All-Inkl Thumbnail Upload] Failed:', error);
      await logger.incrementRetry().catch(() => {});
      await logger.updateStatus('failed', 0, error).catch(() => {});
      // DO NOT fallback to Supabase - throw error instead
      throw new Error(`CDN-Upload fehlgeschlagen: ${error.message}. Bitte versuche es erneut oder kontaktiere den Administrator.`);
    }
  }

  // If All-Inkl is not enabled, use Supabase Storage
  await logger.updateStatus('uploading', 45).catch(() => {});
  
  // Store thumbnails in a separate bucket or in the beta-videos bucket with a prefix
  // Always use .jpg extension for compressed thumbnails
  const ext = 'jpg';
  const objectPath = `thumbnails/${randomId()}.${ext}`;

  // Simulate progress if callback provided (starts at 45% after compression)
  const simulateProgress = () => {
    if (!onProgress) return;
    
    let progress = 45; // Start at 45% after compression
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 95) {
        progress = 95;
        clearInterval(interval);
      }
      const totalProgress = progress;
      logger.updateStatus('uploading', totalProgress).catch(() => {});
      onProgress(totalProgress);
    }, 200);
    
    return interval;
  };

  const progressInterval = simulateProgress();

  try {
    const { data, error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(objectPath, thumbnailToUpload, {
        cacheControl: '31536000', // 1 year cache for thumbnails (immutable)
        upsert: true,
        contentType: 'image/jpeg', // Always JPEG after compression
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
      await logger.updateStatus('failed', 0, error).catch(() => {});
      throw error;
    }

    if (onProgress) {
      onProgress(100);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(DEFAULT_BUCKET)
      .getPublicUrl(objectPath);

    await logger.updateStatus('completed', 100, null, null, urlData.publicUrl).catch(() => {});
    return urlData.publicUrl;
  } catch (error: any) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    console.error('[Thumbnail Upload] Upload failed:', error);
    await logger.updateStatus('failed', 0, error).catch(() => {});
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

