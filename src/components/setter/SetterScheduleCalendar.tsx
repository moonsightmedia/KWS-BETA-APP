import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { addMonths, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import {
  DayPicker,
  useDayPicker,
  useDayRender,
  type DayContentProps,
  type DayProps,
} from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetterSurface } from "./SetterWorkspaceShell";
import { scheduleDayKey, type SetterAppointment } from "@/lib/setterSchedule";

const CalendarEntries = createContext(new Map<string, SetterAppointment[]>());
const CompactCalendar = createContext(false);
function ScheduleDay({ date, displayMonth }: DayProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { labels, locale } = useDayPicker();
  const day = useDayRender(date, displayMonth, ref);
  if (day.isHidden) return <div role="gridcell" />;
  // v8's default Day doesn't attach labelDay to its button. Keep the library's
  // roving focus/arrow navigation, and explicitly expose the date and action.
  return (
    <button
      type="button"
      name="day"
      ref={ref}
      {...day.buttonProps}
      data-reset-day={day.activeModifiers.scheduled ? 'true' : undefined}
      aria-label={labels.labelDay(date, day.activeModifiers, { locale })}
    />
  );
}
function ScheduleDayContent({ date }: DayContentProps) {
  const entries = useContext(CalendarEntries).get(scheduleDayKey(date)) ?? [];
  const compact = useContext(CompactCalendar);
  if (compact) return <>
    <span className="font-semibold tabular-nums leading-5">{date.getDate()}</span>
    <span aria-hidden="true" className="flex h-3 items-center justify-center gap-0.5 text-[10px] leading-3">
      {entries.length > 0 && <><CalendarDays className="h-3 w-3" />{entries.length > 1 && entries.length}</>}
    </span>
  </>;
  return (
    <>
      <span className="font-semibold tabular-nums">{date.getDate()}</span>
      <span
        aria-hidden="true"
        className="mt-1 flex h-4 items-center justify-center gap-1 text-[11px] leading-4 md:hidden"
      >
        {entries.length > 0 && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-primary-ink" />
            {entries.length}
          </>
        )}
      </span>
      <span
        aria-hidden="true"
        className="mt-1 hidden min-w-0 truncate text-[11px] font-medium leading-4 md:block"
      >
        {entries[0]?.sectorName || "\u00a0"}
      </span>
      {entries.length > 1 && (
        <span
          aria-hidden="true"
          className="hidden text-[11px] leading-4 md:block"
        >
          +{entries.length - 1} weitere
        </span>
      )}
    </>
  );
}

