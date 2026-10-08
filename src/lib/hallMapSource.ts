import bundledMap from '@/assets/boulderkarte-original.png';

type MapSource = { image_url?: string | null; width?: number | null; height?: number | null };
const positive = (value: number | null | undefined, fallback: number) => value && Number.isFinite(value) && value > 0 ? value : fallback;

// This specific legacy SVG has a different outline from the saved KWS polygons.
// Those polygons were traced from bundledMap (verified against the live map).
// Keep this compatibility correction narrow so future/custom uploads still win.
const legacyKwsDrawing = 'https://pkzzxtsyxwxoraytyjau.supabase.co/storage/v1/object/public/hall-maps/09edc012-45ac-4938-a267-d13fc3acf220/hall-map-base.svg';
const legacyDrawingUrl = new URL(legacyKwsDrawing);

const matchesLegacyDrawing = (savedSrc: string | undefined, apiBaseUrl?: string) => {
  if (!savedSrc) return false;
  try {
    const saved = new URL(savedSrc);
    const allowedOrigin = saved.origin === legacyDrawingUrl.origin
      || (!!apiBaseUrl && saved.origin === new URL(apiBaseUrl).origin);
    return allowedOrigin && saved.pathname === legacyDrawingUrl.pathname;
  } catch {
    return false;
  }
};

/** Image and geometry must use the same source in every layout, including frameless. */
export const resolveHallMapSource = (map?: MapSource | null, apiBaseUrl = import.meta.env?.VITE_SUPABASE_URL) => {
  const savedSrc = map?.image_url?.trim();
  const isLegacyKwsDrawing = matchesLegacyDrawing(savedSrc, apiBaseUrl);
  const src = isLegacyKwsDrawing ? bundledMap : savedSrc || bundledMap;
  const isBundled = src === bundledMap;
  return {
    src,
    // Replacing the legacy drawing must not resize the polygon editing space.
    width: isLegacyKwsDrawing ? positive(map?.width, 735) : isBundled ? 1471 : positive(map?.width, 1471),
    height: isLegacyKwsDrawing ? positive(map?.height, 466) : isBundled ? 930 : positive(map?.height, 930),
    // The static tracing proposals belong exclusively to the bundled PNG.
    supportsProposals: isBundled,
  };
};
