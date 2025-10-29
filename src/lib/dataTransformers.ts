import { Boulder as SupabaseBoulder, Sector as SupabaseSector } from '@/hooks/useBoulders';
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
  
  return {
    id: boulder.id,
    name: boulder.name,
    sector: sector?.name || 'Unbekannter Sektor',
    difficulty: boulder.difficulty as Boulder['difficulty'],
    color: boulder.color as Boulder['color'],
    betaVideoUrl: boulder.beta_video_url || undefined,
    note: boulder.note || undefined,
    createdAt: new Date(boulder.created_at),
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

