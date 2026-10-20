import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {UserProfileEditor} from '@/components/admin/UserProfileEditor';
import '@/index.css';

function Fixture(){
  const [open,setOpen]=useState(true);
  const [saved,setSaved]=useState<unknown>(null);
  return <main><h1>Lokale Prüfung · Beispieldaten</h1><output aria-label="Bestätigtes Profil">{JSON.stringify(saved)}</output>{open&&<UserProfileEditor profile={{id:'birthday-fixture',email:'alex@example.invalid',first_name:'Alex',last_name:'König',full_name:'Alex König',birth_date:'1994-06-12'}} onClose={()=>setOpen(false)} onRestoreFocus={()=>{}} onSave={async payload=>{await new Promise(resolve=>setTimeout(resolve,400));if(new URLSearchParams(location.search).has('failure'))throw new Error('Isolierter Fehler');setSaved(payload);}}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><Fixture/></MemoryRouter>);
