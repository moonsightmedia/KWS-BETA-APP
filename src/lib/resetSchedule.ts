import { resolveSectorArea, type SectorAreaSource } from './sectorAreas';

export const HALL_TIME_ZONE = 'Europe/Berlin';
export type ResetScheduleRow = { id: string; sector_id: string; scheduled_at: string; note: string | null };
export type ResetAppointment = {
  id: string;
  when: Date;
  day: string;
  sectors: Array<{ name: string; ids: string[] }>;
  notes: string[];
};

export function hallDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HALL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

// DayPicker works with local Date objects; preserve the hall's calendar day even
// when a visitor's device has a different timezone. Noon avoids DST gaps.
export function calendarDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

export function localCalendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Compare calendar days, not elapsed hours (a Berlin DST day can be 23/25h). */
export function relativeResetDay(day: string, now: Date): string | null {
  const ordinal = (key: string) => {
    const [year, month, date] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, date) / 86_400_000;
  };
  const difference = ordinal(day) - ordinal(hallDayKey(now));
  return difference === 0 ? 'Heute' : difference === 1 ? 'Morgen' : difference === 2 ? 'Übermorgen' : null;
}

export const RESET_PLAN_VIEW_KEY = 'kws.reset-plan.view.v1';
export type ResetPlanViewState = {
  version: 1;
  view: 'agenda' | 'calendar';
  selectedDay: string;
  month: string;
  hasSelection: boolean;
};
export function defaultResetPlanView(now = new Date()): ResetPlanViewState {
  const day = hallDayKey(now);
  return { version: 1, view: 'agenda', selectedDay: day, month: `${day.slice(0, 7)}-01`, hasSelection: false };
}

export function readResetPlanView(storage?: Pick<Storage, 'getItem'>, now = new Date()): ResetPlanViewState {
  const fallback = defaultResetPlanView(now);
  try {
    const value = JSON.parse(storage?.getItem(RESET_PLAN_VIEW_KEY) ?? 'null');
    const validDay = (day: unknown): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)
      && localCalendarDayKey(calendarDate(day)) === day;
    if (!value || value.version !== 1 || !['agenda', 'calendar'].includes(value.view)
      || !validDay(value.selectedDay) || !validDay(value.month) || !value.month.endsWith('-01')
      || typeof value.hasSelection !== 'boolean') return fallback;
    // Return only UI preferences. Never restore API data or unknown fields.
    return { version: 1, view: value.view, selectedDay: value.selectedDay, month: value.month, hasSelection: value.hasSelection };
  } catch {
    return fallback;
  }
}

export function formatHallDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('de-DE', { ...options, timeZone: HALL_TIME_ZONE }).format(date);
}

export function buildResetAppointments(
  rows: readonly ResetScheduleRow[],
  sectors: readonly (SectorAreaSource & { id: string })[],
  now = new Date(),
): ResetAppointment[] {
  const sectorById = new Map(sectors.map(sector => [sector.id, sector]));
  const grouped = new Map<number, ResetAppointment>();
  for (const row of rows) {
    const when = new Date(row.scheduled_at);
    if (!Number.isFinite(when.getTime()) || when.getTime() < now.getTime()) continue;
    const timestamp = when.getTime();
    let appointment = grouped.get(timestamp);
    if (!appointment) {
      appointment = { id: String(timestamp), when, day: hallDayKey(when), sectors: [], notes: [] };
      grouped.set(timestamp, appointment);
    }
    const sector = sectorById.get(row.sector_id);
    // Missing references remain visible without inventing a sector name/link.
    const name = sector ? resolveSectorArea(sector).publicName : 'Teilbereich nicht zugeordnet';
    const existing = appointment.sectors.find(item => item.name === name);
    if (existing) {
      if (sector && !existing.ids.includes(row.sector_id)) existing.ids.push(row.sector_id);
    } else {
      appointment.sectors.push({ name, ids: sector ? [row.sector_id] : [] });
    }
    const note = row.note?.trim();
    if (note && !appointment.notes.includes(note)) appointment.notes.push(note);
  }
  return [...grouped.values()].sort((a, b) => a.when.getTime() - b.when.getTime()).map(item => ({
    ...item, sectors: item.sectors.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true })),
  }));
}
