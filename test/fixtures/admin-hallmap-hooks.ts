// Test-only replacements. Mutations are recorded in memory and never reach Supabase or storage.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import snapshot from './hall-hierarchy-snapshot.json';

const realistic = new URLSearchParams(location.search).get('state') === 'hierarchy';
const hallMap = realistic ? { ...snapshot.map } : { id: 'map-1', name: 'Haupthalle', image_url: '/src/assets/boulderkarte-original.png', width: 1471, height: 930, is_active: true, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' };
const sectors = realistic ? snapshot.sectors : [
  { id: 'sector-1', name: 'Bug A', description: null, boulder_count: 5, next_schraubtermin: null, last_schraubtermin: null, image_url: null, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' },
  { id: 'sector-2', name: 'Grotte B', description: null, boulder_count: 2, next_schraubtermin: null, last_schraubtermin: null, image_url: null, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' },
];
if (new URLSearchParams(location.search).has('extended')) {
  Object.assign(sectors[0], { area: { id: 'training', name: 'Training', slug: 'training', sort_order: 6, is_active: true, description: null }, area_id: 'training', subarea_code: 'A12' });
}
type Region = { id: string; hall_map_id: string; sector_id: string; shape_type: 'polygon'; points_json: Array<{ x: number; y: number }>; label_x: number; label_y: number; z_index: number; created_at: string; updated_at: string };
type RegionInput = Omit<Region, 'created_at' | 'updated_at'>;
let regions: Region[] = [{ id: 'region-1', hall_map_id: 'map-1', sector_id: 'sector-1', shape_type: 'polygon', points_json: [{ x: 12, y: 12 }, { x: 36, y: 15 }, { x: 20, y: 38 }], label_x: 22, label_y: 22, z_index: 0, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }];
if (realistic) regions = snapshot.regions as Region[];
export const fixtureSectors = sectors;
const state = { writes: [] as Array<{ kind: string; payload: unknown }>, fail: false, delay: 0 };
const record = async (kind: string, payload: unknown) => {
  state.writes.push({ kind, payload });
  await new Promise(resolve => setTimeout(resolve, state.delay));
  if (state.fail) throw new Error('Isolierter Testfehler');
};
declare global { interface Window { hallMapQA: typeof state } }
window.hallMapQA = state;
const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => () => queryClient.invalidateQueries({ queryKey: ['sector_map_regions'] });

export const useHallMaps = () => useQuery({ queryKey: ['hall_maps'], queryFn: async () => [hallMap] });
export const useActiveHallMap = () => useQuery({ queryKey: ['hall_maps', 'active'], queryFn: async () => hallMap });
export const useSectorMapRegions = () => useQuery({ queryKey: ['sector_map_regions', 'map-1'], queryFn: async () => regions });
export const useSectors = () => useQuery({ queryKey: ['sectors'], queryFn: async () => sectors });
export const useCreateHallMap = () => useMutation({ mutationFn: async (payload: unknown) => { state.writes.push({ kind: 'create-map', payload }); return hallMap; } });
export const useUpdateHallMap = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (payload: Partial<typeof hallMap>) => { await record('update-map', payload); Object.assign(hallMap, payload); return { ...hallMap }; }, onSuccess: () => qc.invalidateQueries({ queryKey: ['hall_maps'] }) }); };
export const useDeleteHallMap = () => useMutation({ mutationFn: async (payload: unknown) => { state.writes.push({ kind: 'delete-map', payload }); } });
export const useCreateSectorMapRegion = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (payload: Omit<RegionInput, 'id'>) => { const next: Region = { ...payload, id: 'region-new', created_at: '', updated_at: '' }; regions = [...regions, next]; state.writes.push({ kind: 'create-region', payload }); return next; }, onSuccess: invalidate(qc) }); };
export const useUpdateSectorMapRegion = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (payload: RegionInput) => { await record('update-region', payload); const next: Region = { ...regions.find(region => region.id === payload.id)!, ...payload }; regions = regions.map(region => region.id === payload.id ? next : region); return next; }, onSuccess: invalidate(qc) }); };
export const useDeleteSectorMapRegion = () => { const qc = useQueryClient(); return useMutation({ mutationFn: async (payload: { id: string; hallMapId: string }) => { await record('delete-region', payload); regions = regions.filter(region => region.id !== payload.id); return payload.hallMapId; }, onSuccess: invalidate(qc) }); };
export const useAuth = () => ({ user: { id: 'qa-admin' }, session: { access_token: 'fixture-only-not-a-credential' }, loading: false });
