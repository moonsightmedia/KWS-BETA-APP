import { hallDayKey, type ResetAppointment } from './resetSchedule';
import type { Boulder } from '../types/boulder';

export type SectorMapAnnotation = { label: string; description: string };
export type ResetSequenceEntry = { number: number; name: string; ids: string[]; when: Date; day: string };

/** The map shows the next appointment per logical sector; the calendar retains repeats. */
export function buildResetSequence(appointments: readonly ResetAppointment[]): ResetSequenceEntry[] {
  const seen = new Set<string>();
  const entries: ResetSequenceEntry[] = [];
  for (const appointment of [...appointments].sort((a, b) => a.when.getTime() - b.when.getTime())) {
    for (const sector of [...appointment.sectors].sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }))) {
      if (seen.has(sector.name)) continue;
      seen.add(sector.name);
      entries.push({ number: entries.length + 1, name: sector.name, ids: [...sector.ids], when: appointment.when, day: appointment.day });
    }
  }
  return entries;
}

/** New means actual hanging boulders, never a future teardown appointment.
 * Include all sectors on the latest Berlin setup day, inside the existing 7-day window.
 * Missing dates/IDs, removed boulders and future timestamps cannot create a badge.
 */
export function latestNewBoulderSectors(boulders: readonly Pick<Boulder, 'createdAt' | 'status' | 'sectorId' | 'sector2Id'>[], now = new Date()) {
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - 7);
  const recent = boulders.filter(boulder => boulder.status !== 'abgeschraubt'
    && boulder.createdAt instanceof Date && Number.isFinite(boulder.createdAt.getTime())
    && boulder.createdAt >= threshold && boulder.createdAt <= now
    && (boulder.sectorId || boulder.sector2Id));
  const day = recent.map(boulder => hallDayKey(boulder.createdAt)).sort().at(-1);
  return { day, ids: day ? [...new Set(recent.filter(boulder => hallDayKey(boulder.createdAt) === day)
    .flatMap(boulder => [boulder.sectorId, boulder.sector2Id]).filter((id): id is string => Boolean(id)))] : [] };
}
