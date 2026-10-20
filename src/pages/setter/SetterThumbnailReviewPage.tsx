import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SetterConfirm, SetterSearch, SetterSelect } from '@/components/setter/SetterControls';
import { SetterThumbnailFocus } from '@/components/setter/SetterThumbnailFocus';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/useHasRole';
import { backendConfig } from '@/lib/backendConfig';
import { isThumbnailFocusEnabled, loadPhoto, paintThumbnail, renderThumbnail, type ThumbnailFocus } from '@/lib/thumbnailFocus';
import { analyzeReviewCatalog, localReviewCatalog, loadReviewPhoto, photoSource, publishReview, readReviews, reviewCatalog, reviewKey, saveReview, type ReviewDecision, type ReviewPhoto } from '@/lib/thumbnailReview';

type Prepared = { row: ReviewPhoto; value?: ThumbnailFocus; file: File; url: string };
async function prepare(row: ReviewPhoto, saved: ReviewDecision | undefined, signal: AbortSignal): Promise<Prepared> {
  const {file,result} = await loadReviewPhoto(row,signal);
  let baseline = saved?.focus?.result || result;
  const reference = row.reference;
  if (!saved?.focus && baseline && reference?.image.sha256 === baseline.image_hash && reference.image.width === baseline.width && reference.image.height === baseline.height) {
    baseline = {...baseline,candidates:reference.candidates,selected:reference.selected,note:'Deine frühere Auswahl – bitte für die Online-Übernahme bestätigen.'};
  }
  const url = URL.createObjectURL(file);
  const value: ThumbnailFocus | undefined = baseline ? {
    inputFile:file,outputFile:file,inputKey:row.cache_key,result:baseline,
    selected:saved?.focus?.selected || baseline.selected,automatic:saved?.focus?.automatic || (reference?.image.sha256===baseline.image_hash?reference.automatic:baseline.selected),
    mode:saved?.focus?.mode || 'focus',
  } : undefined;
  return {row,file,url,value};
}
function ReviewCard({row,saved,disabled,onEdit,onDecision}: {
  row:ReviewPhoto; saved?:ReviewDecision;disabled:boolean;
  onEdit:(row:ReviewPhoto)=>void;onDecision:(row:ReviewPhoto,state:'accepted'|'skipped',value?:ThumbnailFocus)=>Promise<void>;
}) {
  const host=useRef<HTMLElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const [value,setValue]=useState<ThumbnailFocus>(),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let url='';
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(e=>e.isIntersecting))return;
      observer.disconnect();setLoading(true);setError('');
      void prepare(row,saved,controller.signal).then(async p=>{
        url=p.url;if(controller.signal.aborted)return;
        const image=await loadPhoto(p.value?.result?.image || url);
        if(controller.signal.aborted)return;
        setValue(p.value);if(canvas.current)paintThumbnail(canvas.current,image,p.value,'preview');
      }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },{rootMargin:'300px'});
    if(host.current)observer.observe(host.current);
    return()=>{controller.abort();observer.disconnect();if(url)URL.revokeObjectURL(url);};
    // State updates to the catalogue retain the same cached image unless its job changes.
  },[row,saved]);
  const status=saved?.state==='published'?'Online übernommen':saved?.state==='accepted'?'Bestätigt':saved?.state==='skipped'?'Übersprungen':row.analysis_state==='pending'?'Analyse läuft …':row.analysis_state==='manual'?'Manuell auswählen':row.reference?'Deine frühere Auswahl':value?.selected.length?`${value.selected.length} ${value.selected.length===1?'Griffvorschlag':'Griffvorschläge'}`:'Startgriffe prüfen';
  return <article ref={host} className="min-w-0 overflow-hidden rounded-kws-card bg-white shadow-soft" aria-label={row.name}>
    <button type="button" className="relative block aspect-[3/4] w-full overflow-hidden bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={()=>onEdit(row)} disabled={disabled||saved?.state==='published'} aria-label={`${row.name} korrigieren`}>
      <img src={photoSource(row)} alt="" loading="lazy" className="h-full w-full object-contain" />
      <canvas ref={canvas} role="img" aria-label={`${row.name} · Griffvorschau`} className="absolute inset-0 m-auto h-auto max-h-full w-auto max-w-full" />
      {loading && <Loader2 aria-label="Vorschau wird geladen" className="absolute right-3 top-3 h-5 w-5 animate-spin motion-reduce:animate-none" />}
    </button>
    <div className="space-y-1 px-3 pb-2 pt-3">
      <p className="text-xs text-muted-foreground" role="status">{saved?.state==='accepted'||saved?.state==='published'?<Check className="mr-1 inline h-3 w-3" />:null}{status}</p>
      <h2 title={row.name} className="truncate text-sm font-semibold">{row.name}</h2>
      <p className="text-xs text-muted-foreground">{row.color}{row.color_2?` / ${row.color_2}`:''}</p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
    <div className="grid grid-cols-2 gap-1 px-2 pb-2">
      <Button variant={saved?.state==='accepted'?'secondary':'default'} className="min-w-0 px-1 text-xs" disabled={disabled||loading||!value?.selected.length||saved?.state==='published'} onClick={()=>void onDecision(row,'accepted',value)}>Passt</Button>
      <Button variant="secondary" className="min-w-0 px-1 text-xs" disabled={disabled||saved?.state==='published'} onClick={()=>onEdit(row)}>Korrigieren</Button>
      <Button variant="ghost" className="col-span-2 text-xs" disabled={disabled||saved?.state==='published'} onClick={()=>void onDecision(row,'skipped')}>Überspringen</Button>
    </div>
  </article>;
}

