import type { ColorRow } from '@/hooks/useColors';

export type ColorDraft = {
  name: string;
  hex: string;
  secondaryHex: string;
  twoTone: boolean;
  sortOrder: string;
  active: boolean;
};

export const normalizeHex = (value: string): string | null => {
  const digits = value.trim().replace(/^#/, '');
  if (/^[a-f\d]{3}$/i.test(digits)) return `#${[...digits].map(c => c + c).join('').toUpperCase()}`;
  return /^[a-f\d]{6}$/i.test(digits) ? `#${digits.toUpperCase()}` : null;
};

export function makeColorDraft(color?: ColorRow, nextOrder = 0): ColorDraft {
  return {
    name: color?.name ?? '',
    hex: color?.hex ?? '#22C55E',
    secondaryHex: color?.secondary_hex ?? '#FACC15',
    twoTone: Boolean(color?.secondary_hex),
    sortOrder: String(color?.sort_order ?? nextOrder),
    active: color?.is_active ?? true,
  };
}

export function validateColorDraft(draft: ColorDraft, colors: ColorRow[], id?: string) {
  const errors: Partial<Record<keyof ColorDraft, string>> = {};
  if (!draft.name.trim()) errors.name = 'Gib der Farbe einen Namen.';
  else if (colors.some(c => c.id !== id && c.name.trim().toLocaleLowerCase('de') === draft.name.trim().toLocaleLowerCase('de'))) errors.name = 'Dieser Farbname ist bereits vergeben.';
  if (!normalizeHex(draft.hex)) errors.hex = 'Gültigen HEX-Code eingeben, z. B. #22C55E.';
  if (draft.twoTone && !normalizeHex(draft.secondaryHex)) errors.secondaryHex = 'Gültigen HEX-Code für die zweite Farbe eingeben.';
  if (!/^\d+$/.test(draft.sortOrder) || !Number.isSafeInteger(Number(draft.sortOrder))) errors.sortOrder = 'Gib eine ganze Zahl ab 0 ein.';
  return errors;
}

export const colorDraftPayload = (draft: ColorDraft) => ({
  name: draft.name.trim(),
  hex: normalizeHex(draft.hex)!,
  secondary_hex: draft.twoTone ? normalizeHex(draft.secondaryHex) : null,
  sort_order: Number(draft.sortOrder),
  is_active: draft.active,
});
