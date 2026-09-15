import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ['kws-badge', 'kws-control', 'kws-card'] }],
      'rounded-t': [{ 'rounded-t': ['kws-badge', 'kws-control', 'kws-card'] }],
      'rounded-b': [{ 'rounded-b': ['kws-badge', 'kws-control', 'kws-card'] }],
      'rounded-l': [{ 'rounded-l': ['kws-badge', 'kws-control', 'kws-card'] }],
      'rounded-r': [{ 'rounded-r': ['kws-badge', 'kws-control', 'kws-card'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
