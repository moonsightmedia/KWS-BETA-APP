import { getCurrentSession } from '@/lib/authenticatedFetch';
import { backendConfig } from '@/lib/backendConfig';
import { Capacitor } from '@capacitor/core';
import { focusedThumbnailFile, resolveThumbnailServiceBase, thumbnailConfirmationRequired, thumbnailPhotoDimensions } from './thumbnailPolicy.mjs';
/** Off by default. Production web uses the same-origin proxy; installed apps
 * and the isolated demo use their own configured API's authenticated proxy. */
export const thumbnailServiceBase = () => {
  if (import.meta.env.DEV && import.meta.env.VITE_LOCAL_REVIEW_ONLY === 'true') return '/thumbnail-focus';
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
  /** Immutable published pixels for legacy photos whose original mask was not
   * stored. New geometry augments this image; opening never reruns detection. */
  base_thumbnail_url?: string;
  base_image?: string;
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
export async function readPhoto(file: File, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  if (file.size > 12_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Für die Griffvorschau bitte JPG, PNG oder WebP bis 12 MB wählen. Das Original bleibt erhalten.');
  // Read actual bytes rather than a document-owned blob URL. WebKit can revoke
  // the latter while a previous editor is still completing its photo decode.
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal?.throwIfAborted();
  let binary='';
  for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return btoa(binary);
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
export function loadPhoto(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  signal?.throwIfAborted();
  return new Promise((resolve,reject) => {const image = new Image();const stop=()=>{image.onload=null;image.onerror=null;image.src='';reject(signal?.reason || new DOMException('Fotoverarbeitung beendet.','AbortError'));};const cleanup=()=>signal?.removeEventListener('abort',stop);signal?.addEventListener('abort',stop,{once:true});image.onload=()=>{cleanup();resolve(image);};image.onerror=()=>{cleanup();reject(new Error('Das Bild konnte nicht geöffnet werden.'));};image.src=url;});
}
/** Local, explicitly manual photo space when the service cannot propose a mask.
 * Raw bytes and their digest stay the source of truth; no photo is transmitted. */
export async function createManualPhotoResult(file: File, signal?: AbortSignal): Promise<HoldResult> {
  const bytes = await readPhoto(file,signal);
  signal?.throwIfAborted();
  const image = await loadPhoto(`data:${file.type};base64,${bytes}`,signal);
  const [width, height] = thumbnailPhotoDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Die manuelle Vorschau konnte nicht vorbereitet werden.');
  context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  signal?.throwIfAborted();
  return {version:'local-manual-photo-v1',image_hash:Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join(''),
    image:canvas.toDataURL('image/png'),width,height,candidates:[],selected:[],note:'Kontur am sichtbaren Griffrand nachzeichnen. Das Original bleibt erhalten.'};
}

/** Infer only the clicked legacy region from the visible published pixels.
 * Color and added white outline are evidence; this never guesses other holds. */
export async function publishedHoldSelected(canvas: HTMLCanvasElement, originalUrl: string, candidate: HoldCandidate) {
  const original = await loadPhoto(originalUrl), source = document.createElement('canvas');
  source.width=canvas.width;source.height=canvas.height;
  source.getContext('2d')!.drawImage(original,0,0,source.width,source.height);
  const current=canvas.getContext('2d')!, before=source.getContext('2d')!.getImageData(0,0,source.width,source.height).data;
  const after=current.getImageData(0,0,canvas.width,canvas.height).data,path=holdPath(candidate);
  const [left,top,width,height]=candidate.box;
  let colored=0,retained=0,outline=0;
  for(let y=Math.max(0,Math.floor(top-5));y<Math.min(canvas.height,top+height+5);y+=2)for(let x=Math.max(0,Math.floor(left-5));x<Math.min(canvas.width,left+width+5);x+=2){
    const i=(y*canvas.width+x)*4, a=[after[i],after[i+1],after[i+2]],b=[before[i],before[i+1],before[i+2]];
    if(current.isPointInPath(path,x,y) && Math.max(...b)-Math.min(...b)>18){colored++;if(Math.max(...a)-Math.min(...a)>10)retained++;}
    if(Math.min(...a)>239 && Math.max(...b)<218)outline++;
  }
  return (colored>5&&retained/colored>.55)||outline>5;
}
function desaturate(context: CanvasRenderingContext2D, width: number, height: number) {
  // Canvas filter is missing in Safari versions we support. Pixel luminance
  // gives the same real output on web, iPhone and native WebViews.
  const image=context.getImageData(0,0,width,height),pixels=image.data;
  for(let i=0;i<pixels.length;i+=4){const gray=Math.round(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]);pixels[i]=pixels[i+1]=pixels[i+2]=gray;}
  context.putImageData(image,0,0);
}
export function paintThumbnail(canvas: HTMLCanvasElement, image: HTMLImageElement, value: ThumbnailFocus | undefined, view: 'preview' | 'edit' | 'original', baseImage?: HTMLImageElement) {
  const result = value?.result;
  const scale = Math.min(1,720 / Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width = result?.width || Math.round(image.naturalWidth*scale);
  canvas.height = result?.height || Math.round(image.naturalHeight*scale);
  const ctx = canvas.getContext('2d')!;
  const focused = view === 'preview' && value?.mode === 'focus' && (value.selected.length || baseImage) && result;
  const legacy = focused && baseImage;
  ctx.drawImage(legacy || image,0,0,canvas.width,canvas.height);
  if(focused&&!legacy)desaturate(ctx,canvas.width,canvas.height);
  if (focused) {
    // Erase a corrected legacy region including the old outline. Other saved
    // pixels remain byte-for-byte the visual basis, even without old geometry.
    const removed = baseImage ? result.candidates.filter(c => !value.selected.includes(c.id)) : [];
    if (removed.length) {
      const layer = document.createElement('canvas'), mask = document.createElement('canvas');
      layer.width = mask.width = canvas.width; layer.height = mask.height = canvas.height;
      const lc = layer.getContext('2d')!, mc = mask.getContext('2d')!;
      lc.drawImage(image,0,0,canvas.width,canvas.height);desaturate(lc,canvas.width,canvas.height);
      mc.fillStyle = mc.strokeStyle = '#fff'; mc.lineWidth = 8 * canvas.width / 360; mc.lineJoin = 'round';
      for (const candidate of removed) { const path = holdPath(candidate); mc.fill(path,'evenodd'); mc.stroke(path); }
      lc.globalCompositeOperation = 'destination-in'; lc.drawImage(mask,0,0); ctx.drawImage(layer,0,0);
    }
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
  if (value.mode === 'original' || (!value.selected.length && !value.result?.base_image) || !value.result) return value.inputFile;
  const [image, base] = await Promise.all([loadPhoto(value.result.image), value.result.base_image ? loadPhoto(value.result.base_image) : Promise.resolve(undefined)]);
  const canvas=document.createElement('canvas');paintThumbnail(canvas,image,value,'preview',base);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Vorschau konnte nicht erstellt werden.')),'image/png'));
  return new File([blob],'thumbnail-focus.png',{type:'image/png'});
}
