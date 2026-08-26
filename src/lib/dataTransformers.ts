import { Boulder as SupabaseBoulder, VideoQualities } from '@/hooks/useBoulders';
import { Sector as SupabaseSectorHook } from '@/hooks/useSectors';
import { resolveSectorArea } from '@/lib/sectorAreas';
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
  const resolvedSector = sector ? resolveSectorArea(sector) : undefined;
  const resolvedSector2 = sector2 ? resolveSectorArea(sector2) : undefined;
  const publicSecondarySector = resolvedSector2?.publicName !== resolvedSector?.publicName
    ? resolvedSector2?.publicName
    : undefined;
  
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
    sector: resolvedSector?.publicName || 'Unbekannter Sektor',
    sector2: publicSecondarySector,
    sectorId: boulder.sector_id,
    sector2Id: boulder.sector_id_2 || undefined,
    sectorLegacyName: sector?.name || undefined,
    sector2LegacyName: sector2?.name || undefined,
    sectorArea: resolvedSector?.area,
    sector2Area: resolvedSector2?.area,
    sectorSubareaCode: resolvedSector?.subareaCode,
    sector2SubareaCode: resolvedSector2?.subareaCode,
    difficulty: boulder.difficulty as Boulder['difficulty'],
    color: boulder.color as Boulder['color'],
    color2: boulder.color_2 as Boulder['color2'] || undefined,
    betaVideoUrl: boulder.beta_video_url || undefined, // Legacy field
    betaVideoUrls: betaVideoUrls, // New structure with multiple qualities
    thumbnailUrl: boulder.thumbnail_url || undefined,
    note: boulder.note || undefined,
    createdAt: new Date(boulder.created_at),
    status: boulder.status || 'haengt',
  };
};

/**
 * Konvertiert Supabase Sector zu Frontend Sector
 */
export const transformSector = (sector: SupabaseSectorHook): Sector => {
  const resolvedSector = resolveSectorArea(sector);

  return {
    id: sector.id,
    name: resolvedSector.publicName,
    legacyName: sector.name,
    area: resolvedSector.area,
    areaId: resolvedSector.area?.id || sector.area_id || undefined,
    subareaCode: resolvedSector.subareaCode,
    sortOrder: resolvedSector.sortOrder,
    boulderCount: sector.boulder_count,
    description: sector.description || undefined,
    nextSchraubtermin: sector.next_schraubtermin ? new Date(sector.next_schraubtermin) : undefined,
    lastSchraubtermin: sector.last_schraubtermin ? new Date(sector.last_schraubtermin) : undefined,
    imageUrl: sector.image_url || undefined,
  };
};

