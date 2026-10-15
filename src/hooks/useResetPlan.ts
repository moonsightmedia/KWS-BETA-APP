import { useEffect, useMemo, useState } from 'react';
import { usePublicResetSchedule } from './usePublicResetSchedule';
import { usePublicTvSectors } from './usePublicTvSchedule';
import { buildResetAppointments } from '@/lib/resetSchedule';

export function useResetPlan() {
  const schedule = usePublicResetSchedule();
  const sectors = usePublicTvSectors();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const appointments = useMemo(() => buildResetAppointments(schedule.data ?? [], sectors.data ?? [], now),
    [schedule.data, sectors.data, now]);
  const pending = schedule.isPending || sectors.isPending;
  const failed = schedule.isError || sectors.isError;
  return {
    appointments, now, pending, failed,
    fetching: schedule.isFetching || sectors.isFetching,
    retry: () => Promise.all([schedule.refetch(), sectors.refetch()]),
  };
}