export function SetterScheduleCalendar({
  appointments,
  month,
  selectedDay,
  onMonthChange,
  onSelectDay,
  onCreate,
  canCreate,
  readOnly = false,
  todayDate,
  compact = false,
  selectedDayLabel,
  selectedDaySubtitle,
  children,
}: {
  appointments: SetterAppointment[];
  month: Date;
  selectedDay: Date;
  onMonthChange: (date: Date) => void;
  onSelectDay: (date: Date) => void;
  onCreate: (date: Date) => void;
  canCreate: boolean;
  readOnly?: boolean;
  todayDate?: Date;
  compact?: boolean;
  selectedDayLabel?: string;
  selectedDaySubtitle?: string;
  children: ReactNode;
}) {
  const today = todayDate ? new Date(todayDate) : new Date();
  today.setHours(0, 0, 0, 0);
  const byDay = useMemo(() => {
    const index = new Map<string, SetterAppointment[]>();
    appointments.forEach((item) => {
      const key = scheduleDayKey(item.date);
      index.set(key, [...(index.get(key) ?? []), item]);
    });
    return index;
  }, [appointments]);
  const monthCount = appointments.filter((item) =>
    isSameMonth(item.date, month),
  ).length;
  return (
    <div className={`grid items-start ${compact ? 'gap-4' : 'gap-5'} xl:grid-cols-[minmax(0,1fr)_300px]`}>
      <div data-schedule-calendar data-swipe-ignore>
        <SetterSurface className="min-w-0 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold" aria-live="polite">
                {month.toLocaleDateString("de-DE", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {monthCount} {monthCount === 1 ? "Termin" : "Termine"}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Vorheriger Monat"
                onClick={() =>
                  onMonthChange(addMonths(startOfMonth(month), -1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="px-2"
                onClick={() => {
                  onMonthChange(today);
                  onSelectDay(today);
                }}
              >
                Heute
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Nächster Monat"
                onClick={() => onMonthChange(addMonths(startOfMonth(month), 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CalendarEntries.Provider value={byDay}><CompactCalendar.Provider value={compact}>
            <DayPicker
              mode="single"
              locale={de}
              weekStartsOn={1}
              month={month}
              onMonthChange={onMonthChange}
              selected={selectedDay}
              showOutsideDays
              fixedWeeks={!compact}
              today={today}
              modifiers={compact ? { scheduled: day => byDay.has(scheduleDayKey(day)) } : undefined}
              modifiersClassNames={compact ? { scheduled: 'bg-primary/10 ring-1 ring-inset ring-primary/30' } : undefined}
              onDayClick={(day) => {
                onSelectDay(day);
                if (!isSameMonth(day, month)) onMonthChange(day);
                if (
                  canCreate &&
                  day >= today &&
                  !byDay.has(scheduleDayKey(day))
                )
                  onCreate(day);
              }}
              labels={{
                labelDay: (day) => {
                  const count = byDay.get(scheduleDayKey(day))?.length ?? 0;
                  return `${day.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${isSameDay(day, today) ? ", heute" : ""} · ${count ? `${count} ${count === 1 ? "Termin" : "Termine"} anzeigen` : day >= today && canCreate ? "Termin hinzufügen" : "Keine Termine"}`;
                },
              }}
              components={{ Day: ScheduleDay, DayContent: ScheduleDayContent }}
              classNames={{
                months: "w-full",
                month: "w-full",
                caption: "sr-only",
                nav: "hidden",
                table: "w-full table-fixed border-collapse",
                head_row: "grid grid-cols-7",
                head_cell: `${compact ? 'py-1' : 'py-2'} text-center text-xs font-normal text-muted-foreground`,
                tbody: "block",
                row: "grid grid-cols-7 gap-y-1",
                cell: "min-w-0 p-0 text-center",
                day: compact
                  ? "flex h-11 min-h-11 w-full min-w-0 flex-col items-center justify-center rounded-kws-control px-1 text-center text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring xl:h-16"
                  : "flex h-14 min-h-11 w-full min-w-0 flex-col justify-start rounded-kws-control px-1 pt-2 text-center text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:h-20",
                day_today: compact
                  ? "underline decoration-foreground decoration-2 underline-offset-4"
                  : "underline decoration-primary decoration-2 underline-offset-4",
                day_selected: compact
                  ? "!bg-primary-strong text-primary-foreground ring-2 ring-inset ring-foreground/70"
                  : "!bg-primary/15 ring-1 ring-inset ring-primary-ink text-foreground",
                day_outside: "text-muted-foreground",
                day_hidden: "invisible",
              }}
            />
          </CompactCalendar.Provider></CalendarEntries.Provider>
          {compact ? <div aria-label="Kalenderlegende" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 border-b-2 border-foreground" />Heute</span>
            <span className="flex items-center gap-1"><CalendarDays aria-hidden="true" className="h-3 w-3 text-primary-ink" />Schraubtag</span>
            <span className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 rounded-kws-badge bg-primary-strong ring-1 ring-inset ring-foreground/70" />Ausgewählt</span>
          </div> : <p className="mt-3 text-xs text-muted-foreground">
            {readOnly ? 'Tag wählen · Schraubtermine ansehen' : 'Tag wählen · Termine ansehen oder hinzufügen'}
          </p>}
        </SetterSurface>
      </div>
      <section aria-label={readOnly ? 'Schraubtermine am ausgewählten Tag' : 'Tagesplanung'} className={compact ? 'min-w-0 space-y-2' : 'min-w-0 space-y-3'}>
        <div>
          <h2 className="text-base font-semibold">
            {selectedDayLabel ?? selectedDay.toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          {selectedDaySubtitle ? <p className="mt-1 text-xs text-muted-foreground">{selectedDaySubtitle}</p> : !compact && <p className="mt-1 text-xs text-muted-foreground">
            {!readOnly && selectedDay < today ? "Vergangene Termine" : "Schraubtermine"}
          </p>}
        </div>
        {children}
        {!readOnly && selectedDay >= today && (
          <Button
            disabled={!canCreate}
            variant="secondary"
            className="w-full"
            onClick={() => onCreate(selectedDay)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Termin hinzufügen
          </Button>
        )}
        {!readOnly && !canCreate && (
          <p className="text-xs text-muted-foreground">
            Zum Planen muss zuerst ein Teilbereich angelegt werden.
          </p>
        )}
      </section>
    </div>
  );
}
