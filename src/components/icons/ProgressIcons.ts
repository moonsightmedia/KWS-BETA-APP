import { createLucideIcon } from 'lucide-react';

// Original KWS outlines: same 24px grid and shared stroke as BoulderIcon.
export const CalendarIcon = createLucideIcon('KwsCalendar', [
  ['path', { d: 'M7 5h10.1a2.7 2.7 0 0 1 2.7 2.5l.5 9.6a2.6 2.6 0 0 1-2.5 2.8l-11 .5a2.7 2.7 0 0 1-2.8-2.6L3.8 8A2.9 2.9 0 0 1 7 5Z', key: 'calendar' }],
  ['path', { d: 'M8 3.5v3M16 3.5v3M4 9.5h15.9', key: 'binding' }],
  ['circle', { cx: '12', cy: '14.5', r: '1.5', key: 'active-day' }],
]);

export const FlashIcon = createLucideIcon('KwsFlash', [
  ['path', { d: 'm13.7 3.6-8.3 9.2q-.8 1 .5 1h4.7l-.8 6.1q-.1 1 .6.2l8.3-9.2q.8-1-.5-1h-4.7l.8-6.1q.1-1-.6-.2Z', key: 'flash' }],
]);
