import type { Sector, SectorArea } from '@/types/boulder';

export type CanonicalSectorAreaSlug =
  | 'bug'
  | 'couch-ecke'
  | 'top-out'
  | 'lange-platte'
  | 'grotte';

export interface CanonicalSectorArea extends SectorArea {
  slug: CanonicalSectorAreaSlug;
}

export interface SectorAreaPalette {
  regionFill: string;
  regionFillHighlighted: string;
  regionStroke: string;
  regionStrokeHighlighted: string;
  tagFill: string;
  tagFillHighlighted: string;
  tagStroke: string;
  tagText: string;
  tagTextHighlighted: string;
}

/** The five stable, customer-facing names used throughout the app. */
export const SECTOR_AREAS: readonly CanonicalSectorArea[] = [
  { name: 'Bug', slug: 'bug', sortOrder: 1 },
  { name: 'Couch-Ecke', slug: 'couch-ecke', sortOrder: 2 },
  { name: 'Top-Out', slug: 'top-out', sortOrder: 3 },
  { name: 'Lange Platte', slug: 'lange-platte', sortOrder: 4 },
  { name: 'Grotte', slug: 'grotte', sortOrder: 5 },
] as const;

/** Stable wayfinding colors: every A-D subarea inherits its parent area's palette. */
export const SECTOR_AREA_PALETTES: Readonly<Record<CanonicalSectorAreaSlug, SectorAreaPalette>> = {
  bug: {
    regionFill: '#55D04A',
    regionFillHighlighted: '#2FAF2A',
    regionStroke: 'rgba(255, 255, 255, 0.98)',
    regionStrokeHighlighted: '#2A9E2A',
    tagFill: 'rgba(255, 255, 255, 0.96)',
    tagFillHighlighted: '#36B531',
    tagStroke: '#36B531',
    tagText: '#192436',
    tagTextHighlighted: '#FFFFFF',
  },
  'couch-ecke': {
    regionFill: '#C7EE63',
    regionFillHighlighted: '#9FD52F',
    regionStroke: 'rgba(255, 255, 255, 0.98)',
    regionStrokeHighlighted: '#74A91F',
    tagFill: 'rgba(255, 255, 255, 0.96)',
    tagFillHighlighted: '#72C935',
    tagStroke: '#72C935',
    tagText: '#192436',
    tagTextHighlighted: '#FFFFFF',
  },
  'top-out': {
    regionFill: '#78D991',
    regionFillHighlighted: '#3BBF62',
    regionStroke: 'rgba(255, 255, 255, 0.98)',
    regionStrokeHighlighted: '#178D45',
    tagFill: 'rgba(255, 255, 255, 0.96)',
    tagFillHighlighted: '#1EAD55',
    tagStroke: '#1EAD55',
    tagText: '#192436',
    tagTextHighlighted: '#FFFFFF',
  },
  'lange-platte': {
    regionFill: '#9EDD3D',
    regionFillHighlighted: '#75BC1C',
    regionStroke: 'rgba(255, 255, 255, 0.98)',
    regionStrokeHighlighted: '#699D13',
    tagFill: 'rgba(255, 255, 255, 0.96)',
    tagFillHighlighted: '#8ABD22',
    tagStroke: '#8ABD22',
    tagText: '#192436',
    tagTextHighlighted: '#FFFFFF',
  },
  grotte: {
    regionFill: '#4EC9A0',
    regionFillHighlighted: '#1FAA7D',
    regionStroke: 'rgba(255, 255, 255, 0.98)',
    regionStrokeHighlighted: '#087B59',
    tagFill: 'rgba(255, 255, 255, 0.96)',
    tagFillHighlighted: '#0C9B72',
    tagStroke: '#0C9B72',
    tagText: '#192436',
    tagTextHighlighted: '#FFFFFF',
  },
} as const;

export const DEFAULT_SECTOR_AREA_PALETTE: SectorAreaPalette = {
  regionFill: '#E9F0E7',
  regionFillHighlighted: '#CEE3CA',
  regionStroke: 'rgba(255, 255, 255, 0.98)',
  regionStrokeHighlighted: '#36B531',
  tagFill: 'rgba(255, 255, 255, 0.92)',
  tagFillHighlighted: 'transparent',
  tagStroke: '#D4E1D6',
  tagText: '#192436',
  tagTextHighlighted: '#174A20',
};

export const getSectorAreaPalette = (slug?: string | null): SectorAreaPalette =>
  SECTOR_AREA_PALETTES[slug as CanonicalSectorAreaSlug] ?? DEFAULT_SECTOR_AREA_PALETTE;

export interface LegacySectorAreaMapping {
  legacyName: string;
  areaSlug: CanonicalSectorAreaSlug;
  subareaCode: string;
  sortOrder: number;
}

/**
 * LEGACY COMPATIBILITY ONLY.
 *
 * This matrix keeps the five-area UI functional before all environments have
 * the structured `area`/`subarea_code` database fields. Structured data always
 * wins. Keep the old names because map polygons, QR links and boulders still
 * reference the corresponding technical sector IDs.
 */
