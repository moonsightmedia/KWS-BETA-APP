import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter,Routes,Route,useLocation } from 'react-router-dom';
import Auth from '@/pages/Auth';
import '@/index.css';
const query=new URLSearchParams(location.search);
function Destination(){const current=useLocation();return <p role="status">Prüfliste nach Anmeldung · {current.pathname}</p>;}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[query.get('route')||'/app/login?from=thumbnail-review']}><Routes>
  <Route path="/app/login" element={<Auth/>}/><Route path="/app/register" element={<Auth/>}/>
  <Route path="/setter/thumbnails" element={<Destination/>}/><Route path="/thumbnail-review-local" element={<Destination/>}/>
</Routes></MemoryRouter>);
