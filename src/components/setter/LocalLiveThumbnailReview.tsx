/** Explicit local operator entry. Not routed or included in the production build. */
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,Download,Loader2,X} from 'lucide-react';
import './local-live-thumbnail-review.css';
import {BetaLogo} from '@/components/brand/BetaLogo';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {SetterSearch,SetterSelect} from '@/components/setter/SetterControls';
import {SetterThumbnailFocus} from '@/components/setter/SetterThumbnailFocus';
import {readReviews,saveReview,type ReviewDecision} from '@/lib/thumbnailReview';
import {loadPhoto,paintThumbnail,renderThumbnail,type HoldResult,type ThumbnailFocus} from '@/lib/thumbnailFocus';

type Row={id:string;name:string;color:string;color_2:string|null;sector_name:string;thumbnail_url:string;published:boolean;cache_key:string;photo:string;result:string;analysis_state:string;note?:string;selected_count?:number};
type Catalog={source:string;verified_at:string;rows:Row[];preparation_finished_at?:string};
type Prepared={row:Row;file:File;url:string;value?:ThumbnailFocus};
const localBase='/.thumbnail-data/live-review/';
const production='https://beta-api.kletterwelt-sauerland.de';
const keyFor=(row:Row)=>JSON.stringify([production,row.id,row.thumbnail_url,row.color,row.color_2,row.cache_key]);
const colorNames=(row:Row)=>[...(row.color==='Schwarz-Gelb'?['Schwarz','Gelb']:[row.color]),...(row.color_2?[row.color_2]:[])];
async function prepare(row:Row,saved:ReviewDecision|undefined,signal:AbortSignal):Promise<Prepared>{
 const [response,resultResponse]=await Promise.all([fetch(localBase+row.photo,{signal}),!saved?.focus?.result&&['ready','manual'].includes(row.analysis_state)?fetch(localBase+row.result,{signal}):Promise.resolve(null)]);
 if(!response.ok)throw Error('Das lokale Original konnte nicht geladen werden.');
 const blob=await response.blob(),file=new File([blob],row.id+'.jpg',{type:blob.type||'image/jpeg'});
 const result:HoldResult|undefined=saved?.focus?.result||(resultResponse?.ok?await resultResponse.json():undefined);
 return {row,file,url:URL.createObjectURL(file),value:result?{inputFile:file,outputFile:file,inputKey:row.cache_key,result,selected:saved?.focus?.selected||result.selected,automatic:saved?.focus?.automatic||result.selected,mode:saved?.focus?.mode||'focus'}:undefined};
}
function Card({row,saved,disabled,onEdit,onDecision}:{row:Row;saved?:ReviewDecision;disabled:boolean;onEdit:(row:Row)=>void;onDecision:(row:Row,state:'accepted'|'skipped',focus?:ThumbnailFocus)=>Promise<void>}){
 const host=useRef<HTMLElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [value,setValue]=useState<ThumbnailFocus>(),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{
  if(row.published)return;
  const controller=new AbortController();let url='';
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();setLoading(true);
   void prepare(row,saved,controller.signal).then(async p=>{url=p.url;if(controller.signal.aborted)return;const image=await loadPhoto(p.value?.result?.image||url);if(controller.signal.aborted)return;setValue(p.value);if(canvas.current)paintThumbnail(canvas.current,image,p.value,'preview');setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  },{rootMargin:'300px'});
  if(host.current)observer.observe(host.current);
  return()=>{controller.abort();observer.disconnect();if(url)URL.revokeObjectURL(url);};
 },[row,saved]);
 const status=row.published?'Online übernommen':saved?.state==='accepted'?'Bestätigt':saved?.state==='skipped'?'Übersprungen':row.analysis_state==='pending'?'Vorschlag wird vorbereitet …':row.analysis_state==='manual'?'Startgriffe antippen':value?.selected.length?`${value.selected.length} Griffvorschläge · prüfen`:'Startgriffe prüfen';
 return <article ref={host} className="live-card" aria-label={row.name}>
  <button type="button" className="live-photo" disabled={disabled} onClick={()=>onEdit(row)} aria-label={`${row.name} ${row.published?'ansehen':'korrigieren'}`}>
   <img src={row.published?row.thumbnail_url:localBase+row.photo} alt="" loading="lazy"/>
   {!row.published&&<canvas ref={canvas} role="img" aria-label={`${row.name} · Automatischer Griffvorschlag`} className="absolute inset-0 m-auto h-auto max-h-full w-auto max-w-full"/>}
   {row.published&&<span className="live-mark">✓ Übernommen</span>}
  </button>
  <div className="live-caption"><p className="live-review-status">{saved?.state==='accepted'||row.published?<Check className="mr-1 inline h-3 w-3"/>:null}{status}</p><h2 title={row.name}>{row.name}</h2><p>{row.sector_name} · {row.color}{row.color_2?` / ${row.color_2}`:''}</p>{error&&<p role="alert">{error}</p>}</div>
  {!row.published&&<div className="live-card-actions"><Button disabled={disabled||loading||!value?.selected.length} onClick={()=>void onDecision(row,'accepted',value)} variant={saved?.state==='accepted'?'secondary':'default'}>Passt</Button><Button variant="secondary" disabled={disabled} onClick={()=>onEdit(row)}>Korrigieren</Button><Button variant="ghost" disabled={disabled} onClick={()=>void onDecision(row,'skipped')}>Überspringen</Button></div>}
 </article>;
}
export default function LocalLiveThumbnailReview(){
 const [catalog,setCatalog]=useState<Catalog>(),[decisions,setDecisions]=useState<Record<string,ReviewDecision>>({}),[error,setError]=useState('');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('open'),[color,setColor]=useState('all');
 const [edit,setEdit]=useState<Prepared>(),[detail,setDetail]=useState<Row>(),[editLoading,setEditLoading]=useState(false),[editError,setEditError]=useState(''),[editBusy,setEditBusy]=useState(false),[busy,setBusy]=useState(false);
 const editController=useRef<AbortController>(),editUrl=useRef(''),lock=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;let reviewsLoaded=false;
  async function load(){try{const [response,saved]=await Promise.all([fetch(localBase+'catalog.json',{cache:'no-store',signal:controller.signal}),reviewsLoaded?Promise.resolve(null):readReviews()]);if(!response.ok)throw Error('Die aktuellen Vorschläge konnten nicht geladen werden.');const next:Catalog=await response.json();if(next.source!==production)throw Error('Unpassende Datenquelle. Die Prüfung wurde angehalten.');if(controller.signal.aborted)return;
   setCatalog(current=>current?{...next,rows:next.rows.map(r=>{const old=current.rows.find(x=>x.cache_key===r.cache_key);return old&&JSON.stringify(old)===JSON.stringify(r)?old:r;})}:next);if(saved){setDecisions(Object.fromEntries(saved.filter(d=>d.sourceBackend===production).map(d=>[d.key,d])));reviewsLoaded=true;}setError('');if(!next.preparation_finished_at)timer=setTimeout(()=>void load(),4000);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Prüfliste konnte nicht geladen werden.');}}
  void load();return()=>{controller.abort();clearTimeout(timer);};
 },[]);
 useEffect(()=>()=>{editController.current?.abort();if(editUrl.current)URL.revokeObjectURL(editUrl.current);},[]);
 const rows=useMemo(()=>catalog?.rows||[],[catalog]);
 const published=rows.filter(r=>r.published).length,accepted=rows.filter(r=>decisions[keyFor(r)]?.state==='accepted').length,skipped=rows.filter(r=>decisions[keyFor(r)]?.state==='skipped').length;
 const open=rows.length-published-accepted-skipped,pending=rows.filter(r=>r.analysis_state==='pending').length;
 const colors=useMemo(()=>[...new Set(rows.flatMap(r=>[r.color,r.color_2]).filter((v):v is string=>Boolean(v)))].sort((a,b)=>a.localeCompare(b,'de')),[rows]);
 const shown=useMemo(()=>rows.filter(r=>{const state=r.published?'published':decisions[keyFor(r)]?.state;return (filter==='all'||filter==='open'&&(!state||state==='draft')||filter===state)&&(color==='all'||r.color===color||r.color_2===color)&&`${r.name} ${r.sector_name}`.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de'));}),[rows,decisions,filter,color,search]);
 const closeEdit=useCallback(()=>{if(editBusy||lock.current)return;editController.current?.abort();if(editUrl.current)URL.revokeObjectURL(editUrl.current);editUrl.current='';setEdit(undefined);setEditLoading(false);setEditError('');},[editBusy]);
 async function openEdit(row:Row){
  if(row.published){setDetail(row);return;}
  editController.current?.abort();const controller=new AbortController();editController.current=controller;if(editUrl.current)URL.revokeObjectURL(editUrl.current);editUrl.current='';setEdit(undefined);setEditLoading(true);setEditError('');
  try{const p=await prepare(row,decisions[keyFor(row)],controller.signal);if(controller.signal.aborted){URL.revokeObjectURL(p.url);return;}editUrl.current=p.url;setEdit(p);}catch(e){if(!controller.signal.aborted)setEditError(e instanceof Error?e.message:'Foto konnte nicht geöffnet werden.');}finally{if(!controller.signal.aborted)setEditLoading(false);}
 }
 async function decide(row:Row,state:'accepted'|'skipped',focus?:ThumbnailFocus,next=false){
  if(lock.current||row.published)return;lock.current=true;setBusy(true);setError('');
  try{if(state==='accepted'&&(!focus?.result||!focus.selected.length||focus.mode!=='focus'))throw Error('Bitte zuerst die Startgriffe wählen oder das Original behalten.');if(focus)await renderThumbnail(focus);
   const decision:ReviewDecision={key:keyFor(row),boulderId:row.id,sourceUrl:row.thumbnail_url,sourceBackend:production,color:row.color,color2:row.color_2,state,savedAt:new Date().toISOString(),focus};await saveReview(decision);setDecisions(current=>({...current,[decision.key]:decision}));
   if(edit){const remaining=shown.filter(r=>r.id!==row.id&&!r.published&&(!decisions[keyFor(r)]||decisions[keyFor(r)]?.state==='draft'));const index=shown.findIndex(r=>r.id===row.id);const following=shown.slice(index+1).find(r=>remaining.some(x=>x.id===r.id))||remaining[0];if(next&&following)await openEdit(following);else{if(editUrl.current)URL.revokeObjectURL(editUrl.current);editUrl.current='';setEdit(undefined);}}
  }catch(e){setError(e instanceof Error?e.message:'Speichern fehlgeschlagen. Die Auswahl bleibt geöffnet.');}finally{lock.current=false;setBusy(false);}
 }
 const changeDraft=(value:ThumbnailFocus|undefined)=>{
  setEdit(current=>current?{...current,value}:current);if(!edit||!value?.result)return;
  const decision:ReviewDecision={key:keyFor(edit.row),boulderId:edit.row.id,sourceUrl:edit.row.thumbnail_url,sourceBackend:production,color:edit.row.color,color2:edit.row.color_2,state:'draft',savedAt:new Date().toISOString(),focus:value};
  void saveReview(decision).then(()=>setDecisions(current=>({...current,[decision.key]:decision}))).catch(e=>setEditError(e.message));
 };
 const exportReviews=async()=>{try{const saved=(await readReviews()).filter(d=>d.sourceBackend===production);const data=saved.map(({focus,...d})=>({...d,focus:focus?{...focus,inputFile:undefined,outputFile:undefined}:undefined}));const blob=new Blob([JSON.stringify({schema:'kws.thumbnail-review/v1',source:production,exportedAt:new Date().toISOString(),alreadyPublished:rows.filter(r=>r.published).map(r=>({id:r.id,url:r.thumbnail_url})),decisions:data},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='live-thumbnail-pruefung.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){setError(e instanceof Error?e.message:'Sicherung fehlgeschlagen.');}};
 return <main className="live-page"><header className="live-top"><BetaLogo style={{width:94}}/><span>Live-Bestand · lokal prüfen</span></header><h1>Startgriffe prüfen</h1><p className="live-intro">{catalog?`${open} noch offen · ${accepted} bestätigt · ${published} bereits online übernommen`:'Live-Prüfliste wird geladen …'}</p><p className="live-time">{pending?`${pending} automatische Vorschläge werden vorbereitet. `:'Automatische Vorschläge sind vorbereitet. '}Korrigieren öffnet direkt die Griffauswahl.</p>
  <section className="live-controls" aria-label="Boulder filtern"><div className="live-status" role="group" aria-label="Prüfstatus">{[['open',`Noch offen ${open}`],['accepted',`Bestätigt ${accepted}`],['published',`Übernommen ${published}`],['all',`Alle ${rows.length}`]].map(([value,label])=><Button key={value} variant={filter===value?'default':'secondary'} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</Button>)}</div><div className="live-search"><SetterSearch value={search} onChange={setSearch}/><div className="live-color"><SetterSelect label="Grifffarbe" value={color} onChange={setColor} options={[{value:'all',label:'Alle Farben'},...colors.map(c=>({value:c,label:c}))]}/></div><Button variant="ghost" aria-label="Live-Prüfung als JSON sichern" onClick={()=>void exportReviews()}><Download/></Button></div></section>
  {error&&<p role="alert" className="live-review-error">{error}</p>}<p className="live-count" role="status">{catalog?`${shown.length} Boulder angezeigt`:''}</p><section className="live-grid" aria-label="Aktuelle Boulder zur Korrektur">{shown.map(row=><Card key={keyFor(row)} row={row} saved={decisions[keyFor(row)]} disabled={busy} onEdit={r=>void openEdit(r)} onDecision={decide}/>)}</section>
  {catalog&&!shown.length&&<div className="live-empty"><p>{!open&&filter==='open'?'Alle aktuellen Boulder sind geprüft.':'Keine Boulder für diese Auswahl.'}</p><Button variant="secondary" onClick={()=>{setSearch('');setColor('all');setFilter('all')}}>Alle Boulder anzeigen</Button></div>}
  <footer>{accepted} bestätigt · {skipped} übersprungen. Deine Auswahl wird auf diesem Gerät gespeichert. Online ändern sich die Bilder erst bei der Übernahme nach deiner Prüfung.</footer>
  <Dialog open={!!edit||editLoading||!!editError} onOpenChange={open=>{if(!open)closeEdit();}}><DialogContent scrollLayout="contained" className="live-review-dialog flex h-[min(92dvh,900px)] flex-col overflow-hidden p-0 md:!max-w-xl" onInteractOutside={e=>{if(editBusy||busy)e.preventDefault();}} onEscapeKeyDown={e=>{if(editBusy||busy)e.preventDefault();}}>
   <header className="relative shrink-0 space-y-2 px-4 py-4 pr-16"><DialogTitle>{edit?.row.name||'Startgriffe korrigieren'}</DialogTitle><DialogDescription>Griffe direkt antippen zum An- oder Abwählen. Auch mehrere Startgriffe sind möglich.</DialogDescription><Button variant="ghost" size="icon" aria-label="Korrektur schließen" className="absolute right-2 top-2" disabled={busy||editBusy} onClick={closeEdit}><X/></Button></header>
   <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">{editLoading&&<p role="status"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Foto wird geladen …</p>}{editError&&<p role="alert">{editError}</p>}{error&&<p role="alert">{error}</p>}{edit&&<>
    <SetterThumbnailFocus key={keyFor(edit.row)} initialView="edit" file={edit.file} previewUrl={edit.url} inputKey={edit.row.cache_key} colorNames={colorNames(edit.row)} value={edit.value} disabled={busy} onChange={changeDraft} onBusyChange={setEditBusy}/>
    <div className="live-review-confirm"><Button disabled={busy||editBusy||!edit.value?.selected.length||edit.value.mode!=='focus'} onClick={()=>void decide(edit.row,'accepted',edit.value,true)}>Auswahl passt · Weiter</Button><Button variant="secondary" disabled={busy||editBusy} onClick={()=>void decide(edit.row,'skipped',undefined,true)}>Überspringen</Button></div>
    <div className="live-review-navigation"><Button variant="ghost" disabled={busy||editBusy||shown.findIndex(r=>r.id===edit.row.id)<=0} onClick={()=>{const i=shown.findIndex(r=>r.id===edit.row.id);void openEdit(shown[i-1]);}}><ChevronLeft/>Zurück</Button><Button variant="ghost" disabled={busy||editBusy||shown.findIndex(r=>r.id===edit.row.id)>=shown.length-1} onClick={()=>{const i=shown.findIndex(r=>r.id===edit.row.id);void openEdit(shown[i+1]);}}>Weiter<ChevronRight/></Button></div>
   </>}</div></DialogContent></Dialog>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(undefined)}}><DialogContent className="live-dialog"><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>Dein bestätigtes Thumbnail ist bereits online übernommen und muss nicht erneut geprüft werden.</DialogDescription>{detail&&<img className="live-detail-photo" src={detail.thumbnail_url} alt={detail.name}/>}</DialogContent></Dialog>
 </main>;
}
