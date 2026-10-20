import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {BoulderTrackTab} from '@/components/boulder/BoulderDetailSections';
import {SetterBoulderEditorDialog,createEmptySetterBoulderDraft,getMissingSetterBoulderFields} from '@/components/setter/SetterBoulderEditorDialog';
import {Toaster} from '@/components/ui/sonner';
import {switchFixtureAccount} from './designmotion-auth';
import '@/index.css';
const colors=[{id:'green',name:'Grün',hex:'#36B531'}];
const boulder={id:'undo-boulder',name:'Grüne Kante',sector:'Bug A',sectorId:'s1',color:'Grün',difficulty:4,status:'haengt' as const,createdAt:new Date()};
function Fixture(){
  const [visible,setVisible]=useState(true);
  const [open,setOpen]=useState(true);
  const [draft,setDraft]=useState({...createEmptySetterBoulderDraft(colors),name:'Grüne Kante',sectorId:'s1',withoutVideo:true,existingThumbnailUrl:'/src/assets/boulderkarte-original.png'});
  const [pending,setPending]=useState(false);
  const [saved,setSaved]=useState(0);
  const editor=new URLSearchParams(location.search).has('editor');
  return <main className="mx-auto max-w-3xl space-y-4 p-4"><h1>Isolierte Prüfung · Beispieldaten</h1>{editor?<><button onClick={()=>setOpen(true)}>Editor öffnen</button><output aria-label="Speicheranzahl">{saved}</output><output aria-label="Fehlende Angaben">{getMissingSetterBoulderFields(draft).join(', ')}</output><SetterBoulderEditorDialog open={open} onOpenChange={setOpen} title="Boulder bearbeiten" submitLabel="Speichern" draft={draft} onDraftChange={setDraft} colors={colors} sectors={[{id:'s1',name:'Bug A'}]} attributeCatalog={[]} loadError={new URLSearchParams(location.search).has('loadError') ? 'Quelle nicht verfuegbar' : undefined} isSubmitting={pending} onSubmit={async()=>{setPending(true);try{await new Promise(r=>setTimeout(r,600));if(new URLSearchParams(location.search).has('error'))throw new Error('Verbindung unterbrochen. Eingaben bleiben erhalten.');setSaved(v=>v+1);setOpen(false);}finally{setPending(false);}}}/></>:<><button onClick={()=>setVisible(false)}>Track schließen</button><button onClick={switchFixtureAccount}>Konto wechseln</button>{visible&&<BoulderTrackTab boulder={boulder}/>}</>}<Toaster/></main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter><Fixture/></MemoryRouter></QueryClientProvider>);
