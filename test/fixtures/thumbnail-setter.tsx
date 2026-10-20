// Synthetic UI only: no account, production photo, database or storage writes.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetterBoulderEditorDialog, createEmptySetterBoulderDraft } from '@/components/setter/SetterBoulderEditorDialog';
import { SetterThumbnailFocus } from '@/components/setter/SetterThumbnailFocus';
import { thumbnailInputKey, thumbnailUploadFile, type ThumbnailFocus } from '@/lib/thumbnailFocus';
import { fixtureSectors } from './admin-hallmap-hooks';
import { Button } from '@/components/ui/button';
import '@/index.css';

const colors=[{id:'green',name:'Grün',hex:'#36B531'},{id:'pink',name:'Rosa',hex:'#dd72ad'}];
function Fixture(){
 const params=new URLSearchParams(location.search),focusOnly=params.has('focus');
 const [draft,setDraft]=useState(()=>({...createEmptySetterBoulderDraft(colors),name:'Beispielboulder',withoutVideo:true,sectorId:fixtureSectors[0].id}));
 const [saved,setSaved]=useState(''),[pending,setPending]=useState(false),[open,setOpen]=useState(true);
 const [source,setSource]=useState('');
 useEffect(()=>{
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=480;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d4c6ad';ctx.fillRect(0,0,360,480);
  ctx.fillStyle='#36B531';ctx.fillRect(40,70,80,65);ctx.fillRect(210,290,90,70);
  ctx.fillStyle='#ffffff';ctx.fillRect(55,140,35,28);ctx.fillRect(230,365,35,28);
  const image=canvas.toDataURL('image/png');setSource(image);
  canvas.toBlob(blob=>{if(blob)setDraft(d=>({...d,thumbFile:new File([blob],'synthetic-holds.png',{type:'image/png'})}));},'image/png');
 },[]);
 const patch=(change:Partial<typeof draft>)=>setDraft(current=>({...current,...change}));
 const submit=()=>{const file=thumbnailUploadFile(draft);setSaved(file===draft.thumbFile?'Original gespeichert':`Fokus gespeichert: ${draft.thumbnailFocus?.selected.length||0}`);};
 const onFocus=(thumbnailFocus:ThumbnailFocus|undefined)=>patch({thumbnailFocus});
 return <><p className="px-4 py-2 text-xs" data-fixture-notice>Isolierte Setter-Prüfung · gezeichnete Beispieldaten</p>
  {focusOnly ? <main className="mx-auto max-w-xl space-y-4 p-4">
   <div className="flex flex-wrap gap-2"><Button onClick={()=>patch({volumeOnly:!draft.volumeOnly})}>Volumen wechseln</Button><Button onClick={()=>patch({colorId:draft.colorId==='green'?'pink':'green'})}>Farbe wechseln</Button><Button disabled={pending} onClick={submit}>Test speichern</Button></div>
   {draft.thumbFile&&<SetterThumbnailFocus file={draft.thumbFile} previewUrl={source} inputKey={thumbnailInputKey(draft)} colorNames={[colors.find(c=>c.id===draft.colorId)?.name||'']} volumeOnly={draft.volumeOnly} value={draft.thumbnailFocus} disabled={false} onChange={onFocus} onBusyChange={setPending}/>}
  </main> : <SetterBoulderEditorDialog open={open} onOpenChange={setOpen} title="Boulder hinzufügen" submitLabel="Zum Stapel hinzufügen" draft={draft} onDraftChange={setDraft} colors={colors} sectors={fixtureSectors} attributeCatalog={[]} onSubmit={submit}/>}
  <output data-fixture-result className="block p-4">{saved}</output>
  <output hidden data-fixture-state>{JSON.stringify({mode:draft.thumbnailFocus?.mode,selected:draft.thumbnailFocus?.selected.length||0,volumeOnly:draft.volumeOnly,pending,original:thumbnailUploadFile(draft)===draft.thumbFile})}</output>
 </>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><Fixture/></QueryClientProvider>);
