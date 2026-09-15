import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { CalendarPlus, Loader2, Map as MapIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { HallMapView } from "@/components/HallMapView";
import { SetterSurface } from "@/components/setter/SetterWorkspaceShell";
import {
  SetterConfirm,
  SetterSearch,
  SetterState,
} from "@/components/setter/SetterControls";
import { SetterDateField } from "@/components/setter/SetterDateField";
import { SetterScheduleCalendar } from "@/components/setter/SetterScheduleCalendar";
import { scheduleDayKey, type SetterAppointment } from "@/lib/setterSchedule";
import { KwsSegmentedControl } from "@/components/ui/kws-segmented-control";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBouldersWithSectors } from "@/hooks/useBoulders";
import {
  useCreateSectorScheduleGroup,
  useDeleteSectorScheduleGroup,
  useSectorSchedule,
} from "@/hooks/useSectorSchedule";
import { useSectorsTransformed } from "@/hooks/useSectors";
import { groupSectorsByArea } from "@/lib/sectorAreas";
import { cn } from "@/lib/utils";
import { combineDateAndTime } from "./setterPageUtils";

type Appointment = SetterAppointment;
export default function SetterSchedulePage() {
  const queryClient = useQueryClient();
  const sectorQuery = useSectorsTransformed();
  const { data: sectors = [] } = sectorQuery;
  const { data: boulders = [] } = useBouldersWithSectors();
  const scheduleQuery = useSectorSchedule();
  const create = useCreateSectorScheduleGroup();
  const remove = useDeleteSectorScheduleGroup();
  const [period, setPeriod] = useState("upcoming");
  const [view, setView] = useState("calendar");
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("18:00");
  const [mapOpen, setMapOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const initialDate = useRef<number>();
  const opener = useRef<HTMLElement | null>(null);
  const areaGroups = useMemo(() => groupSectorsByArea(sectors), [sectors]);
  const chosenSubareas = areaGroups
    .flatMap((g) => g.subareas)
    .filter((s) => s.sectorIds.some((id) => selected.has(id)));
  const filteredGroups = areaGroups
    .map((g) => ({
      ...g,
      subareas: g.subareas.filter((s) =>
        [
          s.name,
          ...sectors
            .filter((sector) => s.sectorIds.includes(sector.id))
            .map((sector) => sector.legacyName),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    }))
    .filter((g) => g.subareas.length);
  const appointments = useMemo(() => {
    const entries = new Map<string, Appointment>();
    for (const item of scheduleQuery.data ?? []) {
      const sectorName =
        sectors.find((s) => s.id === item.sector_id)?.name ??
        "Unbekannter Teilbereich";
      const scheduledDate = new Date(item.scheduled_at);
      const key = scheduledDate.getTime() + ":" + sectorName;
      const current = entries.get(key) ?? {
        ids: [],
        sectorName,
        date: scheduledDate,
      };
      current.ids.push(item.id);
      entries.set(key, current);
    }
    return [...entries.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [scheduleQuery.data, sectors]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = appointments.filter((a) => a.date >= today);
  const past = appointments.filter((a) => a.date < today).reverse();
  const shown = period === "upcoming" ? upcoming : past;
  const groups = new Map<string, Appointment[]>();
  shown.forEach((a) => {
    const key = a.date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    groups.set(key, [...(groups.get(key) ?? []), a]);
  });
  const busy = create.isPending;
  const loading = scheduleQuery.isLoading || sectorQuery.isLoading;
  const failed = scheduleQuery.isError || Boolean(sectorQuery.error);
  const dayAppointments = appointments.filter(
    (a) => scheduleDayKey(a.date) === scheduleDayKey(selectedDay),
  );
  const openCreate = (day?: Date) => {
    initialDate.current = day?.getTime();
    setDate(day);
    setOpen(true);
  };
  const reset = () => {
    setOpen(false);
    setSearch("");
    setSelected(new Set());
    setDate(undefined);
    setTime("18:00");
    setMapOpen(false);
    setError("");
  };
  const close = () => {
    if (busy || lock.current) return;
    if (
      selected.size ||
      date?.getTime() !== initialDate.current ||
      time !== "18:00"
    )
      setDiscard(true);
    else reset();
  };
  const toggle = (ids: readonly string[]) => {
    if (busy || lock.current) return;
    setSelected((current) => {
      const next = new Set(current);
      const all = ids.every((id) => next.has(id));
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  };
  const submit = async () => {
    if (lock.current || busy) return;
    setError("");
    if (!selected.size || !date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError(
        "Bitte Teilbereiche, Datum und eine Uhrzeit im Format 18:00 wählen.",
      );
      return;
    }
    const scheduled = combineDateAndTime(date, time);
    if (
      scheduled < new Date() ||
      scheduled.getHours() !== Number(time.split(":")[0])
    ) {
      setError("Bitte einen gültigen zukünftigen Zeitpunkt wählen.");
      return;
    }
    lock.current = true;
    try {
      await create.mutateAsync({
        sectorIds: [...selected],
        scheduledAt: scheduled.toISOString(),
        note: null,
      });
      toast.success(`${chosenSubareas.length} ${chosenSubareas.length === 1 ? 'Teilbereich' : 'Teilbereiche'} eingeplant.`);
      const savedDay = new Date(scheduled);
      savedDay.setHours(0, 0, 0, 0);
      setSelectedDay(savedDay);
      setMonth(savedDay);
      reset();
      setPeriod("upcoming");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Der Termin konnte nicht gespeichert werden.",
      );
    } finally {
      lock.current = false;
    }
  };
  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <KwsSegmentedControl
            value={view}
            onValueChange={setView}
            options={[
              { value: "calendar", label: "Kalender" },
              { value: "list", label: "Liste" },
            ]}
            ariaLabel="Planungsansicht"
          />
          <Button
            disabled={loading || failed || !sectors.length}
            onClick={() => openCreate()}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Neuer Termin
          </Button>
        </div>
        {view === "list" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant={period === "upcoming" ? "default" : "secondary"}
                aria-pressed={period === "upcoming"}
                onClick={() => setPeriod("upcoming")}
              >
                Anstehend
              </Button>
              <Button
                variant={period === "past" ? "default" : "secondary"}
                aria-pressed={period === "past"}
                onClick={() => setPeriod("past")}
              >
                Vergangen
              </Button>
            </div>
            {!loading && !failed && (
              <p className="text-sm text-muted-foreground" role="status">
                {shown.length} {shown.length === 1 ? "Termin" : "Termine"} ·{" "}
                {groups.size} {groups.size === 1 ? "Tag" : "Tage"}
              </p>
            )}
          </div>
        )}
        {loading ? (
          <SetterState loading title="Planung wird geladen …" />
        ) : failed ? (
          <SetterState
            title="Planung konnte nicht geladen werden."
            retrying={scheduleQuery.isFetching || sectorQuery.isFetching}
            onRetry={() => {
              void scheduleQuery.refetch();
              void queryClient.refetchQueries({ queryKey: ["sectors"] });
            }}
          />
        ) : view === "calendar" ? (
          <SetterScheduleCalendar
            appointments={appointments}
            month={month}
            selectedDay={selectedDay}
            canCreate={sectors.length > 0}
            onMonthChange={(next) => {
              setMonth(next);
              setSelectedDay(next);
            }}
            onSelectDay={setSelectedDay}
            onCreate={openCreate}
          >
            {dayAppointments.length ? (
              <AppointmentList
                items={dayAppointments}
                busy={remove.isPending}
                onDelete={setDeleting}
              />
            ) : (
              <p className="rounded-kws-control bg-secondary p-4 text-sm text-muted-foreground">
                Keine Termine an diesem Tag.
              </p>
            )}
          </SetterScheduleCalendar>
        ) : !shown.length ? (
          <SetterState
            title={
              period === "upcoming"
                ? "Keine anstehenden Schraubtermine"
                : "Keine vergangenen Termine"
            }
            description={
              period === "upcoming"
                ? "Plane einen Termin für einen oder mehrere Teilbereiche."
                : undefined
            }
          />
        ) : (
          [...groups.entries()].map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-sm font-semibold">{day}</h2>
              <AppointmentList
                items={items}
                busy={remove.isPending}
                onDelete={setDeleting}
              />
            </section>
          ))
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          scrollLayout="contained"
          className="flex h-[min(90dvh,820px)] flex-col overflow-hidden p-0 md:!max-w-2xl"
          aria-busy={busy}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <DialogTitle>Neuer Termin</DialogTitle>
              <DialogDescription className="sr-only">
                Zeitpunkt und Teilbereiche für den Schraubtermin wählen.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="Terminplanung schließen"
              onClick={close}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6">
            <fieldset disabled={busy} className="min-w-0 space-y-5">
              {error && (
                <p
                  role="alert"
                  className="rounded-kws-control bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="setter-schedule-date">Datum</Label>
                  <SetterDateField
                    value={date}
                    onChange={setDate}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setter-schedule-time">Uhrzeit</Label>
                  <Input
                    id="setter-schedule-time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    inputMode="text"
                    placeholder="18:00"
                    maxLength={5}
                  />
                </div>
              </div>
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Teilbereiche</h3>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    aria-expanded={mapOpen}
                    onClick={() => setMapOpen((v) => !v)}
                  >
                    <MapIcon className="mr-2 h-4 w-4" />
                    Karte
                  </Button>
                </div>
                <SetterSearch
                  label="Teilbereich suchen"
                  value={search}
                  onChange={setSearch}
                  disabled={busy}
                />
                {mapOpen && (
                  <HallMapView
                    sectors={sectors}
                    countsBySectorId={Object.fromEntries(
                      sectors.map((s) => [s.id, s.boulderCount ?? 0]),
                    )}
                    boulderSectorReferences={boulders}
                    selectedSectorIds={[...selected]}
                    onSelectSectorId={(id) =>
                      toggle(
                        areaGroups
                          .flatMap((g) => g.subareas)
                          .find((s) => s.sectorIds.includes(id))?.sectorIds ?? [
                          id,
                        ],
                      )
                    }
                    onClearSector={() => {
                      if (!busy) setSelected(new Set());
                    }}
                    compact
                    frameless
                    lockAspectRatio={false}
                    viewportClassName="h-[240px]"
                  />
                )}
                {filteredGroups.map((group) => {
                  const ids = group.subareas.flatMap((s) => s.sectorIds);
                  const all = ids.every((id) => selected.has(id));
                  return (
                    <section key={group.area.slug} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          {group.area.name}
                        </h4>
                        <Button
                          variant="ghost"
                          aria-label={`${group.area.name} komplett ${all ? "abwählen" : "auswählen"}`}
                          onClick={() => toggle(ids)}
                        >
                          {all ? "Auswahl lösen" : "Alle wählen"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {group.subareas.map((s) => (
                          <button
                            key={s.code}
                            type="button"
                            aria-pressed={s.sectorIds.every((id) =>
                              selected.has(id),
                            )}
                            aria-label={s.name}
                            onClick={() => toggle(s.sectorIds)}
                            className={cn(
                              "grid min-h-11 place-items-center rounded-kws-control px-2 text-sm font-semibold",
                              s.sectorIds.every((id) => selected.has(id))
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/70",
                            )}
                          >
                            {s.code}
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!filteredGroups.length && (
                  <p className="py-4 text-sm text-muted-foreground">
                    Keine Teilbereiche gefunden.
                  </p>
                )}
              </section>
            </fieldset>
          </div>
          <footer className="shrink-0 space-y-3 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <p className="text-xs text-muted-foreground" role="status">
              {chosenSubareas.length} {chosenSubareas.length === 1 ? 'Teilbereich' : 'Teilbereiche'} ausgewählt
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" disabled={busy} onClick={close}>
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {busy ? "Wird gespeichert …" : "Termin erstellen"}
              </Button>
            </div>
          </footer>
        </DialogContent>
      </Dialog>
      <SetterConfirm
        open={discard}
        onOpenChange={setDiscard}
        title="Termin verwerfen?"
        description="Deine Auswahl wurde noch nicht gespeichert."
        confirmLabel="Verwerfen"
        onConfirm={() => {
          setDiscard(false);
          reset();
        }}
      />
      <SetterConfirm
        open={!!deleting}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Termin löschen?"
        description={`${deleting?.sectorName ?? ""} · ${deleting?.date.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) ?? ""}. Nur der Termin wird entfernt, keine Boulder.`}
        onConfirm={async () => {
          if (deleting) {
            await remove.mutateAsync(deleting.ids);
            toast.success("Termin gelöscht.");
          }
        }}
      />
    </>
  );
}

function AppointmentList({
  items,
  busy,
  onDelete,
}: {
  items: Appointment[];
  busy: boolean;
  onDelete: (item: Appointment) => void;
}) {
  return (
    <SetterSurface className="overflow-hidden p-0 sm:p-0">
      <div className="divide-y divide-border/60">
        {items.map((item) => (
          <article
            key={item.ids.join(",")}
            className="flex items-center gap-3 px-3 py-3"
          >
            <time
              dateTime={item.date.toISOString()}
              className="shrink-0 text-sm font-semibold tabular-nums"
            >
              {item.date.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <p className="min-w-0 flex-1 break-words text-sm font-semibold">
              {item.sectorName}
            </p>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label={`Termin ${item.sectorName} löschen`}
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </article>
        ))}
      </div>
    </SetterSurface>
  );
}
