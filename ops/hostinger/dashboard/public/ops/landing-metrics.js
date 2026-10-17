const byId=id=>document.getElementById(id);
const number=new Intl.NumberFormat('de-DE');
async function loadLanding(){
 const state=byId('landing-state');
 try{
  const response=await fetch('/ops/landing.json',{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('snapshot');
  const data=await response.json();
  if(data.schema!==1||!data.days?.length||!Object.values(data.totals).every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('invalid');
  const stale=Date.now()-Date.parse(data.generatedAt)>15*60*1000;
  for(const [id,key] of [['landing-today','today'],['landing-week','last7'],['landing-month','last30']])byId(id).textContent=number.format(data.totals[key]);
  state.textContent=stale?'Daten veraltet':'Ohne Nutzerkennungen';state.className='badge '+(stale?'warn':'good');
  const date=new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeZone:'Europe/Berlin'});
  byId('landing-since').textContent='Messung seit '+date.format(new Date(data.measuredSince))+' · Aktualisiert '+new Intl.DateTimeFormat('de-DE',{timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(data.generatedAt))+' Uhr';
  const list=byId('landing-days');list.replaceChildren();
  for(const row of data.days.slice(-7).reverse()){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isSafeInteger(row.views)||row.views<0)throw Error('invalid day');
   const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=date.format(new Date(row.date+'T12:00:00Z'));dd.textContent=number.format(row.views);div.append(dt,dd);list.append(div);
  }
 }catch{
  state.textContent='Auswertung nicht verfügbar';state.className='badge warn';
  for(const id of ['landing-today','landing-week','landing-month'])byId(id).textContent='—';
  byId('landing-since').textContent='Es liegen gerade keine verlässlichen Zählerdaten vor.';byId('landing-days').replaceChildren();
 }
}
byId('refresh').addEventListener('click',loadLanding);loadLanding();setInterval(loadLanding,60000);
