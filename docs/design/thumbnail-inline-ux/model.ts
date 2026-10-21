export type Point = [number, number];
export type Hold = { id: string; color: string; points: Point[]; manual?: boolean };
export type Draft = { name: string; sector: string; grade: number; color: string; selected: string[]; holds: Hold[]; photo: string; volume: boolean; note?: string };
export const storageKey = 'kws-design:thumbnail-inline:v1';
export const photo = new URL('./assets/boulder-original.jpg', import.meta.url).href;
export const colors = [
  { id: 'green', name: 'Grün', hex: '#36B531' },
  { id: 'yellow', name: 'Gelb', hex: '#E6CE42' },
  { id: 'pink', name: 'Pink', hex: '#E22B76' },
] as const;

// Prepared, hand-traced example regions; no model or API is invoked by this design.
export const holds: Hold[] = [
  { id: 'green-left', color: 'green', points: [[60,44],[70,35],[91,31],[111,37],[121,49],[125,65],[124,79],[135,92],[132,110],[120,127],[103,140],[89,143],[75,137],[62,126],[59,108],[56,86],[54,65]] },
  { id: 'green-top', color: 'green', points: [[138,31],[143,16],[157,5],[175,0],[201,0],[219,11],[225,27],[217,41],[197,53],[171,63],[153,60],[139,49]] },
  { id: 'green-bottom', color: 'green', points: [[232,262],[240,249],[249,240],[259,239],[271,248],[277,260],[273,273],[265,282],[249,288],[232,286],[228,278]] },
  { id: 'yellow-right', color: 'yellow', points: [[257,126],[269,114],[280,110],[295,116],[303,130],[301,150],[292,174],[278,185],[262,189],[252,179],[250,163],[250,144]] },
  { id: 'yellow-top', color: 'yellow', points: [[278,55],[282,40],[294,31],[301,32],[306,42],[306,61],[300,77],[291,85],[278,83],[273,73]] },
  { id: 'pink-right', color: 'pink', points: [[329,156],[345,150],[356,153],[359,165],[352,179],[335,186],[329,179]] },
  { id: 'pink-bottom', color: 'pink', points: [[261,436],[279,430],[290,420],[301,423],[311,434],[319,445],[312,457],[290,461],[270,453],[260,444]] },
];
export function initialDraft(edit = true): Draft {
  return { name: edit ? 'Kühner Wurm' : '', sector: 'Grotte A', grade: 6, color: 'green', selected: edit ? ['green-left', 'green-bottom'] : ['green-left', 'green-top'], holds, photo, volume: false };
}
export function readSaved(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.schema === 1 && typeof saved.draft?.name === 'string' && Array.isArray(saved.draft?.holds) && Array.isArray(saved.draft?.selected)) return saved.draft;
  } catch { /* Storage may be disabled; the example remains usable. */ }
  return initialDraft();
}
export const polygon = (points: Point[]) => points.map(p => p.join(',')).join(' ');
export const selectedCount = (draft: Draft) => draft.volume ? 0 : draft.holds.filter(h => draft.selected.includes(h.id)).length;
export function contourArea(points: Point[]) {
  return Math.abs(points.reduce((sum, p, i) => { const next = points[(i + 1) % points.length]; return sum + p[0] * next[1] - next[0] * p[1]; }, 0)) / 2;
}
