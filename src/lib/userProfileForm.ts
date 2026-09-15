export type EditableProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  birth_date: string | null;
};
export type ProfileDraft = { firstName: string; lastName: string; birthDate: string };
export type ProfilePayload = { first_name: string | null; last_name: string | null; full_name: string | null; birth_date: string | null };

export function makeProfileDraft(profile: EditableProfile): ProfileDraft {
  const parts = (profile.full_name || '').trim().split(/\s+/).filter(Boolean);
  const birthDate = profile.birth_date?.slice(0, 10) || '';
  return {
    firstName: profile.first_name || parts[0] || '',
    lastName: profile.last_name || parts.slice(1).join(' ') || '',
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate.split('-').reverse().join('.') : birthDate,
  };
}

/** A date-only value: never convert through UTC, which can shift birthdays. */
export function parseBirthDate(value: string, today = new Date()): string | null | undefined {
  if (!value.trim()) return null;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText), month = Number(monthText), year = Number(yearText);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  const iso = `${yearText}-${monthText}-${dayText}`;
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return iso <= todayISO ? iso : undefined;
}

export function profileDraftPayload(draft: ProfileDraft): ProfilePayload {
  const birthday = parseBirthDate(draft.birthDate);
  if (birthday === undefined) throw new Error('Bitte ein gültiges Geburtsdatum im Format TT.MM.JJJJ eingeben, das nicht in der Zukunft liegt.');
  const first = draft.firstName.trim();
  const last = draft.lastName.trim();
  return { first_name: first || null, last_name: last || null, full_name: [first, last].filter(Boolean).join(' ') || null, birth_date: birthday };
}
