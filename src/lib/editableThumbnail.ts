import { backendConfig } from '@/lib/backendConfig';
import { createAuthenticatedUploadFetch, getCurrentSession } from '@/lib/authenticatedFetch';
import { createManualPhotoResult, readPhoto, renderThumbnail, thumbnailUploadFile, type HoldResult, type ThumbnailFocus } from './thumbnailFocus';
import { isPublishedThumbnailVariant } from './thumbnailPolicy.mjs';
import { getVideoApiBase } from '@/utils/nativeVideoUpload';
import { resumableUpload } from '@/utils/resumableUpload';
import { saveEditableThumbnail } from './editableThumbnailTransport.mjs';

export interface ExistingThumbnailSource {
  url: string;
  sha256?: string;
  // Image pixels come from the original; only geometry is stored in the DB.
  selection?: Omit<HoldResult, 'image'> & { automatic: string[] };
}
export async function loadExistingThumbnail(boulderId: string, currentUrl: string, color: string, color2: string | null, signal: AbortSignal) {
  const session = await getCurrentSession(signal);
  if (!session) throw new Error('Bitte erneut anmelden. Deine Eingaben bleiben erhalten.');
  const transport = createAuthenticatedUploadFetch(session.user.id);
  const query = new URLSearchParams({ boulder_id: `eq.${boulderId}`, thumbnail_url: `eq.${currentUrl}`, select: 'original_url,original_sha256,selection,color,color_2' });
  const response = await transport(`${backendConfig.supabaseUrl}/rest/v1/boulder_thumbnail_sources?${query}`, { headers: { apikey: backendConfig.publicKey }, signal });
  if (!response.ok) throw new Error('Das Originalfoto konnte nicht geladen werden. Bitte erneut versuchen oder ein Foto wählen.');
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length > 1) throw new Error('Das Originalfoto ist nicht eindeutig zugeordnet. Bitte ein Foto wählen.');
  const stored = rows[0];
  if (!stored && (isPublishedThumbnailVariant(currentUrl, backendConfig.supabaseUrl, boulderId) || new URL(currentUrl).pathname.includes('thumbnail-focus'))) {
    throw new Error('Das Farboriginal ist noch nicht zugeordnet. Bitte ein Originalfoto wählen.');
  }
  const source: ExistingThumbnailSource = {
    url: stored?.original_url || currentUrl,
    sha256: stored?.original_sha256 || undefined,
    selection: stored?.color === color && (stored?.color_2 || null) === color2 ? stored.selection || undefined : undefined,
  };
  const url = new URL(source.url);
  const hosts = backendConfig.environment === 'review'
    ? ['review-api.kletterwelt-sauerland.de', 'review-video.kletterwelt-sauerland.de']
    : ['beta-api.kletterwelt-sauerland.de', 'beta.kletterwelt-sauerland.de', 'video.kletterwelt-sauerland.de', 'cdn.kletterwelt-sauerland.de'];
  if (url.protocol !== 'https:' || url.username || url.password || !hosts.includes(url.hostname)) {
    throw new Error('Bitte ein Originalfoto von deinem Gerät wählen.');
  }
  const photo = await fetch(source.url, { signal, credentials: 'omit', redirect: 'error' });
  if (!photo.ok || Number(photo.headers.get('content-length')) > 12_000_000) throw new Error('Das Originalfoto ist nicht verfügbar. Bitte erneut versuchen oder ein Foto wählen.');
  const blob = await photo.blob();
  const file = new File([blob], 'Boulder-Original.' + (blob.type === 'image/png' ? 'png' : 'jpg'), { type: blob.type });
  await readPhoto(file);
  const hash = await photoHash(file);
  if (source.sha256 && source.sha256 !== hash) throw new Error('Das Originalfoto hat sich geändert. Bitte ein Foto wählen.');
  signal.throwIfAborted();
  return { file, source: { ...source, sha256: hash } };
}
export async function restoreThumbnailFocus(file: File, source: ExistingThumbnailSource, inputKey: string): Promise<ThumbnailFocus | undefined> {
  const saved = source.selection;
  if (!saved || saved.image_hash !== source.sha256) return undefined;
  if (!Array.isArray(saved.candidates) || saved.candidates.length > 200 || !Array.isArray(saved.selected) || !Array.isArray(saved.automatic)
    || !saved.candidates.every(c => typeof c.id === 'string' && Array.isArray(c.polygon) && c.polygon.length >= 3 && c.polygon.length <= 10000
      && c.polygon.every(p => p.length === 2 && p.every(Number.isFinite)) && Array.isArray(c.box) && c.box.length === 4 && c.box.every(Number.isFinite))
    || ![...saved.selected, ...saved.automatic].every(id => saved.candidates.some(c => c.id === id))) return undefined;
  const photo = await createManualPhotoResult(file);
  if (photo.width !== saved.width || photo.height !== saved.height) return undefined;
  const focus: ThumbnailFocus = { inputFile: file, inputKey, outputFile: file, result: { ...saved, image: photo.image }, selected: saved.selected, automatic: saved.automatic, mode: 'focus', confirmed: false };
  return { ...focus, outputFile: await renderThumbnail(focus) };
}
export async function photoHash(file: Blob) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
}
export async function commitThumbnailSource(body: Record<string, unknown>, transport: typeof fetch) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await transport(`${backendConfig.supabaseUrl}/rest/v1/rpc/save_boulder_thumbnail`, {
      method: 'POST', headers: { apikey: backendConfig.publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || result !== true) throw new Error(result?.message || 'Vorschaubild konnte nicht gespeichert werden. Deine Auswahl bleibt erhalten.');
  } catch (reason) {
    if (controller.signal.aborted) throw new Error('Speichern wurde nicht rechtzeitig bestätigt. Deine Auswahl bleibt erhalten; bitte erneut speichern.');
    throw reason;
  } finally { clearTimeout(timeout); }
}

