import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColorRow } from '@/hooks/useColors';
import { ColorOrderError, type ColorPosition } from '@/lib/colorOrder';

const initial: ColorRow[] = [
  { id: 'pink', name: 'Pink', hex: '#FF0099', secondary_hex: null, sort_order: 0, is_active: true },
  { id: 'dual', name: 'Grün–Gelb mit einem besonders langen Namen für die Darstellung', hex: '#22C55E', secondary_hex: '#FACC15', sort_order: 1, is_active: true },
  { id: 'inactive', name: 'Inaktives Blau', hex: '#3B82F6', secondary_hex: null, sort_order: 2, is_active: false },
];
const state = {
  rows: new URLSearchParams(location.search).get('state') === 'empty' ? [] as ColorRow[] : new URLSearchParams(location.search).get('state') === 'long' ? Array.from({ length: 24 }, (_, index) => ({ ...initial[index % 3], id: 'long-' + index, name: 'Farbe ' + (index + 1), sort_order: index })) : initial,
  readError: new URLSearchParams(location.search).get('state') === 'error',
  loading: new URLSearchParams(location.search).get('state') === 'loading',
  failWrite: false, reloadRequired: false, writes: [] as { kind: string; payload: unknown }[], delay: 0,
};
declare global { interface Window { colorQA: typeof state } }
window.colorQA = state;
export function useAdminColors() {
  return useQuery({ queryKey: ['colors', 'admin'], queryFn: async () => {
    if (state.loading) await new Promise(() => {});
    if (state.readError) throw new Error('Test-Ladefehler');
    return [...state.rows].sort((a, b) => a.sort_order - b.sort_order);
  } });
}
function useFixtureMutation<T>(kind: string, apply: (payload: T) => void) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (payload: T) => {
    state.writes.push({ kind, payload });
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.reloadRequired) throw new ColorOrderError('Die Reihenfolge wurde inzwischen geändert. Bitte lade die Liste neu.', true);
    if (state.failWrite) throw new Error('Test-Schreibfehler');
    apply(payload);
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['colors'] }); } });
}
export const useCreateColor = () => useFixtureMutation<Omit<ColorRow, 'id'>>('create', payload => { state.rows.push({ ...payload, id: 'created-' + state.writes.length }); });
export const useUpdateColor = () => useFixtureMutation<Partial<ColorRow> & { id: string }>('update', payload => { state.rows = state.rows.map(row => row.id === payload.id ? { ...row, ...payload } : row); });
export const useDeleteColor = () => useFixtureMutation<string>('delete', id => { state.rows = state.rows.filter(row => row.id !== id); });
export const useAddDefaultColors = () => useFixtureMutation<void>('defaults', () => {});
export const useReorderColors = () => useFixtureMutation<{ expected: ColorPosition[]; ids: string[] }>('reorder', ({ ids }) => {
  state.rows = ids.map((id, index) => ({ ...state.rows.find(row => row.id === id)!, sort_order: index + 1 }));
});
