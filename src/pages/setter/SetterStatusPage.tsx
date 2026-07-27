import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, MinusCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { HallMapView } from '@/components/HallMapView';
import { SetterSurface } from '@/components/setter/SetterWorkspaceShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useBouldersWithSectors, useBulkUpdateBoulderStatus } from '@/hooks/useBoulders';
import { useColors } from '@/hooks/useColors';
import { useSectorsTransformed } from '@/hooks/useSectors';
import { cn } from '@/lib/utils';
import type { Boulder } from '@/types/boulder';
import { getColorBackgroundStyle } from '@/utils/colorUtils';

import { formatDifficulty, getTextClassForHex, getThumbnailUrl } from './setterPageUtils';

type BoulderStatus = 'haengt' | 'abgeschraubt';
type StatusFilter = 'all' | BoulderStatus;
type SelectionBehavior = 'keep' | 'remove' | 'clear';

type SectorGroup = {
  id: string;
  name: string;
  allBoulders: Boulder[];
  visibleBoulders: Boulder[];
  hangingIds: string[];
  offIds: string[];
  hangingCount: number;
  offCount: number;
  crossSectorCount: number;
};

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'haengt', label: 'Hängt' },
  { value: 'abgeschraubt', label: 'Abgeschraubt' },
];

const sectionEyebrowClassName =
  'text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground';
const surfaceShadowClassName = 'shadow-[0_8px_24px_rgba(19,17,43,0.05)]';
const controlButtonBaseClassName =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors';
const controlButtonInactiveClassName =
  'border-border bg-card text-foreground hover:bg-secondary';
const controlButtonSelectedNeutralClassName =
  'border-border bg-secondary text-foreground hover:bg-secondary/90';
const controlButtonPositiveClassName =
  'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15';
const controlButtonDestructiveClassName =
  'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15';
const statusFilterButtonClassName =
  'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold leading-4 transition-colors';
const actionButtonBaseClassName =
  'h-auto min-h-11 w-full justify-center rounded-xl px-4 py-3 text-sm leading-4 whitespace-normal';
const statusChipBaseClassName =
  'inline-flex min-h-7 items-center whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold leading-none';
const metaChipClassName = 'border-border bg-secondary/55 text-muted-foreground';
const neutralChipClassName = 'border-border bg-secondary/45 text-foreground';
const positiveChipClassName = 'border-primary/15 bg-primary/[0.08] text-primary';
const destructiveChipClassName = 'border-destructive/15 bg-destructive/[0.08] text-destructive';

const getStatusFilterButtonClassName = (value: StatusFilter, isActive: boolean) => {
  if (!isActive) {
    return controlButtonInactiveClassName;
  }

  if (value === 'haengt') {
    return controlButtonPositiveClassName;
  }

  if (value === 'abgeschraubt') {
    return controlButtonDestructiveClassName;
  }

  return controlButtonSelectedNeutralClassName;
};

const getStatusFilterCountClassName = (value: StatusFilter, isActive: boolean) => {
  if (!isActive) {
    return 'bg-secondary text-muted-foreground';
  }

  if (value === 'haengt') {
    return 'bg-primary/15 text-primary';
  }

  if (value === 'abgeschraubt') {
    return 'bg-destructive/12 text-destructive';
  }

  return 'bg-card text-foreground';
};

const getNormalizedStatus = (status?: BoulderStatus): BoulderStatus => status ?? 'haengt';

const sortBouldersForStatus = (boulders: Boulder[]) =>
  [...boulders].sort((left, right) => {
    const leftStatus = getNormalizedStatus(left.status);
    const rightStatus = getNormalizedStatus(right.status);

    if (leftStatus !== rightStatus) {
      return leftStatus === 'haengt' ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'de-DE');
  });

