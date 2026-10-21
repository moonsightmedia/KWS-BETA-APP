import { getCurrentSession } from '@/lib/authenticatedFetch';
import { backendConfig } from '@/lib/backendConfig';
import { Capacitor } from '@capacitor/core';
import { focusedThumbnailFile, resolveThumbnailServiceBase, thumbnailConfirmationRequired, thumbnailPhotoDimensions } from './thumbnailPolicy.mjs';
/** Off by default. Production web uses the same-origin proxy; installed apps
 * and the isolated demo use their own configured API's authenticated proxy. */
export const thumbnailServiceBase = () => {
  return resolveThumbnailServiceBase({enabled: import.meta.env.VITE_THUMBNAIL_FOCUS,
    path: import.meta.env.VITE_THUMBNAIL_API_PATH || '', native: Capacitor.isNativePlatform(), review: backendConfig.environment === 'review', backend: backendConfig.supabaseUrl});
};
export const isThumbnailFocusEnabled = () => Boolean(thumbnailServiceBase());

export interface HoldCandidate {
  id: string;
  polygon: [number, number][];
  holes?: [number, number][][];
  box: [number, number, number, number];
  area: number;
  source: 'automatic' | 'point_correction' | 'polygon_correction';
  modelVersion?: string;
}
export interface HoldResult {
  version: string;
  color?: string;
  image_hash: string;
  image: string;
  width: number;
  height: number;
  candidates: HoldCandidate[];
  selected: string[];
  note?: string;
  status?: string;
  label_count?: number;
}
export interface ThumbnailFocus {
  inputFile: File;
  inputKey: string;
  result: HoldResult | null;
  selected: string[];
  automatic: string[];
  mode: 'focus' | 'original';
  confirmed?: boolean;
  outputFile: File;
}
type FocusDraft = {
  thumbFile: File | null;
  colorId: string;
  colorId2?: string;
  volumeOnly?: boolean;
  thumbnailFocus?: ThumbnailFocus;
};
export const thumbnailInputKey = (d: Pick<FocusDraft, 'colorId' | 'colorId2' | 'volumeOnly'>) =>
  `${d.colorId}|${d.colorId2 || ''}|${d.volumeOnly === true}`;

/** Always fall back to the original when file or route metadata changed. */
export function thumbnailUploadFile(draft: FocusDraft) {
  return focusedThumbnailFile(draft, isThumbnailFocusEnabled()) as File | null;
}
export const needsThumbnailConfirmation = (draft: FocusDraft) => thumbnailConfirmationRequired(draft, isThumbnailFocusEnabled());
const colorMap: Record<string, string> = {grün:'green',gruen:'green',green:'green',gelb:'yellow',yellow:'yellow',weiß:'white',weiss:'white',white:'white',schwarz:'black',black:'black',rot:'red',red:'red',blau:'blue',blue:'blue',orange:'orange',lila:'purple',violett:'purple',purple:'purple'};
export const detectorColor = (name: string) => colorMap[name.trim().toLocaleLowerCase('de')] || null;

