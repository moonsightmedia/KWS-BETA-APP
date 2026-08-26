export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null; // null represents "?" (unknown/not rated)
export type BoulderColor = 'Grün' | 'Gelb' | 'Blau' | 'Orange' | 'Rot' | 'Schwarz' | 'Weiß' | 'Lila';

export interface VideoQualities {
  hd?: string;
  sd?: string;
  low?: string;
}

/** Customer-facing parent area shared by one or more technical sectors. */
export interface SectorArea {
  id?: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Boulder {
  id: string;
  name: string;
  /** Customer-facing sector label, for example "Bug A". */
  sector: string;
  /** Optional second customer-facing label; omitted when both physical rows share one logical subarea. */
  sector2?: string;
  /** Stable technical sector references used by the map, schedules and QR links. */
  sectorId?: string;
  sector2Id?: string;
  /** Original technical names retained for legacy links and admin tooling. */
  sectorLegacyName?: string;
  sector2LegacyName?: string;
  sectorArea?: SectorArea;
  sector2Area?: SectorArea;
  sectorSubareaCode?: string;
  sector2SubareaCode?: string;
  difficulty: Difficulty;
  color: BoulderColor;
  color2?: BoulderColor;
  betaVideoUrl?: string; // Legacy field, maps to hd in betaVideoUrls
  betaVideoUrls?: VideoQualities; // New structure with multiple quality levels
  thumbnailUrl?: string; // URL to manually uploaded thumbnail image showing starting holds
  note?: string;
  createdAt: Date;
  status?: 'haengt' | 'abgeschraubt';
  /** Position on hall map: 0-100 percent of map width/height; undefined = not set */
  mapX?: number;
  mapY?: number;
}

export interface Sector {
  id: string;
  /** Customer-facing label, for example "Bug A". */
  name: string;
  /** Original technical sector name; falls back to name for legacy data. */
  legacyName?: string;
  area?: SectorArea;
  areaId?: string;
  subareaCode?: string;
  sortOrder?: number;
  boulderCount: number;
  description?: string;
  nextSchraubtermin?: Date;
  lastSchraubtermin?: Date;
  imageUrl?: string;
}

export interface Statistics {
  totalBoulders: number;
  lastUpdate: Date;
  newBouldersCount: number;
  difficultyDistribution: Record<Difficulty, number>; // Includes null for "?"
  colorDistribution: Record<BoulderColor, number>;
}
