/** Only the two immutable operator series verified in the public production
 * catalog are recognized. A PNG extension or a matching name on another host
 * is not a publication receipt. The UUID must belong to this exact row. */
export function isPublishedThumbnailVariant(source, backend, boulderId) {
  if (!source || !backend || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(boulderId || '')) return false;
  try {
    const base = new URL(backend), photo = new URL(source);
    if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash
      || photo.origin !== base.origin || photo.username || photo.password) return false;
    const path = /^\/storage\/v1\/object\/public\/beta-videos\/thumbnail-focus\/(?:live-)?confirmed-2026-10-20\/([a-f\d-]{36})-([a-f\d]{20})\.png$/i.exec(photo.pathname);
    return Boolean(path && path[1].toLowerCase() === boulderId.toLowerCase());
  } catch { return false; }
}

export function thumbnailReviewProtection(row, backend, receipts = [], requireVolume = true) {
  if (isPublishedThumbnailVariant(row.thumbnail_url, backend, row.id)
    || receipts.some(receipt => receipt.sourceBackend === backend && receipt.boulderId === row.id
      && ['accepted', 'published'].includes(receipt.state) && typeof receipt.publishedUrl === 'string'
      && receipt.publishedUrl.length > 0 && receipt.publishedUrl === row.thumbnail_url)) return 'published';
  if (row.volume_only === true) return 'volume';
  if (requireVolume && typeof row.volume_only !== 'boolean') return 'unknown-volume';
  if (row.status !== 'haengt') return 'status';
  return null;
}

export function resolveThumbnailServiceBase({ enabled, path, native, review = false, backend }) {
  if (enabled !== 'true' || typeof path !== 'string' || !/^\/(?!\/)[a-zA-Z\d/_-]+$/.test(path)
    || path.split('/').some(part => part === '.' || part === '..')) return '';
  const normalized = path.replace(/\/$/, '');
  if (!native && !review) return normalized;
  try {
    const origin = new URL(backend);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
      || ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname.toLowerCase())) return '';
    return `${origin.origin}${normalized}`;
  } catch { return ''; }
}

/** File selection is independent from UI guards; stale drafts must never
 * reactivate processing when the feature is off or a route uses only volumes. */
export function focusedThumbnailFile(draft, enabled) {
  const focus = draft.thumbnailFocus;
  const key = `${draft.colorId}|${draft.colorId2 || ''}|${draft.volumeOnly === true}`;
  return enabled && !draft.volumeOnly && focus?.mode === 'focus' && focus.confirmed === true && focus.result && (focus.selected?.length || focus.result.base_thumbnail_url)
    && focus.outputFile instanceof Blob && focus.inputFile === draft.thumbFile && focus.inputKey === key
    ? focus.outputFile : draft.thumbFile;
}

/** Confirmation belongs to this exact photo/route selection, not the dialog. */
export function thumbnailConfirmationRequired(draft, enabled) {
  const focus = draft.thumbnailFocus;
  const key = `${draft.colorId}|${draft.colorId2 || ''}|${draft.volumeOnly === true}`;
  return Boolean(enabled && !draft.volumeOnly && focus?.mode === 'focus' && focus.result && focus.selected?.length
    && focus.inputFile === draft.thumbFile && focus.inputKey === key && focus.confirmed !== true);
}

/** Pillow's thumbnail sizing minimizes aspect error at the integer edge. */
export function thumbnailPhotoDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || Math.min(width, height) < 48 || width * height > 30_000_000) throw new Error('Foto mit mindestens 48 Pixeln je Seite und höchstens 30 Megapixeln wählen.');
  if (Math.max(width, height) <= 720) return [width, height];
  const aspect = width / height;
  const closest = (value, error) => {
    const lo = Math.floor(value), hi = Math.ceil(value);
    return error(lo) <= error(hi) ? lo : hi;
  };
  const size = width >= height
    ? [720, closest(720 / aspect, value => Math.abs(aspect - 720 / value))]
    : [closest(720 * aspect, value => Math.abs(aspect - value / 720)), 720];
  if (Math.min(...size) < 48) throw new Error('Foto zu schmal: nach der Vorschauverkleinerung mindestens 48 Pixel je Seite.');
  return size;
}
