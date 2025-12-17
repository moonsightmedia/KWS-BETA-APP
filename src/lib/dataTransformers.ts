import { Boulder as SupabaseBoulder, Sector as SupabaseSector, VideoQualities } from '@/hooks/useBoulders';
import { Sector as SupabaseSectorHook } from '@/hooks/useSectors';
import { Boulder, Sector } from '@/types/boulder';

/**
 * Konvertiert Supabase Boulder (mit sector_id) zu Frontend Boulder (mit sector name)
 */
export const transformBoulder = (
  boulder: SupabaseBoulder,
  sectors: SupabaseSectorHook[] | undefined
): Boulder => {
  const sector = sectors?.find(s => s.id === boulder.sector_id);
  const sector2 = boulder.sector_id_2 ? sectors?.find(s => s.id === boulder.sector_id_2) : null;
  
  // Parse beta_video_urls JSON if available
  let betaVideoUrls: VideoQualities | undefined = undefined;
  if (boulder.beta_video_urls) {
    try {
      // If it's already an object, use it directly
      if (typeof boulder.beta_video_urls === 'object' && !Array.isArray(boulder.beta_video_urls)) {
        betaVideoUrls = boulder.beta_video_urls as VideoQualities;
      } else if (typeof boulder.beta_video_urls === 'string') {
        // If it's a string, parse it as JSON
        betaVideoUrls = JSON.parse(boulder.beta_video_urls) as VideoQualities;
      }
    } catch (error) {
      console.warn('[transformBoulder] Failed to parse beta_video_urls:', error);
    }
  }
  
  // Backward compatibility: if only beta_video_url exists, map it to hd in betaVideoUrls
  if (!betaVideoUrls && boulder.beta_video_url) {
    betaVideoUrls = { hd: boulder.beta_video_url };
  }
  
  return {
    id: boulder.id,
    name: boulder.name,
    sector: sector?.name || 'Unbekannter Sektor',
    sector2: sector2?.name || undefined,
    difficulty: boulder.difficulty as Boulder['difficulty'],
    color: boulder.color as Boulder['color'],
    betaVideoUrl: boulder.beta_video_url || undefined, // Legacy field
    betaVideoUrls: betaVideoUrls, // New structure with multiple qualities
    thumbnailUrl: boulder.thumbnail_url || undefined,
    note: boulder.note || undefined,
    createdAt: new Date(boulder.created_at),
    status: (boulder as any).status || 'haengt',
  };
};

/**
 * Konvertiert Supabase Sector zu Frontend Sector
 */
export const transformSector = (sector: SupabaseSectorHook): Sector => {
  return {
    id: sector.id,
    name: sector.name,
    boulderCount: sector.boulder_count,
    description: sector.description || undefined,
    nextSchraubtermin: sector.next_schraubtermin ? new Date(sector.next_schraubtermin) : undefined,
    lastSchraubtermin: sector.last_schraubtermin ? new Date(sector.last_schraubtermin) : undefined,
    imageUrl: sector.image_url || undefined,
  };
};