let requests: Promise<unknown> = Promise.resolve();
export async function readPhoto(file: File): Promise<string> {
  if (file.size > 12_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Für die Griffvorschau bitte JPG, PNG oder WebP bis 12 MB wählen. Das Original bleibt erhalten.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}
export function requestHolds(image: string, color: string, signal: AbortSignal, point?: [number, number]): Promise<HoldResult> {
  const task = requests.catch(() => {}).then(async () => {
    if (!isThumbnailFocusEnabled()) throw new Error('Die Grifferkennung ist noch nicht eingerichtet.');
    const session = await getCurrentSession();
    for (let attempt = 0; attempt < 6; attempt++) {
      signal.throwIfAborted();
      const controller = new AbortController();
      const abort = () => controller.abort(); signal.addEventListener('abort', abort, {once:true});
      const timeout = setTimeout(() => controller.abort(), 45000);
      // A superseded job may finish on the local server; callers discard its result.
      try {
        const response = await fetch(`${thumbnailServiceBase()}/api/analyze`, {method:'POST',headers:{'Content-Type':'application/json', ...(session?.access_token ? {Authorization: `Bearer ${session.access_token}`} : {})},
          body:JSON.stringify({image,color,...(point ? {point} : {})}),signal:controller.signal});
        const result = await response.json();
        signal.throwIfAborted();
        if (response.status === 429 && attempt < 5) {await new Promise(resolve => setTimeout(resolve,800));continue;}
        if (!response.ok) throw new Error(result.error || 'Die lokale Grifferkennung ist fehlgeschlagen.');
        return result as HoldResult;
      } finally {clearTimeout(timeout); signal.removeEventListener('abort', abort);}
    }
    throw new Error('Der lokale Dienst ist beschäftigt. Bitte erneut versuchen.');
  });
  requests = task;
  return task;
}
export function holdPath(candidate: HoldCandidate, includeHoles = true) {
  const path = new Path2D();
  for (const contour of [candidate.polygon, ...(includeHoles ? candidate.holes || [] : [])]) {
    contour.forEach(([x,y],i) => i ? path.lineTo(x,y) : path.moveTo(x,y));path.closePath();
  }
  return path;
}
export function loadPhoto(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject) => {const image = new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Das Bild konnte nicht geöffnet werden.'));image.src=url;});
}
/** Local, explicitly manual photo space when the service cannot propose a mask.
 * Raw bytes and their digest stay the source of truth; no photo is transmitted. */
export async function createManualPhotoResult(file: File): Promise<HoldResult> {
  await readPhoto(file);
  const source = URL.createObjectURL(file);
  try {
    const image = await loadPhoto(source);
    const [width, height] = thumbnailPhotoDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Die manuelle Vorschau konnte nicht vorbereitet werden.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return {version:'local-manual-photo-v1',image_hash:Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join(''),
      image:canvas.toDataURL('image/png'),width,height,candidates:[],selected:[],note:'Kontur am sichtbaren Griffrand nachzeichnen. Das Original bleibt erhalten.'};
  } finally { URL.revokeObjectURL(source); }
}
export function paintThumbnail(canvas: HTMLCanvasElement, image: HTMLImageElement, value: ThumbnailFocus | undefined, view: 'preview' | 'edit' | 'original') {
  const result = value?.result;
  const scale = Math.min(1,720 / Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width = result?.width || Math.round(image.naturalWidth*scale);
  canvas.height = result?.height || Math.round(image.naturalHeight*scale);
  const ctx = canvas.getContext('2d')!;
  const focused = view === 'preview' && value?.mode === 'focus' && value.selected.length && result;
  ctx.filter = focused ? 'grayscale(1)' : 'none';ctx.drawImage(image,0,0,canvas.width,canvas.height);ctx.filter='none';
  if (focused) {
    const selected = result.candidates.filter(c => value.selected.includes(c.id));
    const paths = selected.map(candidate => holdPath(candidate));
    ctx.lineJoin='round';for(const path of selected.map(candidate => holdPath(candidate, false))) {ctx.strokeStyle='#19243680';ctx.lineWidth=4.5*canvas.width/360;ctx.stroke(path);ctx.strokeStyle='#fff';ctx.lineWidth=2.3*canvas.width/360;ctx.stroke(path);}
    // Fill every region after all outlines: overlap is a true union even when
    // hand and model polygons have opposite winding, without internal seams.
    for(const path of paths){ctx.save();ctx.clip(path,'evenodd');ctx.drawImage(image,0,0,canvas.width,canvas.height);ctx.restore();}
  }
  if (view === 'edit' && result) result.candidates.forEach((c,i) => {
    const selected=value.selected.includes(c.id),path=holdPath(c);
    ctx.save();ctx.lineWidth=2*canvas.width/360;ctx.lineJoin='round';ctx.strokeStyle='#192436';ctx.stroke(path);
    ctx.strokeStyle='#fff';ctx.setLineDash(selected?[]:[5,4]);ctx.stroke(path);ctx.setLineDash([]);
    const x=Math.max(0,Math.min(canvas.width-26,c.box[0])),y=Math.max(0,c.box[1]-21);
    ctx.fillStyle=selected?'#192436':'#fff';ctx.fillRect(x,y,26,20);ctx.fillStyle=selected?'#fff':'#192436';ctx.font='600 12px sans-serif';ctx.fillText(`${i+1}${selected?'✓':''}`,x+3,y+14);ctx.restore();
  });
}
export async function renderThumbnail(value: ThumbnailFocus): Promise<File> {
  if (value.mode === 'original' || !value.selected.length || !value.result) return value.inputFile;
  const image=await loadPhoto(value.result.image),canvas=document.createElement('canvas');paintThumbnail(canvas,image,value,'preview');
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Vorschau konnte nicht erstellt werden.')),'image/png'));
  return new File([blob],'thumbnail-focus.png',{type:'image/png'});
}
