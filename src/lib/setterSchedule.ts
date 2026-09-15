export type SetterAppointment = {
  ids: string[];
  sectorName: string;
  date: Date;
};

// Calendar keys are local dates. UTC conversion would shift late appointments.
export function scheduleDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
