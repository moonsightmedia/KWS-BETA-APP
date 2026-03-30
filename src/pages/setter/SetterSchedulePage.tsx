import { useMemo, useState } from 'react';
import { CalendarPlus, Check, Loader2, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { HallMapView } from '@/components/HallMapView';
import { SetterSurface } from '@/components/setter/SetterWorkspaceShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSectorSchedule, useDeleteSectorSchedule, useSectorSchedule } from '@/hooks/useSectorSchedule';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';

import { combineDateAndTime } from './setterPageUtils';

const SetterSchedulePage = () => {
  const { data: sectors = [] } = useSectorsTransformed();
  const { data: schedule, isLoading } = useSectorSchedule();
  const createSchedule = useCreateSectorSchedule();
  const deleteSchedule = useDeleteSectorSchedule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const [selectedSectorIds, setSelectedSectorIds] = useState<Set<string>>(new Set());
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const groupedSchedule = useMemo(() => {
    const entries = new Map<string, NonNullable<typeof schedule>>();

    (schedule ?? []).forEach((item) => {
      const dateKey = new Date(item.scheduled_at).toDateString();
      const current = entries.get(dateKey) ?? [];
      current.push(item);
      entries.set(dateKey, current);
    });

    return Array.from(entries.entries())
      .map(([dateKey, items]) => ({
        date: new Date(dateKey),
        items: [...items].sort(
          (left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
        ),
      }))
      .sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [schedule]);

  const { upcomingGroups, pastGroups } = useMemo(() => {
    const now = new Date();
    const upcoming: typeof groupedSchedule = [];
    const past: typeof groupedSchedule = [];

    groupedSchedule.forEach((group) => {
      const isPast = group.date < now && group.date.toDateString() !== now.toDateString();
      if (isPast) {
        past.push(group);
      } else {
        upcoming.push(group);
      }
    });

    return { upcomingGroups: upcoming, pastGroups: past };
  }, [groupedSchedule]);

  const sectorCountsById = useMemo(
    () =>
      sectors.reduce<Record<string, number>>((accumulator, sector) => {
        accumulator[sector.id] = sector.boulderCount ?? 0;
        return accumulator;
      }, {}),
    [sectors],
  );

  const filteredSectors = useMemo(() => {
    const query = sectorSearch.trim().toLowerCase();
    if (!query) return sectors;
    return sectors.filter((sector) => sector.name.toLowerCase().includes(query));
  }, [sectorSearch, sectors]);

  const selectedSectorNames = useMemo(
    () =>
      sectors
        .filter((sector) => selectedSectorIds.has(sector.id))
        .map((sector) => sector.name),
    [sectors, selectedSectorIds],
  );

  const resetDialog = () => {
    setDialogOpen(false);
    setSectorSearch('');
    setSelectedSectorIds(new Set());
    setScheduleDate('');
    setScheduleTime('');
  };

  const toggleSector = (sectorName: string) => {
    const sector = sectors.find((entry) => entry.name === sectorName);
    if (!sector) return;

    setSelectedSectorIds((current) => {
      const next = new Set(current);
      if (next.has(sector.id)) {
        next.delete(sector.id);
      } else {
        next.add(sector.id);
      }
      return next;
    });
  };

  const removeSelectedSector = (sectorId: string) => {
    setSelectedSectorIds((current) => {
      const next = new Set(current);
      next.delete(sectorId);
      return next;
    });
  };

  const handleCreateSchedule = async () => {
    if (selectedSectorIds.size === 0 || !scheduleDate || !scheduleTime) {
      return;
    }

    const localDate = new Date(scheduleDate);
    const scheduledAt = combineDateAndTime(localDate, scheduleTime).toISOString();

    try {
      await Promise.all(
        Array.from(selectedSectorIds).map((sectorId) =>
          createSchedule.mutateAsync({
            sector_id: sectorId,
            scheduled_at: scheduledAt,
            note: null,
          } as any),
        ),
      );

      toast.success(
        `${selectedSectorIds.size} ${selectedSectorIds.size === 1 ? 'Termin' : 'Termine'} erfolgreich erstellt.`,
      );
      resetDialog();
    } catch (error) {
      toast.error('Fehler beim Erstellen der Termine');
      console.error('[SetterSchedulePage] create schedule failed', error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Diesen Termin wirklich l\u00F6schen?')) {
      return;
    }

    try {
      await deleteSchedule.mutateAsync(id);
      toast.success('Termin gel\u00F6scht');
    } catch (error) {
      toast.error('Fehler beim L\u00F6schen des Termins');
      console.error('[SetterSchedulePage] delete schedule failed', error);
    }
  };

  const renderGroup = (title: string | null, groups: typeof groupedSchedule, muted: boolean) => {
    if (groups.length === 0) return null;

    return (
      <div className="space-y-4">
        {title ? (
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6E806A]">
            {title}
          </p>
        ) : null}

        {groups.map((group) => {
          const isToday = group.date.toDateString() === new Date().toDateString();

          return (
            <div key={group.date.toISOString()} className="space-y-2">
              <p
                className={cn(
                  'px-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  muted ? 'text-[#13112B]/42' : 'text-[#6E806A]',
                )}
              >
                {isToday
                  ? 'Heute'
                  : group.date.toLocaleDateString('de-DE', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
              </p>

              <SetterSurface className="overflow-hidden p-0">
                <div className="divide-y divide-[#E7F0E8]">
                  {group.items.map((item) => {
                    const sectorName =
                      sectors.find((sector) => sector.id === item.sector_id)?.name ?? 'Unbekannter Sektor';
                    const time = new Date(item.scheduled_at).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-4 px-4 py-4 sm:px-5',
                          muted && 'opacity-60',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-[-0.02em] text-[#13112B]">{time}</p>
                          <p className="truncate text-sm text-[#13112B]/60">{sectorName}</p>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl text-[#B64332] hover:bg-[#FFF4F2] hover:text-[#B64332]"
                          onClick={() => handleDeleteSchedule(item.id)}
                          disabled={deleteSchedule.isPending}
                        >
                          {deleteSchedule.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </SetterSurface>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-5 pb-32">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6E806A]">
            {schedule?.length ?? 0} geplante Termine
          </p>
          <Button
            type="button"
            className="h-10 gap-2 rounded-xl bg-[#69B545] px-4 text-white hover:bg-[#5FA039]"
            onClick={() => setDialogOpen(true)}
          >
            <CalendarPlus className="h-4 w-4" />
            Neuer Termin
          </Button>
        </div>

        {isLoading ? (
          <SetterSurface className="py-12 text-center text-sm text-[#13112B]/60">
            Termine werden geladen...
          </SetterSurface>
        ) : groupedSchedule.length === 0 ? (
          <SetterSurface className="space-y-4 py-10 text-center">
            <div className="space-y-2">
              <p className="text-lg font-semibold tracking-[-0.03em] text-[#13112B]">
                Noch keine Schraubtermine geplant.
              </p>
              <p className="text-sm text-[#13112B]/58">
                Lege den ersten Termin an, um die Planung direkt in Tagesclustern zu sehen.
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                className="h-10 gap-2 rounded-xl bg-[#69B545] px-4 text-white hover:bg-[#5FA039]"
                onClick={() => setDialogOpen(true)}
              >
                <CalendarPlus className="h-4 w-4" />
                Neuer Termin
              </Button>
            </div>
          </SetterSurface>
        ) : (
          <div className="space-y-6">
            {renderGroup(null, upcomingGroups, false)}
            {renderGroup('Vergangene Termine', pastGroups, true)}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-white p-0 shadow-none sm:h-[90vh] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-[#DDE7DF] sm:shadow-[0_18px_45px_rgba(19,17,43,0.12)]">
          <div className="shrink-0 border-b border-[#E7F0E8] bg-white px-4 py-4 sm:px-6">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-[#13112B]">Neuer Termin</DialogTitle>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <section className="space-y-4 pb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                1. Sektoren
              </p>

              <div className="space-y-2">
                <Label htmlFor="schedule-sector-search">Sektoren</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/40" />
                  <Input
                    id="schedule-sector-search"
                    placeholder="Sektoren suchen..."
                    value={sectorSearch}
                    onChange={(event) => setSectorSearch(event.target.value)}
                    className="h-10 rounded-xl border-none bg-[#F3F6F3] pl-10 pr-4 text-sm text-[#13112B] shadow-none placeholder:text-[#13112B]/42 focus-visible:ring-2 focus-visible:ring-[#69B545]/35"
                  />
                </div>

                {filteredSectors.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white p-1.5 shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
                    <HallMapView
                      sectors={filteredSectors}
                      countsBySectorId={sectorCountsById}
                      selectedSectorNames={selectedSectorNames}
                      onSelectSector={toggleSector}
                      onClearSector={() => setSelectedSectorIds(new Set())}
                      compact
                      frameless
                      lockAspectRatio={false}
                      viewportClassName="h-[240px] sm:h-[280px]"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFDFC] px-4 py-5 text-sm text-[#13112B]/58">
                    Kein Sektor zur Suche gefunden.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{'Ausgew\u00E4hlte Sektoren'}</Label>
                {selectedSectorIds.size > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sectors
                      .filter((sector) => selectedSectorIds.has(sector.id))
                      .map((sector) => (
                        <button
                          key={sector.id}
                          type="button"
                          onClick={() => removeSelectedSector(sector.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#DDE7DF] bg-white px-3 py-2 text-sm font-medium text-[#13112B] transition-colors hover:bg-[#F4F8F4]"
                        >
                          {sector.name}
                          <X className="h-3.5 w-3.5 text-[#13112B]/55" />
                        </button>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#13112B]/58">{'Noch keine Sektoren ausgew\u00E4hlt.'}</p>
                )}
              </div>
            </section>

            <section className="space-y-4 border-t border-[#E7F0E8] py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                2. Termin
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="setter-schedule-date">Datum</Label>
                  <Input
                    id="setter-schedule-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    className="h-11 rounded-xl border-[#DDE7DF]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setter-schedule-time">Uhrzeit</Label>
                  <Input
                    id="setter-schedule-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                    className="h-11 rounded-xl border-[#DDE7DF]"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-[#E7F0E8] bg-white px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-[#DDE7DF] bg-white sm:flex-1"
                onClick={resetDialog}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#69B545] px-5 text-white hover:bg-[#5FA039] sm:flex-1"
                onClick={handleCreateSchedule}
                disabled={selectedSectorIds.size === 0 || !scheduleDate || !scheduleTime || createSchedule.isPending}
              >
                {createSchedule.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Termine erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SetterSchedulePage;
