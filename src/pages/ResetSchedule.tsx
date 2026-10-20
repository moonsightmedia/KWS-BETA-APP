import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { SetterScheduleCalendar } from '@/components/setter/SetterScheduleCalendar';
import { KwsSurface } from '@/components/ui/kws-surface';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ResetSequenceMap } from '@/components/ResetSequenceMap';
import { useResetPlan } from '@/hooks/useResetPlan';
import { useAuth } from '@/hooks/useAuth';
import { calendarDate, defaultResetPlanView, formatHallDate, hallDayKey, localCalendarDayKey, readResetPlanView, relativeResetDay, RESET_PLAN_VIEW_KEY, type ResetAppointment } from '@/lib/resetSchedule';

function Appointment({ appointment }: { appointment: ResetAppointment }) {
  return <article className="py-4 first:pt-0 last:pb-0" aria-label={`Schraubtermin ${formatHallDate(appointment.when, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}>
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><time dateTime={appointment.when.toISOString()}>{formatHallDate(appointment.when, { hour: '2-digit', minute: '2-digit' })} Uhr</time></p>
    <div className="flex flex-wrap gap-2">
      {appointment.sectors.map(sector => sector.ids.length ? <Link key={sector.name}
        to={`/boulders?sector=${encodeURIComponent(sector.name)}`}
        aria-label={`Aktuelle Boulder in ${sector.name}`}
        className="inline-flex min-h-11 items-center rounded-kws-control bg-secondary px-3 text-sm font-semibold transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{sector.name}</Link>
        : <span key={sector.name} className="py-3 text-sm text-muted-foreground">{sector.name}</span>)}
    </div>
    {appointment.notes.map(note => <p key={note} className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{note}</p>)}
  </article>;
}

export default function ResetSchedule() {
  const plan = useResetPlan();
  const { user } = useAuth();
  const location = useLocation();
  const [preferences, setPreferences] = useState(() => {
    try { return readResetPlanView(window.localStorage); } catch { return defaultResetPlanView(); }
  });
  const { view } = preferences;
  const firstDay = plan.appointments[0]?.day;
  // A restored or explicit choice always wins over the first-visit default.
  const automaticDay = view === 'calendar' && !preferences.hasSelection ? firstDay : undefined;
  const selectedDay = calendarDate(automaticDay ?? preferences.selectedDay);
  const month = calendarDate(automaticDay ? `${automaticDay.slice(0, 7)}-01` : preferences.month);
  useEffect(() => {
    if (automaticDay) setPreferences(current => ({ ...current, selectedDay: automaticDay, month: `${automaticDay.slice(0, 7)}-01`, hasSelection: true }));
  }, [automaticDay]);
  useEffect(() => {
    try { window.localStorage.setItem(RESET_PLAN_VIEW_KEY, JSON.stringify(preferences)); } catch { /* Storage must never block navigation. */ }
  }, [preferences]);
  const changeView = (next: 'agenda' | 'calendar') => setPreferences(current => ({ ...current, view: next }));
  const setSelectedDay = (date: Date) => setPreferences(current => ({ ...current, selectedDay: localCalendarDayKey(date), hasSelection: true }));
  const setMonth = (date: Date) => setPreferences(current => ({ ...current, month: `${localCalendarDayKey(date).slice(0, 7)}-01`, hasSelection: true }));
  const calendarAppointments = useMemo(() => plan.appointments.map(item => ({
    ids: [item.id], sectorName: item.sectors.map(sector => sector.name).join(' · '), date: calendarDate(item.day),
  })), [plan.appointments]);
  // The calendar date is a wall-clock day, not an instant to convert to Berlin.
  const selectedKey = localCalendarDayKey(selectedDay);
  const dayAppointments = plan.appointments.filter(item => item.day === selectedKey);
  const selectedDayLabel = relativeResetDay(selectedKey, plan.now);
  const backTo = user ? (location.state?.from === 'profile' ? '/profile' : '/') : '/guest';
  return <DashboardPageLayout headerBackTo={backTo} headerBackLabel={backTo === '/profile' ? 'Zurück zum Profil' : 'Zurück zur App'} rightSlot={
    <Button variant="secondary" size="icon" aria-label="Schraubplan aktualisieren" disabled={plan.fetching} onClick={() => void plan.retry()}>
      <RefreshCw className={plan.fetching ? 'h-4 w-4 animate-spin motion-reduce:animate-none' : 'h-4 w-4'} aria-hidden="true" />
    </Button>}>
    <div className="space-y-4" data-reset-plan>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <KwsSegmentedControl<'agenda' | 'calendar'> ariaLabel="Schraubplan-Ansicht" value={view} onValueChange={changeView}
          options={[{ value: 'agenda', label: 'Termine' }, { value: 'calendar', label: 'Kalender' }]} className="w-full sm:max-w-xs" />
        <p className={view === 'calendar' ? 'hidden text-xs text-muted-foreground sm:block' : 'text-xs text-muted-foreground'} aria-live="polite">{plan.pending ? 'Termine werden geladen …' : plan.failed ? 'Daten nicht verfügbar' : `${plan.appointments.length} ${plan.appointments.length === 1 ? 'Termin' : 'Termine'} geplant · Hallenzeit`}</p>
      </div>
      {plan.failed ? <KwsSurface role="alert" className="space-y-3 p-5">
        <h2 className="text-base font-semibold">Schraubplan konnte nicht geladen werden</h2>
        <p className="text-sm text-muted-foreground">Prüfe deine Verbindung und versuche es noch einmal.</p>
        <Button variant="secondary" disabled={plan.fetching} onClick={() => void plan.retry()}>{plan.fetching ? 'Wird geladen …' : 'Erneut versuchen'}</Button>
      </KwsSurface> : plan.pending ? <KwsSurface role="status" aria-label="Schraubplan wird geladen" className="space-y-4 p-5"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></KwsSurface>
        : view === 'calendar' ? <SetterScheduleCalendar appointments={calendarAppointments} month={month} selectedDay={selectedDay}
          onMonthChange={setMonth} onSelectDay={setSelectedDay} onCreate={() => {}} canCreate={false} readOnly compact
          selectedDayLabel={selectedDayLabel ?? undefined}
          selectedDaySubtitle={selectedDayLabel ? selectedDay.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
          todayDate={calendarDate(hallDayKey(plan.now))}>
          {dayAppointments.length ? <KwsSurface className="divide-y divide-border/60 p-3 sm:p-4">{dayAppointments.map(item => <Appointment key={item.id} appointment={item} />)}</KwsSurface>
            : <p className="py-3 text-sm text-muted-foreground">Keine kommenden Termine an diesem Tag.</p>}
        </SetterScheduleCalendar>
          : plan.appointments.length ? <ResetSequenceMap appointments={plan.appointments} sectors={plan.sectors} />
            : <KwsSurface className="p-5"><CalendarDays className="mb-3 h-6 w-6 text-primary-ink" aria-hidden="true" /><h2 className="text-base font-semibold">Noch keine Umschraubung geplant</h2><p className="mt-2 text-sm text-muted-foreground">Neue Termine erscheinen hier, sobald das Setter-Team sie einträgt.</p></KwsSurface>}
    </div>
  </DashboardPageLayout>;
}