const SetterStatusPage = () => {
  const { data: boulders, isLoading } = useBouldersWithSectors();
  const { data: sectors = [] } = useSectorsTransformed();
  const { data: colors } = useColors();
  const bulkStatusUpdate = useBulkUpdateBoulderStatus();

  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const colorMeta = useMemo(() => {
    const entries = new Map<string, { hex?: string }>();
    (colors ?? []).forEach((color) => {
      entries.set(color.name, { hex: color.hex });
    });
    return entries;
  }, [colors]);

  const selectedSectorName = useMemo(
    () => (sectorFilter === 'all' ? 'all' : sectors.find((sector) => sector.id === sectorFilter)?.name ?? 'all'),
    [sectorFilter, sectors],
  );

  const mapCountsBySectorId = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (boulders ?? []).reduce<Record<string, number>>((accumulator, boulder) => {
      if (normalizedQuery) {
        const haystack = [boulder.name, boulder.sector, boulder.sector2 ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return accumulator;
        }
      }

      const primarySectorId = sectors.find((sector) => sector.name === boulder.sector)?.id;
      const secondarySectorId = boulder.sector2
        ? sectors.find((sector) => sector.name === boulder.sector2)?.id
        : null;

      if (primarySectorId) {
        accumulator[primarySectorId] = (accumulator[primarySectorId] ?? 0) + 1;
      }
      if (secondarySectorId) {
        accumulator[secondarySectorId] = (accumulator[secondarySectorId] ?? 0) + 1;
      }

      return accumulator;
    }, {});
  }, [boulders, query, sectors]);

  const baseFilteredBoulders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sectorName =
      sectorFilter === 'all'
        ? null
        : sectors.find((sector) => sector.id === sectorFilter)?.name ?? null;

    return (boulders ?? []).filter((boulder) => {
      if (normalizedQuery) {
        const haystack = [boulder.name, boulder.sector, boulder.sector2 ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      if (sectorName && boulder.sector !== sectorName && boulder.sector2 !== sectorName) {
        return false;
      }

      return true;
    });
  }, [boulders, query, sectorFilter, sectors]);

  const filteredBoulders = useMemo(() => {
    if (statusFilter === 'all') {
      return baseFilteredBoulders;
    }

    return baseFilteredBoulders.filter((boulder) => getNormalizedStatus(boulder.status) === statusFilter);
  }, [baseFilteredBoulders, statusFilter]);

  const statusSummary = useMemo(
    () =>
      baseFilteredBoulders.reduce(
        (summary, boulder) => {
          if (getNormalizedStatus(boulder.status) === 'abgeschraubt') {
            summary.off += 1;
          } else {
            summary.hanging += 1;
          }
          return summary;
        },
        { hanging: 0, off: 0 },
      ),
    [baseFilteredBoulders],
  );

  const sectorGroups = useMemo(() => {
    if (selectedSectorName !== 'all') {
      const allBoulders = sortBouldersForStatus(baseFilteredBoulders);
      const visibleBoulders = sortBouldersForStatus(filteredBoulders);
      const hangingIds = allBoulders
        .filter((boulder) => getNormalizedStatus(boulder.status) === 'haengt')
        .map((boulder) => boulder.id);
      const offIds = allBoulders
        .filter((boulder) => getNormalizedStatus(boulder.status) === 'abgeschraubt')
        .map((boulder) => boulder.id);

      return visibleBoulders.length > 0
        ? [
            {
              id: sectorFilter,
              name: selectedSectorName,
              allBoulders,
              visibleBoulders,
              hangingIds,
              offIds,
              hangingCount: hangingIds.length,
              offCount: offIds.length,
              crossSectorCount: allBoulders.filter((boulder) => boulder.sector !== selectedSectorName).length,
            } satisfies SectorGroup,
          ]
        : [];
    }

    const grouped = new Map<string, Omit<SectorGroup, 'hangingIds' | 'offIds' | 'hangingCount' | 'offCount'>>();

    baseFilteredBoulders.forEach((boulder) => {
      const groupId = sectors.find((sector) => sector.name === boulder.sector)?.id ?? boulder.sector;
      const current = grouped.get(groupId) ?? {
        id: groupId,
        name: boulder.sector,
        allBoulders: [],
        visibleBoulders: [],
        crossSectorCount: 0,
      };

      current.allBoulders.push(boulder);
      if (boulder.sector2) {
        current.crossSectorCount += 1;
      }

      grouped.set(groupId, current);
    });

    filteredBoulders.forEach((boulder) => {
      const groupId = sectors.find((sector) => sector.name === boulder.sector)?.id ?? boulder.sector;
      const current = grouped.get(groupId);

      if (!current) return;

      current.visibleBoulders.push(boulder);
    });

    return Array.from(grouped.values())
      .filter((group) => group.visibleBoulders.length > 0)
      .map((group) => {
        const sortedAll = sortBouldersForStatus(group.allBoulders);
        const sortedVisible = sortBouldersForStatus(group.visibleBoulders);
        const hangingIds = sortedAll
          .filter((boulder) => getNormalizedStatus(boulder.status) === 'haengt')
          .map((boulder) => boulder.id);
        const offIds = sortedAll
          .filter((boulder) => getNormalizedStatus(boulder.status) === 'abgeschraubt')
          .map((boulder) => boulder.id);

        return {
          ...group,
          allBoulders: sortedAll,
          visibleBoulders: sortedVisible,
          hangingIds,
          offIds,
          hangingCount: hangingIds.length,
          offCount: offIds.length,
        } satisfies SectorGroup;
      })
      .sort((left, right) => {
        if (left.hangingCount !== right.hangingCount) {
          return right.hangingCount - left.hangingCount;
        }

        if (left.allBoulders.length !== right.allBoulders.length) {
          return right.allBoulders.length - left.allBoulders.length;
        }

        return left.name.localeCompare(right.name, 'de-DE');
      });
  }, [baseFilteredBoulders, filteredBoulders, sectorFilter, sectors, selectedSectorName]);

  const filteredBoulderIds = useMemo(
    () => filteredBoulders.map((boulder) => boulder.id),
    [filteredBoulders],
  );

  const areAllFilteredSelected = useMemo(
    () =>
      filteredBoulderIds.length > 0 &&
      filteredBoulderIds.every((id) => selectedIds.has(id)),
    [filteredBoulderIds, selectedIds],
  );

  const visibleSectorCount = selectedSectorName !== 'all' && baseFilteredBoulders.length > 0 ? 1 : sectorGroups.length;

  const toggleSelectedId = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroupSelection = (ids: string[]) => {
    if (ids.length === 0) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      const everySelected = ids.every((id) => next.has(id));

      ids.forEach((id) => {
        if (everySelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });

      return next;
    });
  };

  const applySelectionBehavior = (ids: string[], behavior: SelectionBehavior) => {
    if (behavior === 'keep') {
      return;
    }

    if (behavior === 'clear') {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const runStatusUpdate = async (
    ids: string[],
    status: BoulderStatus,
    actionKey: string,
    selectionBehavior: SelectionBehavior = 'keep',
  ) => {
    if (ids.length === 0) return;

    setActiveAction(actionKey);

    try {
      await bulkStatusUpdate.mutateAsync({ ids, status });
      applySelectionBehavior(ids, selectionBehavior);
      toast.success(status === 'haengt' ? 'Boulder hängen wieder.' : 'Boulder wurden abgeschraubt.');
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
      console.error('[SetterStatusPage] status update failed', error);
    } finally {
      setActiveAction(null);
    }
  };

  const handleMapSectorSelect = (sectorName: string) => {
    const sector = sectors.find((entry) => entry.name === sectorName);
    if (!sector) return;

    const nextSectorId = sectorFilter === sector.id ? 'all' : sector.id;
    setSectorFilter(nextSectorId);
    setSelectedIds(new Set());
  };

  const clearSectorFilter = () => {
    setSectorFilter('all');
    setSelectedIds(new Set());
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(areAllFilteredSelected ? new Set() : new Set(filteredBoulderIds));
  };

  const currentSectorLabel = sectorFilter === 'all' ? 'Alle Sektoren' : selectedSectorName;

  return (
    <div className="space-y-5 pb-32">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name oder Sektor durchsuchen"
            className="h-11 rounded-xl border-border bg-card pl-9"
          />
        </div>

        <SetterSurface className={cn('space-y-5 border-border', surfaceShadowClassName)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={sectionEyebrowClassName}>Statussteuerung</p>
              <h2 className="mt-2 text-[1.28rem] font-semibold leading-none tracking-[-0.02em] text-foreground sm:text-[1.4rem]">
                Boulder nach Status ordnen
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Filtere Status und Sektoren, oeffne bei Bedarf die Hallenkarte und markiere sichtbare Boulder in einem Schritt.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">
              <span className="text-muted-foreground">Aktive Sicht</span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-foreground">{filteredBoulders.length} Boulder</span>
            </div>
          </div>

          <div className={cn('overflow-hidden rounded-2xl border border-border bg-card', surfaceShadowClassName)}>
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="px-3 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Segmente</p>
                <p className="mt-2 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-foreground">{visibleSectorCount}</p>
              </div>
              <div className="px-3 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Hängt</p>
                <p className="mt-2 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-primary">{statusSummary.hanging}</p>
              </div>
              <div className="px-3 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive/80">Ab</p>
                <p className="mt-2 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-destructive">{statusSummary.off}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className={sectionEyebrowClassName}>Statusfilter</p>
              <div className="grid grid-cols-2 gap-2">
                {statusFilterOptions.map((option) => {
                  const count =
                    option.value === 'all'
                      ? baseFilteredBoulders.length
                      : option.value === 'haengt'
                        ? statusSummary.hanging
                        : statusSummary.off;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={cn(
                        statusFilterButtonClassName,
                        option.value === 'abgeschraubt' && 'col-span-2',
                        getStatusFilterButtonClassName(option.value, statusFilter === option.value),
                      )}
                    >
                      <span className="min-w-0">{option.label}</span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          getStatusFilterCountClassName(option.value, statusFilter === option.value),
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className={sectionEyebrowClassName}>Ansicht und Auswahl</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={clearSectorFilter}
                  className={cn(
                    controlButtonBaseClassName,
                    'min-h-11 justify-between rounded-xl px-4 py-2.5 text-left',
                    sectorFilter === 'all'
                      ? controlButtonSelectedNeutralClassName
                      : controlButtonPositiveClassName,
                  )}
                >
                  {currentSectorLabel}
                  {sectorFilter !== 'all' ? <X className="h-3.5 w-3.5 text-current opacity-70" /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapOpen((current) => !current)}
                  className={cn(
                    controlButtonBaseClassName,
                    isMapOpen ? controlButtonSelectedNeutralClassName : controlButtonInactiveClassName,
                    'min-h-11 justify-between rounded-xl px-4 py-2.5 text-left',
                  )}
                >
                  {isMapOpen ? 'Karte ausblenden' : 'Karte anzeigen'}
                  {isMapOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  disabled={filteredBoulderIds.length === 0}
                  className={cn(
                    controlButtonBaseClassName,
                    'col-span-2 min-h-11 justify-center rounded-xl px-4 py-2.5 sm:col-span-1',
                    areAllFilteredSelected
                      ? controlButtonSelectedNeutralClassName
                      : controlButtonPositiveClassName,
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {areAllFilteredSelected ? 'Auswahl lösen' : 'Sichtbare wählen'}
                </button>
              </div>
            </div>

            {isMapOpen ? (
              <div className={cn('overflow-hidden rounded-2xl border border-border bg-card p-3', surfaceShadowClassName)}>
                <HallMapView
                  sectors={sectors}
                  countsBySectorId={mapCountsBySectorId}
                  selectedSectorName={selectedSectorName}
                  onSelectSector={handleMapSectorSelect}
                  onClearSector={clearSectorFilter}
                  compact
                  frameless
                />
              </div>
            ) : null}
          </div>
        </SetterSurface>
      </div>

      <section className="space-y-4">
        <div className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-end sm:justify-between', surfaceShadowClassName)}>
          <div className="min-w-0">
            <p className={sectionEyebrowClassName}>Statusbereich</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {selectedSectorName !== 'all'
                ? `${selectedSectorName} im Fokus. Du kannst das ganze Segment direkt hier abhängen.`
                : 'Nach Segmenten gebündelt, damit du freie Flächen schneller findest.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground sm:self-auto">
            <span className="text-muted-foreground">sichtbar</span>
            <span className="rounded-full bg-secondary px-2.5 py-1">{filteredBoulders.length}</span>
          </div>
        </div>

        {isLoading ? (
          <SetterSurface className="py-12 text-sm text-muted-foreground">Boulder werden geladen...</SetterSurface>
        ) : filteredBoulders.length === 0 ? (
          <SetterSurface className="py-12 text-sm text-muted-foreground">
            {baseFilteredBoulders.length === 0
              ? 'Keine Boulder gefunden.'
              : 'Für diesen Status-Filter gibt es gerade keine Boulder.'}
          </SetterSurface>
        ) : (
          <div className="space-y-4">
            {sectorGroups.map((group) => {
              const visibleIds = group.visibleBoulders.map((boulder) => boulder.id);
              const everyVisibleSelected =
                visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
              const isPendingGroupOff =
                bulkStatusUpdate.isPending && activeAction === `group:${group.id}:abgeschraubt`;
              const isPendingGroupOn =
                bulkStatusUpdate.isPending && activeAction === `group:${group.id}:haengt`;

              return (
                <SetterSurface
                  key={group.id}
                  className={cn('overflow-hidden border-border p-0', surfaceShadowClassName)}
                >
                  <div className="border-b border-border bg-card px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[1.04rem] font-semibold tracking-[-0.02em] text-foreground">{group.name}</h3>
                          {group.crossSectorCount > 0 ? (
                            <span className={cn(statusChipBaseClassName, metaChipClassName)}>
                              {group.crossSectorCount} sektorübergreifend
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={cn(statusChipBaseClassName, positiveChipClassName)}>
                            {group.hangingCount} hängt
                          </span>
                          <span className={cn(statusChipBaseClassName, destructiveChipClassName)}>
                            {group.offCount} ab
                          </span>
                          <span className={cn(statusChipBaseClassName, neutralChipClassName)}>
                            {group.allBoulders.length} gesamt
                          </span>
                        </div>
                      </div>

                      <div className="w-full space-y-2 lg:w-[320px]">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(actionButtonBaseClassName, 'border-border bg-card text-foreground hover:bg-secondary')}
                          onClick={() => toggleGroupSelection(visibleIds)}
                          disabled={visibleIds.length === 0}
                        >
                          {everyVisibleSelected ? 'Markierung lösen' : `Auswählen (${visibleIds.length})`}
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(actionButtonBaseClassName, controlButtonDestructiveClassName)}
                            disabled={bulkStatusUpdate.isPending || group.hangingIds.length === 0}
                            onClick={() =>
                              runStatusUpdate(
                                group.hangingIds,
                                'abgeschraubt',
                                `group:${group.id}:abgeschraubt`,
                                'remove',
                              )
                            }
                          >
                            {isPendingGroupOff ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MinusCircle className="h-4 w-4" />
                            )}
                            {`Segment abhängen (${group.hangingCount})`}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(actionButtonBaseClassName, controlButtonPositiveClassName)}
                            disabled={bulkStatusUpdate.isPending || group.offIds.length === 0}
                            onClick={() =>
                              runStatusUpdate(group.offIds, 'haengt', `group:${group.id}:haengt`, 'remove')
                            }
                          >
                            {isPendingGroupOn ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            {`Wieder aktivieren (${group.offCount})`}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {group.visibleBoulders.map((boulder) => {
                      const color = colorMeta.get(boulder.color);
                      const thumbnailUrl = getThumbnailUrl(boulder);
                      const isSelected = selectedIds.has(boulder.id);
                      const currentStatus = getNormalizedStatus(boulder.status);
                      const hangsActionKey = `${boulder.id}:haengt`;
                      const offActionKey = `${boulder.id}:abgeschraubt`;
                      const isPendingHangs = bulkStatusUpdate.isPending && activeAction === hangsActionKey;
                      const isPendingOff = bulkStatusUpdate.isPending && activeAction === offActionKey;
                      const crossSectorLabel =
                        selectedSectorName !== 'all'
                          ? boulder.sector === group.name
                            ? boulder.sector2
                              ? `Auch ${boulder.sector2}`
                              : null
                            : `Primär ${boulder.sector}`
                          : boulder.sector2
                            ? `Auch ${boulder.sector2}`
                            : null;

                      return (
                        <article
                          key={boulder.id}
                          className={cn('px-4 py-3 transition-colors sm:px-5', isSelected && 'bg-primary/5')}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectedId(boulder.id)}
                              className="mt-3 shrink-0 bg-white"
                            />

                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                              {thumbnailUrl ? (
                                <img src={thumbnailUrl} alt={boulder.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                                  Kein Bild
                                </div>
                              )}
                              <span
                                className={cn(
                                    'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm',
                                    getTextClassForHex(color?.hex),
                                  )}
                                style={{
                                  background: color
                                    ? getColorBackgroundStyle(boulder.color, colors ?? [])
                                    : '#9ca3af',
                                }}
                              >
                                {formatDifficulty(boulder.difficulty)}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                <div className="min-w-0">
                                  <p className="line-clamp-2 break-words text-[0.98rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                                    {boulder.name}
                                  </p>
                                  {crossSectorLabel ? (
                                    <p className="mt-1 text-xs font-medium text-muted-foreground">{crossSectorLabel}</p>
                                  ) : null}
                                </div>

                                <div className="flex justify-end">
                                  <div className="inline-flex min-w-[150px] rounded-xl border border-border bg-secondary p-1">
                                    <button
                                      type="button"
                                      className={cn(
                                        'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-xs font-semibold transition-colors',
                                        currentStatus === 'haengt'
                                          ? 'bg-primary/10 text-primary'
                                          : 'text-muted-foreground hover:bg-card/80',
                                      )}
                                      disabled={bulkStatusUpdate.isPending}
                                      onClick={() => runStatusUpdate([boulder.id], 'haengt', hangsActionKey, 'remove')}
                                    >
                                      {isPendingHangs ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                      Hängt
                                    </button>
                                    <button
                                      type="button"
                                      className={cn(
                                        'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-xs font-semibold transition-colors',
                                        currentStatus === 'abgeschraubt'
                                          ? 'bg-destructive/10 text-destructive'
                                          : 'text-muted-foreground hover:bg-card/80',
                                      )}
                                      disabled={bulkStatusUpdate.isPending}
                                      onClick={() =>
                                        runStatusUpdate([boulder.id], 'abgeschraubt', offActionKey, 'remove')
                                      }
                                    >
                                      {isPendingOff ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <MinusCircle className="h-3.5 w-3.5" />
                                      )}
                                      Ab
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </SetterSurface>
              );
            })}
          </div>
        )}
      </section>

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-[125] md:bottom-6 md:left-auto md:right-6 md:w-auto">
          <div className={cn('rounded-2xl border border-border bg-card p-2', surfaceShadowClassName)}>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {`${selectedIds.size} ausgewählt`}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn('h-10 justify-start rounded-xl px-3', controlButtonPositiveClassName)}
                disabled={bulkStatusUpdate.isPending}
                onClick={() => runStatusUpdate(Array.from(selectedIds), 'haengt', 'bulk:haengt', 'clear')}
              >
                {bulkStatusUpdate.isPending && activeAction === 'bulk:haengt' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                    {'Hängt'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn('h-10 justify-start rounded-xl px-3', controlButtonDestructiveClassName)}
                disabled={bulkStatusUpdate.isPending}
                onClick={() =>
                  runStatusUpdate(Array.from(selectedIds), 'abgeschraubt', 'bulk:abgeschraubt', 'clear')
                }
              >
                {bulkStatusUpdate.isPending && activeAction === 'bulk:abgeschraubt' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MinusCircle className="h-4 w-4" />
                )}
                Abschrauben
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SetterStatusPage;
