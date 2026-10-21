import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetterBoulderEditorDialog, createEmptySetterBoulderDraft } from '@/components/setter/SetterBoulderEditorDialog';
import { thumbnailUploadFile } from '@/lib/thumbnailFocus';
import '@/index.css';

const colors=[{id:'green',name:'Grün',hex:'#30b62b'},{id:'red',name:'Rot',hex:'#dd3030'}];
function Fixture(){
 const [draft,setDraft]=useState({...createEmptySetterBoulderDraft(colors),withoutVideo:true,sectorId:'sector'});
 const [saved,setSaved]=useState('');
 return <><p data-fixture-result role="status">{saved}</p><SetterBoulderEditorDialog open onOpenChange={()=>{}} title="Boulder hinzufügen" submitLabel="Zum Stapel hinzufügen" draft={draft} onDraftChange={setDraft} colors={colors} sectors={[{id:'sector',name:'Testsektor'}]} attributeCatalog={[]} onSubmit={()=>{const file=thumbnailUploadFile(draft);setSaved(`${file?.type} · ${draft.thumbnailFocus?.selected.length||0} Startgriffe`);}} /></>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><Fixture/></QueryClientProvider>);
