import { useState, useSyncExternalStore } from 'react';

// Self-contained, synthetic fixtures: no dependency on admin/setter test data.
const sectors = [
  { id: 's1', name: 'Bug A', area: 'Bug', subarea: 'A' },
  { id: 's2', name: 'Grotte B', area: 'Grotte', subarea: 'B' },
];
export const useSectorsTransformed = () => ({ data: sectors, isLoading: false, error: null });
export const useSectors = useSectorsTransformed;
export const useColors = () => ({ data: [{ id: 'green', name: 'Grün', hex: '#67AE3F' }], isPending: false, isError: false });
export const useIsAdmin = () => ({ isAdmin: true, loading: false });
export const useHasRole = () => ({ hasRole: true, loading: false });
export const useBoulderRatingSummaries = () => ({ data: [] });

export const personalBoulders = Array.from({ length: 32 }, (_, i) => ({
  id: `personal-${i}`, name: ['Grüne Kante', 'Leichte Welle', 'Über den Bug', 'Ein sehr langer Bouldername zum Prüfen der Darstellung'][i % 4] + ` ${i + 1}`,
  sector: i % 2 ? 'Bug A' : 'Grotte B', sectorId: i % 2 ? 's1' : 's2',
  difficulty: i === 31 ? null : (i % 8) + 1, color: 'Grün', createdAt: new Date('2026-09-14T10:00:00Z'),
  status: i > 25 ? 'abgeschraubt' : 'haengt', thumbnailUrl: undefined,
}));
let entries = personalBoulders.map((b, i) => ({
  boulder: { id:b.id, name:b.name, color:b.color, difficulty:b.difficulty, created_at:'2026-09-14T10:00:00Z', status:b.status, thumbnail_url:null },
  tick: { id:`tick-${i}`, boulder_id:b.id, user_id:'personal-user', status:i < 16 ? (i % 3 === 0 ? 'flash' : 'top') : 'attempted', attempt_count:i < 16 ? 2 : i % 2,
    is_favorite:i >= 14, is_project:i >= 12 && i % 2 === 0, note:null, created_at:'2026-09-01T10:00:00Z', updated_at:'2026-09-15T10:00:00Z' },
}));
const sessions = personalBoulders.slice(0, 24).map((b,i) => ({id:`session-${i}`, boulder_id:b.id, user_id:'personal-user', session_date:`2026-09-${String(15 - (i % 12)).padStart(2,'0')}`,
  result:i < 16 ? (i % 3 === 0 ? 'flash' : 'top') : 'attempted', attempt_count:i % 3 === 0 ? 1 : 3, note:null, created_at:'2026-09-15T10:00:00Z', updated_at:'2026-09-15T10:00:00Z'}));
const listeners = new Set<() => void>();
let revision = 0;
function useData<T>(data:T) {
  const [state,setState] = useState(new URLSearchParams(location.search).get('state'));
  return { data: state === 'empty' ? [] : state ? undefined : data, isLoading:state === 'loading', isPending:state === 'loading', isFetching:state === 'loading', error:state === 'error' ? new Error('Isolierter Ladefehler') : null, refetch:async()=>setState(null) };
}
export function useMyTrackedBoulders() {
  useSyncExternalStore(cb=>{listeners.add(cb);return()=>{listeners.delete(cb);};},()=>revision);
  return useData(entries);
}
export const useMyTrackingSessions = () => useData(sessions);
export const useBouldersWithSectors = () => ({data:personalBoulders, isLoading:false, error:null, rawBoulders:personalBoulders, rawSectors:[]});
export const useSectorSchedule = () => ({data:[]});
const user = {id:'personal-user',email:'test@example.invalid',user_metadata:{first_name:'Alex'},created_at:'2026-01-01'};
const session = {access_token:'isolated-test-token'};
export const useAuth = () => ({user,session,loading:false,signOut:async()=>{}});
export function useUpdateBoulderMarkers() {
  const [isPending, setPending] = useState(false);
  return { isPending, mutateAsync:async (payload:{tickId:string; field:'is_favorite'|'is_project'; value:boolean})=>{
    setPending(true);
    try {
      if(new URLSearchParams(location.search).has('writeError')) throw new Error('Testfehler');
      entries=entries.map(entry=>entry.tick.id===payload.tickId ? {...entry,tick:{...entry.tick,[payload.field]:payload.value}}:entry);
      revision++;listeners.forEach(fn=>fn());
    } finally {setPending(false);}
  }};
}