export const LEGACY_SECTOR_AREA_MAPPING: readonly LegacySectorAreaMapping[] = [
  { legacyName: 'Atta-Höhle', areaSlug: 'bug', subareaCode: 'A', sortOrder: 1 },
  { legacyName: 'Felsenmeer', areaSlug: 'bug', subareaCode: 'A', sortOrder: 2 },
  { legacyName: 'Steuerbord', areaSlug: 'bug', subareaCode: 'B', sortOrder: 3 },
  { legacyName: 'Bug', areaSlug: 'bug', subareaCode: 'C', sortOrder: 4 },
  { legacyName: 'Buckbord', areaSlug: 'bug', subareaCode: 'D', sortOrder: 5 },

  { legacyName: 'Zwergenwand', areaSlug: 'couch-ecke', subareaCode: 'A', sortOrder: 1 },
  { legacyName: 'Kahlwinkel', areaSlug: 'couch-ecke', subareaCode: 'B', sortOrder: 2 },

  { legacyName: 'Hönneportal', areaSlug: 'top-out', subareaCode: 'A', sortOrder: 1 },
  { legacyName: 'Hintere Burgmauer', areaSlug: 'top-out', subareaCode: 'B', sortOrder: 2 },
  { legacyName: 'Vollmond-klippe', areaSlug: 'top-out', subareaCode: 'C', sortOrder: 3 },
  { legacyName: 'Vordere Burgmauer', areaSlug: 'top-out', subareaCode: 'D', sortOrder: 4 },

  { legacyName: 'Phänomenturm', areaSlug: 'lange-platte', subareaCode: 'A', sortOrder: 1 },
  { legacyName: 'Übergang', areaSlug: 'lange-platte', subareaCode: 'B', sortOrder: 2 },
  { legacyName: 'Albsteg', areaSlug: 'lange-platte', subareaCode: 'C', sortOrder: 3 },
  { legacyName: 'Deckenhöhle', areaSlug: 'lange-platte', subareaCode: 'D', sortOrder: 4 },

  { legacyName: 'Avalonia', areaSlug: 'grotte', subareaCode: 'A', sortOrder: 1 },
  { legacyName: 'Durchbruch', areaSlug: 'grotte', subareaCode: 'B', sortOrder: 2 },
  { legacyName: 'Wandelwand', areaSlug: 'grotte', subareaCode: 'C', sortOrder: 3 },
  { legacyName: 'Bilstein', areaSlug: 'grotte', subareaCode: 'D', sortOrder: 4 },
] as const;

interface SectorAreaLike {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  sortOrder?: number | null;
  sort_order?: number | null;
}

export interface SectorAreaSource {
  name: string;
  legacyName?: string | null;
  area?: SectorAreaLike | null;
  areaId?: string | null;
  area_id?: string | null;
  subareaCode?: string | null;
  subarea_code?: string | null;
  sortOrder?: number | null;
  sort_order?: number | null;
}

export interface ResolvedSectorArea {
  legacyName: string;
  publicName: string;
  area?: SectorArea;
  subareaCode?: string;
  sortOrder?: number;
  usedLegacyMapping: boolean;
}

export interface SectorSubareaGroup {
  code: string;
  name: string;
  sectors: Sector[];
  sectorIds: string[];
  sortOrder: number;
}

export interface SectorAreaGroup {
  area: CanonicalSectorArea;
  sectors: Sector[];
  sectorIds: string[];
  subareas: SectorSubareaGroup[];
}

export interface BoulderSectorReference {
  id: string;
  sector_id?: string | null;
  sector_id_2?: string | null;
  sectorId?: string | null;
  sector2Id?: string | null;
  status?: 'haengt' | 'abgeschraubt' | null;
}

const LEGACY_MAPPING_BY_NAME = new Map(
  LEGACY_SECTOR_AREA_MAPPING.map((mapping) => [mapping.legacyName, mapping]),
);

const canonicalAreaBySlug = new Map(
  SECTOR_AREAS.map((area) => [area.slug, area]),
);

const canonicalAreaByName = new Map(
  SECTOR_AREAS.map((area) => [area.name.toLocaleLowerCase('de-DE'), area]),
);

const normalizeAreaSlug = (value?: string | null): string | undefined => {
  const normalized = value
    ?.trim()
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || undefined;
};

export const normalizeSubareaCode = (value?: string | null): string | undefined => {
  const normalized = value?.trim().toLocaleUpperCase('de-DE');
  return normalized && /^[A-D]$/.test(normalized) ? normalized : undefined;
};

const getCanonicalArea = (slug?: string | null, name?: string | null): CanonicalSectorArea | undefined => {
  const normalizedSlug = normalizeAreaSlug(slug);
  if (normalizedSlug && canonicalAreaBySlug.has(normalizedSlug as CanonicalSectorAreaSlug)) {
    return canonicalAreaBySlug.get(normalizedSlug as CanonicalSectorAreaSlug);
  }

  const normalizedName = name?.trim().toLocaleLowerCase('de-DE');
  return normalizedName ? canonicalAreaByName.get(normalizedName) : undefined;
};