// The original File remains the weak key: closing the editor releases receipts.
const receipts = new WeakMap<File, Map<string, { originalUrl?: string; thumbnailUrl?: string }>>();
export async function saveBoulderThumbnail(draft: {
  id: string; thumbFile: File | null; thumbnailFocus?: ThumbnailFocus; colorId: string; colorId2?: string; volumeOnly?: boolean;
  existingThumbnailUrl?: string | null; thumbnailSource?: ExistingThumbnailSource;
}, color: string, color2: string | null) {
  if (!draft.thumbFile) return;
  const session = await getCurrentSession();
  if (!session) throw new Error('Bitte erneut anmelden. Deine Eingaben bleiben erhalten.');
  const transport = createAuthenticatedUploadFetch(session.user.id);
  const original = draft.thumbFile, output = thumbnailUploadFile(draft)!;
  const originalHash = await photoHash(original), outputHash = await photoHash(output);
  const selection = output !== original && draft.thumbnailFocus?.result ? (() => {
    const { image: _pixels, ...geometry } = draft.thumbnailFocus.result;
    void _pixels;
    return { ...geometry, selected: draft.thumbnailFocus.selected, automatic: draft.thumbnailFocus.automatic };
  })() : null;
  let entries = receipts.get(original);
  if (!entries) { entries = new Map(); receipts.set(original, entries); }
  const key = JSON.stringify([backendConfig.supabaseUrl, session.user.id, draft.id, draft.existingThumbnailUrl, outputHash, color, color2, draft.volumeOnly === true]);
  let receipt = entries.get(key);
  if (!receipt) { receipt = {}; entries.set(key, receipt); }
  await saveEditableThumbnail({
    boulderId: draft.id, expectedUrl: draft.existingThumbnailUrl || null,
    sourceUrl: draft.thumbnailSource?.sha256 === originalHash ? draft.thumbnailSource.url : undefined,
    originalHash, selection, color, color2, volumeOnly: draft.volumeOnly === true, sameFile: output === original,
  }, receipt, {
    uploadOriginal: async () => (await resumableUpload(original, getVideoApiBase(), { sessionId: crypto.randomUUID(), fetch: transport })).url,
    uploadThumbnail: async () => (await resumableUpload(output, getVideoApiBase(), { sessionId: crypto.randomUUID(), fetch: transport })).url,
    commit: body => commitThumbnailSource(body, transport),
  });
  return receipt.thumbnailUrl;
}
