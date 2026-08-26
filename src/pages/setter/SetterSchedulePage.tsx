import { useMemo, useState } from 'react';
import { CalendarPlus, Check, Loader2, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { HallMapView } from '@/components/HallMapView';
import { SetterSurface } from '@/components/setter/SetterWorkspaceShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBouldersWithSectors } from '@/hooks/useBoulders';
import {
  useCreateSectorScheduleGroup,
  useDeleteSectorScheduleGroup,
  useSectorSchedule,
} from '@/hooks/useSectorSchedule';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { groupSectorsByArea } from '@/lib/sectorAreas';
import { cn } from '@/lib/utils';

import { combineDateAndTime } from './setterPageUtils';

const SetterSchedulePage = () => {
  const { data: sectors = [] } = useSectorsTransformed();
  const { data: boulders = [] } = useBouldersWithSectors();
  const { data: schedule, isLoading } = useSectorSchedule();
  const createScheduleGroup = useCreateSectorScheduleGroup();
  const deleteScheduleGroup = useDeleteSectorScheduleGroup();

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

  const areaGroups = useMemo(() => groupSectorsByArea(sectors), [sectors]);

  const filteredSectors = useMemo(() => {
    const query = sectorSearch.trim().toLowerCase();
    if (!query) return sectors;
    return sectors.filter((sector) =>
      sector.name.toLowerCase().includes(query)
      || sector.legacyName?.toLowerCase().includes(query),
    );
  }, [sectorSearch, sectors]);

  const filteredAreaGroups = useMemo(
    () => {
      const visibleSectorIds = new Set(filteredSectors.map((sector) => sector.id));
      return areaGroups
        .map((areaGroup) => ({
          ...areaGroup,
          sectors: areaGroup.sectors.filter((sector) => visibleSectorIds.has(sector.id)),
          subareas: areaGroup.subareas.filter((subarea) =>
            subarea.sectorIds.some((sectorId) => visibleSectorIds.has(sectorId)),
          ),
        }))
        .filter((areaGroup) => areaGroup.subareas.length > 0);
    },
    [areaGroups, filteredSectors],
  );

  const selectedSubareas = useMemo(
    () => areaGroups.flatMap((areaGroup) => areaGroup.subareas)
      .filter((subarea) => subarea.sectorIds.some((sectorId) => selectedSectorIds.has(sectorId))),
    [areaGroups, selectedSectorIds],
  );

  const resetDialog = () => {
    setDialogOpen(false);
    setSectorSearch('');
    setSelectedSectorIds(new Set());
    setScheduleDate('');
    setScheduleTime('');
  };

  const toggleSectorIds = (sectorIds: readonly string[]) => {
    setSelectedSectorIds((current) => {
      const next = new Set(current);
      const allSelected = sectorIds.every((sectorId) => next.has(sectorId));

      if (allSelected) {
        sectorIds.forEach((sectorId) => next.delete(sectorId));
      } else {
        sectorIds.forEach((sectorId) => next.add(sectorId));
      }
      return next;
    });
  };

  const toggleSector = (sectorId: string) => {
    const matchingSubarea = areaGroups
      .flatMap((areaGroup) => areaGroup.subareas)
      .find((subarea) => subarea.sectorIds.includes(sectorId));

    toggleSectorIds(matchingSubarea?.sectorIds ?? [sectorId]);
  };

  const handleCreateSchedule = async () => {
    if (selectedSectorIds.size === 0 || !scheduleDate || !scheduleTime) {
      return;
    }

    const localDate = new Date(scheduleDate);
    const scheduledAt = combineDateAndTime(localDate, scheduleTime).toISOString();

    try {
      await createScheduleGroup.mutateAsync({
        sectorIds: Array.from(selectedSectorIds),
        scheduledAt,
        note: null,
      });

      toast.success(
        `${selectedSubareas.length} ${selectedSubareas.length === 1 ? 'Teilbereich' : 'Teilbereiche'} erfolgreich geplant.`,
      );
      resetDialog();
    } catch (error) {
      toast.error('Fehler beim Erstellen der Termine');
      console.error('[SetterSchedulePage] create schedule failed', error);
    }
  };

  const handleDeleteSchedule = async (ids: string[]) => {
    if (!window.confirm(ids.length === 1 ? 'Diesen Termin wirklich löschen?' : 'Diesen Terminblock wirklich löschen?')) {
      return;
    }

    try {
      await deleteScheduleGroup.mutateAsync(ids);
      toast.success(ids.length === 1 ? 'Termin gelöscht' : 'Terminblock gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen des Termins');
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
          const displayItems = Array.from(
            group.items.reduce<Map<string, { key: string; ids: string[]; scheduledAt: string; sectorName: string }>>(
              (clusters, item) => {
                const sectorName = sectors.find((sector) => sector.id === item.sector_id)?.name ?? 'Unbekannter Teilbereich';
                const key = `${item.scheduled_at}:${sectorName}`;
                const existing = clusters.get(key);

                if (existing) {
                  existing.ids.push(item.id);
                } else {
                  clusters.set(key, {
                    key,
                    ids: [item.id],
                    scheduledAt: item.scheduled_at,
                    sectorName,
                  });
                }

                return clusters;
              },
              new Map(),
            ).values(),
          ).sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());

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
                  {displayItems.map((item) => {
                    const time = new Date(item.scheduledAt).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={item.key}
                        className={cn(
                          'flex items-center justify-between gap-4 px-4 py-4 sm:px-5',
                          muted && 'opacity-60',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-[-0.02em] text-[#13112B]">{time}</p>
                          <p className="truncate text-sm text-[#13112B]/60">{item.sectorName}</p>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl text-[#B64332] hover:bg-[#FFF4F2] hover:text-[#B64332]"
                          onClick={() => handleDeleteSchedule(item.ids)}
                            disabled={deleteScheduleGroup.isPending}
                          >
                            {deleteScheduleGroup.isPending ? (
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
                1. Bereiche
              </p>

              <div className="space-y-2">
                <Label htmlFor="schedule-sector-search">Bereich suchen</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/40" />
                  <Input
                    id="schedule-sector-search"
                    placeholder="Zum Beispiel Bug oder A..."
                    value={sectorSearch}
                    onChange={(event) => setSectorSearch(event.target.value)}
                    className="h-10 rounded-xl border-none bg-[#F3F6F3] pl-10 pr-4 text-sm text-[#13112B] shadow-none placeholder:text-[#13112B]/42 focus-visible:ring-2 focus-visible:ring-[#69B545]/35"
                  />
                </div>

                {filteredAreaGroups.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {filteredAreaGroups.map((areaGroup) => {
                      const visibleSectorIds = areaGroup.subareas.flatMap((subarea) => subarea.sectorIds);
                      const allAreaSectorsSelected = visibleSectorIds.length > 0
                        && visibleSectorIds.every((sectorId) => selectedSectorIds.has(sectorId));

                      return (
                        <div
                          key={areaGroup.area.slug}
                          className="rounded-2xl border border-[#DDE7DF] bg-[#FCFDFC] p-3.5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-heading text-xl uppercase tracking-[0.02em] text-[#13112B]">
                                {areaGroup.area.name}
                              </p>
                              <p className="text-xs text-[#6E806A]">
                                Teilbereiche einzeln wählen
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleSectorIds(visibleSectorIds)}
                              className={cn(
                                'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                                allAreaSectorsSelected
                                  ? 'border-[#69B545] bg-[#EAF7E7] text-[#2D702D]'
                                  : 'border-[#DDE7DF] bg-white text-[#13112B]/65 hover:bg-[#F4F8F4]',
                              )}
                            >
                              {allAreaSectorsSelected ? 'Alle gewählt' : 'Alle'}
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {areaGroup.subareas.map((subarea) => {
                              const selected = subarea.sectorIds.every((sectorId) => selectedSectorIds.has(sectorId));
                              return (
                                <button
                                  key={`${areaGroup.area.slug}-${subarea.code}`}
                                  type="button"
                                  onClick={() => toggleSectorIds(subarea.sectorIds)}
                                  aria-pressed={selected}
                                  aria-label={`${subarea.name} ${selected ? 'abwählen' : 'auswählen'}`}
                                  className={cn(
                                    'flex min-h-12 items-center justify-center rounded-xl border font-heading text-xl transition-all',
                                    selected
                                      ? 'border-[#69B545] bg-[#69B545] text-white shadow-[0_8px_20px_rgba(105,181,69,0.22)]'
                                      : 'border-[#DDE7DF] bg-white text-[#13112B] hover:border-[#9AC98B] hover:bg-[#F4F8F4]',
                                  )}
                                >
                                  {subarea.code}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {filteredSectors.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <Label>Auf der Hallenkarte</Label>
                    <div className="overflow-hidden rounded-2xl border border-[#DDE7DF] bg-white p-1.5 shadow-[0_8px_24px_rgba(19,17,43,0.05)]">
                      <HallMapView
                        sectors={filteredSectors}
                        countsBySectorId={sectorCountsById}
                        boulderSectorReferences={boulders}
                        selectedSectorIds={Array.from(selectedSectorIds)}
                        onSelectSectorId={toggleSector}
                        onClearSector={() => setSelectedSectorIds(new Set())}
                        compact
                        frameless
                        lockAspectRatio={false}
                        viewportClassName="h-[240px] sm:h-[280px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFDFC] px-4 py-5 text-sm text-[#13112B]/58">
                    Kein Bereich zur Suche gefunden.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{'Ausgewählte Teilbereiche'}</Label>
                {selectedSectorIds.size > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSubareas.map((subarea) => (
                        <button
                          key={subarea.name}
                          type="button"
                          onClick={() => toggleSectorIds(subarea.sectorIds)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#DDE7DF] bg-white px-3 py-2 text-sm font-medium text-[#13112B] transition-colors hover:bg-[#F4F8F4]"
                        >
                          {subarea.name}
                          <X className="h-3.5 w-3.5 text-[#13112B]/55" />
                        </button>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#13112B]/58">{'Noch keine Teilbereiche ausgewählt.'}</p>
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
                disabled={selectedSectorIds.size === 0 || !scheduleDate || !scheduleTime || createScheduleGroup.isPending}
              >
                {createScheduleGroup.isPending ? (
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