export default function SetterThumbnailReviewPage() {
  const {session}=useAuth(),{hasRole:isSetter}=useHasRole('setter'),{hasRole:isAdmin}=useHasRole('admin');
  const [rows,setRows]=useState<ReviewPhoto[]>([]),[decisions,setDecisions]=useState<Record<string,ReviewDecision>>({});
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('open'),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[progress,setProgress]=useState('');
  const [edit,setEdit]=useState<Prepared>(),[editLoading,setEditLoading]=useState(false),[editBusy,setEditBusy]=useState(false),[editError,setEditError]=useState('');
  const editController=useRef<AbortController>(),lock=useRef(false),editUrl=useRef('');
  const decisionFor=(row:ReviewPhoto)=>decisions[reviewKey(row)];
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    async function load(){
      try {
        const [catalog,saved]=await Promise.all([reviewCatalog(controller.signal),readReviews()]);
        if(controller.signal.aborted)return;
        setRows(catalog);setDecisions(Object.fromEntries(saved.map(d=>[d.key,d])));setLoaded(true);setError('');
        if(localReviewCatalog && catalog.some(r=>r.analysis_state==='pending'))timer=setTimeout(()=>void load(),15000);
        if(!localReviewCatalog && isThumbnailFocusEnabled())void analyzeReviewCatalog(catalog,controller.signal,updated=>setRows(current=>current.map(row=>row.id===updated.id?updated:row))).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
      } catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Bestand konnte nicht geladen werden.');}
    }
    void load();return()=>{controller.abort();clearTimeout(timer);};
  },[]);
  useEffect(()=>()=>{editController.current?.abort();if(editUrl.current)URL.revokeObjectURL(editUrl.current);},[]);
  const visible=useMemo(()=>rows.filter(row=>row.name.toLowerCase().includes(search.toLowerCase()) && (filter==='all'||filter==='open'&&(!decisions[reviewKey(row)]||decisions[reviewKey(row)]?.state==='draft')||decisions[reviewKey(row)]?.state===filter)),[rows,search,filter,decisions]);
  const accepted=rows.map(decisionFor).filter((d):d is ReviewDecision=>d?.state==='accepted');
  const reviewed=rows.filter(row=>decisionFor(row)&&decisionFor(row)?.state!=='draft').length;
  const pending=rows.filter(row=>row.analysis_state==='pending').length;
  const closeEdit=()=>{if(editBusy)return;editController.current?.abort();if(editUrl.current)URL.revokeObjectURL(editUrl.current);editUrl.current='';setEdit(undefined);setEditLoading(false);setEditError('');};
  async function openEdit(row:ReviewPhoto){
    editController.current?.abort();const controller=new AbortController();editController.current=controller;
    if(editUrl.current)URL.revokeObjectURL(editUrl.current);editUrl.current='';setEdit(undefined);setEditLoading(true);setEditError('');
    try {const prepared=await prepare(row,decisionFor(row),controller.signal);if(controller.signal.aborted){URL.revokeObjectURL(prepared.url);return;}editUrl.current=prepared.url;setEdit(prepared);}
    catch(e){if(!controller.signal.aborted)setEditError(e instanceof Error?e.message:'Foto konnte nicht geladen werden.');}
    finally{if(!controller.signal.aborted)setEditLoading(false);}
  }
  async function decide(row:ReviewPhoto,state:'accepted'|'skipped',focus?:ThumbnailFocus){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try {
      if(state==='accepted'&&(!focus?.result||!focus.selected.length||focus.mode!=='focus'))throw new Error('Bitte erst die Startgriffe markieren oder das Bild überspringen.');
      const decision:ReviewDecision={key:reviewKey(row),boulderId:row.id,sourceUrl:row.thumbnail_url,sourceBackend:backendConfig.supabaseUrl,color:row.color,color2:row.color_2,state,savedAt:new Date().toISOString(),focus};
      // toBlob verifies rendering before accepting. Keep the original File in IDB.
      if(focus)await renderThumbnail(focus);
      await saveReview(decision);setDecisions(current=>({...current,[decision.key]:decision}));closeEdit();
    } catch(e){setError(e instanceof Error?e.message:'Bestätigung konnte nicht gespeichert werden.');}
    finally{lock.current=false;setBusy(false);}
  }
  const changeDraft=(value:ThumbnailFocus|undefined)=>{
    setEdit(current=>current?{...current,value}:current);
    if (!edit || !value?.result) return;
    const decision:ReviewDecision={key:reviewKey(edit.row),boulderId:edit.row.id,sourceUrl:edit.row.thumbnail_url,sourceBackend:backendConfig.supabaseUrl,color:edit.row.color,color2:edit.row.color_2,state:'draft',savedAt:new Date().toISOString(),focus:value};
    void saveReview(decision).then(()=>setDecisions(current=>({...current,[decision.key]:decision}))).catch(e=>setEditError(e.message));
  };
  const exportReviews=async()=>{
    try {
      const saved=await readReviews();
      const data=saved.map(({focus,...d})=>({...d,focus:focus?{...focus,inputFile:undefined,outputFile:undefined}:undefined}));
      const url=URL.createObjectURL(new Blob([JSON.stringify({schema:'kws.thumbnail-review/v1',exportedAt:new Date().toISOString(),decisions:data},null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='thumbnail-pruefung.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    } catch(e){setError(e instanceof Error?e.message:'Export fehlgeschlagen.');}
  };
  const publish=async()=>{
    if(lock.current)return false;
    lock.current=true;setBusy(true);let done=0;
    try {
      for(const decision of accepted){
        setProgress(`${done+1} von ${accepted.length} wird online übernommen …`);
        const updated=await publishReview(decision);setDecisions(current=>({...current,[updated.key]:updated}));done++;
      }
      setProgress(`${done} Bilder online übernommen.`);
    } finally {lock.current=false;setBusy(false);}
  };
  return <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 pb-28 sm:px-6 md:pb-5" aria-label="Startgriffe prüfen" aria-busy={busy}>
    <header className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Setter · Vorschaubilder</p>
      <h1 className="font-heading text-2xl font-bold">Startgriffe prüfen</h1>
      <p className="text-sm text-muted-foreground">{loaded?`${reviewed} von ${rows.length} geprüft`:'Bestand wird geladen …'}{pending?` · ${pending} Analysen laufen noch`:''}. Bestätigungen bleiben auf diesem Gerät gespeichert.</p>
    </header>
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:min-w-64 sm:flex-1"><SetterSearch value={search} onChange={setSearch} label="Boulder suchen" /></div>
      <div className="w-44"><SetterSelect label="Prüfstatus" value={filter} onChange={setFilter} options={[{value:'open',label:'Noch offen'},{value:'accepted',label:'Bestätigt'},{value:'published',label:'Online übernommen'},{value:'skipped',label:'Übersprungen'},{value:'all',label:'Alle Bilder'}]} /></div>
      <Button variant="ghost" aria-label="Prüfung als JSON sichern" onClick={()=>void exportReviews()}><Download className="h-4 w-4" /></Button>
    </div>
    {error && <p role="alert" className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {loaded&&!visible.length && <p className="py-6 text-sm text-muted-foreground">Keine Bilder in dieser Auswahl. Über „Prüfstatus“ kannst du bereits geprüfte Bilder öffnen.</p>}
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-label="Thumbnail-Prüfliste">
      {visible.map(row=><ReviewCard key={reviewKey(row)} row={row} saved={decisionFor(row)} disabled={busy} onEdit={row=>void openEdit(row)} onDecision={decide} />)}
    </section>
    <footer className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-between gap-2 rounded-kws-control bg-white p-3 shadow-soft md:bottom-2">
      <p role="status" className="text-xs text-muted-foreground">{progress||`${accepted.length} bestätigt · Vorschläge werden erst nach Freigabe übertragen.`}</p>
      {session&&(isSetter||isAdmin)?<Button disabled={busy||!accepted.length} onClick={()=>setConfirm(true)}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}{accepted.length} online übernehmen</Button>:session?<p className="text-xs text-muted-foreground">Für die Online-Übernahme ist eine Setterfreigabe erforderlich.</p>:<Button asChild variant="secondary"><Link to="/app/login?from=thumbnail-review">Als Setter anmelden und übernehmen</Link></Button>}
    </footer>
    <p className="text-xs text-muted-foreground">Passt bestätigt die angezeigten Startgriffe. Unter Korrigieren kannst du mehrere Griffe antippen. Ohne sichere Auswahl bleibt das Original. Online-Übernahme ändert nur bestätigte Vorschaubilder und erhält deren Originaldateien.</p>
    <Dialog open={Boolean(edit)||editLoading||Boolean(editError)} onOpenChange={open=>{if(!open)closeEdit();}}>
      <DialogContent scrollLayout="contained" className="flex h-[min(90dvh,850px)] flex-col overflow-hidden p-0 md:!max-w-xl" onInteractOutside={event=>{if(editBusy)event.preventDefault();}} onEscapeKeyDown={event=>{if(editBusy)event.preventDefault();}}>
        <header className="relative shrink-0 space-y-2 px-4 py-4 pr-16 sm:px-5 sm:pr-16">
          <DialogTitle>{edit?.row.name||'Startgriffe korrigieren'}</DialogTitle>
          <DialogDescription>Alle Startgriffe auswählen – auch bei zwei getrennten Griffen. Original und Vorschau kannst du im Menü vergleichen.</DialogDescription>
          <Button variant="ghost" size="icon" aria-label="Korrektur schließen" className="absolute right-2 top-2" disabled={editBusy||busy} onClick={closeEdit}><X className="h-5 w-5"/></Button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 sm:px-5">
        {editLoading&&<p role="status">Foto wird geladen …</p>}
        {editError&&<p role="alert">{editError}</p>}
        {edit&&<>
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
          {isThumbnailFocusEnabled()?<SetterThumbnailFocus file={edit.file} previewUrl={edit.url} inputKey={edit.row.cache_key} colorNames={[edit.row.color,...(edit.row.color_2?[edit.row.color_2]:[])]} value={edit.value} disabled={busy} onBusyChange={setEditBusy} onChange={changeDraft} />:<p>Die Grifferkennung ist noch nicht eingerichtet.</p>}
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" disabled={busy||editBusy||!edit.value?.selected.length||edit.value.mode!=='focus'} onClick={()=>void decide(edit.row,'accepted',edit.value)}>Auswahl passt</Button>
            <Button variant="secondary" disabled={busy||editBusy} onClick={()=>void decide(edit.row,'skipped')}>Original behalten</Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" disabled={busy||editBusy||visible.findIndex(r=>r.id===edit.row.id)<=0} onClick={()=>{const i=visible.findIndex(r=>r.id===edit.row.id);void openEdit(visible[i-1]);}}><ChevronLeft className="h-4 w-4"/>Zurück</Button>
            <Button variant="ghost" disabled={busy||editBusy||visible.findIndex(r=>r.id===edit.row.id)>=visible.length-1} onClick={()=>{const i=visible.findIndex(r=>r.id===edit.row.id);void openEdit(visible[i+1]);}}>Weiter<ChevronRight className="h-4 w-4"/></Button>
          </div>
        </>}
        </div>
      </DialogContent>
    </Dialog>
    <SetterConfirm open={confirm} onOpenChange={setConfirm} title={`${accepted.length} bestätigte Bilder online übernehmen?`} description="Es werden nur die bestätigten Varianten hochgeladen. Inzwischen geänderte Online-Bilder werden nicht überschrieben. Die Originaldateien und die lokale Prüfaufzeichnung bleiben erhalten." destructive={false} confirmLabel="Jetzt online übernehmen" onConfirm={publish}/>
  </section>;
}
