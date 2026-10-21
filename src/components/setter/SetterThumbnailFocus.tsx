import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Loader2, Maximize2, Minimize2, MoreHorizontal, MousePointer2, PencilLine, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createManualPhotoResult, detectorColor, holdPath, loadPhoto, paintThumbnail, publishedHoldSelected, readPhoto, renderThumbnail, requestHolds, type HoldResult, type ThumbnailFocus } from '@/lib/thumbnailFocus';
import { manualContour, samePhotoSpace } from '@/lib/thumbnailGeometry.mjs';

interface Props {
  file: File; previewUrl: string | null; inputKey: string; colorNames: string[]; volumeOnly?: boolean;
  initialView?: 'preview' | 'edit';
  requireConfirmation?: boolean;
  inline?: boolean;
  value?: ThumbnailFocus; disabled: boolean;
  onChange: (value: ThumbnailFocus | undefined) => void;
  onBusyChange: (busy: boolean) => void;
}
export function SetterThumbnailFocus(props: Props) {
  const latest=useRef(props);latest.current=props;
  const identity=useRef({file:props.file,key:props.inputKey});
  const canvas=useRef<HTMLCanvasElement>(null),sequence=useRef(0),controller=useRef<AbortController>();
  const history=useRef<ThumbnailFocus[]>([]),cursor=useRef<[number,number]>([.5,.5]);
  const stroke = useRef<{ pointerId:number; points:[number,number][] } | null>(null), suppressClick = useRef(false);
  const [view,setView]=useState<'preview'|'edit'|'original'>(props.initialView || 'preview');
  const [pending,setPending]=useState(false),[error,setError]=useState(''),[historyCount,setHistoryCount]=useState(0);
  const [cursorVisible,setCursorVisible]=useState(false),[cursorTick,setCursorTick]=useState(0);
  const [tracing,setTracing]=useState(false),[vertices,setVertices]=useState<[number,number][]>([]);
  const [enlarged,setEnlarged]=useState(false);
  useEffect(()=>{const stop=()=>{sequence.current++;controller.current?.abort();};window.addEventListener('pagehide',stop);return()=>window.removeEventListener('pagehide',stop);},[]);
  const value=!props.volumeOnly && props.value?.inputFile===props.file && props.value.inputKey===props.inputKey ? props.value : undefined;
  const requireConfirmation=!props.inline && props.requireConfirmation !== false && !props.volumeOnly;
  const needsConfirmation=requireConfirmation && value?.mode==='focus' && Boolean(value.result && value.selected.length) && value.confirmed !== true;
  const colors=props.colorNames.map(detectorColor);
  const correctionBlocked=!props.colorNames[0] || props.volumeOnly;
  const unsupported=props.volumeOnly ? 'Für „Nur Volumen“ bleibt das Original erhalten.' : !props.colorNames[0] ? 'Wähle zuerst die Grifffarbe.' : colors.some(c=>!c) ? 'Diese Farbe braucht eine manuelle Auswahl. Tippe direkt auf die Griffe oder zeichne die Kontur.' : '';
  const busy=(next:boolean)=>{setPending(next);latest.current.onBusyChange(next);};
  const cancelTrace=()=>{setTracing(false);setVertices([]);latest.current.onBusyChange(false);};
  const startTrace=async()=>{
    if(pending||props.disabled||correctionBlocked)return;
    const {token,signal}=begin();
    try {
      const result=value?.result || await createManualPhotoResult(props.file,signal);
      if(token!==sequence.current)return;
      if(!value?.result)latest.current.onChange({inputFile:props.file,inputKey:props.inputKey,result,selected:[],automatic:[],mode:'original',outputFile:props.file});
      setPending(false);setView('edit');setVertices([]);setTracing(true);
    }catch(reason){fail(reason,token);}
  };
  const remember=()=>{history.current.push(value || {inputFile:props.file,inputKey:props.inputKey,result:null,selected:[],automatic:[],mode:'original',outputFile:props.file});if(history.current.length>30)history.current.shift();setHistoryCount(history.current.length);};
  const commit=async(next:ThumbnailFocus,token:number)=>{
    const outputFile=await renderThumbnail(next);
    if(sequence.current!==token)return;
    latest.current.onChange({...next,outputFile,confirmed:!requireConfirmation});busy(false);
  };
  const begin=()=>{controller.current?.abort();controller.current=new AbortController();const token=++sequence.current;busy(true);setError('');return{token,signal:controller.current.signal};};
  const fail=(reason:unknown,token:number)=>{if(sequence.current!==token)return;setError(reason instanceof Error && reason.name!=='AbortError'?reason.message:'Die lokale Analyse wurde beendet. Du kannst das Original verwenden.');busy(false);};

  const analyze=async()=>{
    if(unsupported)return;
    const {token,signal}=begin();history.current=[];setHistoryCount(0);latest.current.onChange(undefined);
    const {file,inputKey}=latest.current;
    try {
      const image=await readPhoto(file,signal);let combined:HoldResult|undefined;
      for(const color of colors) {
        const result=await requestHolds(image,color!,signal);
        if(token!==sequence.current)return;
        if(combined && (combined.image_hash!==result.image_hash || combined.width!==result.width || combined.height!==result.height || combined.version!==result.version))throw new Error('Das Foto hat sich geändert. Bitte die Erkennung erneut starten.');
        const candidates=result.candidates.map(c=>({...c,id:`${color}-${c.id}`})),selected=props.inline ? candidates.map(c=>c.id) : result.selected.map(id=>`${color}-${id}`);
        combined=combined?{...combined,candidates:[...combined.candidates,...candidates],selected:[...combined.selected,...selected]}:{...result,candidates,selected};
      }
      if(!combined)return;
      await commit({inputFile:file,inputKey,result:combined,selected:[...combined.selected],automatic:[...combined.selected],mode:'focus',outputFile:file},token);
    } catch(reason){fail(reason,token);}
  };
  useEffect(()=>{
    const changed=identity.current.file!==props.file || identity.current.key!==props.inputKey;
    identity.current={file:props.file,key:props.inputKey};
    if(changed && props.value?.confirmed && !props.inline)latest.current.onChange({...props.value,confirmed:false});
    setView(props.initialView || 'preview');setError('');setTracing(false);setVertices([]);setEnlarged(false);history.current=[];setHistoryCount(0);cursor.current=[.5,.5];setCursorVisible(false);
    if(!value && !unsupported)void analyze();else {busy(false);}
    // Invalidate the latest operation counter, not a captured DOM ref value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return()=>{sequence.current++;controller.current?.abort();latest.current.onBusyChange(false);};
    // The identity of the source, route metadata and volume mode alone invalidate a saved mask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[props.file,props.inputKey,props.initialView]);

  useEffect(()=>{
    let cancelled=false;
    const paint=new AbortController(),stop=()=>{cancelled=true;paint.abort();};window.addEventListener('pagehide',stop);
    const url=value?.result?.image || props.previewUrl;
    if(url)void Promise.all([loadPhoto(url,paint.signal), value?.result?.base_image ? loadPhoto(value.result.base_image,paint.signal) : Promise.resolve(undefined)]).then(([image,base])=>{
      if(cancelled || !canvas.current)return;
      paintThumbnail(canvas.current,image,value,props.inline && view!=='original' ? 'preview' : view,base);
      if(tracing){
        // Keep the original visible while tracing, without candidate labels.
        paintThumbnail(canvas.current,image,value,'original');
        const ctx=canvas.current.getContext('2d')!;ctx.lineWidth=2*canvas.current.width/360;ctx.strokeStyle='#fff';ctx.fillStyle='#192436';ctx.lineJoin='round';
        ctx.beginPath();vertices.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
        vertices.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,4*canvas.current!.width/360,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='600 12px sans-serif';ctx.fillStyle='#fff';ctx.fillText(String(i+1),x+7,y-6);ctx.fillStyle='#192436';});
      }
      if(view==='edit' && cursorVisible){const ctx=canvas.current.getContext('2d')!,x=cursor.current[0]*canvas.current.width,y=cursor.current[1]*canvas.current.height;ctx.strokeStyle='#192436';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x+9,y);ctx.moveTo(x,y-9);ctx.lineTo(x,y+9);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
    }).catch(()=>{if(!cancelled)setError('Das Bild konnte nicht geöffnet werden. Bitte ein anderes Foto wählen.');});
    return()=>{window.removeEventListener('pagehide',stop);stop();};
  },[value,props.previewUrl,view,cursorVisible,cursorTick,tracing,vertices,props.inline]);

  const changeSelection=async(id:string)=>{
    if(!value || pending || props.disabled || correctionBlocked)return;
    remember();const{token}=begin();
    try{await commit({...value,mode:'focus',selected:value.selected.includes(id)?value.selected.filter(x=>x!==id):[...value.selected,id]},token);}catch(reason){fail(reason,token);}
  };
  const tap=async(point:[number,number])=>{
    if(view!=='edit' || pending || props.disabled || correctionBlocked)return;
    const c=canvas.current;if(!c)return;
    if(tracing){if(vertices.length>=128){setError('Maximal 128 Konturpunkte.');return;}setVertices(previous=>[...previous,[point[0]*c.width,point[1]*c.height]]);return;}
    const hit=value?.result?.candidates.filter(candidate=>c.getContext('2d')!.isPointInPath(holdPath(candidate),point[0]*c.width,point[1]*c.height)).sort((a,b)=>a.area-b.area)[0];
    if(hit){void changeSelection(hit.id);return;}
    if((value?.result?.candidates.length||0)>=(props.inline?200:24)){setError('Bitte zuerst eine Korrektur zurücknehmen.');return;}
    remember();const{token,signal}=begin();const{file,inputKey}=latest.current;
    try{
      const result=await requestHolds(await readPhoto(file,signal),colors[0] || 'manual',signal,point);
      if(token!==sequence.current)return;
      if(value?.result && !samePhotoSpace(value.result,result))throw new Error('Das Foto hat sich geändert. Bitte erneut öffnen.');
      if (!result.candidates[0]) throw new Error('An dieser Stelle wurde keine Grifffläche gefunden.');
      const candidate={...result.candidates[0],id:`point-${crypto.randomUUID()}`,modelVersion:result.version};
      if(!candidate.polygon)throw new Error('An dieser Stelle wurde keine Grifffläche gefunden.');
      const combined=value?.result?{...value.result,candidates:[...value.result.candidates,candidate]}:{...result,candidates:[candidate]};
      const wasSelected=props.inline&&value?.result?.base_image ? await publishedHoldSelected(c,value.result.image,candidate) : false;
      if(token!==sequence.current)return;
      await commit({inputFile:file,inputKey,result:combined,selected:[...(value?.selected||[]),...(wasSelected?[]:[candidate.id])],automatic:value?.automatic||[],mode:'focus',outputFile:file},token);
    }catch(reason){fail(reason,token);}
  };
  const finishTrace=async(points=vertices)=>{
    if(!value?.result||pending||props.disabled||correctionBlocked)return;
    let operation:number|undefined;
    try{
      const candidate=manualContour(points,value.result.width,value.result.height,`contour-${crypto.randomUUID()}`);
      remember();setTracing(false);setVertices([]);const{token}=begin();operation=token;
      await commit({...value,mode:'focus',result:{...value.result,candidates:[...value.result.candidates,candidate]},selected:[...value.selected,candidate.id]},token);
    }catch(reason){if(operation!==undefined)fail(reason,operation);else setError(reason instanceof Error?reason.message:'Kontur konnte nicht übernommen werden.');}
  };
  const original=()=>{
    remember();controller.current?.abort();sequence.current++;setError('');busy(false);
    let result=value?.result||null;
    if(props.inline && result){const {base_image:_pixels,base_thumbnail_url:_url,...photo}=result;void _pixels;void _url;result=photo;}
    latest.current.onChange({inputFile:props.file,inputKey:props.inputKey,result,selected:props.inline?[]:value?.selected||[],automatic:value?.automatic||[],mode:'original',outputFile:props.file,confirmed:true});setView(props.inline?'edit':'preview');
  };
  return <section aria-label="Automatische Griffvorschau" className="space-y-2" data-thumbnail-focus data-image-hash={value?.result?.image_hash} data-input-key={props.inputKey} data-output-mode={value?.mode || 'original'} data-selected-count={value?.selected.length || 0} data-confirmed={value?.confirmed === true ? 'true' : 'false'}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0"><h3 className="text-sm font-medium">{props.inline?'Vorschaubild':'Griffvorschau'}</h3><span className="block text-xs text-muted-foreground" role="status">{pending?'Erkennung läuft …':view==='original'?'Originalvergleich':value?.result?.base_thumbnail_url ? value.result.candidates.length ? `${value.result.candidates.length} Bildkorrekturen` : 'Gespeicherte Version' :value?.mode==='focus'?`${value.selected.length} ausgewählt${requireConfirmation ? value.confirmed ? ' · bestätigt' : ' · bitte prüfen' : ''}`:'Original'}</span></div>
      <div className="flex shrink-0 items-center">
        {!props.inline && <Button type="button" variant="ghost" className="px-2" aria-pressed={view==='edit'} disabled={props.disabled||tracing||Boolean(correctionBlocked)} onClick={()=>setView(view==='edit'?'preview':'edit')}>{view==='edit'?'Vorschau':'Griffe antippen'}</Button>}
        <Button type="button" size="icon" variant="ghost" aria-label="Rückgängig" title="Rückgängig" disabled={!historyCount||pending||props.disabled||tracing||Boolean(correctionBlocked)} onClick={()=>{const previous=history.current.pop();setHistoryCount(history.current.length);if(previous){sequence.current++;controller.current?.abort();latest.current.onChange({...previous,confirmed:!requireConfirmation});setError('');busy(false);}}}><Undo2 /></Button>
        {props.inline && <Button type="button" size="icon" variant={view==='original'?'secondary':'ghost'} aria-label="Original vergleichen" aria-pressed={view==='original'} disabled={pending||props.disabled||tracing} onClick={()=>setView(view==='original'?'edit':'original')}><Eye /></Button>}
        {props.inline && <Button type="button" size="icon" variant="ghost" aria-label={enlarged?'Bild verkleinern':'Bild vergrößern'} aria-expanded={enlarged} disabled={pending||props.disabled||tracing} onClick={()=>setEnlarged(value=>!value)}>{enlarged?<Minimize2 />:<Maximize2 />}</Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label="Vorschau-Optionen" disabled={props.disabled||tracing}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[120]">
            <DropdownMenuItem className="min-h-11" onSelect={()=>setView(view==='original'?'preview':'original')}>{view==='original'?'Vorschau':'Original'}</DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" disabled={!value?.result||pending||Boolean(correctionBlocked)} onSelect={()=>{if(!value)return;remember();const{token}=begin();void commit({...value,mode:'focus',selected:[...value.automatic]},token).catch(reason=>fail(reason,token));}}>Automatik zurücksetzen</DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={original}>Original verwenden</DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" disabled={pending||Boolean(correctionBlocked)} onSelect={()=>void startTrace()}>Kontur nachzeichnen</DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" disabled={pending||Boolean(unsupported)} onSelect={()=>void analyze()}>Erneut erkennen</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    {props.inline && <div className="flex gap-2" role="group" aria-label="Bildwerkzeug"><Button type="button" variant={!tracing?'secondary':'ghost'} aria-pressed={!tracing} disabled={pending||props.disabled||Boolean(correctionBlocked)} onClick={()=>{cancelTrace();setView('edit');}}><MousePointer2 className="h-4 w-4"/>Antippen</Button><Button type="button" variant={tracing?'secondary':'ghost'} aria-pressed={tracing} disabled={pending||props.disabled||Boolean(correctionBlocked)} onClick={()=>void startTrace()}><PencilLine className="h-4 w-4"/>Kontur zeichnen</Button></div>}
    <div className={`relative overflow-hidden rounded-kws-control bg-secondary ${props.inline ? enlarged?'h-[min(72dvh,720px)]':'h-[min(36dvh,360px)]' : view==='edit'?'h-[min(58dvh,480px)]':'h-44'}`} aria-busy={pending} data-swipe-ignore>
      <canvas ref={canvas} width={360} height={480} tabIndex={view==='edit'?0:-1} role={view==='edit'?'button':'img'}
        aria-label={view==='edit'?'Griffauswahl. Antippen oder mit Pfeiltasten Position wählen und Eingabe drücken.':'Boulder-Thumbnail mit aktueller Griffauswahl'}
        className={`absolute inset-0 m-auto h-auto max-h-full w-auto max-w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${props.inline&&tracing?'touch-none cursor-crosshair':'touch-pan-y'}`}
        onPointerDown={event=>{if(!props.inline||!tracing||pending||props.disabled||view==='original'||stroke.current)return;const rect=event.currentTarget.getBoundingClientRect();stroke.current={pointerId:event.pointerId,points:[[(event.clientX-rect.left)/rect.width*event.currentTarget.width,(event.clientY-rect.top)/rect.height*event.currentTarget.height]]};event.currentTarget.setPointerCapture(event.pointerId);}}
        onPointerMove={event=>{if(stroke.current?.pointerId!==event.pointerId)return;const c=event.currentTarget,rect=c.getBoundingClientRect(),point:[number,number]=[Math.max(0,Math.min(c.width,(event.clientX-rect.left)/rect.width*c.width)),Math.max(0,Math.min(c.height,(event.clientY-rect.top)/rect.height*c.height))];const points=stroke.current.points,prev=points[points.length-1];if(points.length<128&&Math.hypot(point[0]-prev[0],point[1]-prev[1])>2){points.push(point);setVertices([...points]);}}}
        onPointerUp={event=>{if(stroke.current?.pointerId!==event.pointerId)return;const points=stroke.current.points;stroke.current=null;if(points.length>=3){suppressClick.current=true;void finishTrace(points);}}}
        onPointerCancel={()=>{stroke.current=null;cancelTrace();}}
        onLostPointerCapture={()=>{if(stroke.current){stroke.current=null;cancelTrace();}}}
        onClick={event=>{if(suppressClick.current){suppressClick.current=false;return;}const rect=event.currentTarget.getBoundingClientRect();setCursorVisible(false);void tap([(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height]);}}
        onBlur={()=>setCursorVisible(false)} onKeyDown={event=>{
          if(view!=='edit')return;const step=event.shiftKey?.01:.04;
          const moves:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
          if(moves[event.key]){event.preventDefault();cursor.current=cursor.current.map((v,i)=>Math.max(0,Math.min(1,v+moves[event.key][i]))) as [number,number];setCursorVisible(true);setCursorTick(x=>x+1);}
          else if(event.key==='Enter'||event.key===' '){event.preventDefault();void tap(cursor.current);}
        }} />
      {pending && <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center gap-2 rounded-kws-control bg-white p-3 text-xs shadow-soft" role="status"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Griffe werden erkannt …</div>}
    </div>
    <p className="text-xs text-muted-foreground">{tracing?props.inline?'Am Griffrand entlang zeichnen und loslassen. Alternativ Randpunkte setzen und die Kontur schließen.':`${vertices.length} Konturpunkte · Am sichtbaren Griffrand entlang tippen, auch direkt am Bildrand. Die Fläche schließt beim Übernehmen.`:unsupported || (props.inline?'Griffe direkt im Bild korrigieren. Gespeichert wird mit dem Boulder.':view==='edit'?'Griff antippen zum An- oder Abwählen. Fehlt die Kontur, kannst du sie nachzeichnen.':needsConfirmation?'Vorschau bestätigen oder das Original behalten.':value?.result?.note || 'Startgriffe prüfen · Original bleibt erhalten.')}</p>
    {view==='edit'&&!tracing&&!props.inline&&<Button variant="ghost" type="button" disabled={pending||props.disabled||Boolean(correctionBlocked)} onClick={()=>void startTrace()}>Kontur nachzeichnen</Button>}
    {tracing&&<div className="flex flex-wrap gap-2" aria-label="Kontur zeichnen">
      <Button type="button" disabled={vertices.length<3||pending||props.disabled} onClick={()=>void finishTrace()}>{props.inline?'Kontur schließen':'Kontur übernehmen'}</Button>
      <Button type="button" variant="secondary" disabled={!vertices.length||pending||props.disabled} onClick={()=>setVertices(previous=>previous.slice(0,-1))}>Punkt zurück</Button>
      <Button type="button" variant="ghost" disabled={pending||props.disabled} onClick={cancelTrace}>Zeichnen abbrechen</Button>
    </div>}
    {view==='edit'&&!tracing && <details open={!props.inline}><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">Griffe einzeln auswählen</summary><div className="flex flex-wrap gap-2" aria-label="Griffkandidaten">{value?.result?.candidates.map((c,i)=><Button key={c.id} type="button" variant={value.selected.includes(c.id)?'default':'secondary'} aria-pressed={value.selected.includes(c.id)} aria-label={`Griff ${i+1}${c.source==='point_correction'?' per Tipp':c.source==='polygon_correction'?' per Kontur':''}`} disabled={pending||props.disabled} onClick={()=>void changeSelection(c.id)}>{value.selected.includes(c.id)?'✓ ':''}{i+1}{c.source==='point_correction'?' · Tipp':c.source==='polygon_correction'?' · Kontur':''}</Button>)}</div></details>}
    {requireConfirmation && <div className="flex gap-2" aria-label="Vorschaubild bestätigen">
      <Button type="button" className="min-w-0 flex-1 whitespace-normal px-3" disabled={props.disabled||pending||tracing||Boolean(correctionBlocked)||!needsConfirmation} onClick={()=>{if(needsConfirmation && value)latest.current.onChange({...value,confirmed:true});}}>{value?.mode==='focus'&&value.confirmed ? <><Check className="mr-1 h-4 w-4 shrink-0"/>Vorschau bestätigt</> : 'Vorschau bestätigen'}</Button>
      <Button type="button" variant="secondary" className="min-w-0 flex-1 whitespace-normal px-3" disabled={props.disabled||tracing} onClick={original}>Original behalten</Button>
    </div>}
    {error && <p role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-xs text-destructive">{error} Du kannst das Original verwenden.</p>}
  </section>;
}
