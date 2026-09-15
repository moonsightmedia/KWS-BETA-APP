import { createLucideIcon } from 'lucide-react';

/** Original KWS climbing hold: asymmetric outline and centered bolt hole.
 * A single interior detail keeps small navigation sizes visually light.
 * Uses the same 24px grid, currentColor, ref and sizing API as our outline set.
 */
export const BoulderIcon = createLucideIcon('KwsBoulder', [
  ['path', {
    d: 'M5.5 6.9 9.1 3.8a3.4 3.4 0 0 1 3.9-.4l5.7 3.5a3.4 3.4 0 0 1 1.5 3.9l-2.1 6.8a3.4 3.4 0 0 1-3.9 2.3l-7.8-1.5a3.4 3.4 0 0 1-2.7-3.7l.6-5.6a3.4 3.4 0 0 1 1.2-2.2Z',
    key: 'hold',
  }],
  ['circle', { cx: '12', cy: '12', r: '1.5', key: 'bolt-hole' }],
]);
