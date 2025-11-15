import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Search, Palette, Map, Dumbbell, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BoulderDetailDialog } from '@/components/BoulderDetailDialog';
import { Boulder } from '@/types/boulder';
// Use a data URL for placeholder to ensure it always works
const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjEyMDAiIGZpbGw9IiNFQUVBRUEiIHJ4PSIzIi8+PGcgb3BhY2l0eT0iLjUiPjxwYXRoIGZpbGw9IiNGQUZBRkEiIGQ9Ik02MDAuNzA5IDczNi41Yy03NS40NTQgMC0xMzYuNjIxLTYxLjE2Ny0xMzYuNjIxLTEzNi42MiAwLTc1LjQ1NCA2MS4xNjctMTM2LjYyMSAxMzYuNjIxLTEzNi42MjEgNzUuNDUzIDAgMTM2LjYyIDYxLjE2NyAxMzYuNjIgMTM2LjYyMSAwIDc1LjQ1My02MS4xNjcgMTM2LjYyLTEzNi42MiAxMzYuNjJaIi8+PHBhdGggc3Ryb2tlPSIjQzlDOUM5IiBzdHJva2Utd2lkdGg9IjIuNDE4IiBkPSJNNjAwLjcwOSA3MzYuNWMtNzUuNDU0IDAtMTM2LjYyMS02MS4xNjctMTM2LjYyMS0xMzYuNjIgMC03NS40NTQgNjEuMTY3LTEzNi42MjEgMTM2LjYyMS0xMzYuNjIxIDc1LjQ1MyAwIDEzNi42MiA2MS4xNjcgMTM2LjYyIDEzNi42MjEgMCA3NS40NTMtNjEuMTY3IDEzNi42Mi0xMzYuNjIgMTM2LjYyWiIvPjwvZz48L3N2Zz4=';

const DIFFICULTIES = [1,2,3,4,5,6,7,8];
const COLORS = ['Grün','Gelb','Blau','Orange','Rot','Schwarz','Weiß','Lila'];
const COLOR_HEX: Record<string, string> = {
  'Grün': '#22c55e',
  'Gelb': '#facc15',
  'Blau': '#3b82f6',
  'Orange': '#f97316',
  'Rot': '#ef4444',
  'Schwarz': '#111827',
  'Weiß': '#ffffff',
  'Lila': '#a855f7',
};
const TEXT_ON_COLOR: Record<string, string> = {
  'Grün': 'text-white',
  'Gelb': 'text-black',
  'Blau': 'text-white',
  'Orange': 'text-black',
  'Rot': 'text-white',
  'Schwarz': 'text-white',
  'Weiß': 'text-black',
  'Lila': 'text-white',
};

