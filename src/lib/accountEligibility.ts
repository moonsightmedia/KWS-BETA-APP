export const MINIMUM_ACCOUNT_AGE = 16;

/** Calendar dates only; the VPS and browser use the same German day boundary. */
export function accountBirthDateError(value: string | undefined, now = new Date()): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Bitte gib dein vollständiges Geburtsdatum an.';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return 'Bitte gib ein gültiges Geburtsdatum an.';
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const today = `${part('year')}-${String(part('month')).padStart(2, '0')}-${String(part('day')).padStart(2, '0')}`;
  if (value > today) return 'Das Geburtsdatum darf nicht in der Zukunft liegen.';
  const age = part('year') - year - (part('month') < month || (part('month') === month && part('day') < day) ? 1 : 0);
  return age < MINIMUM_ACCOUNT_AGE ? 'Ein eigenes Konto kannst du derzeit ab 16 Jahren erstellen.' : null;
}
