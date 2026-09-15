import { useColors as useBaseColors } from './setter-hooks';

const extraColors = [
  { id: 'pink', name: 'Pink', hex: '#e83e8c' },
  { id: 'mint', name: 'Mint', hex: '#b7ebcb' },
  { id: 'yellow', name: 'Gelb', hex: '#f6d54a' },
  { id: 'orange', name: 'Orange', hex: '#ee8737' },
  { id: 'black', name: 'Schwarz', hex: '#192436' },
  { id: 'purple', name: 'Lila', hex: '#9754e4' },
  { id: 'dual', name: 'Schwarz-Gelb', hex: '#192436', secondary_hex: '#f6d54a' },
];
export function useColors() {
  const query = useBaseColors();
  return { ...query, data: query.data ? [...query.data, ...extraColors] : undefined };
}