/** Resolves structured fields first and fills only missing values from the legacy matrix. */
export const resolveSectorArea = (sector: SectorAreaSource): ResolvedSectorArea => {
  const legacyName = sector.legacyName?.trim() || sector.name;
  const legacyMapping = LEGACY_MAPPING_BY_NAME.get(legacyName);
  const canonicalStructuredArea = getCanonicalArea(sector.area?.slug, sector.area?.name);
  const fallbackArea = legacyMapping
    ? canonicalAreaBySlug.get(legacyMapping.areaSlug)
    : undefined;

  const structuredAreaName = sector.area?.name?.trim();
  const structuredAreaSlug = normalizeAreaSlug(sector.area?.slug || structuredAreaName);
  const areaTemplate = canonicalStructuredArea || fallbackArea;
  const areaName = structuredAreaName || areaTemplate?.name;
  const areaSlug = structuredAreaSlug || areaTemplate?.slug;
  const areaSortOrder = sector.area?.sortOrder
    ?? sector.area?.sort_order
    ?? areaTemplate?.sortOrder;
  const subareaCode = normalizeSubareaCode(sector.subareaCode ?? sector.subarea_code)
    || legacyMapping?.subareaCode;
  const sortOrder = sector.sortOrder
    ?? sector.sort_order
    ?? legacyMapping?.sortOrder;

  const area = areaName && areaSlug
    ? {
        id: sector.area?.id || sector.areaId || sector.area_id || undefined,
        name: areaName,
        slug: areaSlug,
        sortOrder: areaSortOrder ?? 0,
      }
    : undefined;

  return {
    legacyName,
    publicName: area && subareaCode ? `${area.name} ${subareaCode}` : legacyName,
    area,
    subareaCode,
    sortOrder,
    usedLegacyMapping: Boolean(legacyMapping && (!structuredAreaName || !sector.subareaCode && !sector.subarea_code)),
  };
};

/** Always returns the five canonical cards and merges technical sectors by area and letter. */
export const groupSectorsByArea = (sectors: readonly Sector[]): SectorAreaGroup[] => {
  return SECTOR_AREAS.map((canonicalArea) => {
    const areaSectors = sectors
      .filter((sector) => {
        const resolved = resolveSectorArea(sector);
        return normalizeAreaSlug(resolved.area?.slug) === canonicalArea.slug;
      })
      .sort((left, right) => {
        const leftResolved = resolveSectorArea(left);
        const rightResolved = resolveSectorArea(right);
        return (leftResolved.sortOrder ?? Number.MAX_SAFE_INTEGER)
          - (rightResolved.sortOrder ?? Number.MAX_SAFE_INTEGER)
          || leftResolved.legacyName.localeCompare(rightResolved.legacyName, 'de-DE');
      });

    const subareaMap = new Map<string, SectorSubareaGroup>();
    areaSectors.forEach((sector) => {
      const resolved = resolveSectorArea(sector);
      if (!resolved.subareaCode) return;

      const existing = subareaMap.get(resolved.subareaCode);
      if (existing) {
        existing.sectors.push(sector);
        if (!existing.sectorIds.includes(sector.id)) existing.sectorIds.push(sector.id);
        existing.sortOrder = Math.min(existing.sortOrder, resolved.sortOrder ?? Number.MAX_SAFE_INTEGER);
        return;
      }

      subareaMap.set(resolved.subareaCode, {
        code: resolved.subareaCode,
        name: `${canonicalArea.name} ${resolved.subareaCode}`,
        sectors: [sector],
        sectorIds: [sector.id],
        sortOrder: resolved.sortOrder ?? Number.MAX_SAFE_INTEGER,
      });
    });

    return {
      area: canonicalArea,
      sectors: areaSectors,
      sectorIds: [...new Set(areaSectors.map((sector) => sector.id))],
      subareas: [...subareaMap.values()].sort((left, right) =>
        left.code.localeCompare(right.code, 'de-DE') || left.sortOrder - right.sortOrder,
      ),
    };
  });
};

/** Counts active boulders once even when both sector references belong to the same group. */
export const countActiveBouldersForSectorIds = (
  boulders: readonly BoulderSectorReference[],
  sectorIds: readonly string[],
): number => {
  const relevantSectorIds = new Set(sectorIds);
  const matchingBoulderIds = new Set<string>();

  boulders.forEach((boulder) => {
    if (boulder.status && boulder.status !== 'haengt') return;

    const primarySectorId = boulder.sector_id ?? boulder.sectorId;
    const secondarySectorId = boulder.sector_id_2 ?? boulder.sector2Id;
    if (
      (primarySectorId && relevantSectorIds.has(primarySectorId))
      || (secondarySectorId && relevantSectorIds.has(secondarySectorId))
    ) {
      matchingBoulderIds.add(boulder.id);
    }
  });

  return matchingBoulderIds.size;
};