const Guest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const { data: boulders, isLoading: isLoadingBoulders, error: bouldersError } = useBouldersWithSectors();
  const { data: sectors, isLoading: isLoadingSectors, error: sectorsError } = useSectorsTransformed();
  
  // Note: Hooks already have refetchOnMount: true, so data will be reloaded automatically
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  // Track failed thumbnail attempts to avoid retrying
  const failedThumbnailsRef = useRef<Set<string>>(new Set());
  // Track if we're currently processing to avoid infinite loops
  const isProcessingRef = useRef<boolean>(false);
  // Track which boulder IDs we've already processed to prevent re-processing
  const processedBoulderIdsRef = useRef<Set<string>>(new Set());
  const [selectedBoulder, setSelectedBoulder] = useState<Boulder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [scrollTo, setScrollTo] = useState<null | 'sector' | 'difficulty' | 'color'>(null);
  const [quickFilter, setQuickFilter] = useState<null | 'sector' | 'difficulty' | 'color'>(null);
  const sectorRef = useRef<HTMLDivElement | null>(null);
  const difficultyRef = useRef<HTMLDivElement | null>(null);
  const colorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[Guest] mounted');
    return () => console.log('[Guest] unmounted');
  }, []);

  useEffect(() => {
    console.log('[Guest] Boulders data:', {
      isLoading: isLoadingBoulders,
      hasData: !!boulders,
      count: boulders?.length || 0,
      error: bouldersError,
    });
    if (boulders && boulders.length > 0) {
      console.log('[Guest] Sample boulder:', boulders[0]);
      console.log('[Guest] Boulder statuses:', boulders.map(b => ({ name: b.name, status: (b as any).status })));
    }
    if (bouldersError) {
      console.error('[Guest] Boulder loading error:', bouldersError);
    }
  }, [boulders, isLoadingBoulders, bouldersError]);

  useEffect(() => {
    if (sectorsError) {
      console.error('[Guest] Sectors loading error:', sectorsError);
    }
  }, [sectorsError]);

  useEffect(() => {
    const sectorParam = searchParams.get('sector');
    if (sectorParam) setSectorFilter(sectorParam);
  }, [searchParams]);

  // Auto-scroll to section when filter sheet opens
  useEffect(() => {
    if (filterOpen && scrollTo) {
      const timeout = setTimeout(() => {
        const el = scrollTo === 'sector' ? sectorRef.current : scrollTo === 'difficulty' ? difficultyRef.current : colorRef.current;
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setScrollTo(null);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [filterOpen, scrollTo]);

  const filtered = useMemo(() => {
    let list = boulders || [];
    
    console.log('[Guest] Filtering boulders:', {
      total: boulders?.length || 0,
      sectorFilter,
      difficultyFilter,
      colorFilter,
      searchQuery,
    });
    
    // show only hanging boulders in guest view
    const beforeStatusFilter = list.length;
    list = list.filter((b:any) => {
      const status = (b as any).status;
      const isHanging = status !== 'abgeschraubt';
      if (!isHanging && beforeStatusFilter > 0) {
        console.log('[Guest] Filtered out boulder:', b.name, 'status:', status);
      }
      return isHanging;
    });
    console.log('[Guest] After status filter (hanging only):', list.length, 'of', beforeStatusFilter);
    
    if (sectorFilter !== 'all') {
      // Filter: Boulder erscheint, wenn er in einem der beiden Sektoren ist
      const beforeSectorFilter = list.length;
      list = list.filter(b => {
        const inSector1 = b.sector === sectorFilter;
        const inSector2 = b.sector2 === sectorFilter;
        return inSector1 || inSector2;
      });
      console.log('[Guest] After sector filter:', list.length, 'of', beforeSectorFilter);
    }
    if (difficultyFilter !== 'all') {
      const beforeDifficultyFilter = list.length;
      list = list.filter(b => String(b.difficulty) === difficultyFilter);
      console.log('[Guest] After difficulty filter:', list.length, 'of', beforeDifficultyFilter);
    }
    if (colorFilter !== 'all') {
      const beforeColorFilter = list.length;
      list = list.filter(b => b.color === colorFilter);
      console.log('[Guest] After color filter:', list.length, 'of', beforeColorFilter);
    }
    if (searchQuery.trim()) {
      const beforeSearchFilter = list.length;
      const q = searchQuery.toLowerCase();
      list = list.filter(b => {
        const sectorText = b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector;
        return b.name.toLowerCase().includes(q) || sectorText.toLowerCase().includes(q);
      });
      console.log('[Guest] After search filter:', list.length, 'of', beforeSearchFilter);
    }
    
    console.log('[Guest] Final filtered count:', list.length);
    return list;
  }, [boulders, sectorFilter, difficultyFilter, colorFilter, searchQuery]);

  // Helpers for thumbnails
  const ytId = (url: string) => {
    const m = url.match(/^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return m && m[1].length === 11 ? m[1] : null;
  };
  const vimeoId = (url: string) => {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? m[1] : null;
  };

  // Create a stable reference for boulder IDs and URLs to detect changes
  const filteredBoulderIds = useMemo(() => {
    return filtered.filter(b => b.betaVideoUrl).map(b => `${b.id}:${b.betaVideoUrl}`).sort().join(',');
  }, [filtered]);

  useEffect(() => {
    // Prevent infinite loops - check if already processing
    if (isProcessingRef.current) {
      return;
    }
    
    // Get current boulder IDs with videos and their URLs
    const currentBoulders = filtered.filter(b => b.betaVideoUrl);
    
    // Check if we've already processed all of these boulders with the same URLs
    const allProcessed = currentBoulders.length > 0 && 
                         currentBoulders.every(b => {
                           const key = `${b.id}:${b.betaVideoUrl}`;
                           return processedBoulderIdsRef.current.has(key);
                         });
    
    if (allProcessed) {
      // All boulders already processed with current URLs, skip
      return;
    }
    
    let cancelled = false;
    isProcessingRef.current = true;
    
    const run = async () => {
      // Get current thumbs state using a ref-like approach
      let currentThumbs: Record<string, string> = {};
      setThumbs(prev => {
        currentThumbs = prev;
        return prev;
      });
      
      // First, ensure all boulders with videos have at least a placeholder
      const bouldersWithVideos = filtered.filter(b => b.betaVideoUrl);
      const initialPlaceholders: Record<string, string> = {};
      bouldersWithVideos.forEach(b => {
        if (!currentThumbs[b.id]) {
          // Set placeholder immediately for all boulders with videos
          initialPlaceholders[b.id] = placeholder;
        }
      });
      if (Object.keys(initialPlaceholders).length > 0) {
        setThumbs(prev => ({ ...prev, ...initialPlaceholders }));
        // Update currentThumbs to include the placeholders we just set
        Object.assign(currentThumbs, initialPlaceholders);
      }
      
      // Only process boulders that don't have thumbnails yet and haven't failed before
      // Use ID:URL as key to detect URL changes
      const bouldersToProcess = filtered
        .filter(b => {
          if (!b.betaVideoUrl) return false;
          const key = `${b.id}:${b.betaVideoUrl}`;
          return !failedThumbnailsRef.current.has(key) && !processedBoulderIdsRef.current.has(key);
        })
        .slice(0, 5); // Only process first 5 immediately
      
      if (bouldersToProcess.length === 0) {
        // Mark all current boulders as processed with their current URLs
        bouldersWithVideos.forEach(b => {
          const key = `${b.id}:${b.betaVideoUrl}`;
          processedBoulderIdsRef.current.add(key);
        });
        isProcessingRef.current = false;
        return;
      }
      
      // Mark boulders as being processed BEFORE starting async operations
      bouldersToProcess.forEach(b => {
        const key = `${b.id}:${b.betaVideoUrl}`;
        processedBoulderIdsRef.current.add(key);
      });
      
      // Process thumbnails in parallel for better performance
      const thumbnailPromises = bouldersToProcess.map(async (b) => {
        const url = b.betaVideoUrl!;
        const yid = ytId(url);
        if (yid) {
          return { id: b.id, thumb: `https://img.youtube.com/vi/${yid}/hqdefault.jpg` };
        }
        const vid = vimeoId(url);
        if (vid) {
          return { id: b.id, thumb: `https://vumbnail.com/${vid}.jpg` };
        }
        
        // Try to extract first frame for direct video URLs (optimized - only loads beginning of video)
        try {
          // Use proxy for All-Inkl URLs to ensure CORS headers
          let videoUrl = url;
          if (url.includes('cdn.kletterwelt-sauerland.de')) {
            // Extract filename from URL
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            // Use proxy for reliable CORS
            videoUrl = `https://cdn.kletterwelt-sauerland.de/upload-api/video-proxy.php?file=${encodeURIComponent(fileName)}`;
            console.log(`[Guest] Using proxy for All-Inkl URL: ${url} -> ${videoUrl}`);
          }
          
          console.log(`[Guest] Generating thumbnail for ${b.id}: ${videoUrl}`);
          const video = document.createElement('video');
          video.preload = 'metadata'; // Only load metadata, not full video
          video.muted = true; // Mute to allow autoplay
          video.playsInline = true;
          video.style.display = 'none';
          video.style.position = 'absolute';
          video.style.width = '1px';
          video.style.height = '1px';
          video.style.opacity = '0';
          video.style.pointerEvents = 'none';
          document.body.appendChild(video);
          
          // Add CORS attribute for cross-origin requests
          // Proxy always supports CORS, Supabase doesn't
          if (videoUrl.includes('video-proxy.php') || videoUrl.includes('cdn.kletterwelt-sauerland.de')) {
            video.crossOrigin = 'anonymous';
            console.log(`[Guest] Set CORS for proxied URL: ${videoUrl}`);
          } else if (url.includes('supabase.co')) {
            // Supabase doesn't support CORS for canvas operations
            // Don't set crossOrigin, but we can still draw to canvas (just can't read pixels)
            console.log(`[Guest] Supabase URL detected (no CORS support): ${url}`);
          }
          
          // Wait for metadata to load (this only loads header, not full video)
          // Register error handler BEFORE setting src to catch errors immediately
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              if (video.parentNode) {
                document.body.removeChild(video);
              }
              reject(new Error('Timeout loading metadata'));
            }, 3000); // Reduced timeout to fail faster
            
            // Register error handler FIRST
            video.addEventListener('error', (e) => {
              clearTimeout(timeout);
              if (video.parentNode) {
                document.body.removeChild(video);
              }
              // Check error code - 400 errors mean the file doesn't exist or is corrupted
              const errorCode = video.error?.code;
              if (errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                  errorCode === MediaError.MEDIA_ERR_DECODE ||
                  errorCode === MediaError.MEDIA_ERR_NETWORK) {
                reject(new Error('Video format error or file not accessible'));
              } else {
                reject(new Error('Video load error: ' + (video.error?.message || 'Unknown')));
              }
            }, { once: true });
            
            video.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              resolve(null);
            }, { once: true });
            
            // NOW set the src - error handler is already registered
            video.src = videoUrl;
          });
          
          // Check if video has valid dimensions
          if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
            if (video.parentNode) {
              document.body.removeChild(video);
            }
            return { id: b.id, thumb: placeholder };
          }
          
          // Try multiple time points to find a non-black frame
          // Start at 0.5s, then try 1s, 2s, etc. if needed
          let frameFound = false;
          let currentTime = 0.5;
          const maxTime = Math.min(5, video.duration || 5); // Don't go beyond 5 seconds or video duration
          
          while (!frameFound && currentTime <= maxTime) {
            video.currentTime = currentTime;
          
            // Wait for frame to be seeked and loaded
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Timeout loading frame'));
              }, 2000); // Shorter timeout per frame
              
              const onSeeked = () => {
                clearTimeout(timeout);
                video.removeEventListener('seeked', onSeeked);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                resolve(null);
              };
              
              const onLoadedData = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  clearTimeout(timeout);
                  video.removeEventListener('seeked', onSeeked);
                  video.removeEventListener('loadeddata', onLoadedData);
                  video.removeEventListener('error', onError);
                  resolve(null);
                }
              };
              
              const onError = (e: Event) => {
                clearTimeout(timeout);
                video.removeEventListener('seeked', onSeeked);
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                reject(new Error('Frame load error'));
              };
              
              video.addEventListener('seeked', onSeeked, { once: true });
              video.addEventListener('loadeddata', onLoadedData, { once: true });
              video.addEventListener('error', onError, { once: true });
            });
            
            // Check if this frame is not black
            // Skip CORS check for Supabase URLs (they don't support CORS for canvas)
            const isSupabaseUrl = url.includes('supabase.co');
            if (!isSupabaseUrl) {
              try {
                const testCanvas = document.createElement('canvas');
                testCanvas.width = Math.min(100, video.videoWidth);
                testCanvas.height = Math.min(100, video.videoHeight);
                const testCtx = testCanvas.getContext('2d');
                if (testCtx) {
                  testCtx.drawImage(video, 0, 0, testCanvas.width, testCanvas.height);
                  const testImageData = testCtx.getImageData(0, 0, testCanvas.width, testCanvas.height);
                  const testPixels = testImageData.data;
                  let hasNonBlackPixels = false;
                  for (let i = 0; i < testPixels.length; i += 4) {
                    if (testPixels[i] > 10 || testPixels[i + 1] > 10 || testPixels[i + 2] > 10) {
                      hasNonBlackPixels = true;
                      break;
                    }
                  }
                  if (hasNonBlackPixels) {
                    frameFound = true;
                    console.log(`[Guest] Found non-black frame at ${currentTime}s for ${b.id}`);
                    break;
                  }
                }
              } catch (corsError: any) {
                // CORS error - skip black frame check, just use this frame
                console.warn(`[Guest] CORS error checking frame for ${b.id}, using frame anyway:`, corsError.message);
                frameFound = true;
                break;
              }
            } else {
              // For Supabase URLs, we can't check if frame is black (CORS), but we can try multiple time points
              // Try a few different times to increase chance of getting a non-black frame
              if (currentTime >= 2.0) {
                // After trying 0.5s, 1.0s, 1.5s, 2.0s, use this frame
                frameFound = true;
                console.log(`[Guest] Using frame at ${currentTime}s for Supabase video ${b.id} (tried multiple times, skipping CORS check)`);
                break;
              }
              // Continue to next time point
            }
            
            // Try next time point
            currentTime += 0.5;
          }
          
          if (!frameFound) {
            // If we still haven't found a frame (shouldn't happen), use the last one we tried
            console.warn(`[Guest] No frame found for ${b.id}, using frame at ${currentTime - 0.5}s anyway`);
          }
          
          // Final check for valid dimensions
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          console.log(`[Guest] Video dimensions for ${b.id}: ${videoWidth}x${videoHeight}`);
          
          if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            console.warn(`[Guest] Invalid dimensions for ${b.id}, using placeholder`);
            if (video.parentNode) {
              document.body.removeChild(video);
            }
            return { id: b.id, thumb: placeholder };
          }
          
          // Use smaller canvas size for faster processing
          // For portrait videos, limit height instead of width
          const maxWidth = 240;
          const maxHeight = 320; // Limit height for portrait videos
          const aspectRatio = videoHeight / videoWidth;
          
          let canvasWidth: number;
          let canvasHeight: number;
          
          if (aspectRatio > 1) {
            // Portrait video - limit by height
            canvasHeight = Math.min(maxHeight, videoHeight);
            canvasWidth = Math.round(canvasHeight / aspectRatio);
          } else {
            // Landscape video - limit by width
            canvasWidth = Math.min(maxWidth, videoWidth);
            canvasHeight = Math.round(canvasWidth * aspectRatio);
          }
          
          console.log(`[Guest] Canvas dimensions for ${b.id}: ${canvasWidth}x${canvasHeight} (aspect: ${aspectRatio.toFixed(2)})`);
          
          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          const ctx = canvas.getContext('2d', { willReadFrequently: false });
          if (!ctx) {
            if (video.parentNode) {
              document.body.removeChild(video);
            }
            return { id: b.id, thumb: placeholder };
          }
          
          // Draw video frame to canvas (use the current frame that we found)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Final check if canvas is not completely black (skip for Supabase URLs due to CORS)
          const isSupabaseUrl = url.includes('supabase.co');
          if (!isSupabaseUrl) {
            try {
              const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
              const pixels = imageData.data;
              let hasNonBlackPixels = false;
              for (let i = 0; i < pixels.length; i += 4) {
                // Check if pixel is not pure black (allow some tolerance)
                if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
                  hasNonBlackPixels = true;
                  break;
                }
              }
              
              if (!hasNonBlackPixels) {
                // Canvas is still black even after trying multiple frames - use placeholder
                console.warn(`[Guest] Canvas is still black for ${b.id} after trying multiple frames, using placeholder`);
                if (video.parentNode) {
                  document.body.removeChild(video);
                }
                return { id: b.id, thumb: placeholder };
              }
            } catch (corsError: any) {
              // CORS error - can't check if black, but we can still use the thumbnail
              console.warn(`[Guest] CORS error checking canvas for ${b.id}, using thumbnail anyway:`, corsError.message);
            }
          } else {
            // For Supabase URLs, skip black check (CORS will fail)
            console.log(`[Guest] Skipping black check for Supabase video ${b.id} (CORS not supported)`);
          }
          
          // Try to export canvas to data URL
          // For Supabase URLs, this will fail due to CORS, so we need to catch the error
          let thumb: string;
          try {
            thumb = canvas.toDataURL('image/jpeg', 0.7);
            console.log(`[Guest] Successfully generated thumbnail for ${b.id} (${thumb.length} bytes)`);
          } catch (corsError: any) {
            // CORS error - can't export canvas for Supabase URLs
            console.warn(`[Guest] Cannot export canvas for Supabase video ${b.id} (CORS restriction), using placeholder`);
            thumb = placeholder;
          }
          
          if (video.parentNode) {
            document.body.removeChild(video);
          }
          return { id: b.id, thumb };
        } catch (error: any) {
          // Mark this boulder as failed to avoid retrying (use ID:URL as key)
          const key = `${b.id}:${b.betaVideoUrl}`;
          failedThumbnailsRef.current.add(key);
          // Always log errors for debugging
          const errorMessage = error?.message || '';
          console.error(`[Guest] Failed to generate thumbnail for ${b.id} (${url}):`, errorMessage, error);
          return { id: b.id, thumb: placeholder };
        }
      });
    
      // Wait for all thumbnails to load in parallel
      const results = await Promise.allSettled(thumbnailPromises);
      if (cancelled) {
        isProcessingRef.current = false;
        return;
      }
      
      const newThumbs: Record<string, string> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newThumbs[result.value.id] = result.value.thumb;
        } else {
          // If promise was rejected, use placeholder for that boulder and mark as failed
          const boulder = bouldersToProcess[index];
          if (boulder) {
            const key = `${boulder.id}:${boulder.betaVideoUrl}`;
            failedThumbnailsRef.current.add(key);
            // Make sure it's marked as processed even if it failed
            processedBoulderIdsRef.current.add(key);
            newThumbs[boulder.id] = placeholder;
          }
        }
      });
      
      // Always update thumbs, even if all failed (so placeholders are shown)
      if (Object.keys(newThumbs).length > 0) {
        setThumbs(prev => ({ ...prev, ...newThumbs }));
      } else {
        // If no thumbnails were generated, set placeholders for all processed boulders
        const fallbackThumbs: Record<string, string> = {};
        bouldersToProcess.forEach(b => {
          if (!currentThumbs[b.id]) {
            fallbackThumbs[b.id] = placeholder;
            // Mark as processed with URL
            const key = `${b.id}:${b.betaVideoUrl}`;
            processedBoulderIdsRef.current.add(key);
          }
        });
        if (Object.keys(fallbackThumbs).length > 0) {
          setThumbs(prev => ({ ...prev, ...fallbackThumbs }));
        }
      }
      
      // Ensure all processed boulders are marked as done with their URLs
      bouldersToProcess.forEach(b => {
        const key = `${b.id}:${b.betaVideoUrl}`;
        processedBoulderIdsRef.current.add(key);
      });
      
      // Load remaining thumbnails lazily (one at a time to avoid overwhelming)
      const remaining = filtered
        .filter(b => {
          if (!b.betaVideoUrl || currentThumbs[b.id] || newThumbs[b.id]) return false;
          const key = `${b.id}:${b.betaVideoUrl}`;
          return !failedThumbnailsRef.current.has(key);
        })
        .slice(5); // Skip first 5 that we already processed
      
      // Load remaining thumbnails one by one with delay
      for (const b of remaining) {
        if (cancelled) return;
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between each
        
        const url = b.betaVideoUrl!;
        const yid = ytId(url);
        if (yid) {
          setThumbs(prev => ({ ...prev, [b.id]: `https://img.youtube.com/vi/${yid}/hqdefault.jpg` }));
          continue;
        }
        const vid = vimeoId(url);
        if (vid) {
          setThumbs(prev => ({ ...prev, [b.id]: `https://vumbnail.com/${vid}.jpg` }));
          continue;
        }
        
        // For direct video URLs, generate thumbnail in background
        (async () => {
          // Skip if already failed (use ID:URL as key)
          const key = `${b.id}:${b.betaVideoUrl}`;
          if (failedThumbnailsRef.current.has(key)) {
            setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
            return;
          }
          try {
            // Use proxy for All-Inkl URLs to ensure CORS headers
            let videoUrl = url;
            if (url.includes('cdn.kletterwelt-sauerland.de')) {
              const urlParts = url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              videoUrl = `https://cdn.kletterwelt-sauerland.de/upload-api/video-proxy.php?file=${encodeURIComponent(fileName)}`;
            }
            
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.style.display = 'none';
            video.style.position = 'absolute';
            video.style.width = '1px';
            video.style.height = '1px';
            video.style.opacity = '0';
            video.style.pointerEvents = 'none';
            document.body.appendChild(video);
            video.src = videoUrl;
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                if (video.parentNode) {
                  document.body.removeChild(video);
                }
                reject(new Error('Timeout'));
              }, 3000);
              video.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve(null);
              }, { once: true });
              video.addEventListener('error', () => {
                clearTimeout(timeout);
                if (video.parentNode) {
                  document.body.removeChild(video);
                }
                reject(new Error('Error'));
              }, { once: true });
            });
            
            const duration = video.duration || 0;
            if (duration > 0) {
              const mid = duration / 2;
              video.currentTime = mid;
              
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  if (video.parentNode) {
                    document.body.removeChild(video);
                  }
                  reject(new Error('Timeout'));
                }, 3000);
                video.addEventListener('seeked', () => {
                  clearTimeout(timeout);
                  resolve(null);
                }, { once: true });
                video.addEventListener('error', () => {
                  clearTimeout(timeout);
                  if (video.parentNode) {
                    document.body.removeChild(video);
                  }
                  reject(new Error('Error'));
                }, { once: true });
              });
              
              const maxWidth = 240;
              const videoWidth = video.videoWidth || 640;
              const videoHeight = video.videoHeight || 360;
              const aspectRatio = videoHeight / videoWidth;
              const canvas = document.createElement('canvas');
              canvas.width = maxWidth;
              canvas.height = Math.round(maxWidth * aspectRatio);
              
              const ctx = canvas.getContext('2d');
              if (ctx && videoWidth > 0 && videoHeight > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumb = canvas.toDataURL('image/jpeg', 0.6);
                document.body.removeChild(video);
                setThumbs(prev => ({ ...prev, [b.id]: thumb }));
              } else {
                if (video.parentNode) {
                  document.body.removeChild(video);
                }
                const key = `${b.id}:${b.betaVideoUrl}`;
                failedThumbnailsRef.current.add(key);
                setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
              }
            } else {
              if (video.parentNode) {
                document.body.removeChild(video);
              }
              const key = `${b.id}:${b.betaVideoUrl}`;
              failedThumbnailsRef.current.add(key);
              setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
            }
          } catch {
            // Mark as failed to avoid retrying (use ID:URL as key)
            const key = `${b.id}:${b.betaVideoUrl}`;
            failedThumbnailsRef.current.add(key);
            setThumbs(prev => ({ ...prev, [b.id]: placeholder }));
          }
        })();
      }
    };
    run().finally(() => {
      isProcessingRef.current = false;
    });
    
    return () => {
      cancelled = true;
      isProcessingRef.current = false;
    };
  }, [filteredBoulderIds]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-gradient-to-b from-primary/10 to-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-teko tracking-wide leading-none">Boulder (Gastansicht)</h1>
            <p className="text-xs text-muted-foreground mt-1">Filtere die Boulder. Für mehr Infos anmelden.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border bg-card">
              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              {filtered.length} Treffer
            </span>
            <Button size="sm" onClick={() => { 
              console.log('[Guest] CTA clicked → hard redirect to /auth');
              window.location.href = '/auth';
            }}>
              Mehr erfahren – Anmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">

      {/* Desktop filter row */}
      <div className="hidden sm:flex flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Suchen" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Sektor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {sectors?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Grad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Farbe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: no top search; use floating filter bar below */}

      <div className="grid gap-3">
        {filtered.map(b => (
          <Card 
            key={b.id} 
            className="hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[Guest] Boulder clicked:', b.id, b.name);
              setSelectedBoulder(b);
              setDialogOpen(true);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedBoulder(b);
                setDialogOpen(true);
              }
            }}
          >
            <CardContent className="p-0 pointer-events-none">
              <img 
                className="w-full aspect-video object-cover rounded-t-lg pointer-events-none" 
                src={thumbs[b.id] || placeholder} 
                alt={b.name}
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  if (e.currentTarget.src !== placeholder) {
                    e.currentTarget.src = placeholder;
                  }
                }}
              />
              <div className="p-4 flex items-center justify-between pointer-events-none">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{b.sector2 ? `${b.sector} → ${b.sector2}` : b.sector}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className={`w-6 h-6 rounded-full border grid place-items-center text-[11px] font-semibold ${TEXT_ON_COLOR[b.color] || 'text-white'}`} style={{ backgroundColor: COLOR_HEX[b.color] || '#9ca3af' }}>
                        {b.difficulty}
                      </span>
                      {b.color}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Boulder Detail Dialog */}
      {selectedBoulder && (
        <BoulderDetailDialog
          boulder={selectedBoulder}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedBoulder(null);
            }
          }}
        />
      )}

      

      {/* Floating Filter Bar (mobile) */}
      {quickFilter && (
        <div className="sm:hidden fixed left-4 right-4 bottom-24 z-50 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs px-2 py-1 rounded-full border bg-card">
              {quickFilter === 'color' ? 'Farbe' : quickFilter === 'sector' ? 'Sektor' : 'Schwierigkeit'}
            </span>
            <Button variant="ghost" size="icon" onClick={()=> setQuickFilter(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="w-full">
            <div className="flex items-center gap-2 px-3 pb-3 min-w-max">
              {quickFilter === 'sector' && (
                <>
                  <Button variant={sectorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setSectorFilter('all')}>Alle</Button>
                  {sectors?.map(s => (
                    <Button key={s.id} variant={sectorFilter===s.name?'default':'outline'} size="sm" onClick={()=> setSectorFilter(s.name)}>
                      {s.name}
                    </Button>
                  ))}
                </>
              )}
              {quickFilter === 'difficulty' && (
                <>
                  <Button variant={difficultyFilter==='all'?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter('all')}>Alle</Button>
                  {DIFFICULTIES.map(d => (
                    <Button key={d} variant={difficultyFilter===String(d)?'default':'outline'} size="sm" onClick={()=> setDifficultyFilter(String(d))}>
                      {d}
                    </Button>
                  ))}
                </>
              )}
              {quickFilter === 'color' && (
                <>
                  <Button variant={colorFilter==='all'?'default':'outline'} size="sm" onClick={()=> setColorFilter('all')}>Alle</Button>
                  {COLORS.map(c => (
                    <Button key={c} variant={colorFilter===c?'default':'outline'} size="sm" onClick={()=> setColorFilter(c)}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: COLOR_HEX[c] || '#9ca3af' }} />
                        {c}
                      </span>
                    </Button>
                  ))}
                </>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
      <nav className="sm:hidden fixed bottom-4 left-4 right-4 z-40 bg-sidebar-bg rounded-2xl shadow-2xl border border-border">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <span className="text-xs px-3 py-1 rounded-full border bg-card">{filtered.length} Treffer</span>
          <div className="flex items-center gap-2">
            <Sheet open={filterOpen} onOpenChange={(open)=>{ setFilterOpen(open); if(!open) setScrollTo(null); }}>
              <Button aria-label="Farben filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'color' ? null : 'color')}>
                {colorFilter !== 'all' ? (
                  <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: COLOR_HEX[colorFilter] || '#22c55e' }} />
                ) : (
                  <Palette className="w-5 h-5" />
                )}
              </Button>
              <Button aria-label="Sektor filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'sector' ? null : 'sector')}>
                <span className="relative inline-flex">
                  <Map className="w-5 h-5" />
                  {sectorFilter !== 'all' && <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-primary border border-background" />}
                </span>
              </Button>
              <Button aria-label="Schwierigkeit filtern" variant="outline" size="icon" onClick={()=> setQuickFilter(prev => prev === 'difficulty' ? null : 'difficulty')}>
                {difficultyFilter !== 'all' ? (
                  <span className="w-5 h-5 grid place-items-center text-[11px] font-semibold leading-none">{difficultyFilter}</span>
                ) : (
                  <Dumbbell className="w-5 h-5" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={()=>{ setScrollTo(null); setFilterOpen(true); }}><Filter className="w-5 h-5" /></Button>
              <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>
                  {scrollTo === 'color' ? 'Farbe wählen' : scrollTo === 'sector' ? 'Sektor wählen' : scrollTo === 'difficulty' ? 'Schwierigkeit wählen' : 'Filter'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {scrollTo === null && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Suchen" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
                  </div>
                )}

                {(scrollTo === null || scrollTo === 'sector') && (
                  <div ref={sectorRef}>
                    <label className="text-sm font-medium">Sektor</label>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                      <SelectTrigger><SelectValue placeholder="Sektor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {sectors?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(scrollTo === null || scrollTo === 'difficulty') && (
                  <div ref={difficultyRef}>
                    <label className="text-sm font-medium">Schwierigkeit</label>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger><SelectValue placeholder="Grad" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(scrollTo === null || scrollTo === 'color') && (
                  <div ref={colorRef}>
                    <label className="text-sm font-medium">Farbe</label>
                    <Select value={colorFilter} onValueChange={setColorFilter}>
                      <SelectTrigger><SelectValue placeholder="Farbe" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <div className="h-24 sm:h-0" />
      </main>
    </div>
  );
};

export default Guest;


