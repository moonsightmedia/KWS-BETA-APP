import { publishThumbnailDecision } from './thumbnailPublish.mjs';
import { backendConfig } from '@/lib/backendConfig';
import { authenticatedFetch, createAuthenticatedUploadFetch, getCurrentSession } from '@/lib/authenticatedFetch';
import { getVideoApiBase } from '@/utils/nativeVideoUpload';
import { resumableUpload } from '@/utils/resumableUpload';
import { detectorColor, readPhoto, requestHolds, renderThumbnail, type HoldCandidate, type HoldResult, type ThumbnailFocus } from './thumbnailFocus';

export interface ReviewPhoto {
  id: string; name: string; color: string; color_2: string | null; sector_id: string;
  thumbnail_url: string; status: string; cache_key: string; photo?: string; result?: string;
  analysis_state?: string; note?: string; selected_count?: number;
  reference?: { image:{sha256:string;width:number;height:number}; algorithm:string; selected:string[]; automatic:string[]; candidates:HoldCandidate[] };
}
export interface ReviewDecision {
  key: string; boulderId: string; sourceUrl: string; sourceBackend: string;
  color: string; color2: string | null;
  state: 'draft' | 'accepted' | 'skipped' | 'published'; savedAt: string;
  focus?: ThumbnailFocus; publishedUrl?: string; ownerId?: string; uploadId?: string;
}
export const localReviewCatalog = import.meta.env.DEV && import.meta.env.VITE_THUMBNAIL_LOCAL_CATALOG === 'true';
const localData = localReviewCatalog;
export const reviewKey = (row: ReviewPhoto) => JSON.stringify([backendConfig.supabaseUrl, row.id, row.thumbnail_url, row.color, row.color_2, row.cache_key]);
const openDB = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('kws-thumbnail-review-v1', 2);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('decisions')) request.result.createObjectStore('decisions', { keyPath: 'key' });
    if (!request.result.objectStoreNames.contains('analyses')) request.result.createObjectStore('analyses', { keyPath: 'key' });
  };
  request.onblocked = () => reject(new Error('Bitte andere geöffnete Prüfansichten schließen und neu laden.'));
  request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  request.onerror = () => reject(new Error('Lokale Speicherung nicht verfügbar. Bitte Browser-Speicher freigeben.'));
});
let reviewWrites:Promise<unknown> = Promise.resolve();
export function saveReview(decision:ReviewDecision):Promise<void> {
  const next=reviewWrites.catch(()=>{}).then(()=>writeReview(decision));
  reviewWrites=next;return next;
}
async function writeReview(decision: ReviewDecision) {
  const db = await openDB();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('decisions', 'readwrite'); tx.objectStore('decisions').put(decision);
    tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(new Error('Speichern fehlgeschlagen. Auswahl bitte nicht schließen.'));
  }); } finally { db.close(); }
}
export async function readReviews(): Promise<ReviewDecision[]> {
  const db = await openDB();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('decisions').objectStore('decisions').getAll();
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Gespeicherte Prüfung konnte nicht gelesen werden.'));
  }); } finally { db.close(); }
}
export async function reviewCatalog(signal: AbortSignal): Promise<ReviewPhoto[]> {
  if (localData) {
    const response = await fetch('/__thumbnail-data/inventory.json', { signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Die lokale Bestandsanalyse wurde noch nicht gestartet.');
    const snapshot = await response.json();
    if (snapshot.source !== backendConfig.supabaseUrl) throw new Error('Bestandsanalyse gehört zu einem anderen Backend.');
    return snapshot.records;
  }
  const rows: ReviewPhoto[] = [];
  const session = await getCurrentSession(signal);
  for (let offset = 0; ; ) {
    const query = new URLSearchParams({select:'id,name,color,color_2,sector_id,thumbnail_url,status',thumbnail_url:'not.is.null',order:'id.asc',limit:'100',offset:String(offset)});
    const response = await authenticatedFetch(`${backendConfig.supabaseUrl}/rest/v1/boulders?${query}`, {signal,headers:{apikey:backendConfig.publicKey,Authorization:`Bearer ${session?.access_token || backendConfig.publicKey}`}});
    if (!response.ok) throw new Error('Der Boulderbestand konnte nicht geladen werden.');
    const page = await response.json();
    rows.push(...page.map((row: ReviewPhoto) => ({...row, cache_key: 'sam-number-cards-3.1',analysis_state:'pending'})));
    if (page.length < 100) break;
    offset += page.length;
  }
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Bestand hat sich geändert. Bitte neu laden.');
  return rows;
}
export async function loadReviewPhoto(row: ReviewPhoto, signal: AbortSignal): Promise<{file: File; result?: HoldResult}> {
  const response = await fetch(localData && row.photo ? `/__thumbnail-data/${row.photo}` : row.thumbnail_url, {signal});
  if (!response.ok) throw new Error('Das Originalfoto konnte nicht geladen werden.');
  const blob = await response.blob();
  const file = new File([blob], `${row.id}.jpg`, {type:blob.type || 'image/jpeg'});
  if (localData && row.analysis_state === 'ready' && row.result) {
    const result = await fetch(`/__thumbnail-data/${row.result}`, {signal});
    if (!result.ok) throw new Error('Analyse konnte nicht geladen werden. Bitte erneut versuchen.');
    return {file,result:await result.json()};
  }
  if (!localData) {
    const db = await openDB();
    try {
      const cached = await new Promise<{result:HoldResult}|undefined>((resolve,reject)=>{
        const request=db.transaction('analyses').objectStore('analyses').get(reviewKey(row));
        request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Lokale Analyse konnte nicht gelesen werden.'));
      });
      return {file,result:cached?.result};
    } finally {db.close();}
  }
  return {file};
}
/** Production review uses the same bounded serial service as uploads. Results
 * survive reloads, keyed by backend, photo URL, route colors and model version. */
export async function analyzeReviewCatalog(rows:ReviewPhoto[],signal:AbortSignal,onDone:(row:ReviewPhoto)=>void) {
  for (const row of rows) {
    signal.throwIfAborted();
    try {
      const colors=[row.color,...(row.color_2?[row.color_2]:[])].map(detectorColor);
      if (colors.some(c=>!c)) {onDone({...row,analysis_state:'manual'});continue;}
      const {file,result:cached}=await loadReviewPhoto(row,signal);
      if (cached) {onDone({...row,analysis_state:'ready',selected_count:cached.selected.length});continue;}
      const image=await readPhoto(file);let combined:HoldResult|undefined;
      for (const color of colors) {
        const current=await requestHolds(image,color!,signal);
        current.candidates=current.candidates.map(c=>({...c,id:`${color}-${c.id}`}));current.selected=current.selected.map(id=>`${color}-${id}`);
        combined=combined?{...combined,candidates:[...combined.candidates,...current.candidates],selected:[...combined.selected,...current.selected]}:current;
      }
      const db=await openDB();
      try {await new Promise<void>((resolve,reject)=>{
        const tx=db.transaction('analyses','readwrite');tx.objectStore('analyses').put({key:reviewKey(row),result:combined});
        tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('Analyse konnte nicht gespeichert werden.'));
      });} finally {db.close();}
      onDone({...row,analysis_state:'ready',selected_count:combined?.selected.length||0});
    } catch(e) {
      if (signal.aborted)throw e;
      onDone({...row,analysis_state:'error',note:'Analyse fehlgeschlagen. Original prüfen oder erneut öffnen.'});
    }
  }
}
export function photoSource(row: ReviewPhoto) {
  return localData && row.photo ? `/__thumbnail-data/${row.photo}` : row.thumbnail_url;
}

/** Upload a new immutable variant, then compare-and-swap only thumbnail_url.
 * Originals remain at their URL; durable local receipts exist before any write.
 * Never use UploadContext here: its general thumbnail upload PATCH is unconditional.
 */
export async function publishReview(decision: ReviewDecision): Promise<ReviewDecision> {
  return publishThumbnailDecision(decision, {
    read:readReviews,save:saveReview,getSession:getCurrentSession,
    backend:backendConfig.supabaseUrl,publicKey:backendConfig.publicKey,
    transportFor:createAuthenticatedUploadFetch,uuid:()=>crypto.randomUUID(),
    upload:async (focus:ThumbnailFocus,uploadId:string,transport:typeof fetch)=>{
      const file=await renderThumbnail(focus);
      const named=new File([file],`thumbnail-focus-${uploadId}.png`,{type:'image/png'});
      return resumableUpload(named,getVideoApiBase(),{sessionId:uploadId,fetch:transport});
    },
  });
}
